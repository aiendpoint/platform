import type { AiEndpointSpec, ValidationIssue } from '../types/index.js'

// ─── Token efficiency report ────────────────────────────────────────────────

export interface TokenEfficiency {
  spec_token_estimate: number       // rough token count for the full /ai response
  description_length: number        // service.description char length
  avg_capability_description: number // avg chars of capability descriptions
  has_token_hints: boolean
  returns_specific_count: number    // capabilities with field-level returns
  capability_count: number
  issues: string[]                  // improvement suggestions
  score: number                     // 0–15
}

// ─── Validation result ──────────────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean
  score: number
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  passes: ValidationIssue[]
  response_ms: number | null
  spec_version: string | null
  ai_url: string | null
  capability_count: number
  raw_response: unknown
  token_efficiency: TokenEfficiency | null
}

// ─── Main validator ────────────────────────────────────────────────────────

export async function validateAiEndpoint(url: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: false,
    score: 0,
    errors: [],
    warnings: [],
    passes: [],
    response_ms: null,
    spec_version: null,
    ai_url: null,
    capability_count: 0,
    raw_response: null,
    token_efficiency: null,
  }

  const base = url.replace(/\/$/, '')
  const aiUrls = [`${base}/ai`, `${base}/.well-known/ai`]

  // ── Group 1: Connectivity (15pts) ────────────────────────────────────────
  let spec: unknown = null

  for (const aiUrl of aiUrls) {
    const fetched = await fetchWithTimeout(aiUrl, 3000)
    if (fetched.ok && fetched.data !== null) {
      result.ai_url = aiUrl
      result.response_ms = fetched.ms
      spec = fetched.data
      break
    }
  }

  if (!spec) {
    result.errors.push({
      field: 'endpoint',
      message: `No /ai endpoint found. Tried: ${aiUrls.join(', ')}`,
      code: 'NO_AI_ENDPOINT'
    })
    return result
  }

  result.score += 10 // reachable
  result.passes.push({ field: 'endpoint', message: `Endpoint reachable (${result.response_ms}ms)`, code: 'OK' })

  if (result.response_ms !== null && result.response_ms <= 3000) {
    result.score += 5
    result.passes.push({ field: 'response_time', message: `Response time ${result.response_ms}ms ≤ 3000ms`, code: 'OK' })
  }

  // ── JSON object check ────────────────────────────────────────────────────
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    result.errors.push({
      field: 'response',
      message: 'Response is not a valid JSON object',
      code: 'INVALID_JSON'
    })
    return result
  }

  result.raw_response = spec
  const s = spec as Record<string, unknown>

  // ── Group 2: Required fields (35pts) ─────────────────────────────────────

  // aiendpoint version (9pts)
  if (!s['aiendpoint']) {
    result.errors.push({ field: 'aiendpoint', message: 'Required field "aiendpoint" is missing', code: 'MISSING_VERSION' })
  } else {
    result.spec_version = String(s['aiendpoint'])
    result.score += 9
    result.passes.push({ field: 'aiendpoint', message: `Version "${result.spec_version}" present`, code: 'OK' })
  }

  const service = s['service'] as Record<string, unknown> | undefined

  if (!service || typeof service !== 'object') {
    result.errors.push({ field: 'service', message: 'Required field "service" is missing', code: 'MISSING_SERVICE' })
  } else {
    // service.name (9pts)
    if (!service['name'] || typeof service['name'] !== 'string' || service['name'].trim() === '') {
      result.errors.push({ field: 'service.name', message: 'Required field "service.name" is missing', code: 'MISSING_SERVICE_NAME' })
    } else {
      result.score += 9
      result.passes.push({ field: 'service.name', message: `Service name "${service['name']}" present`, code: 'OK' })
    }

    // service.description (9pts)
    if (!service['description'] || typeof service['description'] !== 'string' || service['description'].trim() === '') {
      result.errors.push({ field: 'service.description', message: 'Required field "service.description" is missing', code: 'MISSING_DESCRIPTION' })
    } else {
      result.score += 9
      result.passes.push({ field: 'service.description', message: 'Description present', code: 'OK' })
    }
  }

  // capabilities (8pts)
  const capabilities = s['capabilities']
  if (!Array.isArray(capabilities)) {
    result.errors.push({ field: 'capabilities', message: '"capabilities" must be an array', code: 'INVALID_CAPABILITIES' })
  } else if (capabilities.length === 0) {
    result.errors.push({ field: 'capabilities', message: '"capabilities" must have at least one entry', code: 'EMPTY_CAPABILITIES' })
  } else {
    result.capability_count = capabilities.length
    result.score += 8
    result.passes.push({ field: 'capabilities', message: `${capabilities.length} capability/capabilities present`, code: 'OK' })

    // ── Group 3: Capability quality (20pts) ────────────────────────────────
    let capTotalScore = 0
    for (const cap of capabilities) {
      const c = cap as Record<string, unknown>
      const capId = String(c['id'] ?? '(unknown)')

      if (c['id'] && c['description'] && c['endpoint'] && c['method']) {
        capTotalScore += 5

        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(String(c['method']))) {
          result.warnings.push({
            field: `capabilities[${capId}].method`,
            message: `Invalid method "${c['method']}" — expected GET|POST|PUT|DELETE|PATCH`,
            code: 'INVALID_METHOD'
          })
        } else {
          capTotalScore += 2
        }

        if (!c['returns']) {
          result.warnings.push({
            field: `capabilities[${capId}].returns`,
            message: `Capability "${capId}" has no "returns" description`,
            code: 'MISSING_RETURNS'
          })
        } else {
          capTotalScore += 3
        }
      } else {
        result.warnings.push({
          field: `capabilities[${capId}]`,
          message: `Capability "${capId}" is missing one of: id, description, endpoint, method`,
          code: 'INCOMPLETE_CAPABILITY'
        })
      }
    }
    // Normalize to 0-20 based on % of perfect score per capability
    const capQualityPct = capTotalScore / (capabilities.length * 10)
    result.score += Math.min(20, Math.round(capQualityPct * 20))
  }

  // ── Group 4: Recommended fields (15pts) ─────────────────────────────────
  const svc = s['service'] as Record<string, unknown> | undefined

  if (!svc?.['category'] || !Array.isArray(svc['category']) || (svc['category'] as unknown[]).length === 0) {
    result.warnings.push({
      field: 'service.category',
      message: '"service.category" not present — recommended for search discoverability',
      code: 'MISSING_CATEGORY'
    })
  } else {
    result.score += 5
    result.passes.push({ field: 'service.category', message: `Categories: ${(svc['category'] as string[]).join(', ')}`, code: 'OK' })
  }

  if (!s['auth']) {
    result.warnings.push({
      field: 'auth',
      message: '"auth" field not present — agents cannot determine authentication requirements',
      code: 'MISSING_AUTH'
    })
  } else {
    result.score += 5
    result.passes.push({ field: 'auth', message: 'Auth field present', code: 'OK' })
  }

  const meta = s['meta'] as Record<string, unknown> | undefined
  if (!meta?.['last_updated']) {
    result.warnings.push({
      field: 'meta.last_updated',
      message: '"meta.last_updated" not present — agents cannot determine freshness',
      code: 'MISSING_LAST_UPDATED'
    })
  } else {
    result.score += 5
    result.passes.push({ field: 'meta.last_updated', message: `Last updated: ${meta['last_updated']}`, code: 'OK' })
  }

  // ── Group 5: Token efficiency (15pts) ───────────────────────────────────
  const caps = Array.isArray(capabilities) ? capabilities : []
  result.token_efficiency = computeTokenEfficiency(s, caps)
  result.score += result.token_efficiency.score

  // ── Final judgment ────────────────────────────────────────────────────────
  result.score = Math.min(100, result.score)
  result.passed = result.errors.length === 0

  return result
}

