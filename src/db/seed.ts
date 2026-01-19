import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { problems, sessions, messages, analyses } from "./schema"

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
const db = drizzle(client)

const starterProblems = [
  {
    title: "Dashboard Performance Investigation",
    description: `## Situation
You're a developer at DataViz Inc. The product team has been getting complaints about the Analytics Dashboard.

## Request
**From:** Sarah (Product Manager)

"Hey, users are saying the dashboard is really slow. Can you look into it?"

## Additional Context
- Dashboard was fine until last sprint when "real-time updates" was added
- Users report 20+ second load times, especially between 9-11 AM
- Support tickets have been increasing

## Your Task
Investigate the issue, identify the root cause, and propose a fix.`,
    codebaseContext: `### File: src/components/Dashboard.tsx
\`\`\`typescript
import { useState, useEffect } from 'react';
import { fetchAnalytics } from '../api/analytics';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(async () => {
      const analytics = await fetchAnalytics();
      setData(analytics);
      setLoading(false);
    }, 100); // Poll every 100ms for real-time updates
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      {data?.metrics.map(metric => (
        <MetricCard key={metric.id} data={metric} />
      ))}
    </div>
  );
}
\`\`\`

### File: src/api/analytics.ts
\`\`\`typescript
export async function fetchAnalytics() {
  const response = await fetch('/api/analytics?include=all&history=90d');
  const data = await response.json();

  // Process and enrich the data
  return data.map(item => ({
    ...item,
    computed: heavyComputation(item),
  }));
}

function heavyComputation(item) {
  // Calculate trends by comparing with all other items
  let trendScore = 0;
  for (let i = 0; i < item.history.length; i++) {
    for (let j = 0; j < item.history.length; j++) {
      trendScore += Math.abs(item.history[i] - item.history[j]);
    }
  }
  return { ...item, trendScore };
}
\`\`\`

### File: src/api/routes/analytics.ts (Backend)
\`\`\`typescript
app.get('/api/analytics', async (req, res) => {
  const { include, history } = req.query;

  // Fetch all metrics when include=all
  const metrics = await db.query(\`
    SELECT * FROM metrics
    WHERE created_at > NOW() - INTERVAL '\${history}'
  \`);

  res.json(metrics);
});
\`\`\``,
    difficulty: "medium" as const,
    category: "performance",
  },
  {
    title: "Checkout Bug Report",
    description: `## Situation
You work on the e-commerce team at ShopFast. A critical bug has been reported in the checkout flow.

## Request
**From:** Alex (Support Lead)

"We're getting reports that some customers are being charged but their orders aren't being created. It seems random - most checkouts work fine but we've had about 15 complaints today. This is urgent."

## Additional Context
- The issue started after last week's deployment
- Affected users see a "Thank you for your order" page but never receive confirmation emails
- Payment provider shows the charges went through successfully
- No clear pattern in which users are affected

## Your Task
Investigate the checkout flow, identify what's causing the inconsistent behavior, and propose a fix.`,
    codebaseContext: `### File: src/pages/checkout.tsx
\`\`\`typescript
import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { createOrder, processPayment } from '../api/checkout';

export function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const [processing, setProcessing] = useState(false);

  const handleCheckout = async () => {
    setProcessing(true);

    try {
      // Process payment first
      const paymentResult = await processPayment(cart.total);

      // Create the order
      createOrder({
        items: cart.items,
        paymentId: paymentResult.id,
        total: cart.total
      });

      // Clear cart and redirect
      clearCart();
      window.location.href = '/order-success';
    } catch (error) {
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <CartSummary items={cart.items} />
      <button onClick={handleCheckout} disabled={processing}>
        {processing ? 'Processing...' : 'Complete Purchase'}
      </button>
    </div>
  );
}
\`\`\`

### File: src/api/checkout.ts
\`\`\`typescript
export async function processPayment(amount: number) {
  const response = await fetch('/api/payment', {
    method: 'POST',
    body: JSON.stringify({ amount })
  });

  if (!response.ok) throw new Error('Payment failed');
  return response.json();
}

export async function createOrder(orderData: OrderData) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  return response.json();
}
\`\`\`

### File: src/hooks/useCart.ts
\`\`\`typescript
export function useCart() {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : { items: [], total: 0 };
  });

  const clearCart = () => {
    setCart({ items: [], total: 0 });
    localStorage.removeItem('cart');
  };

  // ... other cart methods

  return { cart, clearCart };
}
\`\`\``,
    difficulty: "medium" as const,
    category: "debugging",
  },
  {
    title: "API Rate Limiting Issue",
    description: `## Situation
You're on the integrations team at NewsAggregator. Your service pulls articles from various third-party news APIs.

## Request
**From:** Jordan (Backend Lead)

"The NewsAPI integration keeps hitting rate limits. They allow 100 requests per hour but we're burning through that in minutes during peak times. Users are seeing 'Unable to fetch news' errors constantly."

## Additional Context
- NewsAPI charges extra for higher rate limits (\$500/month for 1000 req/hour)
- Management wants to see if we can optimize before paying more
- The issue is worst during morning hours (7-9 AM) when traffic spikes
- Other news sources work fine because they have higher limits

## Your Task
Investigate the API integration code, identify why we're hitting limits so quickly, and propose optimizations.`,
    codebaseContext: `### File: src/services/newsApi.ts
\`\`\`typescript
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = 'https://newsapi.org/v2';

export async function fetchArticles(category: string) {
  const response = await fetch(
    \`\${BASE_URL}/top-headlines?category=\${category}&apiKey=\${NEWS_API_KEY}\`
  );

  if (response.status === 429) {
    // Rate limited - retry after delay
    await delay(1000);
    return fetchArticles(category);
  }

  return response.json();
}

export async function searchArticles(query: string) {
  const response = await fetch(
    \`\${BASE_URL}/everything?q=\${query}&apiKey=\${NEWS_API_KEY}\`
  );

  return response.json();
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
\`\`\`

### File: src/components/NewsFeed.tsx
\`\`\`typescript
import { useEffect, useState } from 'react';
import { fetchArticles } from '../services/newsApi';

export function NewsFeed({ categories }: { categories: string[] }) {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const loadNews = async () => {
      const allArticles = [];
      for (const category of categories) {
        const result = await fetchArticles(category);
        allArticles.push(...result.articles);
      }
      setArticles(allArticles);
    };

    loadNews();
  }, [categories]);

  return (
    <div>
      {articles.map(article => (
        <ArticleCard key={article.url} article={article} />
      ))}
    </div>
  );
}
\`\`\`

### File: src/pages/home.tsx
\`\`\`typescript
export function HomePage() {
  const categories = ['business', 'technology', 'sports', 'entertainment', 'health'];

  return (
    <div>
      <SearchBar />
      <NewsFeed categories={categories} />
      <TrendingTopics />
    </div>
  );
}
\`\`\`

### File: src/components/SearchBar.tsx
\`\`\`typescript
export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 2) {
      const data = await searchArticles(value);
      setResults(data.articles);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search news..."
      />
      <SearchResults results={results} />
    </div>
  );
}
\`\`\``,
    difficulty: "medium" as const,
    category: "optimization",
  },
  {
    title: "Memory Leak Investigation",
    description: `## Situation
You're on the platform team at CloudMetrics. Your Node.js API service handles real-time metrics ingestion.

## Request
**From:** Maria (SRE Lead)

"The metrics-ingestion service keeps running out of memory. Memory usage grows steadily until the pod gets OOMKilled every 4-6 hours. We keep restarting it but need a real fix."

## Additional Context
- Service handles ~10,000 metric events per minute
- Memory starts at 200MB and grows to 2GB before crash
- Issue appeared after adding the "webhook notification" feature last month
- CPU usage is normal, only memory is affected

## Your Task
Investigate the service code, identify potential memory leaks, and propose fixes.`,
    codebaseContext: `### File: src/services/metricsIngestion.ts
\`\`\`typescript
import { EventEmitter } from 'events';
import { notifyWebhooks } from './webhooks';

const metricsEmitter = new EventEmitter();
const metricsCache: Map<string, MetricData[]> = new Map();

export function initializeIngestion() {
  metricsEmitter.on('metric', async (metric: MetricData) => {
    // Store in cache for quick access
    const key = \`\${metric.source}:\${metric.name}\`;
    const existing = metricsCache.get(key) || [];
    existing.push(metric);
    metricsCache.set(key, existing);

    // Persist to database
    await saveMetric(metric);

    // Check for alerts
    await checkAlertThresholds(metric);
  });
}

export function ingestMetric(metric: MetricData) {
  metricsEmitter.emit('metric', metric);
}
\`\`\`

### File: src/services/webhooks.ts
\`\`\`typescript
import { EventEmitter } from 'events';

const alertEmitter = new EventEmitter();

export function registerAlertHandler(handler: (alert: Alert) => void) {
  alertEmitter.on('alert', handler);
}

export async function notifyWebhooks(alert: Alert) {
  const webhooks = await getActiveWebhooks();

  for (const webhook of webhooks) {
    // Create a handler for each webhook
    const handler = async (a: Alert) => {
      await fetch(webhook.url, {
        method: 'POST',
        body: JSON.stringify(a)
      });
    };

    registerAlertHandler(handler);
    alertEmitter.emit('alert', alert);
  }
}

export async function checkAlertThresholds(metric: MetricData) {
  const rules = await getAlertRules(metric.name);

  for (const rule of rules) {
    if (metric.value > rule.threshold) {
      await notifyWebhooks({
        metric: metric.name,
        value: metric.value,
        threshold: rule.threshold,
        timestamp: Date.now()
      });
    }
  }
}
\`\`\`

### File: src/routes/metrics.ts
\`\`\`typescript
import { Router } from 'express';
import { ingestMetric, getRecentMetrics } from '../services/metricsIngestion';

const router = Router();

router.post('/ingest', async (req, res) => {
  const metrics = req.body.metrics;

  for (const metric of metrics) {
    ingestMetric(metric);
  }

  res.json({ success: true, count: metrics.length });
});

router.get('/recent/:source', (req, res) => {
  const metrics = getRecentMetrics(req.params.source);
  res.json(metrics);
});

export default router;
\`\`\``,
    difficulty: "hard" as const,
    category: "debugging",
  },
  {
    title: "Search Not Working",
    description: `## Situation
You're a developer at BookStore Online. Customers are complaining about the search functionality.

## Request
**From:** Taylor (Customer Success)

"Getting lots of complaints that search is 'broken'. Customers say they can't find books that we definitely have in stock. I searched for 'Harry Potter' myself and got no results, but I know we have those books!"

## Additional Context
- Search was working fine a few weeks ago
- No recent deployments that touched search specifically
- Inventory team confirms the books are in the database
- Issue seems to affect some searches more than others

## Your Task
Investigate the search functionality, identify why searches are failing to return expected results, and propose fixes.`,
    codebaseContext: `### File: src/services/search.ts
\`\`\`typescript
import { db } from '../database';

export async function searchBooks(query: string, filters?: SearchFilters) {
  let sql = \`SELECT * FROM books WHERE 1=1\`;
  const params: any[] = [];

  // Add search condition
  if (query) {
    sql += \` AND title = $\${params.length + 1}\`;
    params.push(query);
  }

  // Apply category filter
  if (filters?.category) {
    sql += \` AND category = $\${params.length + 1}\`;
    params.push(filters.category);
  }

  // Apply price filter
  if (filters?.maxPrice) {
    sql += \` AND price <= $\${params.length + 1}\`;
    params.push(filters.maxPrice);
  }

  // Apply availability filter
  if (filters?.inStock) {
    sql += \` AND stock_count > 0\`;
  }

  const results = await db.query(sql, params);
  return results.rows;
}
\`\`\`

### File: src/components/SearchPage.tsx
\`\`\`typescript
import { useState } from 'react';
import { searchBooks } from '../api/search';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    category: null,
    maxPrice: null,
    inStock: false
  });

  const handleSearch = async () => {
    const books = await searchBooks(query, filters);
    setResults(books);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search books..."
      />
      <FilterPanel filters={filters} onChange={setFilters} />
      <button onClick={handleSearch}>Search</button>

      {results.length === 0 ? (
        <p>No books found</p>
      ) : (
        <BookGrid books={results} />
      )}
    </div>
  );
}
\`\`\`

### File: src/api/search.ts
\`\`\`typescript
export async function searchBooks(query: string, filters: SearchFilters) {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  if (filters.category) params.set('category', filters.category);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
  if (filters.inStock) params.set('inStock', 'true');

  const response = await fetch(\`/api/search?\${params}\`);
  return response.json();
}
\`\`\`

### Sample Data in Database:
\`\`\`
| id | title                                    | author          | category | price | stock_count |
|----|------------------------------------------|-----------------|----------|-------|-------------|
| 1  | Harry Potter and the Sorcerer's Stone    | J.K. Rowling    | Fantasy  | 12.99 | 45          |
| 2  | harry potter and the chamber of secrets  | J.K. Rowling    | Fantasy  | 12.99 | 32          |
| 3  | The Hobbit                               | J.R.R. Tolkien  | Fantasy  | 14.99 | 28          |
| 4  | NULL                                     | Unknown         | Fiction  | 9.99  | 5           |
\`\`\``,
    difficulty: "easy" as const,
    category: "debugging",
  },
]

async function seed() {
  console.log("Seeding database...")

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

    // Insert starter problems
    for (const problem of starterProblems) {
      await db.insert(problems).values(problem)
      console.log(`  Added: ${problem.title}`)
    }

    console.log("\nSeeding complete!")
    console.log(`   Added ${starterProblems.length} problems`)
  } catch (error) {
    console.error("Seeding failed:", error)
    process.exit(1)
  }

  process.exit(0)
}

seed()
