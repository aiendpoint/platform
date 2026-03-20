/**
 * ─── Community Spec Confidence Scorer ────────────────────────────────────────
 *
 * Computes a 0-100 confidence score for community-generated /ai specs.
 *
 * Scoring groups:
 *   Base (50):       name, description, capabilities, endpoint+method
 *   Quality (30):    capability count, params, returns
 *   Completeness (20): auth, category, token_hints, meta.last_updated
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AiEndpointSpec } from '../types/index.js'

export function computeConfidence(spec: AiEndpointSpec): number {
  let score = 0
  const caps = spec.capabilities ?? []

  // ── Base (50 pts) ──────────────────────────────────────────────────────────

  // service.name present (10)
  if (spec.service?.name && spec.service.name.trim().length > 0) {
    score += 10
  }

  // service.description 20-200 chars (10)
  const descLen = spec.service?.description?.length ?? 0
  if (descLen >= 20 && descLen <= 200) {
    score += 10
  } else if (descLen > 0) {
    score += 5
  }

  // capabilities ≥ 1 (15)
  if (caps.length >= 1) {
    score += 15
  }

  // each capability has endpoint + method (15)
  if (caps.length > 0) {
    const validCaps = caps.filter(c => c.endpoint && c.method)
    score += Math.round((validCaps.length / caps.length) * 15)
  }

  // ── Quality (30 pts) ──────────────────────────────────────────────────────

  // capabilities ≥ 3 (10)
  if (caps.length >= 3) {
    score += 10
  } else if (caps.length >= 2) {
    score += 5
  }

  // params present ratio × 10
  if (caps.length > 0) {
    const withParams = caps.filter(c => c.params && Object.keys(c.params).length > 0)
    score += Math.round((withParams.length / caps.length) * 10)
  }

  // returns present ratio × 10
  if (caps.length > 0) {
    const withReturns = caps.filter(c => c.returns && c.returns.length > 0)
    score += Math.round((withReturns.length / caps.length) * 10)
  }

  // ── Completeness (20 pts) ─────────────────────────────────────────────────

  // auth field (5)
  if (spec.auth) score += 5

  // category (5)
  if (spec.service?.category && spec.service.category.length > 0) score += 5

  // token_hints (5)
  if (spec.token_hints) score += 5

  // meta.last_updated (5)
  if (spec.meta?.last_updated) score += 5

  return Math.min(100, score)
}

/**
 * Returns TTL in seconds based on confidence score.
 * Higher confidence = longer cache.
 */
export function confidenceTtl(confidence: number): number {
  if (confidence >= 90) return 30 * 24 * 60 * 60  // 30 days
  if (confidence >= 70) return 14 * 24 * 60 * 60  // 14 days
  return 7 * 24 * 60 * 60                          // 7 days
}
