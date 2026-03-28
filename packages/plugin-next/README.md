# @aiendpoint/next

Serve your `/ai` endpoint from Next.js App Router in one line.

## Install

```bash
npm install @aiendpoint/next
```

## Usage

Create `app/ai/route.ts`:

```ts
import { aiendpoint } from '@aiendpoint/next'

export const GET = aiendpoint({ spec: './ai.json' })
```

That's it. Your service now has a `/ai` endpoint.

## Options

```ts
aiendpoint({
  spec: './ai.json',  // path to spec file, or inline object
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
