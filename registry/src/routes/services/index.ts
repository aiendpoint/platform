/**
 * ⚠️  CACHE: Results are cached in Redis for 60 s (1 min).
 *     Cache key: services:v5:<q>:<category>:<auth_type>:<language>:<verified>:<min_score>:<sort>:<page>:<limit>
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
      webmcp?: string
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
      webmcp,
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
    // PostgREST .or() syntax reserves , ( ) — strip them from user input and
    // fall back to no keyword filter when nothing searchable remains.
    const safeQ = q ? q.replace(/[,()]/g, ' ').trim() : ''
    const cacheKey = `services:v5:${safeQ}:${cats.join(',')}:${auth_type ?? ''}:${language ?? ''}:${verified ?? ''}:${webmcp ?? ''}:${min_score ?? ''}:${sort}:${pageNum}:${limitNum}`
    const cached = await cacheGet<unknown>(cacheKey)
    if (cached) {
      return reply.send(cached)
    }

    // ── DB query ──────────────────────────────────────────────────────────────
    const minScoreNum = min_score ? parseInt(min_score, 10) : NaN

    // Every filter must be applied identically to the data query AND the
    // count query, or `total` disagrees with the rows actually returned.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyOwnerFilters = <T,>(qb: any): T => {
      qb = qb.eq('status', 'active').is('deleted_at', null)
      if (safeQ) {
        // Match names and descriptions so capability keywords ("weather")
        // find services not named after them.
        qb = qb.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
      }
      if (cats.length > 0) qb = qb.overlaps('categories', cats)
      if (auth_type) qb = qb.eq('auth_type', auth_type)
      if (language) qb = qb.overlaps('language', [language])
      if (verified === 'true') qb = qb.eq('is_verified', true)
      if (webmcp === 'true') qb = qb.eq('webmcp', true)
      if (!isNaN(minScoreNum)) qb = qb.gte('score', minScoreNum)
      return qb as T
    }

    // Community rows are never verified and store category/language only
    // inside their spec JSON, so those filters exclude them entirely.
    const communityEligible = verified !== 'true' && webmcp !== 'true' && cats.length === 0 && !language
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyCommunityFilters = <T,>(qb: any): T => {
      qb = qb.eq('status', 'active')
      if (safeQ) qb = qb.or(`url.ilike.%${safeQ}%,domain.ilike.%${safeQ}%`)
      if (auth_type) qb = qb.eq('ai_spec->auth->>type', auth_type)
      if (!isNaN(minScoreNum)) qb = qb.gte('confidence', minScoreNum)
      return qb as T
    }

    let query = applyOwnerFilters<ReturnType<typeof buildOwnerSelect>>(buildOwnerSelect())

    function buildOwnerSelect() {
      return db
        .from('services')
        .select(
          'id, name, description, url, ai_url, categories, auth_type, is_verified, webmcp, score, spec_version, created_at',
          { count: 'exact' }
        )
    }

    // Sorting
    if (sort === 'score') {
      query = query.order('score', { ascending: false })
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // ── Get counts first (cheap, no row limit), with the SAME filters ───
    const ownerCountQuery = applyOwnerFilters<PromiseLike<{ count: number | null }>>(
      db.from('services').select('id', { count: 'exact', head: true })
    )

    const communityCountQuery: PromiseLike<{ count: number | null }> = communityEligible
      ? applyCommunityFilters<PromiseLike<{ count: number | null }>>(
          db.from('community_specs').select('id', { count: 'exact', head: true })
        )
      : Promise.resolve({ count: 0 })

    const [{ count: ownerCount }, { count: communityCount }] = await Promise.all([
      ownerCountQuery,
      communityCountQuery,
    ])

    const totalCount = (ownerCount ?? 0) + (communityCount ?? 0)

    // ── Fetch paginated owner services ──────────────────────────────────
    const { data, error } = await query
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
      webmcp:         row.webmcp ?? false,
      score:          row.score ?? 0,
      spec_version:   row.spec_version,
      created_at:     row.created_at,
      source:         'owner',
      discover_count: 0,
    }))

    // ── Fill remaining slots with community specs ───────────────────────
    const remaining = limitNum - services.length
    let communityServices: ServiceListItem[] = []

    if (remaining > 0 && communityEligible) {
      // Offset into community = max(0, offset - ownerCount), where ownerCount
      // reflects the active filters so pagination lines up with the counts.
      const communityOffset = Math.max(0, offset - (ownerCount ?? 0))

      const communityQuery = applyCommunityFilters<
        ReturnType<typeof buildCommunitySelect>
      >(buildCommunitySelect())

      function buildCommunitySelect() {
        return db
          .from('community_specs')
          .select('id, url, domain, ai_spec, confidence, contributors, discover_count, created_at, updated_at')
      }

      const { data: communityData, error: communityError } = await communityQuery
        .order('discover_count', { ascending: false })
        .range(communityOffset, communityOffset + remaining - 1)

      if (communityError) {
        // Surface instead of silently returning partial results
        return reply.status(500).send({ error: 'Failed to fetch services', code: 'INTERNAL_ERROR' })
      }

      communityServices = (communityData ?? []).map(row => {
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
          webmcp:         (() => { const m = spec?.['meta'] as Record<string, unknown> | undefined; const w = m?.['webmcp']; return w === true || w === 'true' || w === '1' })(),
          score:          row.confidence ?? 0,
          spec_version:   (spec?.['aiendpoint'] as string) ?? '1.0',
          created_at:     row.created_at,
          source:         'community',
          discover_count: row.discover_count ?? 0,
        }
      })
    }

    const merged = [...services, ...communityServices]

    const response = { total: totalCount, page: pageNum, limit: limitNum, services: merged }

    await cacheSet(cacheKey, response, SERVICES_TTL)

    reply.send(response)
  })
}
