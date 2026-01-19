import * as React from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CodeBlock } from "@/components/ui/code-block"
import { FileCode, Folder } from "lucide-react"
import type { ProjectFile } from "@/db/schema"

interface ProjectCodeViewerProps {
  files: ProjectFile[]
  className?: string
}

function getFileName(path: string): string {
  return path.split("/").pop() || path
}

function getFileIcon(language: string) {
  return <FileCode className="w-4 h-4" />
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript"
    case "js":
    case "jsx":
      return "javascript"
    case "css":
      return "css"
    case "json":
      return "json"
    case "html":
      return "html"
    default:
      return "typescript"
  }
}

function ProjectCodeViewer({ files, className }: ProjectCodeViewerProps) {
  const [openFiles, setOpenFiles] = React.useState<string[]>([])
  const [activeFile, setActiveFile] = React.useState<string>("")

  const handleOpenFile = (path: string) => {
    if (!openFiles.includes(path)) {
      setOpenFiles([...openFiles, path])
    }
    setActiveFile(path)
  }

  const handleCloseFile = (path: string) => {
    const newOpenFiles = openFiles.filter((f) => f !== path)
    setOpenFiles(newOpenFiles)
    if (activeFile === path) {
      setActiveFile(newOpenFiles[newOpenFiles.length - 1] || "")
    }
  }

  const activeFileData = files.find((f) => f.path === activeFile)

  // Group files by directory
  const filesByDir = files.reduce<Record<string, ProjectFile[]>>((acc, file) => {
    const parts = file.path.split("/")
    const dir = parts.slice(0, -1).join("/") || "root"
    if (!acc[dir]) acc[dir] = []
    acc[dir].push(file)
    return acc
  }, {})

  return (
    <div className={cn("flex h-full bg-white", className)}>
      {/* File tree */}
      <div className="w-48 flex-shrink-0 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">
        <div className="p-2">
          {Object.entries(filesByDir).map(([dir, dirFiles]) => (
            <div key={dir} className="mb-2">
              {dir !== "root" && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 px-2 py-1">
                  <Folder className="w-3.5 h-3.5" />
                  {dir}
                </div>
              )}
              {dirFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleOpenFile(file.path)}
                  className={cn(
                    "flex items-center gap-1.5 w-full text-left px-2 py-1.5 text-sm rounded",
                    "hover:bg-zinc-100 transition-colors",
                    activeFile === file.path && "bg-zinc-200"
                  )}
                >
                  {getFileIcon(file.language)}
                  <span className="truncate">{getFileName(file.path)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Code viewer */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {openFiles.length > 0 ? (
          <Tabs value={activeFile} onValueChange={setActiveFile} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex-shrink-0">
              {openFiles.map((path) => {
                const file = files.find((f) => f.path === path)
                return (
                  <TabsTrigger
                    key={path}
                    value={path}
                    closable
                    onClose={() => handleCloseFile(path)}
                  >
                    {getFileName(path)}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {openFiles.map((path) => {
              const file = files.find((f) => f.path === path)
              if (!file) return null
              return (
                <TabsContent key={path} value={path} className="flex-1 overflow-auto p-0">
                  <CodeBlock
                    code={file.content}
                    language={file.language || getLanguageFromPath(file.path)}
                    maxHeight="none"
                    className="min-h-full rounded-none"
                  />
                </TabsContent>
              )
            })}
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            <div className="text-center">
              <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Wähle eine Datei aus der Liste</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { ProjectCodeViewer }
