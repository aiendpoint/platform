import type { FastifyInstance } from 'fastify'
import { db } from '../../db/index.js'
import { validateAiEndpoint, getScoreGrade, parseSpec } from '../../services/validator.js'
import { cacheDelPattern } from '../../cache/index.js'
import type { AuthType, HttpMethod } from '../../types/index.js'

interface RegisterBody {
  url: string
  owner_email?: string
}

export async function serviceRegisterRoute(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/api/services', async (req, reply) => {
    const { url, owner_email } = req.body ?? {}

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: '"url" is required', code: 'MISSING_PARAM' })
    }

    // Validate URL format
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return reply.status(400).send({ error: 'Invalid URL format', code: 'INVALID_URL' })
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return reply.status(400).send({ error: 'URL must use http or https', code: 'INVALID_URL' })
    }

    const normalizedUrl = parsed.origin // strip trailing paths

    // Check duplicate
    const { data: existing } = await db
      .from('services')
      .select('id')
      .eq('url', normalizedUrl)
      .is('deleted_at', null)
      .single()

    if (existing) {
      return reply.status(409).send({
        error: 'Service already registered',
        code: 'DUPLICATE',
        existing_id: existing.id
      })
    }

    // Validate /ai endpoint
    const validation = await validateAiEndpoint(normalizedUrl)

    if (!validation.passed) {
      return reply.status(422).send({
        error: 'Spec validation failed',
        code: 'INVALID_SPEC',
        errors: validation.errors,
        tried: [
          `${normalizedUrl}/ai`,
          `${normalizedUrl}/.well-known/ai`
        ]
      })
    }

    const spec = parseSpec(validation.raw_response)
    const { badge } = getScoreGrade(validation.score)
    const now = new Date().toISOString()

    // Insert service
    const { data: service, error: insertErr } = await db
      .from('services')
      .insert({
        name:          spec.service.name,
        description:   spec.service.description,
        url:           normalizedUrl,
        ai_url:        validation.ai_url!,
        categories:    spec.service.category ?? [],
        language:      spec.service.language ?? ['en'],
        tags:          [],
        spec_version:  validation.spec_version ?? '1.0',
        raw_spec:      spec,
        auth_type:     (spec.auth?.type ?? 'none') as AuthType,
        auth_docs_url: spec.auth?.docs ?? null,
        status:        'active',
        score:         validation.score,
        is_verified:   badge !== 'none',
        verified_at:   badge !== 'none' ? now : null,
        owner_email:   owner_email ?? null,
        is_official:   false
      })
      .select('id, name, url, ai_url, status, is_verified')
      .single()

    if (insertErr || !service) {
      return reply.status(500).send({ error: 'Failed to save service', code: 'INTERNAL_ERROR' })
    }

    // Insert capabilities
    if (spec.capabilities.length > 0) {
      const capRows = spec.capabilities.map(cap => ({
        service_id:    service.id,
        capability_id: cap.id,
        description:   cap.description,
        endpoint:      cap.endpoint,
        method:        cap.method as HttpMethod,
        params:        cap.params ?? {},
        returns:       cap.returns ?? null
      }))

      await db.from('capabilities').insert(capRows)
    }

    // Invalidate cached service list (new service should appear immediately)
    await cacheDelPattern('services:v1:*')

    // Save validation record
    await db.from('validations').insert({
      service_id:   service.id,
      url:          normalizedUrl,
      passed:       validation.passed,
      score:        validation.score,
      errors:       validation.errors,
      warnings:     validation.warnings,
      response_ms:  validation.response_ms,
      spec_version: validation.spec_version,
      raw_response: validation.raw_response
    })

    reply.status(201).send({
      id:          service.id,
      name:        service.name,
      url:         service.url,
      ai_url:      service.ai_url,
      status:      service.status,
      is_verified: service.is_verified,
      validation: {
        passed:   validation.passed,
        score:    validation.score,
        grade:    getScoreGrade(validation.score).grade,
        warnings: validation.warnings
      }
    })
  })
}
