import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export const Route = createFileRoute('/candidate/$sessionId_/complete')({
  component: SessionCompletePage,
})

function SessionCompletePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle>Task Completed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-600">
            Thank you for completing the assessment. Your conversation has been recorded for review.
          </p>
          <p className="text-sm text-zinc-500">
            The recruiter will review your session and get back to you soon.
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
