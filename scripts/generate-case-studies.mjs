#!/usr/bin/env node

/**
 * Generate /ai case studies from public OpenAPI specs.
 *
 * For each API:
 *   1. Fetch OpenAPI spec -> count tokens
 *   2. Convert to /ai spec via CLI logic -> count tokens
 *   3. Fetch homepage HTML -> count tokens
 *   4. Save results as JSON + ai.json
 *
 * Usage: node scripts/generate-case-studies.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'case-studies')

// ─── Token estimation (same as CLI) ──────────────────────────────────────

function estimateTokens(text) {
  let ascii = 0
  let nonAscii = 0
  for (const ch of text) {
    if (ch.charCodeAt(0) < 128) ascii++
    else nonAscii++
  }
  return Math.ceil(ascii / 4 + nonAscii / 1.5)
}

// ─── OpenAPI -> /ai converter (inline, same logic as CLI) ────────────────

function toSnakeId(raw) {
  return raw.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '').toLowerCase().slice(0, 64)
}

function convertOpenApiToAi(raw) {
  const isV3 = typeof raw.openapi === 'string' && raw.openapi.startsWith('3.')
  const isV2 = typeof raw.swagger === 'string' && raw.swagger.startsWith('2.')
  if (!isV3 && !isV2) throw new Error('Not a valid OpenAPI spec')

  const info = raw.info ?? {}
  const paths = raw.paths ?? {}
  const name = String(info.title ?? 'Unknown').slice(0, 80)
  const description = String(info.description ?? `${name} API`).slice(0, 300)

  const rawTags = raw.tags
  const category = rawTags?.slice(0, 4).map(t => toSnakeId(t.name)) ?? []

  let auth
  if (isV3) {
    const schemes = raw.components?.securitySchemes
    const first = schemes ? Object.values(schemes)[0] : undefined
    if (first) {
      if (first.type === 'apiKey') auth = { type: 'apikey' }
      else if (first.type === 'oauth2') auth = { type: 'oauth2' }
      else if (first.type === 'http' && first.scheme === 'bearer') auth = { type: 'bearer' }
    }
  } else {
    const secDefs = raw.securityDefinitions
    const first = secDefs ? Object.values(secDefs)[0] : undefined
    if (first) {
      if (first.type === 'apiKey') auth = { type: 'apikey' }
      else if (first.type === 'oauth2') auth = { type: 'oauth2' }
    }
  }

  const capabilities = []
  const methods = ['get', 'post', 'put', 'patch', 'delete']
  outer: for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      if (capabilities.length >= 20) break outer
      const op = pathItem[method]
      if (!op) continue
      const rawId = op.operationId ?? `${method}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`
      const id = toSnakeId(rawId)
      const desc = String(op.summary ?? op.description ?? `${method.toUpperCase()} ${path}`).slice(0, 200)
      const params = {}
      if (op.parameters) {
        for (const p of op.parameters) {
          if (p.in !== 'query' && p.in !== 'path') continue
          const pType = String(p.schema?.type ?? p.type ?? 'string')
          const required = p.required ? 'required' : 'optional'
          const pDesc = p.description ? ` - ${String(p.description).slice(0, 60)}` : ''
          params[String(p.name)] = `${pType} (${required}${pDesc})`
        }
      }
      const responses = op.responses
      const okResp = responses?.['200'] ?? responses?.['201']
      const returns = okResp?.description ? String(okResp.description).slice(0, 200) : undefined
      capabilities.push({ id, description: desc, endpoint: path, method: method.toUpperCase(), ...(Object.keys(params).length > 0 && { params }), ...(returns && { returns }) })
    }
  }

  return {
    aiendpoint: '1.0',
    service: { name, description, ...(category.length > 0 && { category }) },
    capabilities,
    ...(auth && { auth }),
    meta: { last_updated: new Date().toISOString().split('T')[0] },
  }
}

// ─── Fetch with timeout ──────────────────────────────────────────────────

async function fetchText(url, accept = 'text/html') {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AIEndpoint-CaseStudy/1.0', Accept: accept },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ─── API list ────────────────────────────────────────────────────────────

const APIS = [
  {
    slug: 'petstore',
    name: 'Swagger Petstore',
    homepage: 'https://petstore3.swagger.io',
    openapi: 'https://petstore3.swagger.io/api/v3/openapi.json',
  },
  {
    slug: 'github',
    name: 'GitHub REST API',
    homepage: 'https://github.com',
    openapi: 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json',
  },
  {
    slug: 'stripe',
    name: 'Stripe API',
    homepage: 'https://stripe.com',
    openapi: 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json',
  },
  {
    slug: 'openai',
    name: 'OpenAI API',
    homepage: 'https://openai.com',
    openapi: 'https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml',
  },
  {
    slug: 'slack',
    name: 'Slack Web API',
    homepage: 'https://slack.com',
    openapi: 'https://raw.githubusercontent.com/slackapi/slack-api-specs/master/web-api/slack_web_openapi_v2.json',
  },
  {
    slug: 'notion',
    name: 'Notion API',
    homepage: 'https://notion.so',
    openapi: 'https://raw.githubusercontent.com/Documented-Notifications/notion-sdk-openapi/main/openapi.json',
  },
  {
    slug: 'spotify',
    name: 'Spotify Web API',
    homepage: 'https://spotify.com',
    openapi: 'https://developer.spotify.com/_data/documentation/web-api/reference/open-api-schema.yml',
  },
  {
    slug: 'twilio',
    name: 'Twilio API',
    homepage: 'https://twilio.com',
    openapi: 'https://raw.githubusercontent.com/twilio/twilio-oai/main/spec/json/twilio_api_v2010.json',
  },
  {
    slug: 'hacker-news',
    name: 'Hacker News API',
    homepage: 'https://news.ycombinator.com',
    // No official OpenAPI - skip conversion, just measure HTML
    openapi: null,
  },
  {
    slug: 'jsonplaceholder',
    name: 'JSONPlaceholder',
    homepage: 'https://jsonplaceholder.typicode.com',
    // No official OpenAPI
    openapi: null,
  },
]

// ─── Main ────────────────────────────────────────────────────────────────

async function processApi(api) {
  console.log(`\n  Processing ${api.name}...`)
  const result = {
    slug: api.slug,
    name: api.name,
    homepage: api.homepage,
    openapi_url: api.openapi,
    html_tokens: null,
    html_bytes: null,
    openapi_tokens: null,
    openapi_bytes: null,
    ai_tokens: null,
    ai_bytes: null,
    capabilities: 0,
    savings_vs_html: null,
    savings_vs_openapi: null,
    error: null,
  }

  // 1. Fetch homepage HTML
  const html = await fetchText(api.homepage)
  if (html) {
    result.html_bytes = new TextEncoder().encode(html).length
    result.html_tokens = estimateTokens(html)
    console.log(`    HTML: ${result.html_bytes.toLocaleString()} bytes, ~${result.html_tokens.toLocaleString()} tokens`)
  } else {
    console.log(`    HTML: fetch failed`)
  }

  if (!api.openapi) {
    result.error = 'no_openapi'
    console.log(`    OpenAPI: not available`)
    return result
  }

  // 2. Fetch OpenAPI spec
  const openapiText = await fetchText(api.openapi, 'application/json')
  if (!openapiText) {
    result.error = 'openapi_fetch_failed'
    console.log(`    OpenAPI: fetch failed`)
    return result
  }

  result.openapi_bytes = new TextEncoder().encode(openapiText).length
  result.openapi_tokens = estimateTokens(openapiText)
  console.log(`    OpenAPI: ${result.openapi_bytes.toLocaleString()} bytes, ~${result.openapi_tokens.toLocaleString()} tokens`)

  // 3. Convert to /ai
  let raw
  try {
    raw = JSON.parse(openapiText)
  } catch {
    // Might be YAML - skip
    result.error = 'yaml_not_supported'
    console.log(`    OpenAPI: YAML format, skipping conversion`)
    return result
  }

  let spec
  try {
    spec = convertOpenApiToAi(raw)
  } catch (e) {
    result.error = `conversion_failed: ${e.message}`
    console.log(`    Conversion failed: ${e.message}`)
    return result
  }

  const aiJson = JSON.stringify(spec, null, 2)
  result.ai_bytes = new TextEncoder().encode(aiJson).length
  result.ai_tokens = estimateTokens(aiJson)
  result.capabilities = spec.capabilities.length
  console.log(`    /ai: ${result.ai_bytes.toLocaleString()} bytes, ~${result.ai_tokens.toLocaleString()} tokens, ${result.capabilities} capabilities`)

  // 4. Calculate savings
  if (result.html_tokens && result.ai_tokens) {
    result.savings_vs_html = Math.round((1 - result.ai_tokens / result.html_tokens) * 100)
    console.log(`    Savings vs HTML: ${result.savings_vs_html}%`)
  }
  if (result.openapi_tokens && result.ai_tokens) {
    result.savings_vs_openapi = Math.round((1 - result.ai_tokens / result.openapi_tokens) * 100)
    console.log(`    Savings vs OpenAPI: ${result.savings_vs_openapi}%`)
  }

  // 5. Save ai.json
  const dir = join(OUT_DIR, api.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'ai.json'), aiJson + '\n')

  return result
}

async function main() {
  console.log('  Generating case studies...\n')

  const results = []
  for (const api of APIS) {
    const result = await processApi(api)
    results.push(result)
  }

  // Save summary
  writeFileSync(join(OUT_DIR, 'summary.json'), JSON.stringify(results, null, 2) + '\n')

  // Generate markdown table
  const lines = [
    '# AIEndpoint Case Studies',
    '',
    'Token comparison: how much does an AI agent save by reading `/ai` instead of raw HTML or OpenAPI specs?',
    '',
    '| Service | HTML tokens | OpenAPI tokens | /ai tokens | Capabilities | Savings vs HTML | Savings vs OpenAPI |',
    '|---------|------------|---------------|-----------|-------------|----------------|-------------------|',
  ]

  for (const r of results) {
    if (r.error && r.error !== 'no_openapi') continue
    const html = r.html_tokens ? `~${r.html_tokens.toLocaleString()}` : 'N/A'
    const openapi = r.openapi_tokens ? `~${r.openapi_tokens.toLocaleString()}` : 'N/A'
    const ai = r.ai_tokens ? `~${r.ai_tokens.toLocaleString()}` : 'N/A'
    const caps = r.capabilities || 'N/A'
    const sHtml = r.savings_vs_html ? `${r.savings_vs_html}%` : 'N/A'
    const sOapi = r.savings_vs_openapi ? `${r.savings_vs_openapi}%` : 'N/A'
    lines.push(`| ${r.name} | ${html} | ${openapi} | ${ai} | ${caps} | ${sHtml} | ${sOapi} |`)
  }

  lines.push('')
  lines.push(`Generated on ${new Date().toISOString().split('T')[0]} by \`node scripts/generate-case-studies.mjs\``)
  lines.push('')

  writeFileSync(join(OUT_DIR, 'README.md'), lines.join('\n'))

  console.log('\n  Summary saved to case-studies/summary.json')
  console.log('  Table saved to case-studies/README.md')

  // Print table
  console.log('\n' + lines.join('\n'))
}

main().catch(e => { console.error(e); process.exit(1) })
