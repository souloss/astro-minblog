# Local CLI Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a maintainer-focused `astro-minimax init --local-packages` workflow that scaffolds a temp blog using current local unpublished packages, then provide a repeatable validation script that tests scaffolded-blog capability parity against the core `apps/blog` baseline.

**Architecture:** Extend the CLI init command to detect a local repository root, validate required package artifacts, and rewrite generated internal dependencies to `file:` absolute paths plus a marker file. Add one repository validation entrypoint that builds the local packages, creates a temp blog with the new mode, verifies dependency provenance, runs CLI/build/browser checks, and emits a capability summary.

**Tech Stack:** TypeScript, Node.js fs/path APIs, existing CLI command structure, pnpm, Python Playwright E2E script

---

## File Structure

- Modify: `packages/cli/src/commands/init.ts`
  - Parse `--local-packages` and optional explicit repo root.
  - Validate repo shape and required build outputs.
  - Rewrite generated `package.json` internal dependencies to `file:` absolute paths.
  - Ensure transitive internal package references needed outside the workspace, including `@astro-minimax/knowledge-model`, are installable in the generated temp blog.
  - Write `.astro-minimax-local.json` marker metadata.
  - Preserve current default init behavior when the option is absent.

- Modify: `packages/cli/src/index.ts`
  - Keep top-level help aligned if needed, especially examples that mention the new init mode.

- Modify: `tests/e2e-test.py`
  - Add parameterization only if required for template-specific route/API checks used by the new validation flow.

- Create: `scripts/validate-local-cli-blog.mjs`
  - Build local packages.
  - Scaffold temp blog with `--local-packages`.
  - Install dependencies and validate provenance.
  - Run CLI command checks, build checks, server checks, and browser checks.
  - Produce structured summary output.

- Create: `docs/local-cli-testing.md`
  - Document maintainer workflow and the canonical validation command.

- Create: `docs/superpowers/plans/2026-03-26-local-cli-packages.md`
  - This implementation plan.

### Task 1: Add failing CLI tests and helper coverage

**Files:**
- Create: `packages/cli/src/commands/init.test.ts`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/commands/init.ts`

- [ ] **Step 1: Write the failing tests for init local-packages behavior**

Create `packages/cli/src/commands/init.test.ts` using Node's built-in test runner and `node:assert/strict`. Cover these cases:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("init rewrites internal packages to file dependencies", () => {
  // create fake repo root and temp target, invoke extracted helper or command,
  // then assert generated package.json uses file:/... for core/ai/notify/cli
});

test("init local-packages rejects invalid repo roots", () => {
  // assert throws or exits with a message that mentions missing packages
});

test("init local-packages rejects missing dist outputs for built packages", () => {
  // create fake repo packages without dist for ai/notify/cli and assert failure
});

test("init local-packages can infer repo root from local built cli output", () => {
  // simulate import.meta.url under packages/cli/dist and assert repo inference succeeds
});

test("init local-packages accepts explicit repo root override", () => {
  // assert --local-packages=/abs/path/to/repo succeeds and rewrites package.json correctly
});

test("init supports combining --pwa with --local-packages", () => {
  // assert scaffold includes pwa files and local file: dependencies together
});

test("init local-packages produces an installable dependency graph outside the workspace", () => {
  // assert rewritten direct/transitive internal package specs do not leave raw workspace:* edges
});

test("init without local-packages preserves published template dependency versions", () => {
  // assert default scaffold keeps normal semver deps and does not write local marker metadata
});
```

- [ ] **Step 2: Wire a package-level test command if missing**

Update `packages/cli/package.json` to add a test script using the built-in runner. The command must be actionable without a manual pre-build step. Prefer one of these patterns:

- execute TypeScript tests directly with the smallest existing tool already present in the package, or
- make the test script build first and then run compiled tests

For example:

```json
{
  "scripts": {
    "test": "tsc && node --test dist/**/*.test.js"
  }
}
```

If TypeScript test execution needs a different approach, keep it minimal and consistent with the package's current tooling.

- [ ] **Step 3: Run the new tests to confirm they fail**

Run: `pnpm --filter @astro-minimax/cli test`

Expected: FAIL because `--local-packages` parsing, repo validation, and dependency rewriting do not exist yet.

- [ ] **Step 4: Commit the failing tests**

```bash
git add packages/cli/package.json packages/cli/src/commands/init.test.ts
git commit -m "test(cli): add local package scaffold coverage"
```

### Task 2: Implement `init --local-packages`

