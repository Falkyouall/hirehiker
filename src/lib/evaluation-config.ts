export interface EvaluationDimension {
  id: string
  name: string
  weight: number // percentage, all weights should sum to 100
  description: string
}

export interface EvaluationSettings {
  dimensions: EvaluationDimension[]
  redFlags: string[]
  greenFlags: string[]
}

export const DEFAULT_EVALUATION_SETTINGS: EvaluationSettings = {
  dimensions: [
    {
      id: "questionIntelligence",
      name: "Question Intelligence",
      weight: 25,
      description: "Are questions specific, targeted, and show prior thought?"
    },
    {
      id: "domainUnderstanding",
      name: "Domain Understanding",
      weight: 25,
      description: "Do questions show relevant programming knowledge?"
    },
    {
      id: "problemSolvingProgression",
      name: "Problem-Solving Progression",
      weight: 20,
      description: "Do questions progress logically toward the solution?"
    },
    {
      id: "debuggingMethodology",
      name: "Debugging Methodology",
      weight: 15,
      description: "Does candidate investigate root causes vs. symptoms?"
    },
    {
      id: "communicationQuality",
      name: "Communication Quality",
      weight: 15,
      description: "Are questions clear, concise, and well-structured?"
    }
  ],
  redFlags: [
    "Immediately asks for the complete solution without trying to understand",
    "Ignores AI responses and asks the same thing repeatedly",
    "Never asks clarifying questions before diving into implementation",
    "Asks questions that are already answered in the problem description"
  ],
  greenFlags: [
    "Asks 'why' questions to understand underlying principles",
    "Validates understanding by restating in their own words",
    "Considers multiple approaches before settling on one",
    "Shows intellectual curiosity beyond the immediate problem"
  ]
}
