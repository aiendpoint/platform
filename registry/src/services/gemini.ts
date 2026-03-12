/**
 * Gemini Flash — webpage → /ai spec generator
 *
 * Layer 1 (always): HTML meta extraction (title, og tags, JSON-LD)
 * Layer 2 (if GEMINI_API_KEY is set): Gemini 1.5 Flash enhances capabilities + description
 *
 * Required env var: GEMINI_API_KEY (Google AI Studio, free tier: 15 RPM)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AiEndpointSpec } from '../types/index.js'

// ─── Gemini client (lazy, no-op if env var absent) ────────────────────────────
let geminiModel: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']> | null = null

if (process.env.GEMINI_API_KEY) {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  geminiModel = genai.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  })
}

export const geminiAvailable = () => geminiModel !== null

// ─── HTML utilities ───────────────────────────────────────────────────────────

function extractMeta(html: string): { title: string; description: string; text: string } {
  const get = (pattern: RegExp) => pattern.exec(html)?.[1]?.trim() ?? ''

  const title = (
    get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i) ||
    get(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:title["']/i) ||
    get(/<title[^>]*>([^<]{1,200})<\/title>/i)
  )

  const description = (
    get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,500})["']/i) ||
    get(/<meta[^>]+content=["']([^"']{1,500})["'][^>]+property=["']og:description["']/i) ||
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,500})["']/i) ||
    get(/<meta[^>]+content=["']([^"']{1,500})["'][^>]+name=["']description["']/i)
  )

  // Stripped readable text (no scripts/styles/tags)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)

  return { title, description, text }
}

function buildFallbackSpec(url: string, meta: ReturnType<typeof extractMeta>): AiEndpointSpec {
  const origin = new URL(url).hostname.replace(/^www\./, '')
  return {
    aiendpoint: '1.0',
    service: {
      name:        meta.title  || origin,
      description: meta.description || `Web service at ${origin}`,
    },
    capabilities: [],
    meta: { last_updated: new Date().toISOString().split('T')[0] },
  }
}

// ─── Gemini prompt ────────────────────────────────────────────────────────────

const SPEC_SCHEMA = `{
  "aiendpoint": "1.0",
  "service": {
    "name": "string (max 80 chars)",
    "description": "string — concise AI-optimized description (max 200 chars)",
    "category": ["string — pick from: ecommerce,productivity,data,finance,media,communication,developer,ai,search,maps,weather,news"],
    "language": ["ko or en or both"]
  },
  "capabilities": [
    {
      "id": "snake_case_action_name",
      "description": "what this does (max 120 chars)",
      "endpoint": "/api/resource",
      "method": "GET|POST|PUT|DELETE",
      "params": { "param_name": "type (required|optional) — short description" },
      "returns": "short description of response (max 120 chars)"
    }
  ],
  "auth": { "type": "none|apikey|oauth2|bearer" }
}`

async function enhanceWithGemini(url: string, meta: ReturnType<typeof extractMeta>): Promise<AiEndpointSpec> {
  const prompt = `You are an API documentation expert. Analyze this web service and generate a /ai endpoint spec for AI agents.

Service URL: ${url}
Page title: ${meta.title || '(unknown)'}
Page description: ${meta.description || '(unknown)'}
Page content (excerpt):
---
${meta.text}
---

Output ONLY valid JSON matching this exact schema (no markdown, no explanation):
${SPEC_SCHEMA}

Rules:
- max 10 capabilities — infer logical API endpoints even if not explicitly listed
- descriptions must be concise and AI-optimized (no fluff)
- if auth cannot be determined, use "none"
- if language cannot be determined, use ["en"]
- category must be one or more from the allowed list`

  const result = await geminiModel!.generateContent(prompt)
  const text   = result.response.text()

  // Parse and validate minimally
  const spec = JSON.parse(text) as AiEndpointSpec
  if (!spec.aiendpoint || !spec.service?.name || !Array.isArray(spec.capabilities)) {
    throw new Error('Gemini returned invalid spec structure')
  }

  // Enforce limits
  spec.capabilities = spec.capabilities.slice(0, 10)
  spec.service.name        = String(spec.service.name).slice(0, 80)
  spec.service.description = String(spec.service.description).slice(0, 300)

  return spec
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface WebpageAnalysisResult {
  spec:        AiEndpointSpec
  ai_enhanced: boolean
  method:      'ai' | 'meta'
}

export async function analyzeWebpage(url: string, html: string): Promise<WebpageAnalysisResult> {
  const meta = extractMeta(html)

  if (geminiModel) {
    try {
      const spec = await enhanceWithGemini(url, meta)
      return { spec, ai_enhanced: true, method: 'ai' }
    } catch (err) {
      // Gemini failed — fall back silently
      console.error('[gemini] fallback to meta extraction:', (err as Error).message)
    }
  }

  return { spec: buildFallbackSpec(url, meta), ai_enhanced: false, method: 'meta' }
}
