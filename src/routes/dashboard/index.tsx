import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, ArrowLeft, Eye, Copy, Check, ChevronDown, ChevronRight, Trash2, RotateCcw } from 'lucide-react'
import { getSessions, createSession, deleteSession } from '@/server/functions/sessions'
import { getProblems } from '@/server/functions/problems'
import { DEFAULT_EVALUATION_SETTINGS, type EvaluationSettings, type EvaluationDimension } from '@/lib/evaluation-config'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
  loader: async () => {
    const [sessions, problems] = await Promise.all([
      getSessions(),
      getProblems(),
    ])
    return { sessions, problems }
  },
})

function DashboardPage() {
  const { sessions: initialSessions, problems } = Route.useLoaderData()
  const [sessions, setSessions] = useState(initialSessions)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSession, setNewSession] = useState({
    candidateName: '',
    candidateEmail: '',
    problemId: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showEvalSettings, setShowEvalSettings] = useState(false)
  const [evalSettings, setEvalSettings] = useState<EvaluationSettings>(
    JSON.parse(JSON.stringify(DEFAULT_EVALUATION_SETTINGS))
  )
  const [useCustomSettings, setUseCustomSettings] = useState(false)

  const handleCreateSession = async () => {
    if (!newSession.candidateName || !newSession.candidateEmail || !newSession.problemId) {
      return
    }

    setIsCreating(true)
    try {
      const sessionData = {
        ...newSession,
        evaluationSettings: useCustomSettings ? evalSettings : null,
      }
      const created = await createSession({ data: sessionData })
      if (created) {
        const problem = problems.find(p => p.id === newSession.problemId)
        setSessions([
          {
            ...created,
            problem: problem ? {
              id: problem.id,
              title: problem.title,
              difficulty: problem.difficulty,
            } : null,
          },
          ...sessions,
        ])
        setShowCreateModal(false)
        setNewSession({ candidateName: '', candidateEmail: '', problemId: '' })
        setUseCustomSettings(false)
        setShowEvalSettings(false)
        setEvalSettings(JSON.parse(JSON.stringify(DEFAULT_EVALUATION_SETTINGS)))
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const updateDimension = (index: number, field: keyof EvaluationDimension, value: string | number) => {
    const newDimensions = [...evalSettings.dimensions]
    newDimensions[index] = { ...newDimensions[index], [field]: value }
    setEvalSettings({ ...evalSettings, dimensions: newDimensions })
    setUseCustomSettings(true)
  }

  const removeDimension = (index: number) => {
    const newDimensions = evalSettings.dimensions.filter((_, i) => i !== index)
    setEvalSettings({ ...evalSettings, dimensions: newDimensions })
    setUseCustomSettings(true)
  }

  const addDimension = () => {
    const newDimension: EvaluationDimension = {
      id: `custom_${Date.now()}`,
      name: 'New Dimension',
      weight: 10,
      description: 'Description of this evaluation dimension',
    }
    setEvalSettings({
      ...evalSettings,
      dimensions: [...evalSettings.dimensions, newDimension],
    })
    setUseCustomSettings(true)
  }

  const updateFlag = (type: 'redFlags' | 'greenFlags', index: number, value: string) => {
    const newFlags = [...evalSettings[type]]
    newFlags[index] = value
    setEvalSettings({ ...evalSettings, [type]: newFlags })
    setUseCustomSettings(true)
  }

  const removeFlag = (type: 'redFlags' | 'greenFlags', index: number) => {
    const newFlags = evalSettings[type].filter((_, i) => i !== index)
    setEvalSettings({ ...evalSettings, [type]: newFlags })
    setUseCustomSettings(true)
  }

  const addFlag = (type: 'redFlags' | 'greenFlags') => {
    setEvalSettings({
      ...evalSettings,
      [type]: [...evalSettings[type], ''],
    })
    setUseCustomSettings(true)
  }

  const resetToDefaults = () => {
    setEvalSettings(JSON.parse(JSON.stringify(DEFAULT_EVALUATION_SETTINGS)))
    setUseCustomSettings(false)
  }

  const totalWeight = evalSettings.dimensions.reduce((sum, d) => sum + d.weight, 0)

  const copySessionId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDeleteSession = async (id: string, candidateName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the session for "${candidateName}"? This will permanently delete all messages and analysis data.`
    )
    if (!confirmed) return

    try {
      await deleteSession({ data: { id } })
      setSessions(sessions.filter(s => s.id !== id))
    } catch (error) {
      console.error('Failed to delete session:', error)
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

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
              <p className="text-sm text-zinc-500">Manage sessions and review candidates</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/problems">
              <Button variant="outline">Problems Library</Button>
            </Link>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-zinc-500 mb-4">No sessions yet</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-zinc-900">
                          {session.candidateName}
                        </h3>
                        <Badge variant={statusColors[session.status]}>
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-500 mb-2">
                        {session.candidateEmail}
                      </p>
                      {session.problem && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-600">
                            Problem: {session.problem.title}
                          </span>
                          <Badge variant={difficultyColors[session.problem.difficulty]} className="text-xs">
                            {session.problem.difficulty}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copySessionId(session.id)}
                      >
                        {copiedId === session.id ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : (
                          <Copy className="w-4 h-4 mr-1" />
                        )}
                        {copiedId === session.id ? 'Copied!' : 'Copy ID'}
                      </Button>
                      <Link to="/dashboard/sessions/$sessionId" params={{ sessionId: session.id }}>
                        <Button size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id, session.candidateName)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader>
              <CardTitle>Create New Session</CardTitle>
              <CardDescription>
                Set up a new assessment session for a candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Candidate Name
                </label>
                <Input
                  placeholder="John Doe"
                  value={newSession.candidateName}
                  onChange={(e) =>
                    setNewSession({ ...newSession, candidateName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Candidate Email
                </label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newSession.candidateEmail}
                  onChange={(e) =>
                    setNewSession({ ...newSession, candidateEmail: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Problem
                </label>
                <select
                  className="w-full h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                  value={newSession.problemId}
                  onChange={(e) =>
                    setNewSession({ ...newSession, problemId: e.target.value })
                  }
                >
                  <option value="">Select a problem...</option>
                  {problems.map((problem) => (
                    <option key={problem.id} value={problem.id}>
                      {problem.title} ({problem.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Evaluation Settings Section */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowEvalSettings(!showEvalSettings)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-zinc-900">Evaluation Settings</span>
                    <span className="text-sm text-zinc-500 ml-2">
                      {useCustomSettings ? '(Customized)' : '(Using defaults)'}
                    </span>
                  </div>
                  {showEvalSettings ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {showEvalSettings && (
                  <div className="px-4 pb-4 space-y-4 border-t">
                    {/* Dimensions */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-zinc-700">
                          Evaluation Dimensions
                        </label>
                        <span className={`text-sm ${totalWeight === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                          Total: {totalWeight}% {totalWeight !== 100 && '(should be 100%)'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {evalSettings.dimensions.map((dim, i) => (
                          <div key={dim.id} className="flex gap-2 items-start p-3 bg-zinc-50 rounded-lg">
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Dimension name"
                                value={dim.name}
                                onChange={(e) => updateDimension(i, 'name', e.target.value)}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Description"
                                value={dim.description}
                                onChange={(e) => updateDimension(i, 'description', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div className="w-20">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={dim.weight}
                                onChange={(e) => updateDimension(i, 'weight', parseInt(e.target.value) || 0)}
                                className="text-sm text-center"
                              />
                              <span className="text-xs text-zinc-500 block text-center">weight %</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDimension(i)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addDimension}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Dimension
                      </Button>
                    </div>

                    {/* Red Flags */}
                    <div>
                      <label className="text-sm font-medium text-zinc-700 mb-2 block">
                        Red Flags (negative indicators)
                      </label>
                      <div className="space-y-2">
                        {evalSettings.redFlags.map((flag, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              placeholder="Red flag description"
                              value={flag}
                              onChange={(e) => updateFlag('redFlags', i, e.target.value)}
                              className="text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFlag('redFlags', i)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addFlag('redFlags')}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Red Flag
                      </Button>
                    </div>

                    {/* Green Flags */}
                    <div>
                      <label className="text-sm font-medium text-zinc-700 mb-2 block">
                        Green Flags (positive indicators)
                      </label>
                      <div className="space-y-2">
                        {evalSettings.greenFlags.map((flag, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              placeholder="Green flag description"
                              value={flag}
                              onChange={(e) => updateFlag('greenFlags', i, e.target.value)}
                              className="text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFlag('greenFlags', i)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addFlag('greenFlags')}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Green Flag
                      </Button>
                    </div>

                    {/* Reset to Defaults */}
                    {useCustomSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetToDefaults}
                        className="w-full"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset to Defaults
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEvalSettings(false)
                    setUseCustomSettings(false)
                    setEvalSettings(JSON.parse(JSON.stringify(DEFAULT_EVALUATION_SETTINGS)))
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSession}
                  disabled={
                    !newSession.candidateName ||
                    !newSession.candidateEmail ||
                    !newSession.problemId ||
                    isCreating
                  }
                >
                  {isCreating ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
