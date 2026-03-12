import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'

type BadgeStyle = 'flat' | 'flat-square' | 'for-the-badge'

function buildSvg(
  label: string,
  message: string,
  color: string,
  style: BadgeStyle
): string {
  if (style === 'for-the-badge') {
    const totalWidth = 160
    const labelWidth = 80
    const msgWidth = 80
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28">
  <rect width="${labelWidth}" height="28" fill="#555"/>
  <rect x="${labelWidth}" width="${msgWidth}" height="28" fill="${color}"/>
  <text x="${labelWidth / 2}" y="18" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle" letter-spacing="1">${label.toUpperCase()}</text>
  <text x="${labelWidth + msgWidth / 2}" y="18" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle" letter-spacing="1">${message.toUpperCase()}</text>
</svg>`
  }

  const rx = style === 'flat-square' ? '0' : '3'
  const height = 20
  const labelWidth = 70
  const msgWidth = 70
  const totalWidth = labelWidth + msgWidth

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="${height}" rx="${rx}" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${msgWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11" text-anchor="middle">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14" fill="#fff">${label}</text>
    <text x="${labelWidth + msgWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelWidth + msgWidth / 2}" y="14" fill="#fff">${message}</text>
  </g>
</svg>`
}

export async function badgeRoute(app: FastifyInstance) {
  app.get<{
    Params: { id: string }
    Querystring: { style?: string; label?: string }
  }>('/api/badge/:id.svg', async (req, reply) => {
    const { id } = req.params
    const style = (req.query.style ?? 'flat') as BadgeStyle
    const labelOverride = req.query.label

    const { data: service, error } = await db
      .from('services')
      .select('id, name, is_verified, status')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !service) {
      const svg = buildSvg(labelOverride ?? 'aiendpoint', 'not found', '#e05d44', style)
      return reply.status(404).header('Content-Type', 'image/svg+xml').send(svg)
    }

    const label = labelOverride ?? 'AI-Ready'
    let message = 'registered'
    let color = '#9f9f9f'

    if (service.status === 'active' && service.is_verified) {
      message = 'verified ✓'
      color = '#4c1'
    } else if (service.status === 'active') {
      message = 'active'
      color = '#007ec6'
    }

    reply
      .header('Content-Type', 'image/svg+xml')
      .header('Cache-Control', 'public, max-age=3600')
      .send(buildSvg(label, message, color, style))
  })
}
