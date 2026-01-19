import { openai } from "./openai"
import type { ChatMessage } from "./openai"
import { type EvaluationSettings, DEFAULT_EVALUATION_SETTINGS } from "./evaluation-config"

export interface AnalysisResult {
  summary: string
  questionCount: number
  qualityScore: number
  dimensionScores: Record<string, number>
  strengths: string[]
  improvements: string[]
}

export function buildAnalysisPrompt(settings: EvaluationSettings): string {
  // Build dimensions section
  const dimensionsText = settings.dimensions
    .map((d, i) => `### ${i + 1}. ${d.name.toUpperCase()} (Weight: ${d.weight}%)\n${d.description}`)
    .join('\n\n')

  // Build flags sections
  const redFlagsText = settings.redFlags.map(f => `- ${f}`).join('\n')
  const greenFlagsText = settings.greenFlags.map(f => `- ${f}`).join('\n')

  // Build expected JSON structure for dimension scores
  const dimensionScoresJson = settings.dimensions
    .map(d => `    "${d.id}": <1-10>`)
    .join(',\n')

  return `You are an expert at evaluating developer candidates based on the quality of questions they ask while solving problems.

Analyze the following conversation between a candidate and an AI assistant. The candidate was given a programming problem and used AI chat to investigate and solve it. Focus on evaluating the QUALITY OF THEIR QUESTIONS, not the final solution.

## Evaluation Criteria

${dimensionsText}

## Red Flags (subtract 1-2 points from overall score if present)
${redFlagsText}

## Green Flags (add 1 point to overall score if present)
${greenFlagsText}

## Scoring Instructions
1. Score each dimension from 1-10
2. Calculate weighted average for the overall qualityScore
3. Adjust for red/green flags observed

Respond with a JSON object (no markdown, just raw JSON) with this structure:
{
  "summary": "A 2-3 sentence summary of the candidate's questioning approach and problem-solving methodology",
  "questionCount": <number of questions asked by the candidate>,
  "qualityScore": <weighted average 1-10, adjusted for flags>,
  "dimensionScores": {
${dimensionScoresJson}
  },
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["area for improvement 1", "area for improvement 2", ...]
}

Provide 2-4 items for both strengths and improvements.`
}

export async function analyzeSession(
  problemDescription: string,
  messages: ChatMessage[],
  evaluationSettings?: EvaluationSettings | null
): Promise<AnalysisResult> {
  const settings = evaluationSettings || DEFAULT_EVALUATION_SETTINGS
  const prompt = buildAnalysisPrompt(settings)

  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `PROBLEM DESCRIPTION:\n${problemDescription}\n\nCONVERSATION:\n${conversationText}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  })

  const content = response.choices[0]?.message?.content || "{}"

  try {
    return JSON.parse(content) as AnalysisResult
  } catch {
    return {
      summary: "Unable to analyze the session.",
      questionCount: messages.filter((m) => m.role === "user").length,
      qualityScore: 0,
      dimensionScores: {},
      strengths: [],
      improvements: [],
    }
  }
}
