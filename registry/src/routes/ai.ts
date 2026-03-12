import type { FastifyInstance } from 'fastify'

export async function aiRoute(app: FastifyInstance) {
  app.get('/ai', async (_, reply) => {
    reply.send({
      aiendpoint: '1.0',
      service: {
        name: 'AIEndpoint Registry',
        description: 'Search and discover AI-ready services. Find services that implement the /ai standard.',
        category: ['search', 'developer', 'data'],
        language: ['en']
      },
      capabilities: [
        {
          id: 'search_services',
          description: 'Search for services that implement the /ai standard',
          endpoint: '/api/services',
          method: 'GET',
          params: {
            q: 'string, optional — keyword search (name, description)',
            category: 'string, optional — filter by category',
            auth_type: 'string, optional — none|apikey|oauth2|bearer',
            verified: 'boolean, optional — only verified services',
            limit: 'integer, optional, default 20, max 100',
            page: 'integer, optional, default 1'
          },
          returns: 'total, page, limit, services[] {id, name, description, url, ai_url, categories, auth_type, is_verified}'
        },
        {
          id: 'get_service',
          description: 'Get full details of a registered service including all capabilities',
          endpoint: '/api/services/:id',
          method: 'GET',
          params: {
            id: 'string, required — service UUID'
          },
          returns: 'service {id, name, description, url, ai_url, categories, capabilities[], auth_type, is_verified, ...}'
        },
        {
          id: 'validate_endpoint',
          description: 'Validate if a URL implements the /ai spec correctly',
          endpoint: '/api/validate',
          method: 'GET',
          params: {
            url: 'string, required — service URL to validate (e.g. https://yourservice.com)'
          },
          returns: 'passed, score, errors[], warnings[], passes[], response_ms, capability_count'
        },
        {
          id: 'list_categories',
          description: 'List all service categories with counts',
          endpoint: '/api/categories',
          method: 'GET',
          params: {},
          returns: 'categories[] {id, label, count}'
        }
      ],
      auth: { type: 'none' },
      token_hints: {
        compact_mode: false,
        field_filtering: false,
        delta_support: false
      },
      meta: {
        last_updated: '2026-03-12',
        status: '/health'
      }
    })
  })
}
