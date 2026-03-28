/**
 * Interactive wizard for creating /ai specs manually.
 * No LLM, no network. Pure readline prompts.
 */

import * as readline from 'node:readline'
import type { AiEndpointSpec, AiCapability } from './types.js'

const CATEGORIES = [
  'productivity', 'ecommerce', 'finance', 'news', 'weather', 'maps',
  'search', 'data', 'communication', 'calendar', 'storage', 'media',
  'health', 'education', 'travel', 'food', 'government', 'developer',
]

const AUTH_TYPES = ['none', 'apikey', 'bearer', 'oauth2']

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()))
  })
}

async function askRequired(rl: readline.Interface, question: string): Promise<string> {
  let answer = ''
  while (!answer) {
    answer = await ask(rl, question)
    if (!answer) console.log('  This field is required.')
  }
  return answer
}

export async function runWizard(): Promise<AiEndpointSpec> {
  const rl = createInterface()

  console.log('\n  AIEndpoint /ai Spec Generator\n')
  console.log('  Answer the prompts to generate your /ai endpoint spec.\n')

  // Service metadata
  const name = await askRequired(rl, '  Service name: ')
  const description = await askRequired(rl, '  Description (one sentence, for AI agents): ')

  console.log(`\n  Categories: ${CATEGORIES.join(', ')}`)
  const categoryInput = await ask(rl, '  Categories (comma-separated, or press Enter to skip): ')
  const category = categoryInput
    ? categoryInput.split(',').map(c => c.trim().toLowerCase()).filter(c => CATEGORIES.includes(c))
    : undefined

  const languageInput = await ask(rl, '  Languages (comma-separated BCP-47 codes, default: en): ')
  const language = languageInput
    ? languageInput.split(',').map(l => l.trim().toLowerCase())
    : ['en']

  // Auth
  console.log(`\n  Auth types: ${AUTH_TYPES.join(', ')}`)
  const authType = await ask(rl, '  Auth type (default: none): ') || 'none'
  let auth: AiEndpointSpec['auth'] | undefined
  if (AUTH_TYPES.includes(authType)) {
    auth = { type: authType }
    if (authType !== 'none') {
      const authDocs = await ask(rl, '  Auth docs URL (optional): ')
      if (authDocs) auth.docs = authDocs
    }
  }

  // Capabilities
  const capabilities: AiCapability[] = []
  console.log('\n  Now add capabilities (what can AI agents do with your service?).\n')

  let addMore = true
  while (addMore) {
    const capId = await askRequired(rl, `  Capability #${capabilities.length + 1} id (snake_case, e.g. search_products): `)
    const capDesc = await askRequired(rl, '    Description: ')
    const capEndpoint = await askRequired(rl, '    Endpoint (e.g. /api/search): ')
    const capMethod = (await ask(rl, '    Method (GET/POST/PUT/DELETE/PATCH, default: GET): ') || 'GET').toUpperCase()

    const params: Record<string, string> = {}
    console.log('    Params (enter empty name to finish):')
    let paramDone = false
    while (!paramDone) {
      const pName = await ask(rl, '      Param name: ')
      if (!pName) { paramDone = true; continue }
      const pDesc = await ask(rl, `      ${pName} description (e.g. "string, required"): `)
      params[pName] = pDesc || 'string, optional'
    }

    const returns = await ask(rl, '    Returns (e.g. "items[] {id, name, price}"): ')

    capabilities.push({
      id: capId,
      description: capDesc,
      endpoint: capEndpoint,
      method: capMethod,
      ...(Object.keys(params).length > 0 && { params }),
      ...(returns && { returns }),
    })

    const more = await ask(rl, '\n  Add another capability? (y/N): ')
    addMore = more.toLowerCase() === 'y'
  }

  rl.close()

  return {
    aiendpoint: '1.0',
    service: {
      name,
      description,
      ...(category && category.length > 0 && { category }),
      ...(language.length > 0 && { language }),
    },
    capabilities,
    ...(auth && { auth }),
    meta: { last_updated: new Date().toISOString().split('T')[0] },
  }
}
