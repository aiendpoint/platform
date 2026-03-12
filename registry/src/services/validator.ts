import type { AiEndpointSpec, ValidationIssue } from '../types/index.js'

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
    raw_response: null
  }

  const base = url.replace(/\/$/, '')
  const aiUrls = [`${base}/ai`, `${base}/.well-known/ai`]

  // ── Group 1: Connectivity (20pts) ────────────────────────────────────────
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

  // ── Group 2: Required fields (40pts) ─────────────────────────────────────

  // aiendpoint version
  if (!s['aiendpoint']) {
    result.errors.push({ field: 'aiendpoint', message: 'Required field "aiendpoint" is missing', code: 'MISSING_VERSION' })
  } else {
    result.spec_version = String(s['aiendpoint'])
    result.score += 10
    result.passes.push({ field: 'aiendpoint', message: `Version "${result.spec_version}" present`, code: 'OK' })
  }

  const service = s['service'] as Record<string, unknown> | undefined

  if (!service || typeof service !== 'object') {
    result.errors.push({ field: 'service', message: 'Required field "service" is missing', code: 'MISSING_SERVICE' })
  } else {
    if (!service['name'] || typeof service['name'] !== 'string' || service['name'].trim() === '') {
      result.errors.push({ field: 'service.name', message: 'Required field "service.name" is missing', code: 'MISSING_SERVICE_NAME' })
    } else {
      result.score += 10
      result.passes.push({ field: 'service.name', message: `Service name "${service['name']}" present`, code: 'OK' })
    }

    if (!service['description'] || typeof service['description'] !== 'string' || service['description'].trim() === '') {
      result.errors.push({ field: 'service.description', message: 'Required field "service.description" is missing', code: 'MISSING_DESCRIPTION' })
    } else {
      result.score += 10
      result.passes.push({ field: 'service.description', message: 'Description present', code: 'OK' })
    }
  }

  const capabilities = s['capabilities']
  if (!Array.isArray(capabilities)) {
    result.errors.push({ field: 'capabilities', message: '"capabilities" must be an array', code: 'INVALID_CAPABILITIES' })
  } else if (capabilities.length === 0) {
    result.errors.push({ field: 'capabilities', message: '"capabilities" must have at least one entry', code: 'EMPTY_CAPABILITIES' })
  } else {
    result.capability_count = capabilities.length
    result.score += 10
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
    result.score += Math.min(20, Math.round(capTotalScore / capabilities.length))
  }

  // ── Group 4: Recommended fields (20pts) ────────────────────────────────
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

  if (!s['token_hints']) {
    result.warnings.push({
      field: 'token_hints',
      message: '"token_hints" not present — recommended for token efficiency',
      code: 'MISSING_TOKEN_HINTS'
    })
  } else {
    result.score += 5
    result.passes.push({ field: 'token_hints', message: 'Token hints present', code: 'OK' })
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

  // ── Final judgment ────────────────────────────────────────────────────────
  result.score = Math.min(100, result.score)
  result.passed = result.errors.length === 0

  return result
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
