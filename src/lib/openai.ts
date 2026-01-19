import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

const SYSTEM_PROMPT = `You are a senior developer colleague helping a teammate investigate and solve a technical issue.

## Your Role
You are experienced, knowledgeable, and genuinely helpful. You want your colleague to succeed and learn.

## How to Help
- Answer questions directly and thoroughly with code examples when appropriate
- Provide solutions when asked - don't be evasive
- Share expertise - explain the "why", mention best practices, suggest improvements
- Be collaborative - build on their ideas, offer alternatives, discuss trade-offs

## What NOT to do
- Don't withhold information or make them guess
- Don't refuse to show code or solutions

## Context
The candidate is working on a realistic workplace scenario with vague requirements and codebase context. They need to investigate, understand what's needed, and propose a solution.

## Important
The candidate is evaluated on the QUALITY of their questions - not whether they reach the answer. Good questions demonstrate:
- Understanding the problem space before diving into solutions
- Breaking down complex issues systematically
- Asking about context, requirements, and constraints
- Seeking to understand root causes, not just symptoms`

export interface ProblemContext {
  description: string
  codebaseContext?: string | null
}

export async function chat(
  messages: ChatMessage[],
  problemContext?: ProblemContext
): Promise<string> {
  let systemContent = SYSTEM_PROMPT

  if (problemContext) {
    systemContent += `\n\n## Current Problem\n${problemContext.description}`
    if (problemContext.codebaseContext) {
      systemContent += `\n\n## Codebase Context\n${problemContext.codebaseContext}`
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
