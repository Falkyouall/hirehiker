import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { problems, sessions, messages, analyses } from "./schema"
import type { ProjectFile, SwaggerSpec, BugTicket } from "./schema"

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
const db = drizzle(client)

// Project files for the User Dashboard
const projectFiles: ProjectFile[] = [
  {
    path: "src/components/Dashboard.tsx",
    language: "typescript",
    content: `import { useEffect } from 'react';
import { useUserStats } from '../hooks/useUserStats';
import { StatsCard } from './StatsCard';

export function Dashboard() {
  const { stats, loading, refetch } = useUserStats();

  // Refresh stats when component mounts
  useEffect(() => {
    refetch();
  }, []);

  if (loading) {
    return <div className="loading">Lade Statistiken...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <StatsCard
          title="Projekte"
          value={stats?.projectCount || 0}
          icon="folder"
        />
        <StatsCard
          title="Aufgaben erledigt"
          value={stats?.completedTasks || 0}
          icon="check"
        />
        <StatsCard
          title="Aktive Tage"
          value={stats?.activeDays || 0}
          icon="calendar"
        />
        <StatsCard
          title="Team-Mitglieder"
          value={stats?.teamMembers || 0}
          icon="users"
        />
      </div>
      <div className="last-updated">
        Zuletzt aktualisiert: {stats?.lastUpdated || 'Nie'}
      </div>
    </div>
  );
}`
  },
  {
    path: "src/components/ProfileForm.tsx",
    language: "typescript",
    content: `import { useState } from 'react';
import { updateUserProfile } from '../api/user';
import { useToast } from '../hooks/useToast';

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    bio: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      updateUserProfile({
        id: user.id,
        name,
        email,
        bio,
      });

      showToast('Profil erfolgreich gespeichert!', 'success');
    } catch (error) {
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="profile-form">
      <h2>Profil bearbeiten</h2>

      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">E-Mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={saving}
          rows={4}
        />
      </div>

      <button type="submit" disabled={saving}>
        {saving ? 'Speichert...' : 'Speichern'}
      </button>
    </form>
  );
}`
  },
  {
    path: "src/hooks/useUserStats.ts",
    language: "typescript",
    content: `import { useState, useEffect, useCallback } from 'react';

interface UserStats {
  projectCount: number;
  completedTasks: number;
  activeDays: number;
  teamMembers: number;
  lastUpdated: string;
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/users/me/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const refetch = useCallback(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch };
}`
  },
  {
    path: "src/api/user.ts",
    language: "typescript",
    content: `const API_BASE = '/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await fetch(\`\${API_BASE}/users/me\`);

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

export async function updateUserProfile(profile: UserProfile): Promise<void> {
  fetch(\`\${API_BASE}/users/me\`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });
}

export async function getNotifications() {
  const response = await fetch(\`\${API_BASE}/notifications\`);
  return response.json();
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await fetch(\`\${API_BASE}/notifications/\${notificationId}\`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ read: true }),
  });

  return response.json();
}`
  }
];

// Swagger API documentation
const swaggerSpec: SwaggerSpec = {
  title: "User Dashboard API",
  version: "1.0.0",
  baseUrl: "/api",
  endpoints: [
    {
      method: "GET",
      path: "/users/me",
      summary: "Aktuellen User abrufen",
      description: "Gibt die Profildaten des eingeloggten Users zurück",
      responseSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "User ID" },
          name: { type: "string", description: "Voller Name" },
          email: { type: "string", description: "E-Mail Adresse" },
          bio: { type: "string", description: "Kurzbeschreibung" },
          createdAt: { type: "string", description: "ISO 8601 Datum" }
        }
      }
    },
    {
      method: "PATCH",
      path: "/users/me",
      summary: "Profil aktualisieren",
      description: "Aktualisiert die Profildaten des eingeloggten Users. Änderungen werden in der Datenbank persistiert.",
      parameters: [
        { name: "name", in: "body", type: "string", description: "Neuer Name" },
        { name: "email", in: "body", type: "string", description: "Neue E-Mail" },
        { name: "bio", in: "body", type: "string", description: "Neue Bio" }
      ],
      responseSchema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          user: { type: "object", description: "Aktualisierte User-Daten" }
        }
      }
    },
    {
      method: "GET",
      path: "/users/me/stats",
      summary: "User-Statistiken",
      description: "Gibt aggregierte Statistiken für das Dashboard zurück. Die Daten werden bei jedem Aufruf neu berechnet.",
      responseSchema: {
        type: "object",
        properties: {
          projectCount: { type: "number", description: "Anzahl Projekte" },
          completedTasks: { type: "number", description: "Erledigte Aufgaben" },
          activeDays: { type: "number", description: "Aktive Tage" },
          teamMembers: { type: "number", description: "Team-Größe" },
          lastUpdated: { type: "string", description: "ISO 8601 Timestamp" }
        }
      }
    },
    {
      method: "GET",
      path: "/notifications",
      summary: "Benachrichtigungen",
      description: "Gibt alle Benachrichtigungen des Users zurück, sortiert nach Datum (neueste zuerst)",
      responseSchema: {
        type: "object",
        properties: {
          notifications: { type: "array", description: "Liste der Benachrichtigungen" },
          unreadCount: { type: "number", description: "Anzahl ungelesener Nachrichten" }
        }
      }
    },
    {
      method: "PATCH",
      path: "/notifications/:id",
      summary: "Als gelesen markieren",
      description: "Markiert eine einzelne Benachrichtigung als gelesen",
      parameters: [
        { name: "id", in: "path", type: "string", required: true, description: "Notification ID" },
        { name: "read", in: "body", type: "boolean", required: true, description: "Gelesen-Status" }
      ],
      responseSchema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          notification: { type: "object" }
        }
      }
    }
  ]
};

