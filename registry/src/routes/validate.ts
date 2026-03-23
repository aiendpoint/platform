/**
 * ⚠️  CACHE: Results are cached in Redis for 300 s (5 min).
 *     Cache key: validate:v1:<url>
 *     Response includes `cached` (bool) and `cache_expires_at` (ISO timestamp).
 *     If Redis env vars are absent the route works without caching.
 */
import type { FastifyInstance } from 'fastify'
import { validateAiEndpoint, getScoreGrade } from '../services/validator.js'
import { cacheGet, cacheSet, cacheTtl } from '../cache/index.js'
import { recordTokenBenchmark } from '../services/metrics.js'

const VALIDATE_TTL = 300 // 5 minutes

export async function validateRoute(app: FastifyInstance) {
  app.get<{ Querystring: { url?: string } }>('/api/validate', async (req, reply) => {
    const { url } = req.query

    if (!url) {
      return reply.status(400).send({ error: '"url" parameter is required', code: 'MISSING_PARAM' })
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return reply.status(400).send({ error: 'Invalid URL format', code: 'INVALID_URL' })
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return reply.status(400).send({ error: 'URL must use http or https', code: 'INVALID_URL' })
    }

    const cacheKey = `validate:v1:${url}`

    // ── Cache hit ─────────────────────────────────────────────────────────────
    const cached = await cacheGet<Record<string, unknown>>(cacheKey)
    if (cached) {
      const remainingTtl = await cacheTtl(cacheKey)
      const expiresAt = new Date(Date.now() + remainingTtl * 1000).toISOString()
      return reply.send({ ...cached, cached: true, cache_expires_at: expiresAt })
    }

    // ── Fresh validation ──────────────────────────────────────────────────────
    const result = await validateAiEndpoint(url)
    const { grade } = getScoreGrade(result.score)

    const expiresAt = new Date(Date.now() + VALIDATE_TTL * 1000).toISOString()

    const response = {
      url,
      ai_url:           result.ai_url,
      passed:           result.passed,
      score:            result.score,
      grade,
      spec_version:     result.spec_version,
      response_ms:      result.response_ms,
      capability_count: result.capability_count,
      errors:           result.errors,
      warnings:         result.warnings,
      passes:           result.passes,
      token_efficiency: result.token_efficiency,
      checked_at:       new Date().toISOString(),
      cached:           false,
      cache_expires_at: expiresAt,
    }

    // Only cache successful fetches (passed or meaningful errors — not connection failures)
    if (result.ai_url !== null || result.errors.some(e => e.code !== 'NO_AI_ENDPOINT')) {
      await cacheSet(cacheKey, response, VALIDATE_TTL)
    }

    // Record token benchmark (fire-and-forget)
    if (result.raw_response && result.passed) {
      recordTokenBenchmark({
        url,
        aiResponseJson: JSON.stringify(result.raw_response),
        aiResponseMs: result.response_ms ?? undefined,
        capabilityCount: result.capability_count,
        specVersion: result.spec_version ?? undefined,
        source: 'validation',
      })
    }

    reply.send(response)
  })
}
