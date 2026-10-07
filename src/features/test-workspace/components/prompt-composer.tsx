import { ArrowUp, Settings } from "lucide-react"
import type { RefObject } from "react"

import { Button } from "@/components/ui/button"

type PromptComposerProps = {
  onBlur: () => void
  prompt: string
  onPromptChange: (prompt: string) => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  onOpenSettings: () => void
}

export function PromptComposer({
  onBlur,
  prompt,
  onPromptChange,
  inputRef,
  onOpenSettings,
}: PromptComposerProps) {
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-foreground/5 transition-colors focus-within:border-primary/40">
        <label htmlFor="test-prompt" className="sr-only">
          Describe your test
        </label>
        <textarea
          onBlur={onBlur}
          maxLength={50000}
          ref={inputRef}
          id="test-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Describe UI steps, API calls, or both…"
          rows={3}
          className="block max-h-52 min-h-24 w-full resize-y bg-transparent px-4 pt-4 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-end px-3 pb-3">
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSettings}
              aria-label="Configure workspace settings"
              title="Workspace settings"
              className="text-muted-foreground"
            >
              <Settings />
            </Button>
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
      </div>
    </div>
  )
}
