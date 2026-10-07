import { Plus, ScanLine } from "lucide-react"
import { useState } from "react"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { SearchForm } from "@/components/search-form"
import { SidebarResizeHandle } from "@/components/resizable-sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { TestCaseList } from "@/features/test-workspace/components/test-case-list"
import type { TestCase, TestGroup } from "@/features/test-workspace/data"

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  onNewTest: () => void
  selectedTestId: string | null
  onSelectTest: (testId: string) => void
  onDeleteTest: (test: TestCase) => void
  onEditCategory: (categoryId: string) => void
  onDeleteCategory: (categoryId: string) => void
  testGroups: TestGroup[]
}

export function AppSidebar({
  onNewTest,
  selectedTestId,
  onSelectTest,
  onDeleteTest,
  onEditCategory,
  onDeleteCategory,
  testGroups,
  ...props
}: AppSidebarProps) {
  const [search, setSearch] = useState("")
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-3 px-4 pt-5 pb-2">
        <div className="mb-1 flex items-center gap-2 px-1">
          <ScanLine className="size-5 text-primary" strokeWidth={1.8} />
          <span className="text-lg font-semibold tracking-tight">
            Novel Test
          </span>
          <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[9px] font-medium tracking-widest text-muted-foreground">
            PREVIEW
          </span>
        </div>
        <Button
          onClick={() => {
            setSearch("")
            setOpenMobile(false)
            onNewTest()
          }}
          className="h-8 w-full justify-start gap-2 rounded-lg border border-border bg-sidebar-accent/50 px-2.5 text-xs text-foreground hover:bg-sidebar-accent"
        >
          <Plus className="size-3.5 text-primary" /> New test
        </Button>
        <SearchForm query={search} onQueryChange={setSearch} />
      </SidebarHeader>
      <SidebarContent className="px-2 pt-1 pb-4">
        <TestCaseList
          query={search}
          selectedTestId={selectedTestId}
          onSelectTest={onSelectTest}
          onDeleteTest={onDeleteTest}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          testGroups={testGroups}
        />
      </SidebarContent>
      <SidebarResizeHandle />
    </Sidebar>
  )
}
