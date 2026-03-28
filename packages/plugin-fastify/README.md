# @aiendpoint/fastify

Serve your `/ai` endpoint from Fastify in one line.

## Install

```bash
npm install @aiendpoint/fastify
```

## Usage

```ts
import Fastify from 'fastify'
import aiendpoint from '@aiendpoint/fastify'

const app = Fastify()
app.register(aiendpoint, { spec: './ai.json' })

app.listen({ port: 3000 })
```

That's it. `GET /ai` now serves your spec.

## Options

```ts
app.register(aiendpoint, {
  spec: './ai.json',  // path to spec file, or inline object
  path: '/ai',        // route path (default: '/ai')
  maxAge: 3600,       // Cache-Control max-age (default: 3600)
})
```

## Generate ai.json

```bash
npx @aiendpoint/cli init --openapi https://your-api.com/openapi.json
```

## Links

- [AIEndpoint spec](https://aiendpoint.dev/docs)
- [@aiendpoint/cli](https://www.npmjs.com/package/@aiendpoint/cli)
- [GitHub](https://github.com/aiendpoint/platform)
