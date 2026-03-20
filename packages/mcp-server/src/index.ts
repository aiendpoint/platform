#!/usr/bin/env node
/**
 * @aiendpoint/mcp-server
 *
 * MCP server that lets AI agents (Claude, Cursor, etc.) discover and connect
 * to web services via the AIEndpoint registry (aiendpoint.dev).
 *
 * Tools:
 *   aiendpoint_discover         — Auto-discover /ai spec for any website (direct → registry → generate)
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

interface CommunitySpecResponse {
  url: string
  ai_spec: AiSpec
  source: 'community'
  confidence: number
  contributors: number
  created_at: string
  updated_at: string
  ttl: number
  claimed: boolean
}

interface CommunitySubmitResponse {
  id: string
  url: string
  status: string
  confidence: number
  message: string
  previous_confidence?: number
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
      'User-Agent': 'AIEndpoint-MCP/0.3.0',
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
  version: '0.3.0',
})

// ── Tool 0: discover ─────────────────────────────────────────────────────────

server.registerTool(
  'aiendpoint_discover',
  {
    title: 'Auto-discover /ai Spec for Any Website',
    description: `Discover the /ai spec for any website through a 3-step fallback:

1. Try fetching the site's /ai endpoint directly
2. Check the AIEndpoint community registry for a cached spec
3. If neither exists, return site metadata so you (the agent) can generate a spec

Use this tool when you want to understand what any website can do — even if it hasn't implemented /ai yet.

After Step 3, you should:
  a. Generate an /ai spec JSON based on the returned site metadata
  b. Call aiendpoint_submit_community_spec to save it to the registry for future agents

Args:
  - url (string, required): Website URL (e.g. "https://github.com")
  - force_refresh (boolean, optional): Skip cache and re-discover (default: false)

Returns:
  - source: "direct" (site has /ai), "registry" (community cache hit), or "needs_generation" (you need to generate)
  - ai_spec: The /ai spec (if source is direct or registry)
  - site_meta: Page title, description, detected links (if source is needs_generation)
  - confidence: Spec confidence score 0-100`,

    inputSchema: z.object({
      url: z.string().url().describe('Website URL to discover'),
      force_refresh: z.boolean().default(false).describe('Skip cache and re-discover'),
    }).strict(),

    annotations: {
      readOnlyHint:    true,
      destructiveHint: false,
      idempotentHint:  true,
      openWorldHint:   true,
    },
  },
  async ({ url, force_refresh }) => {
    const base = url.replace(/\/+$/, '')

    // ── Step 1: Try direct /ai fetch ────────────────────────────────────
    if (!force_refresh) {
      try {
        const aiUrl = `${base}/ai`
        const spec = await apiFetch<AiSpec>(aiUrl)
        if (spec.aiendpoint && spec.service?.name) {
          const caps = spec.capabilities ?? []
          const text = [
            `## ${spec.service.name} (direct /ai)`,
            spec.service.description || '',
            '',
            `- **Source**: direct (site implements /ai)`,
            `- **Confidence**: 100`,
            `- **Auth**: ${spec.auth?.type ?? 'unknown'}`,
            `- **Capabilities**: ${caps.length}`,
            '',
            ...caps.map(formatCapability),
          ].join('\n')

          return {
            content: [{ type: 'text' as const, text: truncate(text) }],
            structuredContent: {
              source: 'direct',
              confidence: 100,
              ai_spec: spec,
              cached: false,
            },
          }
        }
      } catch {
        // Step 1 failed, continue to Step 2
      }
    }

    // ── Step 2: Check community registry ────────────────────────────────
    if (!force_refresh) {
      try {
        const encoded = encodeURIComponent(base)
        const community = await apiFetch<CommunitySpecResponse>(
          `${REGISTRY_BASE}/api/community/${encoded}`
        )
        if (community.ai_spec) {
          const spec = community.ai_spec
          const caps = spec.capabilities ?? []
          const text = [
            `## ${spec.service.name} (community registry)`,
            spec.service.description || '',
            '',
            `- **Source**: community registry`,
            `- **Confidence**: ${community.confidence}/100`,
            `- **Contributors**: ${community.contributors}`,
            `- **Auth**: ${spec.auth?.type ?? 'unknown'}`,
            `- **Capabilities**: ${caps.length}`,
            '',
            ...caps.map(formatCapability),
            '',
            community.claimed
              ? '*This spec has been verified by the site owner.*'
              : '*Community-generated spec — not verified by site owner.*',
          ].join('\n')

          return {
            content: [{ type: 'text' as const, text: truncate(text) }],
            structuredContent: {
              source: 'registry',
              confidence: community.confidence,
              ai_spec: spec,
              cached: true,
              ttl: community.ttl,
              contributors: community.contributors,
              claimed: community.claimed,
            },
          }
        }
      } catch {
        // Step 2 failed (404 or network), continue to Step 3
      }
    }

    // ── Step 3: Collect site metadata for agent-side generation ──────────
    let siteTitle = ''
    let siteDescription = ''
    let detectedLinks: string[] = []

    try {
      const res = await fetch(base, {
        headers: { 'User-Agent': 'AIEndpoint-MCP/0.3.0' },
        signal: AbortSignal.timeout(10_000),
        redirect: 'follow',
      })

      if (res.ok) {
        const html = await res.text()
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        if (titleMatch) siteTitle = titleMatch[1].trim()

        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
          ?? html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)
        if (descMatch) siteDescription = descMatch[1].trim()

        // Extract og:description as fallback
        if (!siteDescription) {
          const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
            ?? html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i)
          if (ogMatch) siteDescription = ogMatch[1].trim()
        }

        // Extract og:title as fallback
        if (!siteTitle) {
          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
          if (ogTitleMatch) siteTitle = ogTitleMatch[1].trim()
        }

        // Detect API-like links
        const linkRegex = /href=["'](\/api\/[^"']*|\/v[0-9]+\/[^"']*|\/docs[^"']*|\/developer[^"']*)/gi
        let match: RegExpExecArray | null
        const linkSet = new Set<string>()
        while ((match = linkRegex.exec(html)) !== null && linkSet.size < 20) {
          linkSet.add(match[1])
        }
        detectedLinks = [...linkSet]
      }
    } catch {
      // Site fetch failed — still return what we can
    }

    const text = [
      `## No /ai spec found for ${base}`,
      '',
      `The site does not have a /ai endpoint and no community spec exists yet.`,
      '',
      `### Site metadata`,
      siteTitle ? `- **Title**: ${siteTitle}` : '- **Title**: (not detected)',
      siteDescription ? `- **Description**: ${siteDescription}` : '- **Description**: (not detected)',
      detectedLinks.length > 0
        ? `- **Detected API paths**: ${detectedLinks.slice(0, 10).join(', ')}`
        : '- **Detected API paths**: none',
      '',
      `### Next steps`,
      `Based on the site metadata above, generate an /ai spec in this format:`,
      '```json',
      `{`,
      `  "aiendpoint": "1.0",`,
      `  "service": { "name": "...", "description": "...", "category": [...] },`,
      `  "capabilities": [{ "id": "...", "description": "...", "endpoint": "...", "method": "GET", "params": {...}, "returns": "..." }],`,
      `  "auth": { "type": "none|apikey|bearer|oauth2" }`,
      `}`,
      '```',
      '',
      `Then call **aiendpoint_submit_community_spec** with the URL and generated spec to save it for future agents.`,
    ].join('\n')

    return {
      content: [{ type: 'text' as const, text }],
      structuredContent: {
        source: 'needs_generation',
        confidence: 0,
        site_meta: {
          title: siteTitle || null,
          description: siteDescription || null,
          detected_links: detectedLinks,
        },
      },
    }
  }
)

// ── Tool 0b: submit_community_spec ──────────────────────────────────────────

server.registerTool(
  'aiendpoint_submit_community_spec',
  {
    title: 'Submit Community /ai Spec',
    description: `Submit a generated /ai spec to the AIEndpoint community registry.

Use this tool AFTER aiendpoint_discover returns source="needs_generation" and you have generated a spec.

The spec will be validated and scored for confidence. Higher-confidence specs replace lower ones. The spec is then available to all future agents via the registry.

Args:
  - url (string, required): The website URL this spec describes
  - ai_spec (object, required): The /ai spec JSON you generated

Returns:
  - status: "active" (new), "updated" (replaced lower confidence), "unchanged" (existing is better)
  - confidence: The confidence score assigned to this spec`,

    inputSchema: z.object({
      url: z.string().url().describe('Website URL this spec describes'),
      ai_spec: z.object({
        aiendpoint: z.string(),
        service: z.object({
          name: z.string(),
          description: z.string(),
          category: z.array(z.string()).optional(),
          language: z.array(z.string()).optional(),
        }),
        capabilities: z.array(z.object({
          id: z.string(),
          description: z.string(),
          endpoint: z.string(),
          method: z.string(),
          params: z.record(z.string()).optional(),
          returns: z.string().optional(),
        })).min(1),
        auth: z.object({
          type: z.string(),
          header: z.string().optional(),
          docs: z.string().optional(),
        }).optional(),
        token_hints: z.object({
          compact_mode: z.boolean().optional(),
          field_filtering: z.boolean().optional(),
          delta_support: z.boolean().optional(),
        }).optional(),
        rate_limits: z.object({
          requests_per_minute: z.number().optional(),
          agent_tier_available: z.boolean().optional(),
        }).optional(),
        meta: z.object({
          last_updated: z.string().optional(),
          changelog: z.string().optional(),
          status: z.string().optional(),
        }).optional(),
      }).describe('The /ai spec JSON'),
    }).strict(),

    annotations: {
      readOnlyHint:    false,
      destructiveHint: false,
      idempotentHint:  false,
      openWorldHint:   true,
    },
  },
  async ({ url, ai_spec }) => {
    try {
      const result = await apiFetch<CommunitySubmitResponse>(
        `${REGISTRY_BASE}/api/community`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, ai_spec }),
        }
      )

      const text = [
        `## Community Spec Submitted`,
        '',
        `- **URL**: ${result.url}`,
        `- **Status**: ${result.status}`,
        `- **Confidence**: ${result.confidence}/100`,
        result.previous_confidence !== undefined
          ? `- **Previous confidence**: ${result.previous_confidence}/100`
          : '',
        `- **Message**: ${result.message}`,
        '',
        'The spec is now available in the registry for all future agents.',
      ].filter(Boolean).join('\n')

      return {
        content: [{ type: 'text' as const, text }],
        structuredContent: result as unknown as Record<string, unknown>,
      }
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('429')) {
        return { content: [{ type: 'text' as const, text: 'Rate limit exceeded — try again later (max 10 submissions per hour).' }] }
      }
      if (msg.includes('409')) {
        return { content: [{ type: 'text' as const, text: 'This service already has an official /ai endpoint registered by its owner. No community spec needed.' }] }
      }
      return { content: [{ type: 'text' as const, text: `Error submitting community spec: ${msg}` }] }
    }
  }
)

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
