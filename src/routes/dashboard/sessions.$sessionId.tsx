import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getSessionWithMessages } from '@/server/functions/sessions'
import { generateAnalysis } from '@/server/functions/analysis'
import { DEFAULT_EVALUATION_SETTINGS } from '@/lib/evaluation-config'

export const Route = createFileRoute('/dashboard/sessions/$sessionId')({
  component: SessionReviewPage,
  loader: async ({ params }) => {
    const session = await getSessionWithMessages({ data: { id: params.sessionId } })
    if (!session) {
      throw new Error('Session not found')
    }
    return { session }
  },
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Session Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600 mb-4">
            The session you're looking for doesn't exist.
          </p>
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  ),
})

function SessionReviewPage() {
  const { session: initialSession } = Route.useLoaderData()
  const [session, setSession] = useState(initialSession)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const analysis = await generateAnalysis({ data: { sessionId: session.id } })
      if (analysis) {
        setSession({ ...session, analysis })
      }
    } catch (error) {
      console.error('Failed to generate analysis:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const statusColors = {
    pending: 'secondary',
    active: 'warning',
    completed: 'success',
  } as const

  const difficultyColors = {
    easy: 'success',
    medium: 'warning',
    hard: 'destructive',
  } as const

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    if (score >= 4) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100'
    if (score >= 6) return 'bg-yellow-100'
    if (score >= 4) return 'bg-orange-100'
    return 'bg-red-100'
  }

  // Get evaluation settings (from session or defaults)
  const evalSettings = (session as any).evaluationSettings || DEFAULT_EVALUATION_SETTINGS

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-zinc-900">
                  {session.candidateName}
                </h1>
                <Badge variant={statusColors[session.status]}>{session.status}</Badge>
              </div>
              <p className="text-sm text-zinc-500">{session.candidateEmail}</p>
            </div>
          </div>
          {session.status === 'completed' && !session.analysis && (
            <Button onClick={handleGenerateAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Analysis
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Problem</CardTitle>
                  {session.problem?.difficulty && (
                    <Badge variant={difficultyColors[session.problem.difficulty]}>
                      {session.problem.difficulty}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">{session.problem?.title}</h3>
                <div className="prose prose-sm prose-zinc max-w-none">
                  <ReactMarkdown>{session.problem?.description || ''}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Chat History */}
            <Card>
              <CardHeader>
                <CardTitle>Chat History ({session.messages.length} messages)</CardTitle>
              </CardHeader>
              <CardContent>
                {session.messages.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No messages yet</p>
                ) : (
                  <div className="space-y-4">
                    {session.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-zinc-100 ml-8'
                            : 'bg-white border border-zinc-200 mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-medium uppercase ${
                              message.role === 'user' ? 'text-zinc-600' : 'text-blue-600'
                            }`}
                          >
                            {message.role === 'user' ? 'Candidate' : 'AI Assistant'}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="prose prose-sm prose-zinc max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle>Session Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-zinc-500">Session ID</span>
                  <p className="font-mono text-sm">{session.id}</p>
                </div>
                <div>
                  <span className="text-sm text-zinc-500">Created</span>
                  <p className="text-sm">
                    {new Date(session.createdAt).toLocaleString()}
                  </p>
                </div>
                {session.startedAt && (
                  <div>
                    <span className="text-sm text-zinc-500">Started</span>
                    <p className="text-sm">
                      {new Date(session.startedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {session.completedAt && (
                  <div>
                    <span className="text-sm text-zinc-500">Completed</span>
                    <p className="text-sm">
                      {new Date(session.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis */}
            {session.analysis ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>AI Analysis</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateAnalysis}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Regenerate'
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Score */}
                  <div className="text-center py-4 border-b border-zinc-200">
                    <div
                      className={`text-4xl font-bold ${getScoreColor(session.analysis.qualityScore)}`}
                    >
                      {session.analysis.qualityScore}/10
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Question Quality Score</p>
                  </div>

                  {/* Stats */}
                  <div className="text-center pb-4 border-b border-zinc-200">
                    <div className="text-2xl font-semibold text-zinc-900">
                      {session.analysis.questionCount}
                    </div>
                    <p className="text-sm text-zinc-500">Questions Asked</p>
                  </div>

                  {/* Dimension Scores */}
                  {session.analysis.dimensionScores && Object.keys(session.analysis.dimensionScores).length > 0 && (
                    <div className="pb-4 border-b border-zinc-200">
                      <h4 className="text-sm font-medium text-zinc-700 mb-3">Dimension Scores</h4>
                      <div className="space-y-2">
                        {evalSettings.dimensions.map((dim: any) => {
                          const score = session.analysis.dimensionScores[dim.id]
                          if (score === undefined) return null
                          return (
                            <div key={dim.id} className="flex items-center justify-between">
                              <span className="text-sm text-zinc-600">{dim.name}</span>
                              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${getScoreBgColor(score)} ${getScoreColor(score)}`}>
                                {score}/10
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 mb-2">Summary</h4>
                    <p className="text-sm text-zinc-600">{session.analysis.summary}</p>
                  </div>

                  {/* Strengths */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {session.analysis.strengths.map((strength, i) => (
                        <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-orange-600" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-1">
                      {session.analysis.improvements.map((improvement, i) => (
                        <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : session.status === 'completed' ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Sparkles className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                  <p className="text-zinc-500 mb-4">
                    Generate an AI analysis of this candidate's questioning approach
                  </p>
                  <Button onClick={handleGenerateAnalysis} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Generate Analysis'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-zinc-500">
                    Analysis will be available after the session is completed
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
