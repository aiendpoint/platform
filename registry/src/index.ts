import Fastify from 'fastify'
import cors from '@fastify/cors'

import { healthRoute }         from './routes/health.js'
import { aiRoute }             from './routes/ai.js'
import { categoriesRoute }     from './routes/categories.js'
import { validateRoute }       from './routes/validate.js'
import { badgeRoute }          from './routes/badge.js'
import { servicesListRoute }   from './routes/services/index.js'
import { serviceDetailRoute }  from './routes/services/detail.js'
import { serviceRegisterRoute } from './routes/services/register.js'
import { convertRoute }         from './routes/convert.js'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, ignore: 'pid,hostname' }
    }
  }
})

// ─── CORS ─────────────────────────────────────────────────────────────────
const rawOrigin = process.env.CORS_ORIGIN
const corsOrigin = rawOrigin
  ? rawOrigin.includes(',')
    ? rawOrigin.split(',').map(o => o.trim())
    : rawOrigin
  : '*'

await app.register(cors, {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS']
})

// ─── Routes ───────────────────────────────────────────────────────────────
await app.register(healthRoute)
await app.register(aiRoute)
await app.register(categoriesRoute)
await app.register(validateRoute)
await app.register(badgeRoute)
await app.register(servicesListRoute)
await app.register(serviceDetailRoute)
await app.register(serviceRegisterRoute)
await app.register(convertRoute)

// ─── 404 handler ──────────────────────────────────────────────────────────
app.setNotFoundHandler((req, reply) => {
  reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND', path: req.url })
})

// ─── Error handler ────────────────────────────────────────────────────────
app.setErrorHandler((err, _, reply) => {
  app.log.error(err)
  reply.status(500).send({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
})

// ─── Start ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4000', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port: PORT, host: HOST })
  app.log.info(`Registry running on http://localhost:${PORT}`)
  app.log.info(`  GET /health`)
  app.log.info(`  GET /ai`)
  app.log.info(`  GET /api/services`)
  app.log.info(`  GET /api/validate?url=...`)
  app.log.info(`  POST /api/convert/openapi`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
