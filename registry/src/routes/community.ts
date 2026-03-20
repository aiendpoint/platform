/**
 * ─── Community Specs Routes ──────────────────────────────────────────────────
 *
 * GET  /api/community/:url  — Lookup a community-generated /ai spec by URL
 * POST /api/community       — Submit a community-generated /ai spec
 *
 * These routes support the MCP auto-discovery flow:
 *   Step 1: agent checks site.com/ai directly (MCP client-side)
 *   Step 2: agent checks registry via GET /api/community/:url
 *   Step 3: agent generates spec and submits via POST /api/community
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { cacheGet, cacheSet } from '../cache/index.js'
import { computeConfidence, confidenceTtl } from '../services/confidence.js'
import type { CommunitySpec, CommunitySubmitBody } from '../types/community.js'
import type { AiEndpointSpec } from '../types/index.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): { origin: string; domain: string } | null {
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return { origin: parsed.origin, domain: parsed.hostname }
  } catch {
    return null
  }
}

/** Minimal spec shape check — not full JSON Schema validation, just required fields. */
function isValidSpecShape(spec: unknown): spec is AiEndpointSpec {
  if (!spec || typeof spec !== 'object') return false
  const s = spec as Record<string, unknown>
  if (!s['aiendpoint']) return false
  const svc = s['service'] as Record<string, unknown> | undefined
  if (!svc?.['name'] || !svc?.['description']) return false
  if (!Array.isArray(s['capabilities']) || s['capabilities'].length === 0) return false
  return true
}

