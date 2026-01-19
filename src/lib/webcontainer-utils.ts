import type { WebContainer, FileSystemTree } from "@webcontainer/api"
import type { ProjectFile } from "@/db/schema"

/**
 * Convert ProjectFile array to WebContainer FileSystemTree format
 */
export function projectFilesToFileSystemTree(files: ProjectFile[]): FileSystemTree {
  const tree: FileSystemTree = {}

  for (const file of files) {
    const parts = file.path.split("/")
    let current = tree

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLastPart = i === parts.length - 1

      if (isLastPart) {
        // It's a file
        current[part] = {
          file: {
            contents: file.content,
          },
        }
      } else {
        // It's a directory
        if (!current[part]) {
          current[part] = {
            directory: {},
          }
        }
        const dirNode = current[part]
        if ("directory" in dirNode) {
          current = dirNode.directory
        }
      }
    }
  }

  return tree
}

/**
 * Read all files from a WebContainer recursively
 */
export async function getAllFilesFromContainer(
  container: WebContainer,
  basePath: string = ""
): Promise<Record<string, string>> {
  const files: Record<string, string> = {}

  async function readDir(dirPath: string) {
    const entries = await container.fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = dirPath ? `${dirPath}/${entry.name}` : entry.name

      // Skip node_modules and common build directories
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === ".cache"
      ) {
        continue
      }

      if (entry.isDirectory()) {
        await readDir(fullPath)
      } else if (entry.isFile()) {
        try {
          const content = await container.fs.readFile(fullPath, "utf-8")
          files[fullPath] = content
        } catch (e) {
          // Skip binary files or files that can't be read as text
          console.warn(`Skipping file ${fullPath}: could not read as text`)
        }
      }
    }
  }

  await readDir(basePath)
  return files
}

/**
 * Get the file tree (paths only) from a WebContainer
 */
export async function getFileTree(
  container: WebContainer,
  basePath: string = ""
): Promise<string[]> {
  const paths: string[] = []

  async function readDir(dirPath: string) {
    const entries = await container.fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = dirPath ? `${dirPath}/${entry.name}` : entry.name

      // Skip node_modules and common build directories
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === ".cache"
      ) {
        continue
      }

      if (entry.isDirectory()) {
        await readDir(fullPath)
      } else if (entry.isFile()) {
        paths.push(fullPath)
      }
    }
  }

  await readDir(basePath)
  return paths.sort()
}

/**
 * Get language from file path for syntax highlighting
 */
export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    html: "html",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    sql: "sql",
    sh: "shell",
    bash: "shell",
  }

  return languageMap[ext || ""] || "plaintext"
}

/**
 * Load a GitHub repo into a WebContainer via tarball download
 * Uses server-side proxy to avoid CORS issues with GitHub's codeload.github.com
 */
export async function loadGitHubRepoViaTarball(
  container: WebContainer,
  repoUrl: string,
  onProgress?: (message: string) => void
): Promise<void> {
  const { gunzipSync } = await import("fflate")
  const { fetchGitHubTarball } = await import("@/server/functions/github")

  // Parse GitHub URL to extract owner/repo
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/)
  if (!match) {
    throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo")
  }
  const [, owner, repoWithSuffix] = match
  const repo = repoWithSuffix.replace(/\.git$/, "")

  onProgress?.("Downloading repository...")

  // Fetch via server proxy (returns base64)
  const base64Data = await fetchGitHubTarball({ data: { owner, repo } })

  // Decode base64 to Uint8Array
  const binaryString = atob(base64Data)
  const gzipped = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    gzipped[i] = binaryString.charCodeAt(i)
  }

  onProgress?.("Extracting files...")

  // Decompress gzip
  const tarData = gunzipSync(gzipped)

  // Parse tar archive
  const files = extractTar(tarData)

  onProgress?.(`Mounting ${files.length} files...`)

  // Convert to FileSystemTree and mount
  const tree = tarFilesToFileSystemTree(files)
  await container.mount(tree)

  onProgress?.("Done!")
}

interface TarFile {
  path: string
  content: Uint8Array
  isDirectory: boolean
}

/**
 * Extract files from a tar archive using manual tar parsing
 * Tar format: 512-byte header blocks followed by file content
 */
function extractTar(tarData: Uint8Array): TarFile[] {
  const files: TarFile[] = []
  let rootPrefix = ""
  let offset = 0

  while (offset < tarData.length) {
    // Read 512-byte header
    const header = tarData.slice(offset, offset + 512)

    // Check for end of archive (two zero blocks)
    if (header.every((b) => b === 0)) {
      break
    }

    // Extract file name (bytes 0-99)
    const nameBytes = header.slice(0, 100)
    const nameEnd = nameBytes.indexOf(0)
    const name = new TextDecoder().decode(nameEnd === -1 ? nameBytes : nameBytes.slice(0, nameEnd))

    // Extract file size (bytes 124-135, octal string)
    const sizeBytes = header.slice(124, 136)
    const sizeEnd = sizeBytes.indexOf(0)
    const sizeStr = new TextDecoder().decode(sizeEnd === -1 ? sizeBytes : sizeBytes.slice(0, sizeEnd)).trim()
    const size = parseInt(sizeStr, 8) || 0

    // Extract type flag (byte 156)
    const typeFlag = header[156]
    const isDirectory = typeFlag === 53 || name.endsWith("/") // 53 = '5' = directory

    offset += 512 // Move past header

    // Read file content (rounded up to 512-byte blocks)
    const content = size > 0 ? tarData.slice(offset, offset + size) : new Uint8Array(0)
    const paddedSize = Math.ceil(size / 512) * 512
    offset += paddedSize

    // Skip empty names
    if (!name) continue

    // Detect and strip root prefix (GitHub tarballs have "owner-repo-hash/")
    if (!rootPrefix && name.includes("/")) {
      rootPrefix = name.split("/")[0] + "/"
    }

    const relativePath = name.startsWith(rootPrefix) ? name.slice(rootPrefix.length) : name

    // Skip empty paths and root directory
    if (!relativePath || relativePath === "/" || relativePath === "./") continue

    files.push({
      path: relativePath.replace(/\/$/, ""),
      content,
      isDirectory,
    })
  }

  return files
}

/**
 * Convert extracted tar files to WebContainer FileSystemTree format
 */
function tarFilesToFileSystemTree(files: TarFile[]): FileSystemTree {
  const tree: FileSystemTree = {}

  // Sort files so directories come before their contents
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sortedFiles) {
    const parts = file.path.split("/").filter(Boolean)
    if (parts.length === 0) continue

    let current = tree

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLastPart = i === parts.length - 1

      if (isLastPart) {
        if (file.isDirectory) {
          if (!current[part]) {
            current[part] = { directory: {} }
          }
        } else {
          // Try to decode as UTF-8 text, fallback to binary representation
          let content: string
          try {
            content = new TextDecoder("utf-8", { fatal: true }).decode(file.content)
          } catch {
            // Binary file - store as base64 or skip
            console.warn(`Skipping binary file: ${file.path}`)
            continue
          }
          current[part] = { file: { contents: content } }
        }
      } else {
        if (!current[part]) {
          current[part] = { directory: {} }
        }
        const node = current[part]
        if ("directory" in node) {
          current = node.directory
        }
      }
    }
  }

  return tree
}
