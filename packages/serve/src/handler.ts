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
  /**
   * Explicit route path override. When set, ONLY this path is served.
   * Default: '/.well-known/ai' (authoritative per draft-01) plus the
   * '/ai' legacy alias.
   */
  path?: string
  /**
   * Also serve the legacy '/ai' alias alongside '/.well-known/ai'
   * (default: true). Ignored when `path` is set.
   */
  legacyAlias?: boolean
}

export const WELL_KNOWN_PATH = '/.well-known/ai'
export const LEGACY_PATH = '/ai'

/** Paths an adapter should serve the discovery document at. */
export function resolvePaths(options: ServeOptions): string[] {
  if (options.path) return [options.path]
  return options.legacyAlias === false ? [WELL_KNOWN_PATH] : [WELL_KNOWN_PATH, LEGACY_PATH]
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
