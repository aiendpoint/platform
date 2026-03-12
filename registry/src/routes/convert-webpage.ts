/**
 * POST /api/convert/webpage
 *
 * Analyzes a webpage URL and generates a /ai endpoint spec.
 *
 * Layer 1 (always):  HTML meta/og tag extraction → basic spec
 * Layer 2 (if GEMINI_API_KEY set): Gemini 1.5 Flash → enhanced spec with inferred capabilities
 *
 * Body: { url: string }
 * Returns: { converted, capability_count, source_url, ai_enhanced, method }
 */

import type { FastifyInstance } from 'fastify'
import { analyzeWebpage, geminiAvailable } from '../services/gemini.js'

interface ConvertWebpageBody {
  url: string
}

export async function convertWebpageRoute(app: FastifyInstance) {
  app.get('/api/convert/webpage/status', async (_req, reply) => {
    reply.send({ ai_available: geminiAvailable() })
  })

  app.post<{ Body: ConvertWebpageBody }>('/api/convert/webpage', async (req, reply) => {
    const { url } = req.body ?? {}

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: '"url" is required', code: 'MISSING_PARAM' })
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

    // Fetch the webpage
    let html: string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AIEndpoint-Bot/1.0 (+https://aiendpoint.dev)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        return reply.status(422).send({
          error: `Webpage returned HTTP ${res.status}`,
          code: 'FETCH_FAILED',
        })
      }
      html = await res.text()
    } catch (e) {
      return reply.status(422).send({
        error: `Failed to fetch webpage: ${(e as Error).message}`,
        code: 'FETCH_FAILED',
      })
    }

    // Analyze (meta extraction + optional Gemini)
    let result
    try {
      result = await analyzeWebpage(url, html)
    } catch (e) {
      return reply.status(500).send({
        error: `Analysis failed: ${(e as Error).message}`,
        code: 'ANALYSIS_FAILED',
      })
    }

    reply.send({
      converted:        result.spec,
      capability_count: result.spec.capabilities.length,
      source_url:       parsed.origin,
      ai_enhanced:      result.ai_enhanced,
      method:           result.method,
    })
  })
}
