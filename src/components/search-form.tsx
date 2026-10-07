import { useId } from "react"
import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"
import { SearchIcon } from "lucide-react"

type SearchFormProps = {
  query: string
  onQueryChange: (query: string) => void
}

export function SearchForm({ query, onQueryChange }: SearchFormProps) {
  const inputId = useId()

  return (
    <form role="search" onSubmit={(event) => event.preventDefault()}>
      <SidebarGroup className="px-0 py-1">
        <SidebarGroupContent className="relative">
          <Label htmlFor={inputId} className="sr-only">
            Search tests
          </Label>
          <SidebarInput
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search tests…"
            autoComplete="off"
            className="h-8 pl-7 md:text-xs"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 opacity-50 select-none" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}
