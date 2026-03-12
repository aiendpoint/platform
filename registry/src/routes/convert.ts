/**
 * POST /api/convert/openapi
 *
 * Converts an OpenAPI 2.x (Swagger) or OpenAPI 3.x spec into the /ai endpoint format.
 *
 * Body (JSON):
 *   { spec_url: string }   — URL to a publicly accessible OpenAPI JSON/YAML (JSON only)
 *   { spec: object }       — Raw OpenAPI spec object pasted directly
 *
 * Returns:
 *   { converted: AiEndpointSpec, capability_count: number, source_url?: string }
 */

import type { FastifyInstance } from 'fastify'
import type { AiEndpointSpec, AiCapability } from '../types/index.js'

interface ConvertBody {
  spec_url?: string
  spec?: Record<string, unknown>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSnakeId(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 64)
}

function extractBaseUrl(raw: Record<string, unknown>): string | undefined {
  // OpenAPI 3.x
  const servers = raw.servers as Array<{ url?: string }> | undefined
  if (servers?.[0]?.url) return servers[0].url

  // Swagger 2.x
  const host = raw.host as string | undefined
  if (host) {
    const scheme = ((raw.schemes as string[]) ?? ['https'])[0]
    const basePath = (raw.basePath as string | undefined) ?? ''
    return `${scheme}://${host}${basePath}`
  }
  return undefined
}

// ─── Core conversion ─────────────────────────────────────────────────────────

function convertOpenApiToAi(raw: Record<string, unknown>): AiEndpointSpec {
  const isV3 = typeof raw.openapi === 'string' && raw.openapi.startsWith('3.')
  const isV2 = typeof raw.swagger === 'string' && raw.swagger.startsWith('2.')

  if (!isV3 && !isV2) {
    throw new Error('Not a valid OpenAPI 2.x or 3.x spec (missing "openapi" or "swagger" field)')
  }

  const info = (raw.info ?? {}) as Record<string, unknown>
  const paths = (raw.paths ?? {}) as Record<string, Record<string, unknown>>

  // ── Service metadata ──────────────────────────────────────────────────────
  const name        = String(info.title ?? 'Unknown Service').slice(0, 80)
  const description = String(info.description ?? `${name} API`).slice(0, 300)

  // Tags → category (first 4, lowercase snake_case)
  const rawTags  = raw.tags as Array<{ name: string }> | undefined
  const category = rawTags?.slice(0, 4).map(t => toSnakeId(t.name)) ?? []

  // ── Auth ──────────────────────────────────────────────────────────────────
  let auth: AiEndpointSpec['auth'] | undefined

  if (isV3) {
    const schemes = (raw.components as Record<string, unknown>)
      ?.securitySchemes as Record<string, { type: string; scheme?: string }> | undefined

    const first = schemes ? Object.values(schemes)[0] : undefined
    if (first) {
      if (first.type === 'apiKey')                                 auth = { type: 'apikey' }
      else if (first.type === 'oauth2')                            auth = { type: 'oauth2' }
      else if (first.type === 'http' && first.scheme === 'bearer') auth = { type: 'bearer' }
    }
  } else {
    const secDefs = raw.securityDefinitions as Record<string, { type: string }> | undefined
    const first   = secDefs ? Object.values(secDefs)[0] : undefined
    if (first) {
      if (first.type === 'apiKey') auth = { type: 'apikey' }
      else if (first.type === 'oauth2') auth = { type: 'oauth2' }
    }
  }

  // ── Capabilities (max 20) ─────────────────────────────────────────────────
  const capabilities: AiCapability[] = []
  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']

  outer: for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      if (capabilities.length >= 20) break outer
      const op = pathItem[method] as Record<string, unknown> | undefined
      if (!op) continue

      // ID
      const rawId = (op.operationId as string | undefined) ??
        `${method}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`
      const id = toSnakeId(rawId)

      // Description
      const desc = String(op.summary ?? op.description ?? `${method.toUpperCase()} ${path}`).slice(0, 200)

      // Params (query + path params)
      const params: Record<string, string> = {}
      const parameters = op.parameters as Array<Record<string, unknown>> | undefined
      if (parameters) {
        for (const p of parameters) {
          if (p.in !== 'query' && p.in !== 'path') continue
          const schema   = p.schema as Record<string, unknown> | undefined
          const pType    = String(schema?.type ?? p.type ?? 'string')
          const required = p.required ? 'required' : 'optional'
          const pDesc    = p.description ? ` — ${String(p.description).slice(0, 60)}` : ''
          params[String(p.name)] = `${pType} (${required}${pDesc})`
        }
      }

      // Request body params (OpenAPI 3 only, simplified)
      if (isV3) {
        const body = op.requestBody as Record<string, unknown> | undefined
        const content = body?.content as Record<string, { schema?: Record<string, unknown> }> | undefined
        const jsonSchema = content?.['application/json']?.schema
        if (jsonSchema?.properties) {
          const required = (jsonSchema.required as string[]) ?? []
          for (const [pName, pDef] of Object.entries(jsonSchema.properties as Record<string, { type?: string; description?: string }>)) {
            const pType = pDef.type ?? 'string'
            const req   = required.includes(pName) ? 'required' : 'optional'
            const pDesc = pDef.description ? ` — ${pDef.description.slice(0, 60)}` : ''
            params[pName] = `${pType} (${req}${pDesc})`
          }
        }
      }

      // Returns
      const responses  = op.responses as Record<string, { description?: string }> | undefined
      const okResponse = responses?.['200'] ?? responses?.['201']
      const returns    = okResponse?.description
        ? String(okResponse.description).slice(0, 200)
        : undefined

      capabilities.push({ id, description: desc, endpoint: path, method: method.toUpperCase(), params, returns })
    }
  }

  return {
    aiendpoint:  '1.0',
    service:     { name, description, ...(category.length > 0 && { category }) },
    capabilities,
    ...(auth && { auth }),
    meta: { last_updated: new Date().toISOString().split('T')[0] },
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function convertRoute(app: FastifyInstance) {
  app.post<{ Body: ConvertBody }>('/api/convert/openapi', async (req, reply) => {
    const { spec_url, spec } = req.body ?? {}

    if (!spec_url && !spec) {
      return reply.status(400).send({ error: 'Provide "spec_url" or "spec"', code: 'MISSING_PARAM' })
    }

    let raw: Record<string, unknown>

    if (spec_url) {
      let url: URL
      try { url = new URL(spec_url) } catch {
        return reply.status(400).send({ error: 'Invalid spec_url', code: 'INVALID_URL' })
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        return reply.status(400).send({ error: 'spec_url must use http or https', code: 'INVALID_URL' })
      }
      try {
        const res = await fetch(spec_url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        raw = await res.json()
      } catch (e) {
        return reply.status(422).send({
          error: `Failed to fetch spec: ${(e as Error).message}`,
          code: 'FETCH_FAILED',
        })
      }
    } else {
      raw = spec!
    }

    let converted: AiEndpointSpec
    try {
      converted = convertOpenApiToAi(raw)
    } catch (e) {
      return reply.status(422).send({ error: (e as Error).message, code: 'INVALID_SPEC' })
    }

    const sourceUrl = extractBaseUrl(raw)

    reply.send({
      converted,
      capability_count: converted.capabilities.length,
      ...(sourceUrl && { source_url: sourceUrl }),
    })
  })
}
