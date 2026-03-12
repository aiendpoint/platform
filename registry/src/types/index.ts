// ─── DB row types ─────────────────────────────────────────────────────────

export type ServiceStatus = 'pending' | 'active' | 'invalid' | 'suspended'
export type AuthType = 'none' | 'apikey' | 'oauth2' | 'bearer'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface Service {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  name: string
  description: string
  url: string
  ai_url: string
  categories: string[]
  language: string[]
  tags: string[]
  spec_version: string
  raw_spec: AiEndpointSpec
  auth_type: AuthType
  auth_docs_url: string | null
  status: ServiceStatus
  is_verified: boolean
  verified_at: string | null
  view_count: number
  check_count: number
  owner_email: string | null
  is_official: boolean
}

export interface Capability {
  id: string
  created_at: string
  service_id: string
  capability_id: string
  description: string
  endpoint: string
  method: HttpMethod
  params: Record<string, string>
  returns: string | null
}

export interface Validation {
  id: string
  created_at: string
  service_id: string | null
  url: string
  passed: boolean
  score: number
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  response_ms: number | null
  spec_version: string | null
  raw_response: AiEndpointSpec | null
}

export interface ValidationIssue {
  field: string
  message: string
  code: string
}

// ─── /ai endpoint spec types ───────────────────────────────────────────────

export interface AiCapability {
  id: string
  description: string
  endpoint: string
  method: string
  params?: Record<string, string>
  returns?: string
}

export interface AiEndpointSpec {
  aiendpoint: string
  service: {
    name: string
    description: string
    category?: string[]
    language?: string[]
  }
  capabilities: AiCapability[]
  auth?: {
    type: string
    header?: string
    docs?: string
  }
  token_hints?: {
    compact_mode?: boolean
    field_filtering?: boolean
    delta_support?: boolean
  }
  rate_limits?: {
    requests_per_minute?: number
    agent_tier_available?: boolean
  }
  meta?: {
    last_updated?: string
    changelog?: string
    status?: string
  }
}

// ─── API response types ────────────────────────────────────────────────────

export interface ServiceListItem {
  id: string
  name: string
  description: string
  url: string
  ai_url: string
  categories: string[]
  auth_type: AuthType
  is_verified: boolean
  spec_version: string
  created_at: string
}

export interface ApiError {
  error: string
  code: string
  [key: string]: unknown
}
