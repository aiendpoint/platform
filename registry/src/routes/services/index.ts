import type { FastifyInstance } from 'fastify'
import { db } from '../../db/index.js'
import type { ServiceListItem } from '../../types/index.js'

export async function servicesListRoute(app: FastifyInstance) {
  app.get<{
    Querystring: {
      q?: string
      category?: string | string[]
      auth_type?: string
      language?: string
      verified?: string
      page?: string
      limit?: string
    }
  }>('/api/services', async (req, reply) => {
    const {
      q,
      category,
      auth_type,
      language,
      verified,
      page = '1',
      limit = '20'
    } = req.query

    const pageNum  = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const offset   = (pageNum - 1) * limitNum

    let query = db
      .from('services')
      .select(
        'id, name, description, url, ai_url, categories, auth_type, is_verified, spec_version, created_at',
        { count: 'exact' }
      )
      .eq('status', 'active')
      .is('deleted_at', null)

    if (q) {
      query = query.ilike('name', `%${q}%`)  // simple name search; full-text via tsvector is better but needs Supabase RPC
    }

    if (category) {
      const cats = Array.isArray(category) ? category : [category]
      query = query.overlaps('categories', cats)
    }

    if (auth_type) {
      query = query.eq('auth_type', auth_type)
    }

    if (language) {
      query = query.overlaps('language', [language])
    }

    if (verified === 'true') {
      query = query.eq('is_verified', true)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch services', code: 'INTERNAL_ERROR' })
    }

    const services: ServiceListItem[] = (data ?? []).map(row => ({
      id:           row.id,
      name:         row.name,
      description:  row.description,
      url:          row.url,
      ai_url:       row.ai_url,
      categories:   row.categories,
      auth_type:    row.auth_type,
      is_verified:  row.is_verified,
      spec_version: row.spec_version,
      created_at:   row.created_at
    }))

    reply.send({
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      services
    })
  })
}
