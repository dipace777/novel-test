import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

const Dialog = DialogPrimitive.Root

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl transition-opacity duration-150 outline-none data-ending-style:opacity-0 data-starting-style:opacity-0",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4"
            />
          }
          aria-label="Close"
        >
          <X />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn("text-xs leading-5 text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogTitle, DialogDescription }
