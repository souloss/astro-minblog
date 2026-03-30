# Deferred backlog after scoped-clean-verified-subset

This backlog covers the large uncommitted remainder that was intentionally **not** included in the verified clean subset on branch `scoped-clean-verified-subset`.

## Accepted committed subset

Already committed and considered verified:

1. `chore: update workspace build wiring and ignore generated artifacts`
2. `refactor(ai): centralize knowledge bundle typing and notify runtime loading`
3. `chore(cli): remove unused template chat type import`

## Deferred investigation groups

### 1) AI runtime and retrieval overhaul

Scope examples:

- `packages/ai/src/server/*` except the already committed `dev-server.ts` slice
- `packages/ai/src/search/*`
- `packages/ai/src/prompt/*`
- `packages/ai/src/cache/*`
- `packages/ai/src/intelligence/*`
- `packages/ai/src/query/*`
- related new tests under `packages/ai/src/**/*.test.*`

Why deferred:

- broad multi-module behavior changes
- mixed with new files, deletions, and partial refactors
- needs targeted runtime and test verification before commit splitting

Next actions:

1. isolate the intended AI runtime contract changes from search/ranking changes
2. run package-level verification for AI after each isolated slice
3. split into reviewable commits by module boundary

### 2) Blog function and app integration changes

Scope examples:

- `apps/blog/functions/api/*`
- `apps/blog/functions/README.md`
- `apps/blog/astro.config.ts`
- `apps/blog/package.json`
- `apps/blog/src/config.ts`
- `apps/blog/tsconfig.json`

Why deferred:

- touches deployment/runtime adapter behavior
- includes endpoint deletions and new shared env wiring
- should be verified together with app build and endpoint behavior

Next actions:

1. verify chat, ai-info, and notify endpoint behavior
2. confirm deleted debug/test endpoints are intentionally removed
3. split app runtime wiring from docs/content changes

### 3) CLI and template evolution beyond the verified subset

Scope examples:

- `packages/cli/src/**`
- `packages/cli/scripts/**`
- `packages/cli/template/**` except committed `functions/api/chat.ts`
- `packages/cli/template/datas/knowledge/`
- `packages/cli/template/src/plugins/`

Why deferred:

- large scaffold/template surface area
- requires repeated `validate:template` and scaffold-level sanity checks
- mixes runtime wiring with docs and template asset changes

Next actions:

1. separate CLI command changes from template asset/layout changes
2. run `pnpm --filter @astro-minimax/cli build`
3. run `pnpm --filter @astro-minimax/cli validate:template` after each slice

### 4) Notify package restructuring

Scope examples:

- `packages/notify/src/config.ts`
- `packages/notify/src/core/`
- `packages/notify/src/sources/`
- `packages/notify/src/comment-webhook.ts`
- `packages/notify/src/provider-helpers.ts`
- `packages/notify/src/index.ts`

Why deferred:

- public API and package surface are shifting
- needs compatibility verification with app and AI imports
- should be committed independently from AI/runtime cleanup

Next actions:

1. verify public exports and dist declarations
2. verify app and AI integration imports against built package output
3. commit package refactor separately from app consumers

### 5) Core UI/preferences/layout changes

Scope examples:

- `packages/core/src/layouts/*`
- `packages/core/src/preferences/*`
- `packages/core/src/components/*`
- `packages/core/src/actions/*`
- `packages/core/src/integration.ts`

Why deferred:

- wide visual and interaction surface
- needs separate review from backend/runtime work
- not required for the already verified cleanup subset

Next actions:

1. split preferences/runtime/client changes from visual/layout changes
2. run targeted build/type validation for core consumers
3. review user-visible behavior before commit

### 6) Docs, blog content, and tracked data artifacts

Scope examples:

- `README.md`
- `README.en.md`
- `DEVELOPMENT.md`
- `docs/`
- `apps/blog/src/data/blog/**`
- tracked files under `apps/blog/datas/*.json`

Why deferred:

- mixes editorial updates with code changes
- tracked data artifacts need policy review, not blind cleanup
- should follow stable code behavior, not precede it

Next actions:

1. confirm which `apps/blog/datas/*.json` files are intentional tracked baselines
2. separate documentation sync from code changes
3. review zh/en parity after code paths stabilize

## Manual rule for later work

Do not commit the remaining files as one large patch. Continue by selecting one deferred group at a time, verifying it independently, and committing it separately.
