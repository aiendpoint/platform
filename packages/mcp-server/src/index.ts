#!/usr/bin/env node
/**
 * @aiendpoint/mcp-server
 *
 * MCP server that lets AI agents (Claude, Cursor, etc.) discover and connect
 * to web services via the AIEndpoint registry (aiendpoint.dev).
 *
 * Tools:
 *   aiendpoint_search_services  — Search registered /ai-enabled services
 *   aiendpoint_fetch_ai_spec    — Fetch the /ai spec from any URL directly
 *   aiendpoint_validate_service — Validate a service's /ai endpoint compliance
 *
 * Transport: stdio (use via npx or Claude Desktop config)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// ─── Constants ────────────────────────────────────────────────────────────────

const REGISTRY_BASE = process.env.REGISTRY_URL ?? 'https://api.aiendpoint.dev'
const CHARACTER_LIMIT = 20_000

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceRecord {
  id: string
  name: string
  url: string
  ai_url: string
  description: string | null
  categories: string[] | null
  auth_type: string | null
  is_verified: boolean
  score: number
  spec_version: string | null
  created_at: string
}

interface ServicesResponse {
  services: ServiceRecord[]
  total: number
  page: number
  limit: number
}

interface AiCapability {
  id: string
  description: string
  endpoint: string
  method: string
  params?: Record<string, string>
  returns?: string
}

interface AiSpec {
  aiendpoint: string
  service: {
    name: string
    description: string
    category?: string[]
    language?: string[]
  }
  capabilities: AiCapability[]
  auth?: { type: string; docs?: string }
  rate_limits?: Record<string, unknown>
  meta?: Record<string, unknown>
}

interface ValidationIssue {
  field: string
  message: string
  code: string
}

interface TokenEfficiency {
  spec_token_estimate: number
  issues: string[]
  score: number
}

interface ValidateResponse {
  url: string
  ai_url: string | null
  passed: boolean
  score: number
  grade: string
  spec_version: string | null
  response_ms: number | null
  capability_count: number
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  passes: ValidationIssue[]
  token_efficiency: TokenEfficiency | null
  checked_at: string
  cached: boolean
  cache_expires_at: string
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AIEndpoint-MCP/0.2.0',
      ...options?.headers,
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  return res.json() as Promise<T>
}

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text
  return text.slice(0, CHARACTER_LIMIT) + '\n\n[... response truncated — refine your query or use offset/limit to see more]'
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatService(s: ServiceRecord): string {
  const cats  = s.categories?.join(', ') || '—'
  const badge = s.is_verified ? '[✓ verified]' : ''
  const score = s.score ? ` · Score: ${s.score}` : ''
  const desc  = s.description ? `\n  ${s.description}` : ''
  return `**${s.name}** ${badge}${score}\n  URL: ${s.url}\n  Category: ${cats}${desc}`
}

function formatCapability(cap: AiCapability): string {
  const params = cap.params
    ? '\n    Params: ' + Object.entries(cap.params).map(([k, v]) => `${k}: ${v}`).join(', ')
    : ''
  const returns = cap.returns ? `\n    Returns: ${cap.returns}` : ''
  return `  **${cap.id}** [${cap.method} ${cap.endpoint}]\n    ${cap.description}${params}${returns}`
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'aiendpoint-mcp-server',
  version: '0.2.0',
})

// ── Tool 1: search_services ───────────────────────────────────────────────────

server.registerTool(
  'aiendpoint_search_services',
  {
    title: 'Search AIEndpoint Registry',
    description: `Search the AIEndpoint registry for web services that expose a /ai endpoint.

Use this tool when you need to find an API or web service to accomplish a task. Services in the registry have machine-readable capability descriptions optimized for AI agents.

Args:
  - query (string, optional): Keyword search — matches service name and description
  - category (string, optional): Filter by category. One of: ecommerce, productivity, data, finance, media, communication, developer, ai, search, maps, weather, news
  - auth_type (string, optional): Filter by auth type. One of: none, apikey, oauth2, bearer
  - min_score (number, optional): Minimum compliance score 0–100. Use 70 for well-implemented services, 90 for gold-tier only.
  - sort (string, optional): Sort order — newest (default), score (highest first), name (A–Z)
  - limit (number, optional): Max results to return, 1–50 (default: 10)
  - offset (number, optional): Pagination offset (default: 0)

Returns:
  List of matching services with name, URL, description, category, and capability count.
  Each service has a /ai endpoint you can fetch with aiendpoint_fetch_ai_spec.

Examples:
  - Find payment APIs: query="payment"
  - Find free weather services: category="weather", auth_type="none"
  - Find high-quality weather services: category="weather", min_score=70
  - Find Korean e-commerce platforms: query="쇼핑", category="ecommerce"`,

    inputSchema: z.object({
      query:     z.string().max(200).optional().describe('Keyword search — matches name and description'),
      category:  z.string().optional().describe('Filter by category: ecommerce|productivity|data|finance|media|communication|developer|ai|search|maps|weather|news'),
      auth_type: z.string().optional().describe('Filter by auth type: none|apikey|oauth2|bearer'),
      min_score: z.number().int().min(0).max(100).optional().describe('Minimum compliance score 0–100 (70=good, 90=gold)'),
      sort:      z.enum(['newest', 'score', 'name']).optional().describe('Sort: newest (default) | score (highest first) | name (A–Z)'),
      limit:     z.number().int().min(1).max(50).default(10).describe('Max results (default: 10)'),
      offset:    z.number().int().min(0).default(0).describe('Pagination offset (default: 0)'),
    }).strict(),

    annotations: {
      readOnlyHint:    true,
      destructiveHint: false,
      idempotentHint:  true,
      openWorldHint:   true,
    },
  },
  async ({ query, category, auth_type, min_score, sort, limit, offset }) => {
    try {
      const params = new URLSearchParams()
      if (query)               params.set('q', query)
      if (category)            params.set('category', category)
      if (auth_type)           params.set('auth_type', auth_type)
      if (min_score !== undefined) params.set('min_score', String(min_score))
      if (sort)                params.set('sort', sort)
      params.set('limit', String(limit))
      params.set('page', String(Math.max(1, Math.floor(offset / limit) + 1)))

      const data = await apiFetch<ServicesResponse>(
        `${REGISTRY_BASE}/api/services?${params}`
      )

      const services = data.services ?? []
      const total    = data.total ?? services.length

      if (services.length === 0) {
        const hint = query ? `matching "${query}"` : 'with the given filters'
        return {
          content: [{ type: 'text', text: `No services found ${hint}. Try a broader query or different category.` }],
        }
      }

      const lines: string[] = [
        `## AIEndpoint Registry — Search Results`,
        `Found **${total}** services${query ? ` matching "${query}"` : ''}${category ? ` in category "${category}"` : ''} (showing ${services.length})`,
        '',
        ...services.map(formatService),
      ]

      if (total > offset + services.length) {
        lines.push('')
        lines.push(`*${total - offset - services.length} more results — use offset=${offset + limit} to see the next page*`)
      }

      const text = truncate(lines.join('\n'))

      return {
        content: [{ type: 'text', text }],
        structuredContent: {
          total,
          count:    services.length,
          offset,
          has_more: total > offset + services.length,
          ...(total > offset + services.length ? { next_offset: offset + limit } : {}),
          services: services.map(s => ({
            id:          s.id,
            name:        s.name,
            url:         s.url,
            ai_url:      s.ai_url,
            description: s.description,
            categories:  s.categories,
            auth_type:   s.auth_type,
            is_verified: s.is_verified,
            score:       s.score,
          })),
        },
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error searching registry: ${(err as Error).message}` }],
      }
    }
  }
)

// ── Tool 2: fetch_ai_spec ─────────────────────────────────────────────────────

server.registerTool(
  'aiendpoint_fetch_ai_spec',
  {
    title: 'Fetch /ai Spec from a Service',
    description: `Fetch the machine-readable /ai spec directly from a web service's URL.

Use this tool when you want to understand what a specific service can do — its capabilities, endpoints, parameters, and authentication requirements. The /ai spec is optimized for AI agents.

Args:
  - url (string, required): Base URL of the service (e.g. "https://api.stripe.com" or "https://stripe.com"). The tool will append /ai automatically.

Returns:
  The full /ai spec with:
  - service.name, service.description
  - capabilities[]: each with id, method, endpoint, params, returns
  - auth.type (none | apikey | oauth2 | bearer)
  - rate_limits (if provided)

Examples:
  - url="https://news-demo.aiendpoint.dev" → fetches https://news-demo.aiendpoint.dev/ai
  - url="https://stripe.com" → fetches https://stripe.com/ai (if they implement the standard)`,

    inputSchema: z.object({
      url: z.string().url().describe('Base URL of the service (the /ai path will be appended automatically)'),
    }).strict(),

    annotations: {
      readOnlyHint:    true,
      destructiveHint: false,
      idempotentHint:  true,
      openWorldHint:   true,
    },
  },
  async ({ url }) => {
    try {
      // Normalize: strip trailing slash, append /ai
      const base   = url.replace(/\/+$/, '')
      const aiUrl  = base.endsWith('/ai') ? base : `${base}/ai`

      const spec = await apiFetch<AiSpec>(aiUrl)

      // Validate minimal shape
      if (!spec.aiendpoint || !spec.service?.name) {
        return {
          content: [{ type: 'text', text: `Error: Response from ${aiUrl} does not appear to be a valid /ai spec (missing "aiendpoint" or "service.name" field).` }],
        }
      }

      const caps = spec.capabilities ?? []
      const lines: string[] = [
        `## ${spec.service.name}`,
        spec.service.description || '',
        '',
        `- **Auth**: ${spec.auth?.type ?? 'unknown'}`,
        `- **Category**: ${spec.service.category?.join(', ') || '—'}`,
        `- **Language**: ${spec.service.language?.join(', ') || '—'}`,
        `- **Capabilities**: ${caps.length}`,
        '',
      ]

      if (caps.length > 0) {
        lines.push('### Capabilities')
        lines.push(...caps.map(formatCapability))
      } else {
        lines.push('*No capabilities listed in this spec.*')
      }

      if (spec.auth?.docs) {
        lines.push('', `**Auth docs**: ${spec.auth.docs}`)
      }

      const text = truncate(lines.join('\n'))

      return {
        content: [{ type: 'text', text }],
        structuredContent: spec as unknown as Record<string, unknown>,
      }
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('HTTP 404')) {
        return { content: [{ type: 'text', text: `This service does not implement the /ai standard yet. Consider using aiendpoint_search_services to find alternatives, or aiendpoint_validate_service to check compliance status.` }] }
      }
      return { content: [{ type: 'text', text: `Error fetching /ai spec: ${msg}` }] }
    }
  }
)

// ── Tool 3: validate_service ──────────────────────────────────────────────────

server.registerTool(
  'aiendpoint_validate_service',
  {
    title: 'Validate Service /ai Endpoint',
    description: `Validate whether a web service correctly implements the /ai endpoint standard.

Use this tool to check if a service is /ai-compliant before attempting to use it, or to diagnose why a service's /ai spec might not be working correctly.

Args:
  - url (string, required): Base URL of the service to validate (e.g. "https://stripe.com")

Returns:
  - passed (boolean): Whether the /ai endpoint passes all required checks
  - score (number): Compliance score 0–100
  - grade (string): "Excellent" (90+) | "Good" (70+) | "Basic" (50+) | "Poor"
  - errors[]: Required fields that are missing or invalid
  - warnings[]: Recommended fields that are absent
  - passes[]: Checks that passed
  - token_efficiency: Token efficiency score and improvement suggestions

Notes:
  - Results are cached for 5 minutes to reduce load on services
  - A passing service has no errors (score can still vary based on optional fields)`,

    inputSchema: z.object({
      url: z.string().url().describe('Base URL of the service to validate (the /ai path will be appended automatically)'),
    }).strict(),

    annotations: {
      readOnlyHint:    true,
      destructiveHint: false,
      idempotentHint:  true,
      openWorldHint:   true,
    },
  },
  async ({ url }) => {
    try {
      const params = new URLSearchParams({ url })
      const data = await apiFetch<ValidateResponse>(
        `${REGISTRY_BASE}/api/validate?${params}`
      )

      const statusEmoji = data.passed ? '✅' : '❌'
      const cachedNote  = data.cached ? ' *(cached)*' : ''

      const lines: string[] = [
        `## Validation Result for ${data.url}${cachedNote}`,
        '',
        `${statusEmoji} **${data.passed ? 'Passed' : 'Failed'}** — Score: ${data.score}/100  ·  Grade: **${data.grade}**`,
        '',
      ]

      if (data.passes.length > 0) {
        lines.push(`### ✓ Passes (${data.passes.length})`)
        lines.push(...data.passes.map(p => `  ✓ ${p.field} — ${p.message}`))
        lines.push('')
      }

      if (data.warnings.length > 0) {
        lines.push(`### ⚠ Warnings (${data.warnings.length})`)
        lines.push(...data.warnings.map(w => `  ⚠ ${w.field} — ${w.message}`))
        lines.push('')
      }

      if (data.errors.length > 0) {
        lines.push(`### ✗ Errors (${data.errors.length})`)
        lines.push(...data.errors.map(e => `  ✗ ${e.field} — ${e.message}`))
        lines.push('')
      }

      if (data.token_efficiency?.issues?.length) {
        lines.push('### Token Efficiency Issues')
        lines.push(...data.token_efficiency.issues.map(i => `  • ${i}`))
        lines.push('')
      }

      if (data.capability_count > 0) {
        lines.push(`*${data.capability_count} capabilities found — use aiendpoint_fetch_ai_spec to see details*`)
      }

      const text = truncate(lines.join('\n'))

      return {
        content: [{ type: 'text', text }],
        structuredContent: {
          url:              data.url,
          passed:           data.passed,
          score:            data.score,
          grade:            data.grade,
          errors:           data.errors,
          warnings:         data.warnings,
          capability_count: data.capability_count,
          cached:           data.cached,
        },
      }
    } catch (err) {
      const msg = (err as Error).message
      return { content: [{ type: 'text', text: `Error validating service: ${msg}` }] }
    }
  }
)

// ─── Start ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[aiendpoint-mcp] Server started (stdio)')
}

main().catch(err => {
  console.error('[aiendpoint-mcp] Fatal error:', err)
  process.exit(1)
})
