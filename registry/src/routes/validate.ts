import type { FastifyInstance } from 'fastify'
import { validateAiEndpoint, getScoreGrade } from '../services/validator.js'

export async function validateRoute(app: FastifyInstance) {
  app.get<{ Querystring: { url?: string } }>('/api/validate', async (req, reply) => {
    const { url } = req.query

    if (!url) {
      return reply.status(400).send({ error: '"url" parameter is required', code: 'MISSING_PARAM' })
    }

    // Basic URL validation
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return reply.status(400).send({ error: 'Invalid URL format', code: 'INVALID_URL' })
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return reply.status(400).send({ error: 'URL must use http or https', code: 'INVALID_URL' })
    }

    const result = await validateAiEndpoint(url)
    const { grade } = getScoreGrade(result.score)

    reply.send({
      url,
      ai_url: result.ai_url,
      passed: result.passed,
      score: result.score,
      grade,
      spec_version: result.spec_version,
      response_ms: result.response_ms,
      capability_count: result.capability_count,
      errors: result.errors,
      warnings: result.warnings,
      passes: result.passes,
      checked_at: new Date().toISOString()
    })
  })
}
