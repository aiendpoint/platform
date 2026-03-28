# @aiendpoint/serve

Serve your `/ai` endpoint from any JS/TS framework. One package, one install.

## Install

```bash
npm install @aiendpoint/serve
```

## Usage

### Express

```ts
import express from 'express'
import { aiendpoint } from '@aiendpoint/serve/express'

const app = express()
app.use(aiendpoint({ spec: './ai.json' }))
app.listen(3000)
```

### Fastify

```ts
import Fastify from 'fastify'
import { aiendpoint } from '@aiendpoint/serve/fastify'

const app = Fastify()
app.register(aiendpoint, { spec: './ai.json' })
app.listen({ port: 3000 })
```

### Next.js (App Router)

```ts
// app/ai/route.ts
import { aiendpoint } from '@aiendpoint/serve/next'

export const GET = aiendpoint({ spec: './ai.json' })
```

### Hono

```ts
import { Hono } from 'hono'
import { aiendpoint } from '@aiendpoint/serve/hono'

const app = new Hono()
app.use(aiendpoint({ spec: './ai.json' }))
export default app
```

### NestJS

NestJS uses Express under the hood. Use the Express adapter:

```ts
// main.ts
import { aiendpoint } from '@aiendpoint/serve/express'

app.use(aiendpoint({ spec: './ai.json' }))
```

## Options

All adapters accept the same options:

```ts
aiendpoint({
  spec: './ai.json',  // path to spec file, or inline object
  path: '/ai',        // route path (default: '/ai')
  maxAge: 3600,       // Cache-Control max-age in seconds (default: 3600)
})
```

## Generate ai.json

```bash
npx @aiendpoint/cli init --openapi https://your-api.com/openapi.json
npx @aiendpoint/cli init  # interactive wizard
```

## Custom adapter

For frameworks not listed above, use the shared utilities:

```ts
import { loadSpec, cacheHeader } from '@aiendpoint/serve/handler'

const spec = loadSpec('./ai.json')
// serve `spec` as JSON with header `Cache-Control: ${cacheHeader(3600)}`
```

## Links

- [aiendpoint.dev](https://aiendpoint.dev)
- [@aiendpoint/cli](https://www.npmjs.com/package/@aiendpoint/cli)
- [GitHub](https://github.com/aiendpoint/platform)
