import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { GripVertical } from "lucide-react"

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import {
  DEFAULT_SIDEBAR_WIDTH,
  useSidebarWidth,
} from "@/hooks/use-sidebar-width"

type ResizeContextValue = ReturnType<typeof useSidebarWidth> & {
  setResizing: (resizing: boolean) => void
}
const ResizeContext = createContext<ResizeContextValue | null>(null)

export function ResizableSidebarProvider({
  children,
}: {
  children: ReactNode
}) {
  const sizing = useSidebarWidth()
  const [resizing, setResizing] = useState(false)

  return (
    <ResizeContext.Provider value={{ ...sizing, setResizing }}>
      <SidebarProvider
        style={{ "--sidebar-width": `${sizing.width}px` } as CSSProperties}
        data-resizing={resizing}
        className={
          resizing ? "select-none [&_*]:cursor-col-resize!" : undefined
        }
      >
        {children}
      </SidebarProvider>
    </ResizeContext.Provider>
  )
}

export function SidebarResizeHandle() {
  const sizing = useContext(ResizeContext)
  const { isMobile, state } = useSidebar()
  const drag = useRef<{
    pointerId: number
    startX: number
    startWidth: number
    width: number
  } | null>(null)
  if (!sizing)
    throw new Error("SidebarResizeHandle requires ResizableSidebarProvider.")
  const { width, minWidth, maxWidth, setWidth, setResizing } = sizing

  function finishDrag() {
    const active = drag.current
    if (!active) return
    drag.current = null
    setWidth(active.width)
    setResizing(false)
  }

  useEffect(() => {
    if (isMobile || state === "collapsed") finishDrag()
    return () => finishDrag()
  }, [isMobile, state, setWidth])

  if (isMobile || state === "collapsed") return null

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels wide`}
      title="Drag to resize. Use arrow keys, or double-click to reset."
      className="group/sidebar-resizer absolute inset-y-0 -right-1.5 z-20 hidden w-3 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px hover:after:bg-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset focus-visible:after:bg-primary md:block"
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth: width,
          width,
        }
        setResizing(true)
      }}
      onPointerMove={(event) => {
        const active = drag.current
        if (!active || active.pointerId !== event.pointerId) return
        active.width = setWidth(
          active.startWidth + event.clientX - active.startX,
          false
        )
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointerId === event.pointerId) finishDrag()
      }}
      onPointerCancel={(event) => {
        if (drag.current?.pointerId === event.pointerId) finishDrag()
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.pointerId === event.pointerId) finishDrag()
      }}
      onDoubleClick={() => setWidth(DEFAULT_SIDEBAR_WIDTH)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 40 : 10
        const next = {
          ArrowLeft: width - step,
          ArrowRight: width + step,
          Home: minWidth,
          End: maxWidth,
        }[event.key]
        if (next === undefined) return
        event.preventDefault()
        setWidth(next)
      }}
    >
      <GripVertical className="pointer-events-none absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-sidebar-border bg-sidebar text-muted-foreground opacity-60 group-hover/sidebar-resizer:opacity-100 group-focus-visible/sidebar-resizer:text-primary" />
    </div>
  )
}
