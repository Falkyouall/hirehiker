import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider")
  }
  return context
}

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [activeTab, setActiveTabState] = React.useState(defaultValue || "")

  const activeValue = value !== undefined ? value : activeTab

  const setActiveTab = React.useCallback((newValue: string) => {
    if (value === undefined) {
      setActiveTabState(newValue)
    }
    onValueChange?.(newValue)
  }, [value, onValueChange])

  return (
    <TabsContext.Provider value={{ activeTab: activeValue, setActiveTab }}>
      <div className={cn("flex flex-col", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn(
      "flex items-center gap-1 border-b border-zinc-200 bg-zinc-100 px-2",
      className
    )}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  onClose?: () => void
  closable?: boolean
}

function TabsTrigger({ value, children, className, onClose, closable = false }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs()
  const isActive = activeTab === value

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
        "border-b-2 -mb-px",
        isActive
          ? "border-zinc-900 text-zinc-900 bg-white"
          : "border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50",
        className
      )}
    >
      <span className="truncate max-w-[150px]">{children}</span>
      {closable && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
          }}
          className="ml-1 rounded hover:bg-zinc-200 p-0.5"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeTab } = useTabs()

  if (activeTab !== value) return null

  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
