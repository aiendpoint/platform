#!/usr/bin/env node
/**
 * seed-community.mjs
 *
 * Reads domains from Tranco CSV, generates /ai specs via the registry's
 * /api/convert/webpage endpoint (Gemini), then submits them to /api/community.
 *
 * Usage:
 *   node scripts/seed-community.mjs --limit=10 --offset=0
 *   node scripts/seed-community.mjs --limit=10 --offset=10
 *   node scripts/seed-community.mjs --limit=50 --offset=0 --api=http://localhost:4000
 *
 * Options:
 *   --limit   Number of domains to process (default: 10)
 *   --offset  Starting position in CSV (default: 0)
 *   --api     Registry API base URL (default: https://api.aiendpoint.dev)
 *   --csv     Path to Tranco CSV (default: scripts/tranco-top-1m.csv)
 *   --delay   Delay in ms between requests (default: 1000)
 *   --dry-run Print domains without registering
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Parse args ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = {}
  for (const arg of process.argv.slice(2)) {
    const [key, val] = arg.replace(/^--/, '').split('=')
    args[key] = val ?? 'true'
  }
  return {
    limit:  parseInt(args.limit ?? '10', 10),
    offset: parseInt(args.offset ?? '0', 10),
    api:    args.api ?? 'https://api.aiendpoint.dev',
    csv:    args.csv ?? resolve(__dirname, 'tranco-top-1m.csv'),
    delay:  parseInt(args.delay ?? '1000', 10),
    dryRun: args['dry-run'] === 'true',
  }
}

// ─── Load domains from CSV ──────────────────────────────────────────────────

function loadDomains(csvPath, offset, limit) {
  const content = readFileSync(csvPath, 'utf-8')
  const lines = content.trim().split('\n')
  return lines.slice(offset, offset + limit).map(line => {
    const [rank, domain] = line.split(',')
    return { rank: parseInt(rank, 10), domain: domain.trim() }
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Domains to skip (CDNs, DNS infra, ad networks, etc.)
const SKIP_PATTERNS = [
  /^gtld-servers\.net$/,
  /^root-servers\.net$/,
  /^googleapis\.com$/,
  /^gstatic\.com$/,
  /^googleusercontent\.com$/,
  /^googlevideo\.com$/,
  /^google-analytics\.com$/,
  /^googletagmanager\.com$/,
  /^googleadservices\.com$/,
  /^googlesyndication\.com$/,
  /^doubleclick\.net$/,
  /^cloudflare\.com$/,
  /^cloudflare-dns\.com$/,
  /^akamai\.net$/,
  /^akamaiedge\.net$/,
  /^akamaitechnologies\.com$/,
  /^amazonaws\.com$/,
  /^cloudfront\.net$/,
  /^fbcdn\.net$/,
  /^fbsbx\.com$/,
  /^edgecastcdn\.net$/,
  /^fastly\.net$/,
  /^trafficmanager\.net$/,
  /^azurewebsites\.net$/,
  /^azureedge\.net$/,
  /^msedge\.net$/,
  /^aaplimg\.com$/,
  /^apple-dns\.net$/,
  /^icloud-content\.com$/,
  /^mzstatic\.com$/,
  /^cdn\./,
  /^ns\d?\./,
  /^dns\./,
  // URL shorteners & redirectors
  /^goo\.gl$/,
  /^bit\.ly$/,
  /^youtu\.be$/,
  /^wa\.me$/,
  /^t\.co$/,
  // CDN / infra continued
  /^pv-cdn\.net$/,
  /^akadns\.net$/,
  /^akam\.net$/,
  /^edgekey\.net$/,
  /^edgesuite\.net$/,
  /^tiktokcdn\.com$/,
  /^tiktokv\.com$/,
  /^ytimg\.com$/,
  /^gvt\d\.com$/,
  /^e2ro\.com$/,
  /^ripn\.net$/,
  /^cloudflare\.net$/,
  /^yandex\.net$/,
  /^googledomains\.com$/,
  /^appsflyersdk\.com$/,
  // Internal / update / auth services
  /^windowsupdate\.com$/,
  /^microsoftonline\.com$/,
  /^domaincontrol\.com$/,
  /^keenetic\.io$/,
  /^myfritz\.net$/,
  /^windows\.net$/,
  /^workers\.dev$/,
  /^office\.net$/,
  /^whatsapp\.net$/,
  /^icloud-content\.com$/,
  /^mzstatic\.com$/,
  /^ntp\.org$/,
  /^root-servers\.net$/,
  /^cloud\.microsoft$/,
]

function shouldSkip(domain) {
  return SKIP_PATTERNS.some(p => p.test(domain))
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()

  console.log(`\n🌐 AIEndpoint Community Seeder`)
  console.log(`   API:    ${opts.api}`)
  console.log(`   CSV:    ${opts.csv}`)
  console.log(`   Range:  offset=${opts.offset}, limit=${opts.limit}`)
  console.log(`   Delay:  ${opts.delay}ms`)
  console.log(`   DryRun: ${opts.dryRun}\n`)

  const domains = loadDomains(opts.csv, opts.offset, opts.limit)
  console.log(`📋 Loaded ${domains.length} domains\n`)

  const startTime = Date.now()
  let success = 0
  let skipped = 0
  let failed = 0

  for (const { rank, domain } of domains) {
    const prefix = `[#${rank} ${domain}]`

    // Skip infra domains
    if (shouldSkip(domain)) {
      console.log(`${prefix} ⏭  Skipped (infra/CDN)`)
      skipped++
      continue
    }

    if (opts.dryRun) {
      console.log(`${prefix} 🔍 Would process https://${domain}`)
      continue
    }

    const url = `https://${domain}`

    try {
      // Step 1: Check if already has /ai endpoint
      try {
        const aiRes = await fetch(`${url}/ai`, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'AIEndpoint-Seeder/1.0' },
        })
        if (aiRes.ok) {
          const spec = await aiRes.json()
          if (spec.aiendpoint && spec.service?.name) {
            console.log(`${prefix} ✅ Already has /ai — skipping`)
            skipped++
            continue
          }
        }
      } catch {
        // No /ai, continue
      }

      // Step 2: Check if already in community registry
      try {
        const communityRes = await fetch(
          `${opts.api}/api/community/${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (communityRes.ok) {
          console.log(`${prefix} ✅ Already in community registry — skipping`)
          skipped++
          continue
        }
      } catch {
        // Not in registry, continue
      }

      // Step 3: Generate spec via /api/convert/webpage
      const convertRes = await fetch(`${opts.api}/api/convert/webpage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(30000),
      })

      if (!convertRes.ok) {
        const err = await convertRes.text().catch(() => '')
        console.log(`${prefix} ❌ Convert failed: ${convertRes.status} ${err.slice(0, 100)}`)
        failed++
        await sleep(opts.delay)
        continue
      }

      const { converted, capability_count, ai_enhanced } = await convertRes.json()

      if (!converted || capability_count === 0) {
        console.log(`${prefix} ⚠️  No capabilities generated — skipping`)
        skipped++
        await sleep(opts.delay)
        continue
      }

      // Step 4: Submit to community registry
      const submitRes = await fetch(`${opts.api}/api/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          ai_spec: converted,
          source_hints: {
            seeder: 'tranco-top-1m',
            rank,
            ai_enhanced,
          },
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (submitRes.ok || submitRes.status === 201) {
        const result = await submitRes.json()
        console.log(`${prefix} ✅ Registered (confidence: ${result.confidence}, caps: ${capability_count}, ai: ${ai_enhanced})`)
        success++
      } else if (submitRes.status === 409) {
        console.log(`${prefix} ⏭  Owner already registered`)
        skipped++
      } else if (submitRes.status === 429) {
        console.log(`${prefix} ⏸  Rate limited — waiting 60s`)
        await sleep(60000)
        failed++
      } else {
        const err = await submitRes.text().catch(() => '')
        console.log(`${prefix} ❌ Submit failed: ${submitRes.status} ${err.slice(0, 100)}`)
        failed++
      }
    } catch (e) {
      console.log(`${prefix} ❌ Error: ${e.message}`)
      failed++
    }

    await sleep(opts.delay)
  }

  const elapsed = Date.now() - startTime
  const processed = success + failed
  const avgMs = processed > 0 ? Math.round(elapsed / processed) : 0

  console.log(`\n📊 Results:`)
  console.log(`   ✅ Success: ${success}`)
  console.log(`   ⏭  Skipped: ${skipped}`)
  console.log(`   ❌ Failed:  ${failed}`)
  console.log(`   Total:     ${domains.length}`)
  console.log(`\n⏱  Time:`)
  console.log(`   Total:   ${(elapsed / 1000).toFixed(1)}s`)
  console.log(`   Avg/site: ${(avgMs / 1000).toFixed(1)}s (${processed} processed)\n`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
