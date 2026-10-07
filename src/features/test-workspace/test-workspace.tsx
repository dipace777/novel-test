import { useRef, useState } from "react"
import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PromptComposer } from "./components/prompt-composer"
import { WorkspaceHeader } from "./components/workspace-header"

export function TestWorkspace() {
  const [prompt, setPrompt] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function selectPrompt(value: string) {
    setPrompt(value)
    inputRef.current?.focus()
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "260px" } as CSSProperties}>
      <AppSidebar onNewTest={() => selectPrompt("")} />
      <SidebarInset className="h-svh min-w-0 bg-background">
        <WorkspaceHeader />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <section aria-label="Test conversation" className="flex-1" />
          <div className="shrink-0 px-5 pb-5 sm:px-10 sm:pb-7">
            <PromptComposer
              prompt={prompt}
              onPromptChange={setPrompt}
              inputRef={inputRef}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
