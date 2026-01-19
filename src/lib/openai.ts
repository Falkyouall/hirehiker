import OpenAI from "openai"
import type { SwaggerSpec, BugTicket } from "@/db/schema"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ProblemContext {
  description: string
  fileTree: string[]
  bugTickets?: BugTicket[] | null
  swaggerSpec?: SwaggerSpec | null
}

// OpenAI tools definition for read_file
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read the content of a file from the project. Use this to examine source code before answering questions about it.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "The file path relative to project root, e.g. 'src/api/user.ts'",
          },
        },
        required: ["path"],
      },
    },
  },
]

/**
 * Build the system prompt with project context
 */
function buildSystemPrompt(context: ProblemContext): string {
  let systemContent = `You are a helpful AI assistant helping a developer debug a software project.

You have access to the project's file structure and can read any file using the read_file tool.

## Project Structure
${context.fileTree.map((f) => `- ${f}`).join("\n")}

## Problem Description
${context.description}`

  if (context.bugTickets && context.bugTickets.length > 0) {
    systemContent += `\n\n## Bug Reports`
    for (const ticket of context.bugTickets) {
      systemContent += `\n\n### ${ticket.id}: ${ticket.title}\n${ticket.description}`
      if (ticket.relatedFiles && ticket.relatedFiles.length > 0) {
        systemContent += `\n\nRelated files: ${ticket.relatedFiles.join(", ")}`
      }
    }
  }

  if (context.swaggerSpec) {
    systemContent += `\n\n## API Documentation`
    systemContent += `\n\n**${context.swaggerSpec.title}** (v${context.swaggerSpec.version})`
    systemContent += `\nBase URL: ${context.swaggerSpec.baseUrl}`

    for (const endpoint of context.swaggerSpec.endpoints) {
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
          for (const [key, value] of Object.entries(
            endpoint.responseSchema.properties
          )) {
            systemContent += `\n- \`${key}\`: ${value.type}`
            if (value.description) {
              systemContent += ` - ${value.description}`
            }
          }
        }
      }
    }
  }

  systemContent += `

## Instructions
- Use the read_file tool to examine source code BEFORE answering questions about specific files or code
- When suggesting code fixes, ALWAYS include the file path using this exact format:

\`\`\`typescript
// filepath: src/api/user.ts
export async function updateUserProfile(...) {
  // your fixed code here
}
\`\`\`

This format with the "// filepath:" comment allows the user to apply your changes directly to the editor using the "Apply" button.

- Be helpful and explain your reasoning
- Point out potential issues and suggest improvements
- Ask clarifying questions if the user's request is ambiguous`

  return systemContent
}

/**
 * Chat function with function calling support for read_file
 */
export async function chat(
  messages: ChatMessage[],
  context: ProblemContext,
  readFile: (path: string) => Promise<string | null>
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)

  type OpenAIMessage =
    | OpenAI.ChatCompletionSystemMessageParam
    | OpenAI.ChatCompletionUserMessageParam
    | OpenAI.ChatCompletionAssistantMessageParam
    | OpenAI.ChatCompletionToolMessageParam

  const currentMessages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ]

  // Loop for tool calls (AI might want to read multiple files)
  let iterationCount = 0
  const maxIterations = 10 // Prevent infinite loops

  while (iterationCount < maxIterations) {
    iterationCount++

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: currentMessages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 2000,
    })

    const message = response.choices[0].message

    // If no tool calls, return the response
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content || "Sorry, I couldn't generate a response."
    }

    // Add assistant message with tool calls
    currentMessages.push({
      role: "assistant",
      content: message.content || null,
      tool_calls: message.tool_calls,
    } as OpenAI.ChatCompletionAssistantMessageParam)

    // Process tool calls
    for (const toolCall of message.tool_calls) {
      if (toolCall.type === "function" && toolCall.function.name === "read_file") {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          const content = await readFile(args.path)

          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: content || `File not found: ${args.path}`,
          })
        } catch (error) {
          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`,
          })
        }
      }
    }
  }

  return "Sorry, I encountered an issue while processing your request. Please try again."
}

/**
 * Legacy chat function for backwards compatibility (without function calling)
 * Used when projectFiles are passed directly instead of being read on-demand
 */
export async function chatWithFiles(
  messages: ChatMessage[],
  context: {
    description: string
    bugTickets?: BugTicket[] | null
    projectFiles?: Array<{ path: string; language: string; content: string }> | null
    swaggerSpec?: SwaggerSpec | null
  }
): Promise<string> {
  let systemContent = `You are a helpful AI assistant.

The user is working on debugging a software project. Below is the context of the project they are working on.`

  if (context) {
    systemContent += `\n\n## Problem Description\n${context.description}`

    if (context.bugTickets && context.bugTickets.length > 0) {
      systemContent += `\n\n## Bug Reports`
      for (const ticket of context.bugTickets) {
        systemContent += `\n\n### ${ticket.id}: ${ticket.title}\n${ticket.description}`
      }
    }

    if (context.projectFiles && context.projectFiles.length > 0) {
      systemContent += `\n\n## Project Code`
      for (const file of context.projectFiles) {
        systemContent += `\n\n### ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\``
      }
    }

    if (context.swaggerSpec) {
      systemContent += `\n\n## API Documentation`
      systemContent += `\n\n**${context.swaggerSpec.title}** (v${context.swaggerSpec.version})`
      systemContent += `\nBase URL: ${context.swaggerSpec.baseUrl}`

      for (const endpoint of context.swaggerSpec.endpoints) {
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
            for (const [key, value] of Object.entries(
              endpoint.responseSchema.properties
            )) {
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

  systemContent += `

## Instructions
When suggesting code fixes, ALWAYS include the file path using this exact format:

\`\`\`typescript
// filepath: src/api/user.ts
export async function updateUserProfile(...) {
  // your fixed code here
}
\`\`\`

This format with the "// filepath:" comment allows the user to apply your changes directly to the editor.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemContent }, ...messages],
    temperature: 0.7,
    max_tokens: 2000,
  })

  return (
    response.choices[0]?.message?.content ||
    "Sorry, I couldn't generate a response."
  )
}

export { openai }
