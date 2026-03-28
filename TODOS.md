# TODOS

## CLI codegen: file collision guard
- **What:** CLI codegen must check if target file exists before writing. Abort with message unless `--force` flag is passed.
- **Why:** Without this, `npx @aiendpoint/cli init` could silently overwrite a user's existing route handler.
- **Context:** CLI generates files like `app/ai/route.ts` (Next.js) or registers Fastify plugins. If the user already has a custom `/ai` implementation, overwriting it would destroy their work with no warning. Standard CLI behavior (like `npm init`, `create-next-app`) always checks first.
- **Depends on:** CLI core implementation (Phase 1).

## GitHub Action: /ai endpoint validation
- **What:** Publish `aiendpoint/validate-action@v1` that validates /ai endpoint in CI.
- **Why:** Site owners who implement /ai want assurance it stays valid. Automated CI check catches regressions (spec changes, endpoint down, invalid JSON).
- **Effort:** S (CC: ~15min) | **Priority:** P2
- **Context:** `validateAiEndpoint()` in registry already does 0-100 scoring. Action would call the public API or embed the validation logic. One-liner: `uses: aiendpoint/validate-action@v1`.
- **Depends on:** At least a few native /ai implementations to test against.

## Awesome /ai curated list
- **What:** Create `awesome-aiendpoint` GitHub repo with 10-20 curated case studies.
- **Why:** Awesome lists are viral in developer communities. Each entry shows before/after token comparison + generated /ai JSON. Builds social proof and GitHub stars.
- **Effort:** S (CC: ~15min) | **Priority:** P2
- **Context:** CLI can generate the /ai specs from public OpenAPI endpoints. Candidates: Stripe, GitHub, Twilio, OpenAI, PetStore (demo).
- **Depends on:** CLI OpenAPI mode working.

## Framework official PR strategy
- **What:** Submit docs PRs to Next.js, Fastify, Express repos showing how to implement /ai.
- **Why:** Official framework docs mentioning AIEndpoint = massive credibility boost. Even if rejected, the PR itself gets visibility.
- **Effort:** M (CC: ~30min) | **Priority:** P3
- **Context:** Need working middleware packages first (@aiendpoint/next, @aiendpoint/fastify) so the PR can reference them.
- **Depends on:** Middleware packages published to npm.

## Validate page UX improvements
- **What:** Improve web/app/validate/page.tsx with better scoring visualization, actionable suggestions, and share-friendly results.
- **Why:** The validate page is an adoption funnel entry point. Better UX = more conversions from "curious" to "implementing."
- **Effort:** S (CC: ~20min) | **Priority:** P3
- **Depends on:** Nothing - can be done anytime.
