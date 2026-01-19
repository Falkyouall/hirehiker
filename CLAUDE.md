# HireHiker - AI Context

## Project Overview
HireHiker is a developer candidate evaluation tool that uses the "Question Over Answer" approach. Instead of just evaluating a candidate's final solution, it focuses on the **quality of questions** they ask an AI assistant while solving a programming problem.

## Core Concept
- Candidates are given a programming problem (JS/TS)
- They use a built-in AI chat to ask questions and solve it
- The tool captures the entire conversation
- Recruiters review the chat history and get AI-assisted analysis of question quality
- Better questions = better understanding of the problem = better developer

## Tech Stack
- **Framework**: TanStack Start RC (React meta-framework)
- **Database**: PostgreSQL 14 (Docker: `postgres:14.20-trixie`)
- **ORM**: Drizzle ORM
- **AI**: OpenAI API (GPT-4o)
- **Styling**: Tailwind CSS 4 + shadcn/ui-style components
- **Package Manager**: pnpm

## Project Structure
```
src/
├── routes/                      # TanStack Router file-based routes
│   ├── index.tsx               # Landing page (role selection)
│   ├── candidate/
│   │   ├── index.tsx           # Enter session code
│   │   ├── $sessionId.tsx      # Problem view + AI chat (main interface)
│   │   └── $sessionId.complete.tsx
│   └── dashboard/
│       ├── index.tsx           # Sessions list + create new
│       ├── sessions.$sessionId.tsx  # Review session + analysis
│       └── problems.index.tsx  # Problems library
├── components/ui/              # Reusable UI components (Button, Card, etc.)
├── lib/
│   ├── db.ts                   # Drizzle database client
│   ├── openai.ts               # OpenAI client + chat function
│   ├── analysis.ts             # Question quality analysis prompts
│   └── utils.ts                # cn() helper for Tailwind
├── db/
│   ├── schema.ts               # Database schema (problems, sessions, messages, analyses)
│   └── seed.ts                 # Seed script with 5 starter problems
└── server/functions/           # TanStack Start server functions
    ├── problems.ts
    ├── sessions.ts
    ├── messages.ts
    └── analysis.ts
```

## Database Schema
- **problems**: Programming problems (title, description, difficulty, category)
- **sessions**: Candidate assessment sessions (candidate info, status, solution)
- **messages**: Chat history (role: user/assistant, content)
- **analyses**: AI-generated analysis (score, strengths, improvements)

## Key Commands
```bash
pnpm run dev          # Start dev server (port 3000)
pnpm run db:push      # Push schema to database
pnpm run db:seed      # Seed starter problems
pnpm run db:studio    # Open Drizzle Studio
```

## Environment Variables
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hirehiker
OPENAI_API_KEY=<your-key>
```

## Current State (MVP)
- No authentication (single company use)
- 5 starter JavaScript problems
- Full candidate flow: enter session → solve problem with AI → submit
- Full recruiter flow: create session → review chat → generate analysis

## Future Considerations
- Multi-tenant authentication
- Custom problem creation by companies
- More sophisticated analysis metrics
- Real-time session monitoring
- Export/reporting features