**Files:**
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/src/commands/init.test.ts`

- [ ] **Step 1: Refactor init command into testable helpers**

Extract focused helpers inside `packages/cli/src/commands/init.ts` for:

- parsing init options
- resolving repo root
- validating repository shape
- validating package build outputs
- rewriting internal dependencies
- writing marker metadata

Export only the minimum helper surface needed by tests.

- [ ] **Step 2: Implement option parsing for `--local-packages`**

Support these forms as canonical input:

- `--local-packages`
- `--local-packages=/abs/path/to/repo`

Treat arbitrary global-install inference as out of scope. When no path value is provided, infer from the current CLI's local repository checkout/build output only.

- [ ] **Step 3: Implement repo and build validation**

Validate required package manifests:

- `packages/core/package.json`
- `packages/ai/package.json`
- `packages/notify/package.json`
- `packages/cli/package.json`

Validate required build outputs:

- `packages/ai/dist`
- `packages/notify/dist`
- `packages/cli/dist`
- `packages/knowledge-model/dist` if that package is included in the local install graph

Do not require `packages/core/dist`.

Also identify any transitive internal packages referenced by the rewritten local packages that would otherwise leave `workspace:*` dependencies unresolved in a temp non-workspace install. Handle `@astro-minimax/knowledge-model` explicitly as part of this feature unless implementation proves it is unnecessary.

Missing-build-output failures must print exact recommended commands for each affected package, for example:

- `pnpm --filter @astro-minimax/notify build`
- `pnpm --filter @astro-minimax/knowledge-model build`
- `pnpm --filter @astro-minimax/ai build`
- `pnpm --filter @astro-minimax/cli build`

- [ ] **Step 4: Rewrite generated package dependencies and write marker metadata**

After the template copy succeeds:

- change generated `dependencies.@astro-minimax/core`
- change generated `dependencies.@astro-minimax/ai`
- change generated `dependencies.@astro-minimax/notify`
- change any required transitive internal dependency entries, especially `@astro-minimax/knowledge-model`, so the generated app remains installable outside the monorepo
- change generated `devDependencies.@astro-minimax/cli`

Each should become `file:` plus an absolute path to the corresponding local package directory.

Create `.astro-minimax-local.json` with fields equivalent to:

```json
{
  "mode": "local-packages",
  "repoRoot": "/abs/path/to/repo",
  "createdAt": "2026-03-26T00:00:00.000Z",
  "rewrittenPackages": [
    "@astro-minimax/core",
    "@astro-minimax/ai",
    "@astro-minimax/notify",
    "@astro-minimax/knowledge-model",
    "@astro-minimax/cli"
  ],
  "packages": {
    "@astro-minimax/core": "file:/abs/path/to/repo/packages/core"
  }
}
```

- [ ] **Step 5: Improve help and failure output**

Update init help text so users see the new option and one explicit maintainer example. Make sure failure messages clearly explain:

- invalid repo root
- missing package manifests
- missing build outputs
- partial scaffold left in place for debugging

- [ ] **Step 6: Run tests to verify the implementation passes**

Run: `pnpm --filter @astro-minimax/cli test`

Expected: PASS for the new init tests.

- [ ] **Step 7: Build the CLI package and smoke-test help output**

Run: `pnpm --filter @astro-minimax/cli build && node packages/cli/dist/index.js init --help`

Expected: build succeeds and help output documents `--local-packages`.

- [ ] **Step 8: Commit the implementation**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/index.ts packages/cli/src/commands/init.test.ts packages/cli/package.json
git commit -m "feat(cli): support local package scaffolds"
```

### Task 3: Add failing validation-script tests and reusable assertions

**Files:**
- Create: `scripts/validate-local-cli-blog.test.mjs`
- Create: `scripts/validate-local-cli-blog.mjs`

- [ ] **Step 1: Write the failing tests for provenance and summary behavior**

Create `scripts/validate-local-cli-blog.test.mjs` with focused unit coverage for pure helpers that will live in the validation script, such as:

- parsing generated `package.json` and asserting `file:` specs exist
- verifying installed package provenance from symlink-realpath/package metadata
- producing a normalized capability summary record

Example shape:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { verifyPackageSpecs, summarizeChecks } from "./validate-local-cli-blog.mjs";

test("verifyPackageSpecs requires file dependencies for internal packages", () => {
  assert.throws(() => verifyPackageSpecs({ dependencies: {} }));
});
```

- [ ] **Step 2: Run the new script tests to confirm they fail**

Run: `node --test scripts/validate-local-cli-blog.test.mjs`

Expected: FAIL because the script and exported helpers do not exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add scripts/validate-local-cli-blog.test.mjs
git commit -m "test(repo): add local cli validation coverage"
```

### Task 4: Implement the repository validation workflow

**Files:**
- Create: `scripts/validate-local-cli-blog.mjs`
- Test: `scripts/validate-local-cli-blog.test.mjs`
- Modify: `tests/e2e-test.py`

- [ ] **Step 1: Implement reusable validation helpers**

In `scripts/validate-local-cli-blog.mjs`, add small focused helpers for:

