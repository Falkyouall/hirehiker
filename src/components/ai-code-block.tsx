import { useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Copy, FileCode } from "lucide-react"

interface CodeBlockWithApplyProps {
  code: string
  filepath: string
  language: string
  onApply?: (filepath: string, code: string) => void
}

function CodeBlockWithApply({
  code,
  filepath,
  language,
  onApply,
}: CodeBlockWithApplyProps) {
  const [applied, setApplied] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleApply = () => {
    if (onApply) {
      onApply(filepath, code)
      setApplied(true)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
      {/* Header with filepath */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <FileCode className="w-3.5 h-3.5" />
          <span className="font-mono">{filepath}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </>
            )}
          </Button>
          {onApply && (
            <Button
              size="sm"
              variant={applied ? "ghost" : "default"}
              className={cn(
                "h-7 px-2 text-xs",
                applied && "text-green-500 hover:text-green-400"
              )}
              onClick={handleApply}
              disabled={applied}
            >
              {applied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Applied
                </>
              ) : (
                <>Apply to {filepath}</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8125rem",
          lineHeight: "1.5",
          maxHeight: "400px",
          overflow: "auto",
        }}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "#6b7280",
          userSelect: "none",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

interface ParsedCodeBlock {
  type: "code"
  language: string
  filepath: string | null
  code: string
}

interface ParsedText {
  type: "text"
  content: string
}

type ParsedContent = ParsedCodeBlock | ParsedText

/**
 * Parse markdown content to extract code blocks with filepath comments
 * Supports multiple formats:
 *
 * Format 1 - filepath comment inside code block:
 * ```typescript
 * // filepath: src/api/user.ts
 * code here...
 * ```
 *
 * Format 2 - filepath on line before code block:
 * src/api/user.ts
 * ```typescript
 * code here...
 * ```
 *
 * Format 3 - filepath in backticks before code block:
 * `src/api/user.ts`
 * ```typescript
 * code here...
 * ```
 *
 * Format 4 - filepath in bold before code block:
 * **src/api/user.ts**
 * ```typescript
 * code here...
 * ```
 */
function parseCodeBlocks(markdown: string): ParsedContent[] {
  const result: ParsedContent[] = []
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  // Filepath comment inside code block
  const filepathCommentRegex = /^\/\/\s*filepath:\s*(.+)\n/
  // Filepath patterns that appear before code blocks (on a line by itself)
  // Matches: path/to/file.ext, `path/to/file.ext`, **path/to/file.ext**, or just filename.ext
  const filepathBeforeBlockRegex = /(?:^|\n)(?:\*\*)?`?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)`?(?:\*\*)?\s*\n$/

  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    // Get text before code block
    const textBefore = markdown.slice(lastIndex, match.index)

    const language = match[1] || "plaintext"
    let code = match[2]
    let filepath: string | null = null

    // First, check for filepath comment at the start of the code
    const filepathCommentMatch = code.match(filepathCommentRegex)
    if (filepathCommentMatch) {
      filepath = filepathCommentMatch[1].trim()
      // Remove the filepath comment from the code
      code = code.replace(filepathCommentRegex, "")
    }

    // If no filepath found inside, check for filepath before the code block
    if (!filepath && textBefore) {
      const filepathBeforeMatch = textBefore.match(filepathBeforeBlockRegex)
      if (filepathBeforeMatch) {
        filepath = filepathBeforeMatch[1].trim()
        // Remove the filepath line from the text content
        const textWithoutFilepath = textBefore.replace(filepathBeforeBlockRegex, "\n")
        if (textWithoutFilepath.trim()) {
          result.push({ type: "text", content: textWithoutFilepath })
        }
      } else if (textBefore.trim()) {
        result.push({ type: "text", content: textBefore })
      }
    } else if (textBefore.trim()) {
      result.push({ type: "text", content: textBefore })
    }

    result.push({
      type: "code",
      language,
      filepath,
      code: code.trim(),
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last code block
  if (lastIndex < markdown.length) {
    const textContent = markdown.slice(lastIndex)
    if (textContent.trim()) {
      result.push({ type: "text", content: textContent })
    }
  }

  return result
}

interface AIMessageContentProps {
  content: string
  onApplyCode?: (filepath: string, code: string) => void
  className?: string
}

export function AIMessageContent({
  content,
  onApplyCode,
  className,
}: AIMessageContentProps) {
  const parsedContent = useMemo(() => parseCodeBlocks(content), [content])

  // If there are no code blocks with filepaths, render as normal markdown
  const hasApplyableBlocks = parsedContent.some(
    (block) => block.type === "code" && block.filepath
  )

  if (!hasApplyableBlocks) {
    return (
      <div className={cn("prose prose-sm max-w-none", className)}>
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "")
              const isInline = !match

              if (isInline) {
                return (
                  <code
                    className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                )
              }

              return (
                <div className="my-3">
                  <SyntaxHighlighter
                    language={match[1]}
                    style={oneDark}
                    showLineNumbers
                    customStyle={{
                      margin: 0,
                      borderRadius: "0.5rem",
                      fontSize: "0.8125rem",
                      lineHeight: "1.5",
                      maxHeight: "400px",
                      overflow: "auto",
                    }}
                    lineNumberStyle={{
                      minWidth: "2.5em",
                      paddingRight: "1em",
                      color: "#6b7280",
                      userSelect: "none",
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              )
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  // Render with custom code blocks that have Apply buttons
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      {parsedContent.map((block, index) => {
        if (block.type === "text") {
          return (
            <ReactMarkdown key={index}>{block.content}</ReactMarkdown>
          )
        }

        if (block.filepath) {
          return (
            <CodeBlockWithApply
              key={index}
              code={block.code}
              filepath={block.filepath}
              language={block.language}
              onApply={onApplyCode}
            />
          )
        }

        // Code block without filepath - render normally
        return (
          <div key={index} className="my-3">
            <SyntaxHighlighter
              language={block.language}
              style={oneDark}
              showLineNumbers
              customStyle={{
                margin: 0,
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                lineHeight: "1.5",
                maxHeight: "400px",
                overflow: "auto",
              }}
              lineNumberStyle={{
                minWidth: "2.5em",
                paddingRight: "1em",
                color: "#6b7280",
                userSelect: "none",
              }}
            >
              {block.code}
            </SyntaxHighlighter>
          </div>
        )
      })}
    </div>
  )
}

export { CodeBlockWithApply, parseCodeBlocks }
