import { pgTable, uuid, text, timestamp, pgEnum, integer, jsonb } from "drizzle-orm/pg-core"
import type { EvaluationSettings } from "@/lib/evaluation-config"

// Enums
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"])
export const sessionStatusEnum = pgEnum("session_status", ["pending", "active", "completed"])
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"])

// Type definitions for project files and swagger
export interface ProjectFile {
  path: string        // e.g., "src/hooks/useUserStats.ts"
  language: string    // "typescript" | "css" | "json"
  content: string     // Full file content
}

export interface SwaggerEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  summary: string
  description?: string
  parameters?: {
    name: string
    in: "path" | "query" | "body"
    type: string
    required?: boolean
    description?: string
  }[]
  responseSchema?: {
    type: string
    properties?: Record<string, { type: string; description?: string }>
  }
}

export interface SwaggerSpec {
  title: string
  version: string
  baseUrl: string
  endpoints: SwaggerEndpoint[]
}

export interface BugTicket {
  id: string          // e.g., "#201"
  title: string       // Short title
  description: string // Full bug report
  relatedFiles?: string[]  // Hint about which files might be relevant
}

// Problems table
export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  codebaseContext: text("codebase_context"),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  category: text("category").notNull().default("javascript-basics"),
  projectFiles: jsonb("project_files").$type<ProjectFile[]>(),
  swaggerSpec: jsonb("swagger_spec").$type<SwaggerSpec>(),
  bugTickets: jsonb("bug_tickets").$type<BugTicket[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email").notNull(),
  problemId: uuid("problem_id").notNull().references(() => problems.id),
  status: sessionStatusEnum("status").notNull().default("pending"),
  solution: text("solution"),
  evaluationSettings: jsonb("evaluation_settings").$type<EvaluationSettings>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Analyses table
export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id).unique(),
  summary: text("summary").notNull(),
  questionCount: integer("question_count").notNull(),
  qualityScore: integer("quality_score").notNull(),
  dimensionScores: jsonb("dimension_scores").$type<Record<string, number>>().notNull().default({}),
  strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
  improvements: jsonb("improvements").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Type exports
export type Problem = typeof problems.$inferSelect
export type NewProblem = typeof problems.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

export type Analysis = typeof analyses.$inferSelect
export type NewAnalysis = typeof analyses.$inferInsert
