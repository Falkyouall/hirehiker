import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { WebContainerEditor, type WebContainerEditorRef } from '@/components/webcontainer-editor'
import { AIMessageContent } from '@/components/ai-code-block'
import { SwaggerViewer } from '@/components/swagger-viewer'
import { Send, CheckCircle, Loader2, Bug, FileJson, FileText, Code2 } from 'lucide-react'
import { getSession, startSession, completeSession } from '@/server/functions/sessions'
import { getMessages, sendMessage } from '@/server/functions/messages'
import type { ProjectFile, SwaggerSpec, BugTicket } from '@/db/schema'

export const Route = createFileRoute('/candidate/$sessionId')({
  component: CandidateSessionPage,
  loader: async ({ params }) => {
    const session = await getSession({ data: { id: params.sessionId } })
    if (!session) {
      throw new Error('Session not found')
    }
    const messages = await getMessages({ data: { sessionId: params.sessionId } })
    return { session, messages }
  },
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Session Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600 mb-4">
            The session code you entered doesn't exist or has expired.
          </p>
          <a href="/candidate" className="text-blue-600 hover:underline">
            Try another code
          </a>
        </CardContent>
      </Card>
    </div>
  ),
})

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

function BugTicketCollapsible({ ticket }: { ticket: BugTicket }) {
  return (
    <Collapsible className="border-red-200 bg-red-50/30">
      <CollapsibleTrigger>
        <Bug className="w-4 h-4 text-red-500" />
        <span className="font-mono text-sm text-zinc-500">{ticket.id}</span>
        <span className="text-zinc-700">{ticket.title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 space-y-3">
          <p className="text-sm text-zinc-700">{ticket.description}</p>
          {ticket.relatedFiles && ticket.relatedFiles.length > 0 && (
            <div className="text-xs text-zinc-500">
              <span className="font-medium">Relevante Dateien:</span>{' '}
              {ticket.relatedFiles.join(', ')}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ResizeHandle({ onDrag }: { onDrag: (deltaPercent: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    startWidthRef.current = containerRef.current?.parentElement?.clientWidth || window.innerWidth

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current
      const deltaPercent = (deltaX / startWidthRef.current) * 100
      startXRef.current = e.clientX
      onDrag(deltaPercent)
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      ref={containerRef}
      className="w-1 bg-zinc-200 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
      onMouseDown={handleMouseDown}
    />
  )
}

function CandidateSessionPage() {
  const { session: initialSession, messages: initialMessages } = Route.useLoaderData()
  const navigate = useNavigate()
  const [session, setSession] = useState(initialSession)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [swaggerOpen, setSwaggerOpen] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(true)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<WebContainerEditorRef>(null)

  // Get problem data
  const bugTickets = (session.problem?.bugTickets as BugTicket[]) || []
  const projectFiles = (session.problem?.projectFiles as ProjectFile[]) || []
  const swaggerSpec = session.problem?.swaggerSpec as SwaggerSpec | undefined
  // Cast to access githubRepoUrl (added to schema but type inference may not be updated)
  const problem = session.problem as typeof session.problem & { githubRepoUrl?: string | null }
  const githubRepoUrl = problem?.githubRepoUrl || undefined

  // Check if we should use WebContainer (has either projectFiles or githubRepoUrl)
  const useWebContainer = projectFiles.length > 0 || !!githubRepoUrl

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Start session if it's pending
    if (session.status === 'pending') {
      startSession({ data: { id: session.id } }).then((updated) => {
        if (updated) {
          setSession({ ...session, status: updated.status, startedAt: updated.startedAt })
        }
      })
    }
  }, [session.id, session.status])

  // Callback for applying AI code changes to the editor
  const handleApplyCode = useCallback((filepath: string, code: string) => {
    editorRef.current?.applyCodeChange(filepath, code)
  }, [])

  // Handler for resizing panels with constraints (25-75%)
  const handlePanelResize = useCallback((deltaPercent: number) => {
    setLeftPanelWidth(prev => Math.max(25, Math.min(75, prev + deltaPercent)))
  }, [])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userInput = input.trim()
    setInput('')
    setIsLoading(true)

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userInput,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      // Get files and file tree from WebContainer if available
      let projectFilesData: Record<string, string> | undefined
      let fileTree: string[] | undefined

      if (editorRef.current && editorReady) {
        const [files, tree] = await Promise.all([
          editorRef.current.getAllFiles(),
          editorRef.current.getFileTree(),
        ])
        projectFilesData = files
        fileTree = tree
      }

      const result = await sendMessage({
        data: {
          sessionId: session.id,
          content: userInput,
          projectFiles: projectFilesData,
          fileTree: fileTree,
        },
      })

      // Replace temp message with actual messages
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id)
        return [
          ...filtered,
          result.userMessage as Message,
          result.assistantMessage as Message,
        ]
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCompleteTask = async () => {
    const confirmed = window.confirm(
      'Bist du sicher, dass du die Aufgabe abschließen möchtest? Du kannst danach keine weiteren Nachrichten mehr senden.'
    )
    if (!confirmed) return

    setIsLoading(true)
    try {
      await completeSession({ data: { id: session.id } })
      navigate({ to: '/candidate/$sessionId/complete', params: { sessionId: session.id } })
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Session abgeschlossen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600">
              Diese Session wurde bereits abgeschlossen. Vielen Dank für deine Teilnahme!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if we have the new bug ticket format
  const hasBugTickets = bugTickets.length > 0

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              {session.problem?.title || 'Loading...'}
            </h1>
            <p className="text-sm text-zinc-500">
              Willkommen, {session.candidateName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {session.problem?.difficulty && (
              <Badge variant={session.problem.difficulty === 'easy' ? 'success' : session.problem.difficulty === 'hard' ? 'destructive' : 'warning'}>
                {session.problem.difficulty}
              </Badge>
            )}
            <Button onClick={handleCompleteTask} disabled={isLoading}>Abschließen</Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Code Editor or Bug tickets */}
        <div style={{ width: `${leftPanelWidth}%` }} className="border-r border-zinc-200 flex flex-col bg-white flex-shrink-0">
          {/* Top section - Bug tickets and context */}
          <div className="flex-shrink-0 max-h-[40%] overflow-y-auto border-b border-zinc-200">
            {hasBugTickets ? (
              <div className="space-y-0">
                {/* Collapsible Aufgabenstellung */}
                <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
                  <CollapsibleTrigger>
                    <FileText className="w-4 h-4" />
                    Aufgabenstellung
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 prose prose-sm prose-zinc max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: session.problem?.description || '' }} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Bug Tickets */}
                {bugTickets.map((ticket) => (
                  <BugTicketCollapsible key={ticket.id} ticket={ticket} />
                ))}

                {/* Collapsible API Dokumentation */}
                {swaggerSpec && (
                  <Collapsible open={swaggerOpen} onOpenChange={setSwaggerOpen}>
                    <CollapsibleTrigger>
                      <FileJson className="w-4 h-4" />
                      API Dokumentation ({swaggerSpec.endpoints.length} Endpoints)
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="max-h-[300px] overflow-auto">
                        <SwaggerViewer spec={swaggerSpec} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ) : (
              // Fallback to old layout for problems without bug tickets
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Problem Description</h2>
                <div className="prose prose-zinc max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: session.problem?.description || '' }} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom section - Code Editor */}
          {useWebContainer ? (
            <div className="flex-1 min-h-0">
              <WebContainerEditor
                ref={editorRef}
                projectFiles={projectFiles}
                githubRepoUrl={githubRepoUrl}
                onReady={() => setEditorReady(true)}
                className="h-full"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <Code2 className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                <p>No code editor available for this problem</p>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <ResizeHandle onDrag={handlePanelResize} />

        {/* Right panel - Chat */}
        <div style={{ width: `${100 - leftPanelWidth}%` }} className="flex flex-col bg-zinc-50 flex-shrink-0">
          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-zinc-500 mt-8">
                <p className="mb-2">Stelle Fragen, um die Bugs zu untersuchen.</p>
                <p className="text-sm">
                  Denke daran: Es geht um die Qualität deiner Fragen, nicht um eine perfekte Lösung.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <AIMessageContent
                      content={message.content}
                      onApplyCode={editorReady ? handleApplyCode : undefined}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none prose-invert">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-zinc-200 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-200 bg-white">
            <div className="flex gap-2">
              <Textarea
                placeholder="Stelle eine Frage..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-auto"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
