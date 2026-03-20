import type { AiEndpointSpec } from './index.js'

// ─── DB row type ──────────────────────────────────────────────────────────────

export type CommunitySpecStatus = 'active' | 'expired' | 'superseded' | 'blocked'

export interface CommunitySpec {
  id: string
  created_at: string
  updated_at: string
  url: string
  domain: string
  ai_spec: AiEndpointSpec
  confidence: number
  contributors: number
  source_hints: Record<string, unknown> | null
  ttl: number
  status: CommunitySpecStatus
  claimed: boolean
  claimed_at: string | null
  service_id: string | null
}

// ─── API types ────────────────────────────────────────────────────────────────

export interface CommunitySpecResponse {
  url: string
  ai_spec: AiEndpointSpec
  source: 'community'
  confidence: number
  contributors: number
  created_at: string
  updated_at: string
  ttl: number
  claimed: boolean
}

export interface CommunitySubmitBody {
  url: string
  ai_spec: AiEndpointSpec
  source_hints?: Record<string, unknown>
}
