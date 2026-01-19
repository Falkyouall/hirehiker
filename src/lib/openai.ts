import OpenAI from "openai"
import type { ProjectFile, SwaggerSpec, BugTicket } from "@/db/schema"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

const SYSTEM_PROMPT = `You are a helpful AI assistant.

The user is working on debugging a software project. Below is the context of the project they are working on.`

export interface ProblemContext {
  description: string
  bugTickets?: BugTicket[] | null
  projectFiles?: ProjectFile[] | null
  swaggerSpec?: SwaggerSpec | null
}

export async function chat(
  messages: ChatMessage[],
  problemContext?: ProblemContext
): Promise<string> {
  let systemContent = SYSTEM_PROMPT

  if (problemContext) {
    systemContent += `\n\n## Problem Description\n${problemContext.description}`

    if (problemContext.bugTickets && problemContext.bugTickets.length > 0) {
      systemContent += `\n\n## Bug Reports`
      for (const ticket of problemContext.bugTickets) {
        systemContent += `\n\n### ${ticket.id}: ${ticket.title}\n${ticket.description}`
      }
    }

    if (problemContext.projectFiles && problemContext.projectFiles.length > 0) {
      systemContent += `\n\n## Project Code`
      for (const file of problemContext.projectFiles) {
        systemContent += `\n\n### ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\``
      }
    }

    if (problemContext.swaggerSpec) {
      systemContent += `\n\n## API Documentation`
      systemContent += `\n\n**${problemContext.swaggerSpec.title}** (v${problemContext.swaggerSpec.version})`
      systemContent += `\nBase URL: ${problemContext.swaggerSpec.baseUrl}`

      for (const endpoint of problemContext.swaggerSpec.endpoints) {
        systemContent += `\n\n### ${endpoint.method} ${endpoint.path}`
        systemContent += `\n${endpoint.summary}`
        if (endpoint.description) {
          systemContent += `\n${endpoint.description}`
        }
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          systemContent += `\n\n**Parameters:**`
          for (const param of endpoint.parameters) {
            const required = param.required ? " (required)" : ""
            systemContent += `\n- \`${param.name}\` (${param.in}): ${param.type}${required}`
            if (param.description) {
              systemContent += ` - ${param.description}`
            }
          }
        }
        if (endpoint.responseSchema) {
          systemContent += `\n\n**Response:** ${endpoint.responseSchema.type}`
          if (endpoint.responseSchema.properties) {
            for (const [key, value] of Object.entries(endpoint.responseSchema.properties)) {
              systemContent += `\n- \`${key}\`: ${value.type}`
              if (value.description) {
                systemContent += ` - ${value.description}`
              }
            }
          }
        }
      }
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemContent },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || "Sorry, I couldn't generate a response."
}

export { openai }