// ─── Token efficiency computation ──────────────────────────────────────────

function computeTokenEfficiency(
  spec: Record<string, unknown>,
  capabilities: unknown[]
): TokenEfficiency {
  const issues: string[] = []
  let score = 0

  // Spec token estimate (~4 chars per token)
  const specTokenEstimate = Math.ceil(JSON.stringify(spec).length / 4)

  // 1. service.description length (4pts)
  const service = spec['service'] as Record<string, unknown> | undefined
  const descriptionLength = typeof service?.['description'] === 'string'
    ? service['description'].length
    : 0

  if (descriptionLength > 0) {
    if (descriptionLength < 20) {
      issues.push(`service.description too short (${descriptionLength} chars — recommend 20–150)`)
      score += 2
    } else if (descriptionLength <= 150) {
      score += 4
    } else {
      issues.push(`service.description too long (${descriptionLength} chars — recommend ≤ 150 for token efficiency)`)
      score += 2
    }
  }

  // 2. token_hints presence (4pts)
  const hasTokenHints = !!spec['token_hints']
  if (hasTokenHints) {
    score += 4
  } else {
    issues.push('Add "token_hints" object — declare compact_mode and field_filtering support')
  }

  // 3. Capability description conciseness (3pts)
  const avgCapDesc = capabilities.length > 0
    ? capabilities.reduce((sum: number, cap) => {
        const c = cap as Record<string, unknown>
        return sum + (typeof c['description'] === 'string' ? c['description'].length : 0)
      }, 0) / capabilities.length
    : 0

  if (capabilities.length > 0) {
    if (avgCapDesc < 10) {
      issues.push(`Capability descriptions too short (avg ${Math.round(avgCapDesc)} chars — recommend 10–100)`)
    } else if (avgCapDesc <= 100) {
      score += 3
    } else {
      issues.push(`Capability descriptions too verbose (avg ${Math.round(avgCapDesc)} chars — recommend ≤ 100)`)
      score += 1
    }
  }

  // 4. Returns field specificity (4pts)
  // "Specific" = mentions field names (contains comma or bracket patterns like "id, name" or "items[]")
  const returnsSpecificCount = capabilities.filter(cap => {
    const c = cap as Record<string, unknown>
    const ret = String(c['returns'] ?? '')
    return ret.length > 5 && (ret.includes(',') || ret.includes('[') || /\bwith\b/.test(ret))
  }).length

  if (capabilities.length > 0) {
    const ratio = returnsSpecificCount / capabilities.length
    score += Math.round(ratio * 4)
    if (ratio < 0.5) {
      const missing = capabilities.length - returnsSpecificCount
      issues.push(
        `${missing} of ${capabilities.length} capabilities have generic "returns" — ` +
        'specify field names (e.g., "items[] with id, name, price")'
      )
    }
  }

  return {
    spec_token_estimate: specTokenEstimate,
    description_length: descriptionLength,
    avg_capability_description: Math.round(avgCapDesc),
    has_token_hints: hasTokenHints,
    returns_specific_count: returnsSpecificCount,
    capability_count: capabilities.length,
    issues,
    score: Math.min(15, score),
  }
}

// ─── Badge grade helper ────────────────────────────────────────────────────

export function getScoreGrade(score: number): { grade: string; badge: string } {
  if (score >= 90) return { grade: 'Excellent', badge: 'ai-ready-gold' }
  if (score >= 70) return { grade: 'Good',      badge: 'ai-ready' }
  if (score >= 50) return { grade: 'Basic',     badge: 'ai-compatible' }
  return               { grade: 'Poor',       badge: 'none' }
}

// ─── Parse validated spec into DB-ready shape ──────────────────────────────

export function parseSpec(spec: unknown): AiEndpointSpec {
  return spec as AiEndpointSpec
}

// ─── Fetch helper with timeout ─────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<{ ok: boolean; ms: number; data: unknown }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AIEndpoint-Validator/1.0' }
    })
    clearTimeout(timer)
    const ms = Date.now() - start
    if (!res.ok) return { ok: false, ms, data: null }
    const data: unknown = await res.json()
    return { ok: true, ms, data }
  } catch {
    return { ok: false, ms: Date.now() - start, data: null }
  }
}
