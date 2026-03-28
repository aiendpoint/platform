/**
 * @aiendpoint/next - Serve /ai from Next.js App Router in one line.
 *
 * Usage:
 *   // app/ai/route.ts
 *   import { aiendpoint } from '@aiendpoint/next'
 *   export const GET = aiendpoint({ spec: './ai.json' })
 *
 *   // or with inline spec:
 *   export const GET = aiendpoint({ spec: { aiendpoint: '1.0', ... } })
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NextResponse } from 'next/server'

interface AiEndpointOptions {
  /** Path to ai.json file (relative to project root) or inline spec object */
  spec: string | Record<string, unknown>
  /** Cache-Control max-age in seconds (default: 3600) */
  maxAge?: number
}

export function aiendpoint(options: AiEndpointOptions) {
  const { maxAge = 3600 } = options

  let specData: Record<string, unknown>

  if (typeof options.spec === 'string') {
    const specPath = resolve(process.cwd(), options.spec)
    const raw = readFileSync(specPath, 'utf-8')
    specData = JSON.parse(raw)
  } else {
    specData = options.spec
  }

  return async function GET() {
    return NextResponse.json(specData, {
      headers: {
        'Cache-Control': `public, max-age=${maxAge}`,
      },
    })
  }
}
