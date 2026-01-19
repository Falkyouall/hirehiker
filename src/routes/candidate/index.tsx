import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/candidate/')({
  component: CandidateEntryPage,
})

function CandidateEntryPage() {
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionId.trim()) {
      setError('Please enter a session code')
      return
    }
    navigate({ to: '/candidate/$sessionId', params: { sessionId: sessionId.trim() } })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-zinc-600 hover:text-zinc-900 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Enter Session</CardTitle>
            <CardDescription>
              Enter the session code provided by your recruiter to start the assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Session code (e.g., abc123-def456)"
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId(e.target.value)
                    setError('')
                  }}
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <Button type="submit" className="w-full">
                Start Session
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
