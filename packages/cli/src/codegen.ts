/**
 * Code generation for framework-specific /ai route handlers.
 * Generates ready-to-use code files for Next.js and Fastify.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export type Framework = 'nextjs' | 'fastify'

interface CodegenResult {
  filePath: string
  code: string
  specPath: string
}

export function generateCode(framework: Framework, outputDir: string): CodegenResult {
  switch (framework) {
    case 'nextjs':
      return generateNextJs(outputDir)
    case 'fastify':
      return generateFastify(outputDir)
  }
}

function generateNextJs(outputDir: string): CodegenResult {
  const specPath = path.join(outputDir, 'ai.json')
  const filePath = path.join(outputDir, 'app', 'ai', 'route.ts')

  const code = `import { NextResponse } from 'next/server'
import spec from '../../../ai.json'

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
`

  return { filePath, code, specPath }
}

function generateFastify(outputDir: string): CodegenResult {
  const specPath = path.join(outputDir, 'ai.json')
  const filePath = path.join(outputDir, 'src', 'routes', 'ai.ts')

  const code = `import type { FastifyInstance } from 'fastify'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const spec = JSON.parse(readFileSync(join(__dirname, '..', '..', 'ai.json'), 'utf-8'))

export async function aiRoute(app: FastifyInstance) {
  app.get('/ai', async (_req, reply) => {
    reply
      .header('Content-Type', 'application/json')
      .header('Cache-Control', 'public, max-age=3600')
      .send(spec)
  })
}
`

  return { filePath, code, specPath }
}

export function writeFiles(
  spec: unknown,
  result: CodegenResult,
  force: boolean,
): { specWritten: boolean; codeWritten: boolean } {
  let specWritten = false
  let codeWritten = false

  // Write ai.json
  if (fs.existsSync(result.specPath) && !force) {
    console.log(`  Skipped: ${result.specPath} already exists (use --force to overwrite)`)
  } else {
    fs.mkdirSync(path.dirname(result.specPath), { recursive: true })
    fs.writeFileSync(result.specPath, JSON.stringify(spec, null, 2) + '\n')
    specWritten = true
  }

  // Write route handler
  if (fs.existsSync(result.filePath) && !force) {
    console.log(`  Skipped: ${result.filePath} already exists (use --force to overwrite)`)
  } else {
    fs.mkdirSync(path.dirname(result.filePath), { recursive: true })
    fs.writeFileSync(result.filePath, result.code)
    codeWritten = true
  }

  return { specWritten, codeWritten }
}

export function detectFramework(dir: string): Framework | null {
  // Check for Next.js
  const nextConfig = ['next.config.js', 'next.config.mjs', 'next.config.ts']
  for (const f of nextConfig) {
    if (fs.existsSync(path.join(dir, f))) return 'nextjs'
  }

  // Check for Fastify in package.json
  const pkgPath = path.join(dir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.fastify) return 'fastify'
    } catch { /* ignore */ }
  }

  return null
}