// ─── Rate limit state (in-memory, per-process) ─────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10       // max POSTs per window
const RATE_LIMIT_WINDOW = 3600_000  // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function communityRoute(app: FastifyInstance) {

  // ── GET /api/community/id/:id ────────────────────────────────────────

  app.get<{ Params: { id: string } }>('/api/community/id/:id', async (req, reply) => {
    const { id } = req.params

    const { data, error } = await db
      .from('community_specs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'Community spec not found', code: 'NOT_FOUND' })
    }

    const spec = data as CommunitySpec
    const aiSpec = spec.ai_spec as unknown as Record<string, unknown>
    const svc = aiSpec?.['service'] as Record<string, unknown> | undefined
    const caps = (aiSpec?.['capabilities'] ?? []) as Array<Record<string, unknown>>
    const auth = aiSpec?.['auth'] as Record<string, unknown> | undefined

    return reply.send({
      id:              spec.id,
      name:            (svc?.['name'] as string) ?? spec.domain,
      description:     (svc?.['description'] as string) ?? '',
      url:             spec.url,
      domain:          spec.domain,
      categories:      (svc?.['category'] as string[]) ?? [],
      language:        (svc?.['language'] as string[]) ?? ['en'],
      auth_type:       (auth?.['type'] as string) ?? 'none',
      auth_docs_url:   (auth?.['docs'] as string) ?? null,
      confidence:      spec.confidence,
      contributors:    spec.contributors,
      discover_count:  spec.discover_count ?? 0,
      source:          'community',
      status:          spec.status,
      claimed:         spec.claimed,
      created_at:      spec.created_at,
      updated_at:      spec.updated_at,
      ttl:             spec.ttl,
      capabilities:    caps.map(c => ({
        capability_id: c['id'] ?? '',
        description:   c['description'] ?? '',
        endpoint:      c['endpoint'] ?? '',
        method:        c['method'] ?? 'GET',
        params:        (c['params'] as Record<string, string>) ?? {},
        returns:       (c['returns'] as string) ?? null,
      })),
      token_hints:     (aiSpec?.['token_hints'] as Record<string, boolean>) ?? null,
      rate_limits:     (aiSpec?.['rate_limits'] as Record<string, unknown>) ?? null,
      meta:            (aiSpec?.['meta'] as Record<string, string>) ?? null,
      raw_spec:        spec.ai_spec,
    })
  })

  // ── GET /api/community/:url ────────────────────────────────────────────

  app.get<{ Params: { url: string } }>('/api/community/:url', async (req, reply) => {
    const encodedUrl = req.params.url
    const decodedUrl = decodeURIComponent(encodedUrl)
    const normalized = normalizeUrl(decodedUrl)

    if (!normalized) {
      return reply.status(400).send({ error: 'Invalid URL', code: 'INVALID_URL' })
    }

    // Check cache first
    const cacheKey = `community:v1:${normalized.origin}`
    const cached = await cacheGet<CommunitySpec>(cacheKey)
    if (cached) {
      // Increment discover_count (fire-and-forget)
      db.from('community_specs')
        .update({ discover_count: (cached.discover_count ?? 0) + 1 })
        .eq('url', normalized.origin)
        .then(() => {}, () => {})

      return reply.send({
        url:            cached.url,
        ai_spec:        cached.ai_spec,
        source:         'community' as const,
        confidence:     cached.confidence,
        contributors:   cached.contributors,
        discover_count: (cached.discover_count ?? 0) + 1,
        created_at:     cached.created_at,
        updated_at:     cached.updated_at,
        ttl:            cached.ttl,
        claimed:        cached.claimed,
      })
    }

    // Query DB
    const { data, error } = await db
      .from('community_specs')
      .select('*')
      .eq('url', normalized.origin)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'not_found' })
    }

    const spec = data as CommunitySpec

    // Check TTL — if expired, mark and return 404
    const createdAt = new Date(spec.updated_at).getTime()
    const expiresAt = createdAt + spec.ttl * 1000
    if (Date.now() > expiresAt) {
      // Mark expired (fire-and-forget)
      db.from('community_specs')
        .update({ status: 'expired' })
        .eq('id', spec.id)
        .then(() => {})
      return reply.status(404).send({ error: 'not_found' })
    }

    // Increment discover_count (fire-and-forget)
    db.from('community_specs')
      .update({ discover_count: (spec.discover_count ?? 0) + 1 })
      .eq('id', spec.id)
      .then(() => {}, () => {})

    // Cache for remaining TTL
    const remainingTtl = Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))
    await cacheSet(cacheKey, spec, Math.min(remainingTtl, 3600)) // max 1hr in cache

    return reply.send({
      url:            spec.url,
      ai_spec:        spec.ai_spec,
      source:         'community' as const,
      confidence:     spec.confidence,
      contributors:   spec.contributors,
      discover_count: (spec.discover_count ?? 0) + 1,
      created_at:   spec.created_at,
      updated_at:   spec.updated_at,
      ttl:          spec.ttl,
      claimed:      spec.claimed,
    })
  })

  // ── POST /api/community ────────────────────────────────────────────────

  app.post<{ Body: CommunitySubmitBody }>('/api/community', async (req, reply) => {
    const ip = req.ip
    if (!checkRateLimit(ip)) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        message: `Maximum ${RATE_LIMIT_MAX} submissions per hour`,
      })
    }

    const { url, ai_spec, source_hints } = req.body ?? {}

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: '"url" is required', code: 'MISSING_PARAM' })
    }

    const normalized = normalizeUrl(url)
    if (!normalized) {
      return reply.status(400).send({ error: 'Invalid URL format', code: 'INVALID_URL' })
    }

    // Validate spec shape
    if (!isValidSpecShape(ai_spec)) {
      return reply.status(422).send({
        error: 'Invalid /ai spec',
        code: 'INVALID_SPEC',
        message: 'Spec must include aiendpoint, service.name, service.description, and at least one capability',
      })
    }

    // Check if this URL is already owner-registered in services table
    const { data: ownerService } = await db
      .from('services')
      .select('id')
      .eq('url', normalized.origin)
      .is('deleted_at', null)
      .single()

    if (ownerService) {
      return reply.status(409).send({
        error: 'owner_claimed',
        code: 'OWNER_CLAIMED',
        message: 'This service has an official /ai endpoint registered by its owner',
      })
    }

    // Compute confidence
    const confidence = computeConfidence(ai_spec)
    const ttl = confidenceTtl(confidence)

    // Check if community spec already exists
    const { data: existing } = await db
      .from('community_specs')
      .select('id, confidence, contributors, status')
      .eq('url', normalized.origin)
      .single()

    const now = new Date().toISOString()

    if (existing) {
      // Only update if new confidence is higher or existing is expired
      if (existing.status === 'active' && confidence <= existing.confidence) {
        // Still increment contributors count
        await db
          .from('community_specs')
          .update({
            contributors: (existing.contributors ?? 1) + 1,
            updated_at: now,
          })
          .eq('id', existing.id)

        return reply.send({
          id:         existing.id,
          url:        normalized.origin,
          status:     'unchanged',
          confidence: existing.confidence,
          new_confidence: confidence,
          message:    'Existing spec has equal or higher confidence; contributor count incremented',
        })
      }

      // Update with better spec
      const { error: updateErr } = await db
        .from('community_specs')
        .update({
          ai_spec:      ai_spec,
          confidence:   confidence,
          ttl:          ttl,
          source_hints: source_hints ?? null,
          contributors: (existing.contributors ?? 1) + 1,
          status:       'active',
          updated_at:   now,
        })
        .eq('id', existing.id)

      if (updateErr) {
        return reply.status(500).send({ error: 'Failed to update spec', code: 'INTERNAL_ERROR' })
      }

      // Invalidate cache
      await cacheSet(`community:v1:${normalized.origin}`, null, 1)

      return reply.send({
        id:                  existing.id,
        url:                 normalized.origin,
        status:              'updated',
        confidence:          confidence,
        previous_confidence: existing.confidence,
        message:             'Spec updated with higher confidence',
      })
    }

    // Insert new community spec
    const { data: inserted, error: insertErr } = await db
      .from('community_specs')
      .insert({
        url:          normalized.origin,
        domain:       normalized.domain,
        ai_spec:      ai_spec,
        confidence:   confidence,
        contributors: 1,
        source_hints: source_hints ?? null,
        ttl:          ttl,
        status:       'active',
        claimed:      false,
      })
      .select('id')
      .single()

    if (insertErr || !inserted) {
      return reply.status(500).send({ error: 'Failed to save spec', code: 'INTERNAL_ERROR' })
    }

    reply.status(201).send({
      id:         inserted.id,
      url:        normalized.origin,
      status:     'active',
      confidence: confidence,
      message:    'Community spec registered',
    })
  })
}
