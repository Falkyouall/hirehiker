import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, ClipboardList } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">HireHiker</h1>
        <p className="text-xl text-zinc-600 max-w-2xl">
          Question Over Answer - Evaluate developers by the quality of questions they ask, not just the answers they give.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-zinc-700" />
            </div>
            <CardTitle>I'm a Candidate</CardTitle>
            <CardDescription>
              Enter your session code to start solving a programming problem with AI assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/candidate">
              <Button className="w-full">Enter Session</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-4">
              <ClipboardList className="w-6 h-6 text-zinc-700" />
            </div>
            <CardTitle>I'm a Recruiter</CardTitle>
            <CardDescription>
              Create sessions, manage problems, and review candidate performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard">
              <Button variant="outline" className="w-full">Open Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
