import { ChevronDown, ChevronRight, FileText, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { TestGroup } from "../data"

type TestCaseListProps = {
  query: string
  selectedTestId: string | null
  onSelectTest: (testId: string) => void
  testGroups: TestGroup[]
}

export function TestCaseList({
  query,
  selectedTestId,
  onSelectTest,
  testGroups,
}: TestCaseListProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const search = query.trim().toLowerCase()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  useEffect(() => {
    if (search) setCollapsed({})
  }, [search])
  useEffect(() => {
    const group = testGroups.find((item) =>
      item.tests.some((test) => test.id === selectedTestId)
    )
    if (group)
      setCollapsed((current) =>
        current[group.id] ? { ...current, [group.id]: false } : current
      )
  }, [selectedTestId, testGroups])
  const groups = testGroups
    .map((group) => ({
      ...group,
      tests: group.tests.filter((test) =>
        `${group.name} ${test.name} ${test.description}`
          .toLowerCase()
          .includes(search)
      ),
    }))
    .filter(
      (group) =>
        group.tests.length > 0 ||
        !search ||
        group.name.toLowerCase().includes(search)
    )

  return (
    <nav aria-label="Test cases">
      {groups.map((group) => {
        const Icon = group.id === "auth" ? ShieldCheck : FileText
        return (
          <SidebarGroup key={group.id} className="mt-1">
            <SidebarGroupLabel
              className="mb-1 h-6 cursor-pointer justify-between px-1 text-[11px] hover:bg-sidebar-accent"
              render={
                <button
                  type="button"
                  aria-expanded={!collapsed[group.id]}
                  aria-controls={`test-category-${group.id}`}
                  onClick={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [group.id]: !current[group.id],
                    }))
                  }
                />
              }
            >
              <span className="min-w-0 truncate">{group.name}</span>
              <ChevronDown
                className={`size-3! shrink-0 transition-transform ${collapsed[group.id] ? "-rotate-90" : ""}`}
              />
            </SidebarGroupLabel>
            <SidebarMenu
              id={`test-category-${group.id}`}
              className="gap-1"
              hidden={collapsed[group.id]}
            >
              {group.tests.length === 0 && (
                <SidebarMenuItem className="px-2 py-1 text-[11px] text-muted-foreground">
                  No tests yet.
                </SidebarMenuItem>
              )}
              {group.tests.map((test) => (
                <SidebarMenuItem key={test.id}>
                  <SidebarMenuButton
                    isActive={selectedTestId === test.id}
                    aria-pressed={selectedTestId === test.id}
                    onClick={() => {
                      onSelectTest(test.id)
                      if (isMobile) setOpenMobile(false)
                    }}
                    title={test.name}
                    className="h-8 cursor-pointer gap-2 rounded-md border border-sidebar-border bg-background/40 px-2 py-1.5 transition-colors hover:border-sidebar-primary/25 hover:bg-sidebar-accent focus-visible:ring-2 data-active:border-sidebar-primary/40 data-active:bg-sidebar-primary/10 data-active:hover:bg-sidebar-primary/15"
                  >
                    <Icon className="size-3.5! text-muted-foreground group-data-active/menu-button:text-sidebar-primary" />
                    <span className="min-w-0 flex-1 truncate text-[11px] leading-4">
                      {test.name}
                    </span>
                    <ChevronRight className="ml-auto size-3! text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-active/menu-button:text-sidebar-primary" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )
      })}
      {groups.length === 0 && (
        <p role="status" className="px-4 py-5 text-xs text-muted-foreground">
          {testGroups.length === 0
            ? "No tests yet. Start with a new test."
            : "No tests found."}
        </p>
      )}
    </nav>
  )
}
