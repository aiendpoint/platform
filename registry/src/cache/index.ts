/**
 * ─── Redis Cache Layer ────────────────────────────────────────────────────────
 *
 * Wraps Upstash Redis with graceful no-op fallback when env vars are absent.
 *
 * ⚠️  CACHE USAGE — if something looks wrong (stale data, unexpected results),
 *     check here first. Two routes use this cache:
 *
 *     • GET /api/validate   TTL = 300 s (5 min)   key prefix: validate:v1:
 *     • GET /api/services   TTL = 60 s (1 min)    key prefix: services:v1:
 *
 *     To bust a specific validate result from Upstash console or CLI:
 *       DEL validate:v1:<url>
 *     To bust all cached validate results:
 *       SCAN 0 MATCH validate:v1:* COUNT 100 → then DEL each key
 *
 * Required env vars (set in Railway Variables):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Redis } from '@upstash/redis'

let redis: Redis | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export { redis }

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    return await redis.get<T>(key)
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return
  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch {
    // ignore write errors — cache is best-effort
  }
}

/** Returns remaining TTL in seconds, or 0 if key missing / no Redis. */
export async function cacheTtl(key: string): Promise<number> {
  if (!redis) return 0
  try {
    const ttl = await redis.ttl(key)
    return Math.max(0, ttl)
  } catch {
    return 0
  }
}
