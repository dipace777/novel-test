import { ArrowUp, Globe, Paperclip, Sparkles } from "lucide-react"
import type { RefObject } from "react"

import { Button } from "@/components/ui/button"

type PromptComposerProps = {
  prompt: string
  onPromptChange: (prompt: string) => void
  inputRef: RefObject<HTMLTextAreaElement | null>
}

export function PromptComposer({
  prompt,
  onPromptChange,
  inputRef,
}: PromptComposerProps) {
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-foreground/5 transition-colors focus-within:border-primary/40">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Globe className="size-3.5 shrink-0 text-muted-foreground" />
          <label htmlFor="target-url" className="sr-only">
            Application URL
          </label>
          <input
            id="target-url"
            type="url"
            placeholder="Add your application URL"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <span className="text-[9px] text-muted-foreground">TARGET APP</span>
        </div>
        <label htmlFor="test-prompt" className="sr-only">
          Describe your test
        </label>
        <textarea
          ref={inputRef}
          id="test-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Describe a flow to test, or ask a question…"
          rows={3}
          className="block max-h-52 min-h-24 w-full resize-y bg-transparent px-4 pt-4 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled
              title="Attachments are coming soon"
              aria-label="Attach a reference"
            >
              <Paperclip className="size-4" />
            </Button>
            <span className="h-3.5 w-px bg-sidebar-accent" />
            <span className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
              <Sparkles className="size-3 text-primary" /> Test assistant
            </span>
          </div>
          <Button
            size="icon"
            disabled
            aria-label="Generate test (coming soon)"
            title="Test generation is coming soon"
            className="rounded-lg bg-primary text-primary-foreground disabled:opacity-80"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground">
        Your next great test starts with a simple description.{" "}
        <span className="hidden sm:inline">· </span>
        <br className="sm:hidden" />
        Generation coming soon.
      </p>
    </div>
  )
}
