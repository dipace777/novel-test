import { FlaskConical, History, Plus, ScanLine, Search } from "lucide-react"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { sampleTests } from "@/features/test-workspace/data"

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  onNewTest: () => void
}

export function AppSidebar({ onNewTest, ...props }: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-7 px-5 pt-7 pb-5">
        <div className="flex items-center gap-2.5 px-1">
          <ScanLine className="size-7 text-primary" strokeWidth={1.8} />
          <span className="text-xl font-semibold tracking-tight">
            trace<span className="text-primary">.</span>
          </span>
          <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[9px] font-medium tracking-widest text-muted-foreground">
            PREVIEW
          </span>
        </div>
        <Button
          onClick={onNewTest}
          className="h-10 w-full justify-start gap-2.5 rounded-lg border border-border bg-sidebar-accent/50 px-3 text-foreground hover:bg-sidebar-accent"
        >
          <Plus className="size-4 text-primary" /> New test
        </Button>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup className="pt-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                disabled
                className="h-10 gap-3 text-muted-foreground"
                title="Test search is coming soon"
              >
                <Search /> Search tests
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                disabled
                className="h-10 gap-3 text-muted-foreground"
                title="Run history is coming soon"
              >
                <History /> Run history
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-5">
          <SidebarGroupLabel className="mb-2 flex justify-between text-[10px] font-medium tracking-[0.13em] uppercase">
            Recent tests{" "}
            <span className="tracking-normal">{sampleTests.length}</span>
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {sampleTests.map((test) => (
              <SidebarMenuItem key={test.id}>
                <SidebarMenuButton
                  disabled
                  className="h-auto items-start gap-3 rounded-lg py-3 disabled:opacity-100"
                  title="Sample test — opening saved tests is coming soon"
                >
                  <FlaskConical className="mt-0.5 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="truncate text-[13px] text-foreground/80">
                      {test.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        className={`size-1.5 rounded-full ${test.status === "Passed" ? "bg-primary" : "bg-muted-foreground"}`}
                      />
                      {test.status}
                      <span className="px-0.5 text-muted-foreground/50">·</span>
                      {test.time}
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <p className="px-2 pt-3 text-[10px] text-muted-foreground">
            Sample workspace
          </p>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-4 p-5">
        <div className="flex items-center gap-2.5 border-t border-border pt-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
            JD
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium">Personal workspace</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Local prototype
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
