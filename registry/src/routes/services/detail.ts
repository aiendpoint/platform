import type { FastifyInstance } from 'fastify'
import { db } from '../../db/index.js'

export async function serviceDetailRoute(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/services/:id', async (req, reply) => {
    const { id } = req.params

    const [{ data: service, error: svcErr }, { data: caps, error: capErr }] = await Promise.all([
      db
        .from('services')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single(),
      db
        .from('capabilities')
        .select('capability_id, description, endpoint, method, params, returns')
        .eq('service_id', id)
    ])

    if (svcErr || !service) {
      return reply.status(404).send({ error: 'Service not found', code: 'NOT_FOUND' })
    }

    if (capErr) {
      return reply.status(500).send({ error: 'Failed to fetch capabilities', code: 'INTERNAL_ERROR' })
    }

    // Increment view count (fire and forget)
    db.from('services')
      .update({ view_count: service.view_count + 1 })
      .eq('id', id)
      .then(() => {})
      .catch((err: Error) => console.error('[detail] view_count update failed:', err.message))

    reply.send({
      id:            service.id,
      name:          service.name,
      description:   service.description,
      url:           service.url,
      ai_url:        service.ai_url,
      categories:    service.categories,
      language:      service.language,
      tags:          service.tags,
      spec_version:  service.spec_version,
      auth_type:     service.auth_type,
      auth_docs_url: service.auth_docs_url,
      is_verified:   service.is_verified,
      verified_at:   service.verified_at,
      is_official:   service.is_official,
      status:        service.status,
      capabilities:  (caps ?? []).map(c => ({
        capability_id: c.capability_id,
        description:   c.description,
        endpoint:      c.endpoint,
        method:        c.method,
        params:        c.params,
        returns:       c.returns
      })),
      token_hints:   service.raw_spec?.token_hints ?? null,
      rate_limits:   service.raw_spec?.rate_limits ?? null,
      meta:          service.raw_spec?.meta ?? null,
      created_at:    service.created_at,
      updated_at:    service.updated_at
    })
  })
}
