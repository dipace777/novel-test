import { createFileRoute } from "@tanstack/react-router"
import { TestWorkspace } from "@/features/test-workspace/test-workspace"

export const Route = createFileRoute("/")({ component: TestWorkspace })
