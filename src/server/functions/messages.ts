import { createServerFn } from "@tanstack/react-start"
import { db } from "@/lib/db"
import { messages, sessions, problems } from "@/db/schema"
import { eq } from "drizzle-orm"
import { chat, chatWithFiles } from "@/lib/openai"

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, data.sessionId))
      .orderBy(messages.createdAt)
  })

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string
      content: string
      projectFiles?: Record<string, string> // Files from WebContainer
      fileTree?: string[] // File paths for context
    }) => data
  )
  .handler(async ({ data }) => {
    // Save user message
    const userMessage = await db
      .insert(messages)
      .values({
        sessionId: data.sessionId,
        role: "user",
        content: data.content,
      })
      .returning()

    // Get all messages for context
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, data.sessionId))
      .orderBy(messages.createdAt)

    // Get problem context for the AI
    const sessionWithProblem = await db
      .select({ problem: problems })
      .from(sessions)
      .innerJoin(problems, eq(sessions.problemId, problems.id))
      .where(eq(sessions.id, data.sessionId))
      .limit(1)

    const problem = sessionWithProblem[0]?.problem

    // Get AI response
    const chatMessages = allMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    let aiResponse: string

    // If projectFiles and fileTree are provided, use the new chat function with function calling
    if (data.projectFiles && data.fileTree && data.fileTree.length > 0) {
      // readFile callback - reads from the provided projectFiles
      const readFile = async (path: string): Promise<string | null> => {
        return data.projectFiles?.[path] || null
      }

      aiResponse = await chat(
        chatMessages,
        {
          description: problem?.description || "",
          fileTree: data.fileTree,
          bugTickets: problem?.bugTickets,
          swaggerSpec: problem?.swaggerSpec,
        },
        readFile
      )
    } else {
      // Fallback to legacy chat function with embedded files
      aiResponse = await chatWithFiles(chatMessages, problem ? {
        description: problem.description,
        bugTickets: problem.bugTickets,
        projectFiles: problem.projectFiles,
        swaggerSpec: problem.swaggerSpec,
      } : {
        description: "",
      })
    }

    // Save AI response
    const assistantMessage = await db
      .insert(messages)
      .values({
        sessionId: data.sessionId,
        role: "assistant",
        content: aiResponse,
      })
      .returning()

    return {
      userMessage: userMessage[0],
      assistantMessage: assistantMessage[0],
    }
  })
