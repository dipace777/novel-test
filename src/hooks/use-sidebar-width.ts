import { useCallback, useEffect, useState } from "react"

export const DEFAULT_SIDEBAR_WIDTH = 260
const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 520
const STORAGE_KEY = "novel-test-sidebar-width"

function clampWidth(width: number, maximum = MAX_SIDEBAR_WIDTH) {
  return Math.round(Math.max(MIN_SIDEBAR_WIDTH, Math.min(maximum, width)))
}

export function useSidebarWidth() {
  // Match the server render, then restore the browser preference after mounting.
  const [preferredWidth, setPreferredWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [maxWidth, setMaxWidth] = useState(MAX_SIDEBAR_WIDTH)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved?.trim() && Number.isFinite(Number(saved)))
        setPreferredWidth(clampWidth(Number(saved)))
    } catch {
      // Resizing still works when browser storage is unavailable.
    }
    const updateLimit = () =>
      setMaxWidth(
        Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 360)
        )
      )
    updateLimit()
    window.addEventListener("resize", updateLimit)
    return () => window.removeEventListener("resize", updateLimit)
  }, [])

  const width = Math.min(preferredWidth, maxWidth)
  const setWidth = useCallback(
    (value: number, persist = true) => {
      const next = clampWidth(value, maxWidth)
      setPreferredWidth(next)
      if (persist) {
        try {
          localStorage.setItem(STORAGE_KEY, String(next))
        } catch {
          /* Keep the in-memory preference. */
        }
      }
      return next
    },
    [maxWidth]
  )

  return { width, minWidth: MIN_SIDEBAR_WIDTH, maxWidth, setWidth }
}
