import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getProblems, createProblem } from '@/server/functions/problems'
import type { Problem } from '@/db/schema'

export const Route = createFileRoute('/dashboard/problems/')({
  component: ProblemsPage,
  loader: async () => {
    const problems = await getProblems()
    return { problems }
  },
})

function ProblemsPage() {
  const { problems: initialProblems } = Route.useLoaderData()
  const [problems, setProblems] = useState<Problem[]>(initialProblems)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreview, setShowPreview] = useState<Problem | null>(null)
  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: 'javascript-basics',
  })
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateProblem = async () => {
    if (!newProblem.title || !newProblem.description) {
      return
    }

    setIsCreating(true)
    try {
      const created = await createProblem({ data: newProblem })
      if (created) {
        setProblems([...problems, created])
        setShowCreateModal(false)
        setNewProblem({
          title: '',
          description: '',
          difficulty: 'medium',
          category: 'javascript-basics',
        })
      }
    } catch (error) {
      console.error('Failed to create problem:', error)
    } finally {
      setIsCreating(false)
    }
  }

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
            <Link to="/dashboard" className="text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Problems Library</h1>
              <p className="text-sm text-zinc-500">Manage programming problems for assessments</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Problem
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid gap-4">
          {problems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500 mb-4">No problems yet</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Problem
                </Button>
              </CardContent>
            </Card>
          ) : (
            problems.map((problem) => (
              <Card
                key={problem.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setShowPreview(problem)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-zinc-900">{problem.title}</h3>
                        <Badge variant={difficultyColors[problem.difficulty]}>
                          {problem.difficulty}
                        </Badge>
                        <Badge variant="outline">{problem.category}</Badge>
                      </div>
                      <p className="text-sm text-zinc-500 line-clamp-2">
                        {problem.description.slice(0, 150)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Create Problem Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader>
              <CardTitle>Add New Problem</CardTitle>
              <CardDescription>
                Create a new programming problem for candidate assessments. Use Markdown for formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Title
                </label>
                <Input
                  placeholder="e.g., Array Manipulation Challenge"
                  value={newProblem.title}
                  onChange={(e) =>
                    setNewProblem({ ...newProblem, title: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                    value={newProblem.difficulty}
                    onChange={(e) =>
                      setNewProblem({
                        ...newProblem,
                        difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                      })
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Category
                  </label>
                  <Input
                    placeholder="e.g., javascript-basics"
                    value={newProblem.category}
                    onChange={(e) =>
                      setNewProblem({ ...newProblem, category: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Description (Markdown)
                </label>
                <Textarea
                  placeholder="Describe the problem in detail. You can use Markdown formatting..."
                  value={newProblem.description}
                  onChange={(e) =>
                    setNewProblem({ ...newProblem, description: e.target.value })
                  }
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProblem}
                  disabled={!newProblem.title || !newProblem.description || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Problem'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Problem Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto"
          onClick={() => setShowPreview(null)}
        >
          <Card className="w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>{showPreview.title}</CardTitle>
                  <Badge variant={difficultyColors[showPreview.difficulty]}>
                    {showPreview.difficulty}
                  </Badge>
                </div>
                <Badge variant="outline">{showPreview.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-zinc max-w-none">
                <ReactMarkdown>{showPreview.description}</ReactMarkdown>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end">
                <Button variant="outline" onClick={() => setShowPreview(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
