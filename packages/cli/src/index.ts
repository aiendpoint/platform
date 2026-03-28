#!/usr/bin/env node

/**
 * @aiendpoint/cli - Generate /ai endpoint specs for your service.
 *
 * Usage:
 *   npx @aiendpoint/cli init                    # Interactive wizard
 *   npx @aiendpoint/cli init --openapi <url>    # Convert from OpenAPI spec
 *   npx @aiendpoint/cli validate <url>          # Validate a live /ai endpoint
 */

import { Command } from 'commander'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { convertOpenApiToAi } from './openapi.js'
import { runWizard } from './wizard.js'
import { validateSpec, estimateTokens } from './validate.js'
import { generateCode, writeFiles, detectFramework, type Framework } from './codegen.js'
import type { AiEndpointSpec } from './types.js'

const program = new Command()

program
  .name('aiendpoint')
  .description('Generate /ai endpoint specs for your service')
  .version('0.1.0')

// ─── init command ─────────────────────────────────────────────────────────

program
  .command('init')
  .description('Generate a /ai spec for your service')
  .option('--openapi <url>', 'Generate from an OpenAPI/Swagger spec URL or local file')
  .option('--framework <type>', 'Target framework: nextjs, fastify (auto-detected if omitted)')
  .option('--output <dir>', 'Output directory (default: current directory)')
  .option('--force', 'Overwrite existing files')
  .option('--json-only', 'Only output ai.json, skip route handler generation')
  .action(async (opts) => {
    const outputDir = path.resolve(opts.output ?? '.')

    let spec: AiEndpointSpec

    if (opts.openapi) {
      // OpenAPI mode
      spec = await handleOpenApi(opts.openapi)
    } else {
      // Interactive wizard mode
      spec = await runWizard()
    }

    // Validate
    console.log('\n  Validating spec...')
    const result = validateSpec(spec)

    const specJson = JSON.stringify(spec, null, 2)
    const tokens = estimateTokens(specJson)

    console.log(`\n  Score: ${result.score}/100 (${result.grade})`)
    console.log(`  Capabilities: ${spec.capabilities.length}`)
    console.log(`  Token estimate: ~${tokens} tokens`)

    if (result.errors.length > 0) {
      console.log('\n  Errors:')
      for (const e of result.errors) console.log(`    - ${e}`)
    }
    if (result.warnings.length > 0) {
      console.log('\n  Warnings:')
      for (const w of result.warnings) console.log(`    - ${w}`)
    }

    if (opts.jsonOnly) {
      // Just write ai.json
      const specPath = path.join(outputDir, 'ai.json')
      if (fs.existsSync(specPath) && !opts.force) {
        console.log(`\n  Skipped: ${specPath} already exists (use --force to overwrite)`)
      } else {
        fs.mkdirSync(path.dirname(specPath), { recursive: true })
        fs.writeFileSync(specPath, specJson + '\n')
        console.log(`\n  Written: ${specPath}`)
      }
      return
    }

    // Detect or use specified framework
    const framework: Framework | null = opts.framework ?? detectFramework(outputDir)

    if (!framework) {
      // No framework detected, just write ai.json
      const specPath = path.join(outputDir, 'ai.json')
      if (fs.existsSync(specPath) && !opts.force) {
        console.log(`\n  Skipped: ${specPath} already exists (use --force to overwrite)`)
      } else {
        fs.writeFileSync(specPath, specJson + '\n')
        console.log(`\n  Written: ${specPath}`)
      }
      console.log('\n  No framework detected. To also generate a route handler, use --framework nextjs|fastify')
      return
    }

    console.log(`\n  Framework: ${framework}`)

    const codeResult = generateCode(framework, outputDir)
    const { specWritten, codeWritten } = writeFiles(spec, codeResult, opts.force ?? false)

    console.log('\n  Files:')
    if (specWritten) console.log(`    + ${path.relative(outputDir, codeResult.specPath)}`)
    if (codeWritten) console.log(`    + ${path.relative(outputDir, codeResult.filePath)}`)

    console.log('\n  Done! Your service now has a /ai endpoint.')
    console.log('  Test it: curl http://localhost:3000/ai | jq .')
    console.log('  Validate: npx @aiendpoint/cli validate http://localhost:3000\n')
  })

// ─── validate command ─────────────────────────────────────────────────────

program
  .command('validate <url>')
  .description('Validate a live /ai endpoint')
  .action(async (url: string) => {
    const base = url.replace(/\/$/, '')
    const aiUrls = [`${base}/ai`, `${base}/.well-known/ai`]

    console.log(`\n  Validating /ai endpoint at ${base}...\n`)

    let spec: unknown = null
    let aiUrl = ''
    let responseMs = 0

    for (const u of aiUrls) {
      try {
        const start = Date.now()
        const res = await fetch(u, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'AIEndpoint-CLI/0.1' },
        })
        responseMs = Date.now() - start
        if (res.ok) {
          spec = await res.json()
          aiUrl = u
          break
        }
      } catch { /* try next */ }
    }

    if (!spec) {
      console.log(`  No /ai endpoint found.`)
      console.log(`  Tried: ${aiUrls.join(', ')}`)
      console.log(`\n  Run "npx @aiendpoint/cli init" to create one.\n`)
      process.exit(1)
    }

    console.log(`  Found: ${aiUrl} (${responseMs}ms)`)

    const result = validateSpec(spec as AiEndpointSpec)
    const specJson = JSON.stringify(spec, null, 2)
    const tokens = estimateTokens(specJson)

    console.log(`  Score: ${result.score}/100 (${result.grade})`)
    console.log(`  Capabilities: ${(spec as AiEndpointSpec).capabilities?.length ?? 0}`)
    console.log(`  Token estimate: ~${tokens} tokens`)

    if (result.errors.length > 0) {
      console.log('\n  Errors:')
      for (const e of result.errors) console.log(`    - ${e}`)
    }
    if (result.warnings.length > 0) {
      console.log('\n  Warnings:')
      for (const w of result.warnings) console.log(`    - ${w}`)
    }

    console.log('')
    process.exit(result.errors.length > 0 ? 1 : 0)
  })

// ─── Parse + run ──────────────────────────────────────────────────────────

program.parse()

// ─── OpenAPI handler ──────────────────────────────────────────────────────

async function handleOpenApi(input: string): Promise<AiEndpointSpec> {
  let raw: Record<string, unknown>

  // Check if it's a local file
  const resolvedPath = path.resolve(input)
  if (fs.existsSync(resolvedPath)) {
    console.log(`\n  Reading OpenAPI spec from ${resolvedPath}...`)
    const content = fs.readFileSync(resolvedPath, 'utf-8')
    raw = JSON.parse(content)
  } else if (input.startsWith('http://') || input.startsWith('https://')) {
    console.log(`\n  Fetching OpenAPI spec from ${input}...`)
    const res = await fetch(input, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error(`  Failed: HTTP ${res.status}`)
      process.exit(1)
    }
    raw = await res.json() as Record<string, unknown>
  } else {
    console.error(`  Error: "${input}" is not a valid URL or file path`)
    process.exit(1)
  }

  try {
    const spec = convertOpenApiToAi(raw)
    console.log(`  Converted: ${spec.capabilities.length} capabilities extracted`)
    return spec
  } catch (e) {
    console.error(`  Error: ${(e as Error).message}`)
    process.exit(1)
  }
}
