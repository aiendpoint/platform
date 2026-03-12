import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'

const CATEGORY_LABELS: Record<string, string> = {
  productivity: 'Productivity',
  ecommerce:    'E-Commerce',
  finance:      'Finance',
  news:         'News',
  weather:      'Weather',
  maps:         'Maps',
  search:       'Search',
  data:         'Data',
  communication:'Communication',
  calendar:     'Calendar',
  storage:      'Storage',
  media:        'Media',
  health:       'Health',
  education:    'Education',
  travel:       'Travel',
  food:         'Food',
  government:   'Government',
  developer:    'Developer',
}

export async function categoriesRoute(app: FastifyInstance) {
  app.get('/api/categories', async (_, reply) => {
    // unnest categories array and count per category
    const { data, error } = await db
      .from('services')
      .select('categories')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (error) {
      return reply.status(500).send({ error: 'Failed to load categories', code: 'INTERNAL_ERROR' })
    }

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      for (const cat of row.categories ?? []) {
        counts[cat] = (counts[cat] ?? 0) + 1
      }
    }

    const categories = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({
        id,
        label: CATEGORY_LABELS[id] ?? id,
        count
      }))

    reply.send({ categories })
  })
}
