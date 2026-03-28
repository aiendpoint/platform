/**
 * Shared spec loader and generic handler.
 * All framework adapters use this as the core.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ServeOptions {
  /** Path to ai.json (relative to cwd) or inline spec object */
  spec: string | Record<string, unknown>
  /** Cache-Control max-age in seconds (default: 3600) */
  maxAge?: number
  /** Route path (default: '/ai') - used by adapters that register routes */
  path?: string
}

export function loadSpec(spec: string | Record<string, unknown>): Record<string, unknown> {
  if (typeof spec === 'string') {
    const specPath = resolve(process.cwd(), spec)
    return JSON.parse(readFileSync(specPath, 'utf-8'))
  }
  return spec
}

export function cacheHeader(maxAge: number): string {
  return `public, max-age=${maxAge}`
}
