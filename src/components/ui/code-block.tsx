import * as React from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  className?: string
  maxHeight?: string
}

const languageMap: Record<string, string> = {
  typescript: "typescript",
  ts: "typescript",
  tsx: "tsx",
  javascript: "javascript",
  js: "javascript",
  jsx: "jsx",
  css: "css",
  json: "json",
  html: "html",
  markdown: "markdown",
  md: "markdown",
}

function CodeBlock({
  code,
  language = "typescript",
  showLineNumbers = true,
  className,
  maxHeight = "400px"
}: CodeBlockProps) {
  const mappedLanguage = languageMap[language.toLowerCase()] || language

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      <SyntaxHighlighter
        language={mappedLanguage}
        style={oneDark}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.8125rem",
          lineHeight: "1.5",
          maxHeight,
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

export { CodeBlock }
