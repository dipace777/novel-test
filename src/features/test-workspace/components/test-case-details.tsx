import { CheckCheck } from "lucide-react"

import type { TestCase } from "../data"

export function TestCaseDetails({
  test,
  featureName,
}: {
  test: TestCase
  featureName: string
}) {
  return (
    <article
      className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-0 sm:py-10"
      aria-labelledby="test-case-title"
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{featureName}</span>
        <span aria-hidden="true">·</span>
        <span>Example test</span>
      </div>
      <h1 id="test-case-title" className="text-2xl font-medium tracking-tight">
        {test.name}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {test.description}
      </p>
      <section
        className="mt-7 rounded-xl border border-border bg-card p-5"
        aria-labelledby="test-steps-title"
      >
        <h2 id="test-steps-title" className="text-xs font-medium">
          Test steps
        </h2>
        <ol className="mt-4 space-y-4">
          {test.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm leading-6">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
      <section
        className="mt-4 rounded-xl border border-border bg-muted/30 p-5"
        aria-labelledby="test-result-title"
      >
        <h2
          id="test-result-title"
          className="flex items-center gap-2 text-xs font-medium"
        >
          <CheckCheck className="size-4 text-muted-foreground" /> Expected
          result
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {test.expectedResult}
        </p>
      </section>
    </article>
  )
}
