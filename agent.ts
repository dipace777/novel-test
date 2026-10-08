import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { chat } from "@tanstack/ai"
import { createGrokText } from "@tanstack/ai-grok"
import { parse } from "dotenv"

type Command = {
  command: string
  testFolder: string
  testName: string
  globalUrl: string
  resolve: (reply: string) => void
  reject: (error: Error) => void
}

type Turn = { role: "user" | "assistant"; content: string }

const queue: Command[] = []
let notify: (() => void) | null = null
let started = false
let busy = false
const history: Turn[] = []

const attempts = 3
const verifyTimeoutMs = 120_000

function takeCommand() {
  const next = queue.shift()
  if (next) return Promise.resolve(next)
  return new Promise<Command>((resolve) => {
    notify = () => {
      const command = queue.shift()
      if (!command) return
      notify = null
      resolve(command)
    }
  })
}

function specPath(testFolder: string) {
  const root = path.resolve(".")
  const testsRoot = path.resolve(root, "tests")
  const file = path.resolve(root, testFolder, "test.spec.ts")
  if (file !== testsRoot && !file.startsWith(testsRoot + path.sep))
    throw new Error("Refusing to write a spec outside tests/.")
  return { absolute: file, relative: path.relative(root, file) }
}

function extractSource(text: string) {
  const fenced = text.match(/```(?:ts|typescript)?\s*([\s\S]*?)```/)
  let source = (fenced?.[1] ?? text).trim()
  const importAt = source.indexOf("import ")
  if (importAt > 0) source = source.slice(importAt).trim()
  if (!source.includes("@playwright/test") || !source.includes("test("))
    throw new Error("The agent did not return a Playwright test.")
  return source.endsWith("\n") ? source : `${source}\n`
}

function xaiApiKey() {
  const fromProcess = process.env["XAI_API_KEY"]?.trim()
  if (fromProcess) return fromProcess
  try {
    const fromFile = parse(readFileSync(path.resolve(".env")))[
      "XAI_API_KEY"
    ]?.trim()
    if (fromFile) return fromFile
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  throw new Error("Set XAI_API_KEY in .env and restart the app.")
}

async function draftSpec(
  command: Command,
  currentSource: string,
  failure: string
) {
  const apiKey = xaiApiKey()

  const prompt = [
    `Test name: ${command.testName}`,
    `Global URL: ${command.globalUrl || "(not set)"}`,
    `Instruction: ${command.command}`,
    currentSource ? `Current spec:\n${currentSource}` : "There is no spec yet.",
    failure
      ? `The last Playwright run failed. Return a corrected full file.\n${failure}`
      : "Write the spec for this instruction.",
    "Output only the TypeScript source. No markdown.",
  ].join("\n\n")

  let reply = ""
  let runError = ""
  const stream = chat({
    adapter: createGrokText("grok-4.7", apiKey),
    systemPrompts: [
      [
        "You write one Playwright test file for Novel Test.",
        'Use `import { test, expect } from "@playwright/test"` and exactly one test() whose title is the test name.',
        "Turn the instruction into browser steps and assertions.",
        "If the instruction names a site, open that URL with page.goto. Otherwise start at the Global URL.",
        "Prefer getByRole and visible text.",
        "Output only the TypeScript source.",
      ].join(" "),
    ],
    messages: [...history, { role: "user", content: prompt }],
  })

  for await (const chunk of stream) {
    if (chunk.type === "TEXT_MESSAGE_CONTENT") reply += chunk.delta
    if (chunk.type === "RUN_ERROR") runError = chunk.message
  }
  if (!reply.trim() && runError) throw new Error(runError)
  return extractSource(reply)
}

function tail(output: string) {
  const trimmed = output.trim()
  if (trimmed.length <= 2500) return trimmed
  return trimmed.slice(-2500)
}

function verifySpec(spec: string) {
  return new Promise<{ exitCode: number; output: string; timedOut: boolean }>(
    (resolve, reject) => {
      const child = spawn(
        "pnpm",
        [
          "exec",
          "playwright",
          "test",
          spec,
          "--project=chromium",
          "--reporter=line",
          "--retries=0",
          "--workers=1",
        ],
        { cwd: path.resolve("."), env: process.env }
      )
      let output = ""
      let timedOut = false
      const append = (chunk: Buffer) => {
        output += chunk.toString()
        if (output.length > 100_000) output = output.slice(-100_000)
      }
      child.stdout.on("data", append)
      child.stderr.on("data", append)
      const timer = setTimeout(() => {
        timedOut = true
        child.kill("SIGTERM")
      }, verifyTimeoutMs)
      child.on("error", (error) => {
        clearTimeout(timer)
        reject(error)
      })
      child.on("close", (code) => {
        clearTimeout(timer)
        resolve({ exitCode: code ?? 1, output, timedOut })
      })
    }
  )
}

function browserMissing(output: string) {
  return /Executable doesn't exist|playwright install/i.test(output)
}

async function runCommand(command: Command) {
  const spec = specPath(command.testFolder)
  let current = ""
  try {
    current = await readFile(spec.absolute, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  let failure = ""

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const source = await draftSpec(command, current, failure)
    await mkdir(path.dirname(spec.absolute), { recursive: true })
    await writeFile(spec.absolute, source)
    current = source

    const result = await verifySpec(spec.relative)
    const output = result.timedOut
      ? `${result.output}\nPlaywright timed out after ${verifyTimeoutMs / 1000}s.`
      : result.output
    if (result.exitCode === 0 && !result.timedOut) {
      return `Wrote ${spec.relative} and Playwright passed.\n\n${tail(output)}`
    }
    if (browserMissing(output)) {
      return `Wrote ${spec.relative}, but Playwright has no Chromium browser. Run \`pnpm exec playwright install chromium\`, then send the command again.\n\n${tail(output)}`
    }
    failure = tail(output)
  }

  return `Wrote ${spec.relative}, but Playwright failed after ${attempts} attempts.\n\n${failure}`
}

async function listen() {
  for (;;) {
    const command = await takeCommand()
    busy = true
    try {
      const reply = await runCommand(command)
      history.push(
        { role: "user", content: command.command },
        { role: "assistant", content: reply }
      )
      if (history.length > 20) history.splice(0, history.length - 20)
      command.resolve(reply)
    } catch (error) {
      command.reject(
        error instanceof Error ? error : new Error("The agent failed.")
      )
    } finally {
      busy = false
    }
  }
}

export function startAgent() {
  if (started) return
  started = true
  console.log("[agent] listening for commands")
  void listen()
}

export function agentStatus() {
  return { listening: started, busy: busy || queue.length > 0 }
}

export function submitCommand(input: {
  command: string
  testFolder: string
  testName: string
  globalUrl: string
}) {
  startAgent()
  return new Promise<string>((resolve, reject) => {
    queue.push({ ...input, resolve, reject })
    notify?.()
  })
}
