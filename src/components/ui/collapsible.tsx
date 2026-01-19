import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface CollapsibleContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("Collapsible components must be used within a Collapsible provider")
  }
  return context
}

interface CollapsibleProps {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

function Collapsible({ defaultOpen = false, open, onOpenChange, children, className }: CollapsibleProps) {
  const [openState, setOpenState] = React.useState(defaultOpen)

  const isOpen = open !== undefined ? open : openState

  const setOpen = React.useCallback((newOpen: boolean) => {
    if (open === undefined) {
      setOpenState(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [open, onOpenChange])

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, setOpen }}>
      <div className={cn("border-b border-zinc-200", className)}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
}

function CollapsibleTrigger({ children, className }: CollapsibleTriggerProps) {
  const { open, setOpen } = useCollapsible()

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold",
        "bg-zinc-50 hover:bg-zinc-100 transition-colors text-left",
        className
      )}
    >
      <ChevronRight
        className={cn(
          "w-4 h-4 transition-transform duration-200",
          open && "rotate-90"
        )}
      />
      {children}
    </button>
  )
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { open } = useCollapsible()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | undefined>(open ? undefined : 0)

  React.useEffect(() => {
    if (!contentRef.current) return

    if (open) {
      const contentHeight = contentRef.current.scrollHeight
      setHeight(contentHeight)
      // After animation completes, set to auto for dynamic content
      const timer = setTimeout(() => setHeight(undefined), 200)
      return () => clearTimeout(timer)
    } else {
      // First set explicit height, then animate to 0
      const contentHeight = contentRef.current.scrollHeight
      setHeight(contentHeight)
      // Use requestAnimationFrame to ensure the height is set before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0)
        })
      })
    }
  }, [open])

  return (
    <div
      ref={contentRef}
      style={{ height: height === undefined ? 'auto' : height }}
      className={cn(
        "overflow-hidden transition-[height] duration-200 ease-in-out",
        className
      )}
    >
      {open && children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
