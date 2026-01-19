import { createServerFn } from "@tanstack/react-start"
import { db } from "@/lib/db"
import { problems, type NewProblem } from "@/db/schema"
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