- creating temp directories
- running commands with captured output
- reading generated package manifests
- verifying required `file:` specs
- resolving installed package provenance with `fs.realpathSync`, `package.json` lookup, or equivalent
- collecting pass/fail/warn/skip records
- probing API endpoints for `/api/notify/status` and `/api/ai-info`
- writing result artifacts to a stable location such as a temp-run summary JSON plus the existing E2E results JSON path

- [ ] **Step 2: Implement the end-to-end validation command flow**

The script should execute these commands in order:

```bash
pnpm --filter @astro-minimax/notify build
pnpm --filter @astro-minimax/knowledge-model build
pnpm --filter @astro-minimax/ai build
pnpm --filter @astro-minimax/cli build
node packages/cli/dist/index.js init <temp-dir> --local-packages
pnpm install
verify installed package provenance immediately and stop on mismatch
pnpm build
```

Unless a step explicitly says otherwise, `pnpm install`, the CLI smoke checks, and `pnpm build` all run from the generated temp blog directory.

Then run these blog-root checks in the temp app:

```bash
pnpm exec astro-minimax post new "Local CLI Smoke" --lang=en
pnpm exec astro-minimax post list
pnpm exec astro-minimax data status
pnpm exec astro-minimax ai extensions status
```

After that, start the temp site and run `tests/e2e-test.py` against it with template-appropriate env vars.

The provenance check is a hard gate. It must confirm, package by package, that each internal package resolves back to the expected local repository package path or package metadata after install. Any mismatch fails the run before CLI/browser/build validation continues.

Start the temp site with a deterministic command such as `pnpm preview:astro --host 127.0.0.1 --port <port>` or an equivalent supported preview command, then poll the target URL until it responds before launching `tests/e2e-test.py`. If preview mode proves insufficient for required checks, document and use a dev-server fallback with the same readiness probe.

Also perform explicit HTTP checks against:

- `GET /api/notify/status`
- `GET /api/ai-info`

Record those results directly in the capability matrix rather than relying on the browser script to infer them.

- [ ] **Step 3: Make AI/browser checks deterministic enough for local validation**

If needed, minimally extend `tests/e2e-test.py` so the script can set:

- base URL
- article slug
- optional API endpoint paths or expected degraded AI mode

Keep changes narrow; prefer env vars over branching logic.

- [ ] **Step 4: Emit final capability matrix and non-zero exit on hard failure**

The script should print:

- step-by-step progress
- a final total summary
- capability rows for homepage, article, theme, tags, categories, search, AI widget, AI interaction, RSS, 404, pagination, back-to-top, notify status, AI info, CLI commands, build

Return non-zero exit code if any required capability fails.

- [ ] **Step 5: Run the validation-script tests to verify implementation passes**

Run: `node --test scripts/validate-local-cli-blog.test.mjs`

Expected: PASS.

- [ ] **Step 6: Run the validation script end to end**

Run: `node scripts/validate-local-cli-blog.mjs`

Expected: creates a temp blog, installs local packages, runs checks, and exits successfully with a capability summary. If any capability fails, fix the underlying issue before moving on.

- [ ] **Step 7: Commit the validation workflow**

```bash
git add scripts/validate-local-cli-blog.mjs scripts/validate-local-cli-blog.test.mjs tests/e2e-test.py
git commit -m "test(repo): validate local cli blog scaffolds"
```

### Task 5: Document the maintainer workflow and verify end-to-end behavior

**Files:**
- Create: `docs/local-cli-testing.md`
- Modify: `package.json`
- Test: `scripts/validate-local-cli-blog.mjs`

- [ ] **Step 1: Document the workflow**

Create `docs/local-cli-testing.md` with:

- what `--local-packages` does
- prerequisites for local builds
- canonical validation command: `node scripts/validate-local-cli-blog.mjs`
- expected artifacts and common failure modes

- [ ] **Step 2: Add a root script alias for the canonical validation command**

Update the root `package.json` with a script such as:

```json
{
  "scripts": {
    "test:local-cli": "node scripts/validate-local-cli-blog.mjs"
  }
}
```

- [ ] **Step 3: Run the documented command exactly as users will**

Run: `pnpm test:local-cli`

Expected: PASS with the same capability summary as the direct script run.

- [ ] **Step 4: Run focused regression verification for changed areas**

Run:

```bash
pnpm --filter @astro-minimax/cli test && pnpm --filter @astro-minimax/cli build && node --test scripts/validate-local-cli-blog.test.mjs && pnpm test:local-cli
```

Expected: all commands PASS, including the default `astro-minimax init` regression coverage inside the CLI test suite.

- [ ] **Step 5: Commit docs and final wiring**

```bash
git add docs/local-cli-testing.md package.json
git commit -m "docs: document local cli package validation"
```
