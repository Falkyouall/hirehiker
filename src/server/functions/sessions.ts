import { createServerFn } from "@tanstack/react-start"
import { db } from "@/lib/db"
import { sessions, problems, messages, analyses, type NewSession } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export const getSessions = createServerFn({ method: "GET" }).handler(async () => {
  return await db
    .select({
      id: sessions.id,
      candidateName: sessions.candidateName,
      candidateEmail: sessions.candidateEmail,
      status: sessions.status,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
      createdAt: sessions.createdAt,
      problem: {
        id: problems.id,
        title: problems.title,
        difficulty: problems.difficulty,
        category: problems.category,
        githubRepoUrl: problems.githubRepoUrl,
      },
    })
    .from(sessions)
    .leftJoin(problems, eq(sessions.problemId, problems.id))
    .orderBy(desc(sessions.createdAt))
})

export const getSession = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const result = await db
      .select({
        id: sessions.id,
        candidateName: sessions.candidateName,
        candidateEmail: sessions.candidateEmail,
        status: sessions.status,
        solution: sessions.solution,
        startedAt: sessions.startedAt,
        completedAt: sessions.completedAt,
        createdAt: sessions.createdAt,
        problem: {
          id: problems.id,
          title: problems.title,
          description: problems.description,
          codebaseContext: problems.codebaseContext,
          difficulty: problems.difficulty,
          category: problems.category,
          projectFiles: problems.projectFiles,
          swaggerSpec: problems.swaggerSpec,
          bugTickets: problems.bugTickets,
          githubRepoUrl: problems.githubRepoUrl,
        },
      })
      .from(sessions)
      .leftJoin(problems, eq(sessions.problemId, problems.id))
      .where(eq(sessions.id, data.id))

    return result[0] || null
  })

export const createSession = createServerFn({ method: "POST" })
  .inputValidator((data: NewSession) => data)
  .handler(async ({ data }) => {
    const result = await db.insert(sessions).values(data).returning()
    return result[0]
  })

export const startSession = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const result = await db
      .update(sessions)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(sessions.id, data.id))
      .returning()
    return result[0]
  })

export const completeSession = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const result = await db
      .update(sessions)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(sessions.id, data.id))
      .returning()
    return result[0]
  })

export const deleteSession = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    // Delete related records first (foreign key constraints)
    await db.delete(analyses).where(eq(analyses.sessionId, data.id))
    await db.delete(messages).where(eq(messages.sessionId, data.id))
    // Delete the session
    const result = await db
      .delete(sessions)
      .where(eq(sessions.id, data.id))
      .returning()
    return result[0]
  })

export const getSessionWithMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sessionResult = await db
      .select({
        id: sessions.id,
        candidateName: sessions.candidateName,
        candidateEmail: sessions.candidateEmail,
        status: sessions.status,
        solution: sessions.solution,
        evaluationSettings: sessions.evaluationSettings,
        startedAt: sessions.startedAt,
        completedAt: sessions.completedAt,
        createdAt: sessions.createdAt,
        problem: {
          id: problems.id,
          title: problems.title,
          description: problems.description,
          codebaseContext: problems.codebaseContext,
          difficulty: problems.difficulty,
          category: problems.category,
          projectFiles: problems.projectFiles,
          swaggerSpec: problems.swaggerSpec,
          bugTickets: problems.bugTickets,
          githubRepoUrl: problems.githubRepoUrl,
        },
      })
      .from(sessions)
      .leftJoin(problems, eq(sessions.problemId, problems.id))
      .where(eq(sessions.id, data.id))

    if (!sessionResult[0]) return null

    const sessionMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, data.id))
      .orderBy(messages.createdAt)

    const sessionAnalysis = await db
      .select()
      .from(analyses)
      .where(eq(analyses.sessionId, data.id))

    return {
      ...sessionResult[0],
      messages: sessionMessages,
      analysis: sessionAnalysis[0] || null,
    }
  })
