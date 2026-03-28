/**
 * Lightweight /ai spec validator for CLI.
 * Scores 0-100 based on field completeness and quality.
 */

import type { AiEndpointSpec } from './types.js'

export interface ValidateResult {
  score: number
  grade: string
  errors: string[]
  warnings: string[]
}

export function validateSpec(spec: AiEndpointSpec): ValidateResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  // Required: aiendpoint version
  if (!spec.aiendpoint) {
    errors.push('Missing "aiendpoint" version field')
  } else if (spec.aiendpoint !== '1.0') {
    warnings.push(`Unexpected version "${spec.aiendpoint}" (expected "1.0")`)
    score += 5
  } else {
    score += 9
  }

  // Required: service.name
  if (!spec.service?.name) {
    errors.push('Missing "service.name"')
  } else {
    score += 9
  }

  // Required: service.description
  if (!spec.service?.description) {
    errors.push('Missing "service.description"')
  } else {
    score += 9
    if (spec.service.description.length > 200) {
      warnings.push(`service.description is ${spec.service.description.length} chars (recommend <= 200 for token efficiency)`)
    }
  }

  // Required: capabilities
  if (!spec.capabilities || spec.capabilities.length === 0) {
    errors.push('Missing or empty "capabilities" array')
  } else {
    score += 8

    // Capability quality (max 20pts)
    let capScore = 0
    for (const cap of spec.capabilities) {
      if (cap.id && cap.description && cap.endpoint && cap.method) {
        capScore += 5
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(cap.method)) {
          capScore += 2
        } else {
          warnings.push(`Capability "${cap.id}": invalid method "${cap.method}"`)
        }
        if (cap.returns) {
          capScore += 3
        } else {
          warnings.push(`Capability "${cap.id}": missing "returns" field`)
        }
      } else {
        warnings.push(`Capability "${cap.id || '(unnamed)'}": missing required fields (id, description, endpoint, method)`)
      }
    }
    const capPct = capScore / (spec.capabilities.length * 10)
    score += Math.min(20, Math.round(capPct * 20))
  }

  // Recommended: category (5pts)
  if (spec.service?.category && spec.service.category.length > 0) {
    score += 5
  } else {
    warnings.push('Missing "service.category" (improves search discoverability)')
  }

  // Recommended: auth (5pts)
  if (spec.auth) {
    score += 5
  } else {
    warnings.push('Missing "auth" field (agents need to know authentication requirements)')
  }

  // Recommended: meta.last_updated (5pts)
  if (spec.meta?.last_updated) {
    score += 5
  } else {
    warnings.push('Missing "meta.last_updated" (helps agents cache)')
  }

  // Token efficiency (max 15pts)
  const descLen = spec.service?.description?.length ?? 0
  if (descLen >= 20 && descLen <= 150) score += 4
  else if (descLen > 0) score += 2

  if (spec.token_hints) score += 4

  if (spec.capabilities && spec.capabilities.length > 0) {
    const avgDesc = spec.capabilities.reduce((sum, c) => sum + (c.description?.length ?? 0), 0) / spec.capabilities.length
    if (avgDesc >= 10 && avgDesc <= 100) score += 3
    else if (avgDesc > 0) score += 1

    const withReturns = spec.capabilities.filter(c => {
      const ret = c.returns ?? ''
      return ret.length > 5 && (ret.includes(',') || ret.includes('[') || /\bwith\b/.test(ret))
    }).length
    score += Math.round((withReturns / spec.capabilities.length) * 4)
  }

  score = Math.min(100, score)

  let grade: string
  if (score >= 90) grade = 'Excellent (AI-Ready Gold)'
  else if (score >= 70) grade = 'Good (AI-Ready)'
  else if (score >= 50) grade = 'Basic (AI-Compatible)'
  else grade = 'Poor'

  return { score, grade, errors, warnings }
}

export function estimateTokens(text: string): number {
  let ascii = 0
  let nonAscii = 0
  for (const ch of text) {
    if (ch.charCodeAt(0) < 128) ascii++
    else nonAscii++
  }
  return Math.ceil(ascii / 4 + nonAscii / 1.5)
}
