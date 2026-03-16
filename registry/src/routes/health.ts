import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_, reply) => {
    let dbStatus = 'ok'
    try {
      await db.from('services').select('id').limit(1)
    } catch {
      dbStatus = 'error'
    }

    reply.send({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      db: dbStatus,
      uptime_seconds: Math.floor(process.uptime())
    })
  })
}
