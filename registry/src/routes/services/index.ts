/**
 * ⚠️  CACHE: Results are cached in Redis for 60 s (1 min).
 *     Cache key: services:v1:<q>:<category>:<auth_type>:<language>:<verified>:<min_score>:<sort>:<page>:<limit>
 *     If Redis env vars are absent the route works without caching.
 */
import type { FastifyInstance } from 'fastify'
import { db } from '../../db/index.js'
import type { ServiceListItem } from '../../types/index.js'
import { cacheGet, cacheSet } from '../../cache/index.js'

const SERVICES_TTL = 60 // 1 minute

export async function servicesListRoute(app: FastifyInstance) {
  app.get<{
    Querystring: {
      q?: string
      category?: string | string[]
      auth_type?: string
      language?: string
      verified?: string
      min_score?: string
      sort?: string
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
      min_score,
      sort = 'newest',
      page = '1',
      limit = '20'
    } = req.query

    const pageNum  = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const offset   = (pageNum - 1) * limitNum

    const cats = category ? (Array.isArray(category) ? category : [category]) : []

    // ── Cache hit ─────────────────────────────────────────────────────────────
    const cacheKey = `services:v1:${q ?? ''}:${cats.join(',')}:${auth_type ?? ''}:${language ?? ''}:${verified ?? ''}:${min_score ?? ''}:${sort}:${pageNum}:${limitNum}`
    const cached = await cacheGet<unknown>(cacheKey)
    if (cached) {
      return reply.send(cached)
    }

    // ── DB query ──────────────────────────────────────────────────────────────
    let query = db
      .from('services')
      .select(
        'id, name, description, url, ai_url, categories, auth_type, is_verified, score, spec_version, created_at',
        { count: 'exact' }
      )
      .eq('status', 'active')
      .is('deleted_at', null)

    if (q) {
      query = query.ilike('name', `%${q}%`)
    }

    if (cats.length > 0) {
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

    if (min_score) {
      const minScoreNum = parseInt(min_score, 10)
      if (!isNaN(minScoreNum)) {
        query = query.gte('score', minScoreNum)
      }
    }

    // Sorting
    if (sort === 'score') {
      query = query.order('score', { ascending: false })
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error, count } = await query
      .range(offset, offset + limitNum - 1)

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch services', code: 'INTERNAL_ERROR' })
    }

    const services: ServiceListItem[] = (data ?? []).map(row => ({
      id:             row.id,
      name:           row.name,
      description:    row.description,
      url:            row.url,
      ai_url:         row.ai_url,
      categories:     row.categories,
      auth_type:      row.auth_type,
      is_verified:    row.is_verified,
      score:          row.score ?? 0,
      spec_version:   row.spec_version,
      created_at:     row.created_at,
      source:         'owner',
      discover_count: 0,
    }))

    // ── Merge community specs ───────────────────────────────────────────
    let communityQuery = db
      .from('community_specs')
      .select('id, url, domain, ai_spec, confidence, contributors, discover_count, created_at, updated_at', { count: 'exact' })
      .eq('status', 'active')

    if (q) {
      communityQuery = communityQuery.or(`url.ilike.%${q}%,domain.ilike.%${q}%`)
    }

    const { data: communityData, count: communityCount } = await communityQuery
      .order('discover_count', { ascending: false })
      .range(0, limitNum - 1)

    const communityServices: ServiceListItem[] = (communityData ?? []).map(row => {
      const spec = row.ai_spec as Record<string, unknown>
      const svc = spec?.['service'] as Record<string, unknown> | undefined
      return {
        id:             row.id,
        name:           (svc?.['name'] as string) ?? row.domain,
        description:    (svc?.['description'] as string) ?? '',
        url:            row.url,
        ai_url:         '',
        categories:     (svc?.['category'] as string[]) ?? [],
        auth_type:      (((spec?.['auth'] as Record<string, unknown>)?.['type'] as string) ?? 'none') as import('../../types/index.js').AuthType,
        is_verified:    false,
        score:          row.confidence ?? 0,
        spec_version:   (spec?.['aiendpoint'] as string) ?? '1.0',
        created_at:     row.created_at,
        source:         'community',
        discover_count: row.discover_count ?? 0,
      }
    })

    // Merge: owner services first, then community (avoid duplicates by URL)
    const ownerUrls = new Set(services.map(s => s.url))
    const merged = [
      ...services,
      ...communityServices.filter(s => !ownerUrls.has(s.url)),
    ]

    // Sort merged list
    if (sort === 'score') {
      merged.sort((a, b) => b.score - a.score)
    } else if (sort === 'name') {
      merged.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    const totalMerged = (count ?? 0) + (communityCount ?? 0)

    const response = { total: totalMerged, page: pageNum, limit: limitNum, services: merged.slice(0, limitNum) }

    await cacheSet(cacheKey, response, SERVICES_TTL)

    reply.send(response)
  })
}
