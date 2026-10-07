import { createFileRoute } from "@tanstack/react-router"
import { TestWorkspace } from "@/features/test-workspace/test-workspace"
import { getWorkspaceData } from "@/features/test-workspace/server-functions"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  loader: () => getWorkspaceData(),
  component: WorkspacePage,
  pendingComponent: () => (
    <div
      role="status"
      className="grid h-svh place-items-center text-sm text-muted-foreground"
    >
      Loading workspace…
    </div>
  ),
})

function WorkspacePage() {
  const result = Route.useLoaderData()
  if (!result.data)
    return (
      <div className="grid h-svh place-items-center bg-background p-6 text-foreground">
        <div className="max-w-sm space-y-4">
          <h1 className="text-lg font-semibold">Workspace unavailable</h1>
          <p role="alert" className="text-sm text-muted-foreground">
            {result.error}
          </p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    )
  return <TestWorkspace initialData={result.data} />
}
