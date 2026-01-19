import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react"
import Editor from "@monaco-editor/react"
import { WebContainer } from "@webcontainer/api"
import type { ProjectFile } from "@/db/schema"
import {
  projectFilesToFileSystemTree,
  getAllFilesFromContainer,
  getFileTree,
  getLanguageFromPath,
  loadGitHubRepoViaTarball,
} from "@/lib/webcontainer-utils"

// Singleton WebContainer instance - can only boot once per page
let webContainerInstance: WebContainer | null = null
let webContainerPromise: Promise<WebContainer> | null = null

async function getWebContainer(): Promise<WebContainer> {
  if (webContainerInstance) {
    return webContainerInstance
  }
  if (webContainerPromise) {
    return webContainerPromise
  }
  webContainerPromise = WebContainer.boot().then((instance) => {
    webContainerInstance = instance
    return instance
  })
  return webContainerPromise
}
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Loader2,
  Terminal,
  Play,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface WebContainerEditorRef {
  applyCodeChange: (filepath: string, code: string) => Promise<void>
  getAllFiles: () => Promise<Record<string, string>>
  getFileTree: () => Promise<string[]>
}

interface WebContainerEditorProps {
  projectFiles?: ProjectFile[] | null
  githubRepoUrl?: string | null
  onReady?: () => void
  className?: string
}

interface FileTreeNode {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileTreeNode[]
}

function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const path of paths) {
    const parts = path.split("/")
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join("/")

      let node = current.find((n) => n.name === part)

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isLast ? "file" : "directory",
          children: isLast ? undefined : [],
        }
        current.push(node)
      }

      if (!isLast && node.children) {
        current = node.children
      }
    }
  }

  // Sort: directories first, then files, alphabetically
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined,
      }))
  }

  return sortNodes(root)
}

