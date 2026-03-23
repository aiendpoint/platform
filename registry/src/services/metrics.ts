/**
 * ─── Metrics Collection ─────────────────────────────────────────────────────
 *
 * Fire-and-forget metrics collection for research data.
 * All functions are non-blocking — failures are silently logged.
 *
 * Tables:
 *   - token_benchmarks: /ai vs HTML token efficiency comparison
 *   - discovery_events: MCP tool usage and fallback step tracking
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db } from '../db/index.js'

// ─── Token estimation ───────────────────────────────────────────────────────

/** Rough token estimate: ~4 chars per token for English/JSON, ~1.5 for CJK */
export function estimateTokens(text: string): number {
  // Count ASCII vs non-ASCII characters
  let ascii = 0
  let nonAscii = 0
  for (const ch of text) {
    if (ch.charCodeAt(0) < 128) ascii++
    else nonAscii++
  }
  return Math.ceil(ascii / 4 + nonAscii / 1.5)
}

/** Count top-level and nested fields in a JSON object */
export function countFields(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0
  if (Array.isArray(obj)) {
    return obj.reduce((sum: number, item) => sum + countFields(item), 0)
  }
  let count = 0
  for (const value of Object.values(obj)) {
    count++
    if (typeof value === 'object' && value !== null) {
      count += countFields(value)
    }
  }
  return count
}

// ─── HTML fetch for comparison ──────────────────────────────────────────────

interface HtmlMetrics {
  bytes: number
  tokens: number
  responseMs: number
}

async function fetchHtmlMetrics(url: string): Promise<HtmlMetrics | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const start = Date.now()
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AIEndpoint-Metrics/1.0',
        'Accept': 'text/html',
      },
    })
    clearTimeout(timer)
    const ms = Date.now() - start

    if (!res.ok) return null

    const html = await res.text()
    return {
      bytes: new TextEncoder().encode(html).length,
      tokens: estimateTokens(html),
      responseMs: ms,
    }
  } catch {
    return null
  }
}

// ─── Token benchmark recording ──────────────────────────────────────────────

export interface TokenBenchmarkInput {
  url: string
  serviceId?: string
  aiResponseJson: string
  aiResponseMs?: number
  capabilityCount: number
  specVersion?: string
  source?: 'validation' | 'registration' | 'monitor'
}

/**
 * Records a token benchmark comparing /ai response vs HTML homepage.
 * Fetches the homepage HTML in parallel. Fire-and-forget.
 */
export function recordTokenBenchmark(input: TokenBenchmarkInput): void {
  _recordTokenBenchmark(input).catch(() => {})
}

async function _recordTokenBenchmark(input: TokenBenchmarkInput): Promise<void> {
  const { url, serviceId, aiResponseJson, aiResponseMs, capabilityCount, specVersion, source = 'validation' } = input

  let domain: string
  try {
    domain = new URL(url).hostname
  } catch {
    return
  }

  const aiBytes = new TextEncoder().encode(aiResponseJson).length
  const aiTokens = estimateTokens(aiResponseJson)
  const aiFields = countFields(JSON.parse(aiResponseJson))

  // Fetch HTML for comparison
  const baseUrl = new URL(url).origin
  const html = await fetchHtmlMetrics(baseUrl)

  const tokenRatio = html && html.tokens > 0
    ? parseFloat((html.tokens / aiTokens).toFixed(2))
    : null
  const efficiencyGain = tokenRatio
    ? parseFloat(((1 - 1 / tokenRatio) * 100).toFixed(2))
    : null

  await db.from('token_benchmarks').insert({
    url,
    domain,
    service_id: serviceId ?? null,
    ai_bytes: aiBytes,
    ai_tokens: aiTokens,
    ai_fields: aiFields,
    ai_response_ms: aiResponseMs ?? null,
    html_bytes: html?.bytes ?? null,
    html_tokens: html?.tokens ?? null,
    html_response_ms: html?.responseMs ?? null,
    token_ratio: tokenRatio,
    efficiency_gain_pct: efficiencyGain,
    capability_count: capabilityCount,
    spec_version: specVersion ?? null,
    source,
  })
}

// ─── Discovery event recording ──────────────────────────────────────────────

export interface DiscoveryEventInput {
  url: string
  step: 'direct' | 'registry' | 'generation' | 'failed'
  success: boolean
  responseMs?: number
  tool?: string
  confidence?: number
  errorCode?: string
  agentHash?: string
}

/**
 * Records a discovery event. Fire-and-forget.
 */
export function recordDiscoveryEvent(input: DiscoveryEventInput): void {
  _recordDiscoveryEvent(input).catch(() => {})
}

async function _recordDiscoveryEvent(input: DiscoveryEventInput): Promise<void> {
  let domain: string
  try {
    domain = new URL(input.url).hostname
  } catch {
    return
  }

  await db.from('discovery_events').insert({
    url: input.url,
    domain,
    step: input.step,
    success: input.success,
    response_ms: input.responseMs ?? null,
    tool: input.tool ?? 'aiendpoint_discover',
    confidence: input.confidence ?? null,
    error_code: input.errorCode ?? null,
    agent_hash: input.agentHash ?? null,
  })
}
