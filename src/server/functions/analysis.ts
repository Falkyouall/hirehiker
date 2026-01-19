import { createServerFn } from "@tanstack/react-start"
import { db } from "@/lib/db"
import { analyses, sessions, problems, messages } from "@/db/schema"
import { eq } from "drizzle-orm"
import { analyzeSession as analyzeSessionFn } from "@/lib/analysis"

export const getAnalysis = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(analyses)
      .where(eq(analyses.sessionId, data.sessionId))
    return result[0] || null
  })

export const generateAnalysis = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    // Get session with problem and evaluation settings
    const sessionResult = await db
      .select({
        id: sessions.id,
        problemDescription: problems.description,
        evaluationSettings: sessions.evaluationSettings,
      })
      .from(sessions)
      .leftJoin(problems, eq(sessions.problemId, problems.id))
      .where(eq(sessions.id, data.sessionId))

    if (!sessionResult[0]?.problemDescription) {
      throw new Error("Session or problem not found")
    }

    // Get all messages
    const sessionMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, data.sessionId))
      .orderBy(messages.createdAt)

    // Generate analysis with session's evaluation settings
    const chatMessages = sessionMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    const analysisResult = await analyzeSessionFn(
      sessionResult[0].problemDescription,
      chatMessages,
      sessionResult[0].evaluationSettings
    )

    // Round quality score to integer (database column is integer type)
    const qualityScore = Math.round(analysisResult.qualityScore)

    // Check if analysis already exists
    const existingAnalysis = await db
      .select()
      .from(analyses)
      .where(eq(analyses.sessionId, data.sessionId))

    if (existingAnalysis[0]) {
      // Update existing
      const updated = await db
        .update(analyses)
        .set({
          summary: analysisResult.summary,
          questionCount: analysisResult.questionCount,
          qualityScore,
          dimensionScores: analysisResult.dimensionScores,
          strengths: analysisResult.strengths,
          improvements: analysisResult.improvements,
        })
        .where(eq(analyses.sessionId, data.sessionId))
        .returning()
      return updated[0]
    }

    // Create new
    const created = await db
      .insert(analyses)
      .values({
        sessionId: data.sessionId,
        summary: analysisResult.summary,
        questionCount: analysisResult.questionCount,
        qualityScore,
        dimensionScores: analysisResult.dimensionScores,
        strengths: analysisResult.strengths,
        improvements: analysisResult.improvements,
      })
      .returning()

    return created[0]
  })