function FileTreeItem({
  node,
  selectedFile,
  onSelect,
  expandedDirs,
  onToggleDir,
  depth = 0,
}: {
  node: FileTreeNode
  selectedFile: string
  onSelect: (path: string) => void
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
  depth?: number
}) {
  const isExpanded = expandedDirs.has(node.path)
  const isSelected = selectedFile === node.path

  if (node.type === "directory") {
    return (
      <div>
        <button
          className={cn(
            "flex items-center gap-1 w-full px-2 py-1 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800",
            "text-zinc-700 dark:text-zinc-300"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onToggleDir(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )}
          <Folder className="w-4 h-4 flex-shrink-0 text-blue-500" />
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                onSelect={onSelect}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      className={cn(
        "flex items-center gap-1 w-full px-2 py-1 text-sm text-left",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        isSelected
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          : "text-zinc-600 dark:text-zinc-400"
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      onClick={() => onSelect(node.path)}
    >
      <File className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

export const WebContainerEditor = forwardRef<
  WebContainerEditorRef,
  WebContainerEditorProps
>(({ projectFiles, githubRepoUrl, onReady, className }, ref) => {
  const [container, setContainer] = useState<WebContainer | null>(null)
  const [isBooting, setIsBooting] = useState(true)
  const [bootError, setBootError] = useState<string | null>(null)
  const [activeFile, setActiveFile] = useState<string>("")
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["src"]))
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...")
  const terminalRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<WebContainer | null>(null)
  const hasLoadedFiles = useRef(false)

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    applyCodeChange: async (filepath: string, code: string) => {
      if (!containerRef.current) return

      // Write to WebContainer filesystem
      await containerRef.current.fs.writeFile(filepath, code)

      // Update local state
      setFileContents((prev) => ({
        ...prev,
        [filepath]: code,
      }))

      // Switch to the edited file
      setActiveFile(filepath)

      // Expand parent directories
      const parts = filepath.split("/")
      const newExpanded = new Set(expandedDirs)
      for (let i = 1; i < parts.length; i++) {
        newExpanded.add(parts.slice(0, i).join("/"))
      }
      setExpandedDirs(newExpanded)
    },
    getAllFiles: async () => {
      if (!containerRef.current) return fileContents
      return getAllFilesFromContainer(containerRef.current)
    },
    getFileTree: async () => {
      if (!containerRef.current) return filePaths
      return getFileTree(containerRef.current)
    },
  }))

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  // Boot WebContainer
  useEffect(() => {
    // Prevent multiple loads (React StrictMode, unstable deps like onReady)
    if (hasLoadedFiles.current) return

    let mounted = true

    async function boot() {
      try {
        setStatusMessage("Booting WebContainer...")

        const wc = await getWebContainer()
        if (!mounted) return

        containerRef.current = wc
        setContainer(wc)

        // Set up server-ready listener for preview
        wc.on("server-ready", (port, url) => {
          setPreviewUrl(url)
          addTerminalLine(`Server ready on port ${port}`)
        })

        // Load files (only once)
        hasLoadedFiles.current = true
        if (githubRepoUrl) {
          setStatusMessage("Loading repository...")
          await loadGitHubRepoViaTarball(wc, githubRepoUrl, (message) => {
            setStatusMessage(message)
            addTerminalLine(message)
          })
        } else if (projectFiles && projectFiles.length > 0) {
          setStatusMessage("Mounting project files...")
          const tree = projectFilesToFileSystemTree(projectFiles)
          await wc.mount(tree)
        }

        // Read file tree
        setStatusMessage("Reading file structure...")
        const paths = await getFileTree(wc)
        setFilePaths(paths)

        // Read initial file contents
        const contents: Record<string, string> = {}
        for (const path of paths) {
          try {
            contents[path] = await wc.fs.readFile(path, "utf-8")
          } catch {
            // Skip files that can't be read
          }
        }
        setFileContents(contents)

        // Select first relevant file
        const firstSourceFile = paths.find(
          (p) =>
            p.endsWith(".tsx") ||
            p.endsWith(".ts") ||
            p.endsWith(".jsx") ||
            p.endsWith(".js")
        )
        if (firstSourceFile) {
          setActiveFile(firstSourceFile)
        }

        setIsBooting(false)
        setStatusMessage("Ready")
        onReady?.()
      } catch (error) {
        console.error("Failed to boot WebContainer:", error)
        if (mounted) {
          setBootError(
            error instanceof Error ? error.message : "Failed to initialize editor"
          )
          setIsBooting(false)
        }
      }
    }

    boot()

    return () => {
      mounted = false
    }
  }, [projectFiles, githubRepoUrl, onReady])

  const addTerminalLine = useCallback((line: string) => {
    setTerminalOutput((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${line}`])
  }, [])

  const handleFileSelect = useCallback(
    async (path: string) => {
      setActiveFile(path)

      // Load file content if not already loaded
      if (!fileContents[path] && container) {
        try {
          const content = await container.fs.readFile(path, "utf-8")
          setFileContents((prev) => ({ ...prev, [path]: content }))
        } catch (error) {
          console.error("Failed to read file:", error)
        }
      }
    },
    [container, fileContents]
  )

  const handleEditorChange = useCallback(
    async (value: string | undefined) => {
      if (!value || !activeFile || !container) return

      setFileContents((prev) => ({
        ...prev,
        [activeFile]: value,
      }))

      // Write to WebContainer filesystem
      await container.fs.writeFile(activeFile, value)
    },
    [activeFile, container]
  )

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const runInstall = useCallback(async () => {
    if (!container || isInstalling) return

    setIsInstalling(true)
    addTerminalLine("Running npm install...")

    try {
      const process = await container.spawn("npm", ["install"])

      process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addTerminalLine(chunk)
          },
        })
      )

      const exitCode = await process.exit
      addTerminalLine(`npm install finished with code ${exitCode}`)
    } catch (error) {
      addTerminalLine(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsInstalling(false)
    }
  }, [container, isInstalling, addTerminalLine])

  const runDevServer = useCallback(async () => {
    if (!container || isRunning) return

    setIsRunning(true)
    addTerminalLine("Starting dev server...")

    try {
      const process = await container.spawn("npm", ["run", "dev"])

      process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addTerminalLine(chunk)
          },
        })
      )

      // Don't await - the dev server runs indefinitely
      process.exit.then((code) => {
        addTerminalLine(`Dev server exited with code ${code}`)
        setIsRunning(false)
      })
    } catch (error) {
      addTerminalLine(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsRunning(false)
    }
  }, [container, isRunning, addTerminalLine])

  const fileTree = buildFileTree(filePaths)

  if (bootError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-900",
          className
        )}
      >
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">Failed to initialize editor</div>
          <div className="text-sm text-zinc-500">{bootError}</div>
          <div className="text-xs text-zinc-400 mt-4">
            WebContainer requires Chrome, Edge, or Safari 16.4+
          </div>
        </div>
      </div>
    )
  }

  if (isBooting) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full bg-zinc-50 dark:bg-zinc-900",
          className
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <div className="text-zinc-600 dark:text-zinc-400">{statusMessage}</div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-zinc-900", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
        <Button
          size="sm"
          variant="outline"
          onClick={runInstall}
          disabled={isInstalling || isRunning}
        >
          {isInstalling ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Terminal className="w-4 h-4 mr-1" />
          )}
          npm install
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={runDevServer}
          disabled={isInstalling || isRunning}
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-1" />
          )}
          npm run dev
        </Button>
        {previewUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const iframe = document.querySelector(
                "iframe[data-preview]"
              ) as HTMLIFrameElement
              if (iframe) iframe.src = previewUrl
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh Preview
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-48 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-700 overflow-auto bg-zinc-50/50 dark:bg-zinc-800/50">
          <div className="py-2">
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                selectedFile={activeFile}
                onSelect={handleFileSelect}
                expandedDirs={expandedDirs}
                onToggleDir={toggleDir}
              />
            ))}
          </div>
        </div>

        {/* Editor + Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 min-h-0">
            {activeFile ? (
              <Editor
                height="100%"
                language={getLanguageFromPath(activeFile)}
                value={fileContents[activeFile] || ""}
                onChange={handleEditorChange}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "on",
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                Select a file to edit
              </div>
            )}
          </div>

          {/* Terminal */}
          <div className="h-32 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-900 text-zinc-100 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 text-xs text-zinc-400">
              <Terminal className="w-3 h-3" />
              Terminal
            </div>
            <div
              ref={terminalRef}
              className="flex-1 overflow-auto p-2 font-mono text-xs leading-relaxed"
            >
              {terminalOutput.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="w-80 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-700 flex flex-col">
            <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
              Preview
            </div>
            <iframe
              data-preview
              src={previewUrl}
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        )}
      </div>
    </div>
  )
})

WebContainerEditor.displayName = "WebContainerEditor"
