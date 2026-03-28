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
