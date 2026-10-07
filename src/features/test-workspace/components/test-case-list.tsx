import {
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { TestCase, TestGroup } from "../data"

type TestCaseListProps = {
  query: string
  selectedTestId: string | null
  onSelectTest: (testId: string) => void
  onDeleteTest: (test: TestCase) => void
  onEditCategory: (categoryId: string) => void
  onDeleteCategory: (categoryId: string) => void
  testGroups: TestGroup[]
}

export function TestCaseList({
  query,
  selectedTestId,
  onSelectTest,
  onDeleteTest,
  onEditCategory,
  onDeleteCategory,
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
        const Icon = group.name.toLowerCase().includes("auth")
          ? ShieldCheck
          : FileText
        return (
          <SidebarGroup key={group.id} className="mt-1">
            <div className="mb-1 flex items-center gap-0.5">
              <SidebarGroupLabel
                className="h-6 min-w-0 flex-1 cursor-pointer justify-between px-1 text-[11px] hover:bg-sidebar-accent"
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
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6 shrink-0 text-muted-foreground"
                aria-label={`Edit ${group.name} category`}
                title="Edit category"
                onClick={() => onEditCategory(group.id)}
              >
                <Pencil className="size-3!" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${group.name} category`}
                title="Delete category"
                onClick={() => onDeleteCategory(group.id)}
              >
                <Trash2 className="size-3!" />
              </Button>
            </div>
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
                    className="h-8 cursor-pointer gap-2 rounded-md border border-sidebar-border bg-background/40 px-2 py-1.5 pr-8 transition-colors hover:border-sidebar-primary/25 hover:bg-sidebar-accent focus-visible:ring-2 data-active:border-sidebar-primary/40 data-active:bg-sidebar-primary/10 data-active:hover:bg-sidebar-primary/15"
                  >
                    <Icon className="size-3.5! text-muted-foreground group-data-active/menu-button:text-sidebar-primary" />
                    <span className="min-w-0 flex-1 truncate text-[11px] leading-4">
                      {test.name}
                    </span>
                    <ChevronRight className="ml-auto size-3! text-muted-foreground group-hover/menu-button:text-sidebar-foreground group-data-active/menu-button:text-sidebar-primary" />
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    type="button"
                    showOnHover
                    aria-label={`Delete ${test.name}`}
                    title="Delete test case"
                    onClick={() => onDeleteTest(test)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3!" />
                  </SidebarMenuAction>
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