// Bug tickets
const bugTickets: BugTicket[] = [
  {
    id: "#201",
    title: "Profil speichern funktioniert nicht",
    description: "Profil speichern zeigt 'Erfolgreich', aber nach Seiten-Refresh sind die Änderungen weg.",
    relatedFiles: ["src/components/ProfileForm.tsx", "src/api/user.ts"]
  },
  {
    id: "#202",
    title: "Dashboard-Statistiken veraltet",
    description: "Dashboard-Statistiken aktualisieren sich nicht, zeigen immer alte Werte.",
    relatedFiles: ["src/components/Dashboard.tsx", "src/hooks/useUserStats.ts"]
  },
  {
    id: "#203",
    title: "Badge-Counter aktualisiert nicht",
    description: "Benachrichtigungen: Klicke auf 'Als gelesen markieren', aber Badge-Zahl bleibt gleich.",
    relatedFiles: ["src/api/user.ts"]
  },
  {
    id: "#204",
    title: "Doppelklick-Problem beim Speichern",
    description: "Wenn ich schnell doppelt auf Speichern klicke, wird das Profil zweimal gespeichert.",
    relatedFiles: ["src/components/ProfileForm.tsx"]
  }
];

const userDashboardProblem = {
  title: "User Dashboard Bugs",
  description: `## Aufgabenstellung

Du bist Entwickler bei einem Startup und hast die Aufgabe, mehrere Bug-Reports aus dem Issue-Tracker zu untersuchen.

### Deine Aufgabe

1. **Analysiere** die Bug-Tickets auf der linken Seite
2. **Untersuche** den Projekt-Code und die API-Dokumentation
3. **Diskutiere** mit der AI, um die Ursachen zu verstehen
4. **Stelle Fragen**, die zeigen, dass du das Problem verstehst

### Wichtig

- Es geht **nicht** darum, perfekten Code zu schreiben
- Es geht darum, **die richtigen Fragen** zu stellen
- Zeige, wie du **systematisch** an Probleme herangehst
- Erkläre deine **Denkweise** beim Debugging

### Beispiele für gute Fragen

- "Warum führt X zu Problem Y?"
- "Was passiert, wenn..."
- "Wie hängen diese beiden Komponenten zusammen?"
- "Welche Edge-Cases könnten hier auftreten?"`,
  codebaseContext: null,
  difficulty: "medium" as const,
  category: "debugging",
  projectFiles,
  swaggerSpec,
  bugTickets
};

async function seed() {
  console.log("Seeding database with User Dashboard Bug Investigation...")

  try {
    // Clear existing data (in order due to foreign key constraints)
    await db.delete(analyses)
    console.log("  Cleared existing analyses")
    await db.delete(messages)
    console.log("  Cleared existing messages")
    await db.delete(sessions)
    console.log("  Cleared existing sessions")
    await db.delete(problems)
    console.log("  Cleared existing problems")

    // Insert the User Dashboard problem
    await db.insert(problems).values(userDashboardProblem)
    console.log(`  Added: ${userDashboardProblem.title}`)

    console.log("\nSeeding complete!")
    console.log("  Added 1 problem with:")
    console.log(`    - ${projectFiles.length} project files`)
    console.log(`    - ${swaggerSpec.endpoints.length} API endpoints`)
    console.log(`    - ${bugTickets.length} bug tickets`)
  } catch (error) {
    console.error("Seeding failed:", error)
    process.exit(1)
  }

  process.exit(0)
}

seed()
