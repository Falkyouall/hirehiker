import { createServerFn } from "@tanstack/react-start"
import { db } from "@/lib/db"
import { problems, sessions, messages, analyses, type NewProblem } from "@/db/schema"
import { eq } from "drizzle-orm"

export const getProblems = createServerFn({ method: "GET" }).handler(async () => {
  return await db.select().from(problems).orderBy(problems.createdAt)
})

export const getProblem = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const result = await db.select().from(problems).where(eq(problems.id, data.id))
    return result[0] || null
  })

export const createProblem = createServerFn({ method: "POST" })
  .inputValidator((data: NewProblem) => data)
  .handler(async ({ data }) => {
    const result = await db.insert(problems).values(data).returning()
    return result[0]
  })

export const deleteProblem = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    // First, get all sessions that use this problem
    const problemSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.problemId, data.id))

    // Delete related records for each session
    for (const session of problemSessions) {
      await db.delete(analyses).where(eq(analyses.sessionId, session.id))
      await db.delete(messages).where(eq(messages.sessionId, session.id))
    }

    // Delete all sessions that reference this problem
    await db.delete(sessions).where(eq(sessions.problemId, data.id))

    // Finally, delete the problem
    const result = await db
      .delete(problems)
      .where(eq(problems.id, data.id))
      .returning()
    return result[0]
  })
