# Local CLI Packages Design

## Context

The repository's CLI currently creates new blogs by copying `packages/cli/template/` and preserving the template's published package versions. That behavior is correct for end users, but it blocks local regression testing after large refactors because a blog created from the latest local CLI still installs registry versions of `@astro-minimax/core`, `@astro-minimax/ai`, `@astro-minimax/notify`, and `@astro-minimax/cli`.

The goal is to make local unpublished packages a first-class development workflow without changing the default end-user experience. A maintainer should be able to create a temporary blog from the latest local CLI, install dependencies, and verify that the generated site exercises the current repository code rather than the most recently published npm versions.

## Goals

- Add a supported CLI mode for generating blogs that reference local unpublished packages via `file:` dependencies.
- Keep the default `astro-minimax init` behavior unchanged for normal users.
- Make the workflow stable for temporary directories outside the monorepo.
- Add a repeatable validation flow that proves the generated blog uses current local packages and that its core capabilities remain aligned with `apps/blog`.

## Non-Goals

- Replacing the normal published-package install path.
- Converting generated blogs into a workspace or pnpm monorepo member.
- Requiring identical sample content, post counts, or slugs between the CLI template and `apps/blog`.
- Guaranteeing live external AI provider calls during validation.

## Recommended Approach

Implement a new `--local-packages` option on `astro-minimax init`, backed by `file:` dependency rewriting, and pair it with a repository-level validation script that builds local packages, scaffolds a temporary blog, installs it, and runs capability checks.

This splits the problem at the right boundary:

- The CLI owns package source selection during project creation.
- The repository test harness owns end-to-end regression validation.

This keeps the feature discoverable, avoids duplicating `init` logic in ad hoc scripts, and preserves a clean default path for published usage.

## Alternatives Considered

### 1. Dedicated `init-dev` command

Pros:
- Clear maintainer-only intent.
- Easy to document separately from normal onboarding.

Cons:
- Duplicates `init` semantics and option parsing.
- Creates an unnecessary second entry point for the same scaffold operation.

### 2. Environment variable toggle

Pros:
- Minimal CLI surface area.
- Easy for CI pipelines to inject.

Cons:
- Hidden behavior, weak discoverability.
- Harder to explain and debug.

### 3. Repository script only

Pros:
- Fastest implementation path.
- Keeps published CLI surface area unchanged.

Cons:
- Does not turn the workflow into a real CLI capability.
- Leaves local package resolution logic outside the product boundary.

## CLI Design

### New option

Add `--local-packages` to `astro-minimax init`.

Supported forms:

- `astro-minimax init /tmp/test-blog --local-packages`
- `astro-minimax init /tmp/test-blog --local-packages=/abs/path/to/repo`

Behavior:

- Without a value, the CLI attempts to infer the repository root from its own installation location.
- With a value, the CLI uses the provided path as the repository root.
- The option is invalid unless the target path looks like an `astro-minimax` monorepo checkout.

Inference only needs to support the maintainer workflow where the CLI is executed from the current repository checkout or from its local build output inside that checkout. Supporting arbitrary global installs is not required for this feature.

### Dependency rewriting

After copying the template and updating the project name, the CLI rewrites generated `package.json` entries.

Rewrite these packages to `file:` absolute paths:

- `dependencies.@astro-minimax/core`
- `dependencies.@astro-minimax/ai`
- `dependencies.@astro-minimax/notify`
- `devDependencies.@astro-minimax/cli`

Absolute paths are preferred over relative paths because the generated project is explicitly expected to live in temporary directories, and absolute paths avoid ambiguity when the project is moved or initialized from varying working directories.

### Repository root validation

The CLI should validate the presence of:

- `packages/core/package.json`
- `packages/ai/package.json`
- `packages/notify/package.json`
- `packages/cli/package.json`

If any are missing, initialization fails with a clear error explaining that `--local-packages` requires a local `astro-minimax` repository checkout.

### Build artifact validation

The generated blog can only install successfully if locally referenced packages expose the files expected by their package manifests.

Validation rules:

- `@astro-minimax/core`: package directory must exist; no `dist/` requirement because it exports from `src/`.
- `@astro-minimax/notify`: `dist/` must exist.
- `@astro-minimax/ai`: `dist/` must exist.
- `@astro-minimax/cli`: `dist/` must exist.

If required build artifacts are missing, the CLI should fail before finishing scaffold creation and print the exact build commands needed.

If failure happens after the target directory is created, the CLI should leave the partial directory in place and mark the failure clearly in stderr rather than attempting cleanup. This keeps the failure path non-destructive and makes debugging easier.

### Generated metadata

Write a small marker file in the generated blog root, for example `.astro-minimax-local.json`, containing:

- `mode: "local-packages"`
- resolved `repoRoot`
- created timestamp
- list of rewritten packages

This file is not required for runtime, but it makes validation and debugging much easier.

## Validation Workflow Design

Add a repository-level validation script, for example `scripts/validate-local-cli-blog.mjs`.

Its job is to provide a single repeatable maintainer workflow for regression testing local unpublished packages.

### Proposed flow

1. Build required local packages.
2. Create a temporary directory.
3. Run the local CLI with `init <temp-dir> --local-packages`.
4. Confirm generated `package.json` contains `file:` references.
5. Run `pnpm install` in the temp blog.
6. Verify resolved installed packages point to the local repository.
7. Run core CLI commands against the temp blog.
8. Run `pnpm build` for the temp blog.
9. Start the temp blog and run browser checks.
10. Produce a capability report comparing the temp blog against the expected `apps/blog` core feature baseline.

### Capability baseline

The comparison target is "core user capability parity," not exact content parity.

Package-source verification should use two checks:

- the generated `package.json` contains `file:` specifiers for all rewritten internal packages
- installed dependency resolution confirms each internal package ultimately maps back to the expected repository package directory or its package metadata, even if pnpm materializes it through store links or symlinks rather than a direct in-project path

Required baseline checks:

- Homepage renders.
- Article detail page renders.
- Theme toggle works.
- Tags page renders.
- Categories page renders.
- Search page renders.
- AI chat entry point appears.
- AI chat interaction path degrades gracefully in local/mock mode.
- RSS endpoint renders valid XML.
- 404 page renders.
- Pagination route renders or reports a documented warning when sample data volume is insufficient.
- Back-to-top behavior is available on article pages.
- Notification status endpoint responds.
- AI info endpoint responds.
- `astro-minimax post new` works in the generated blog.
- `astro-minimax post list` works in the generated blog.
- `astro-minimax data status` works in the generated blog.
- `astro-minimax ai extensions status` works in the generated blog.
- Blog build succeeds.

### Output format

The validation script should emit:

- per-step logs
- a final pass/fail summary
- a capability matrix that marks each baseline feature as pass, fail, warn, or skip
- artifact paths for any result JSON files

## Error Handling

### CLI init errors

- Invalid repo root: fail with a message that `--local-packages` requires a repository checkout and mention the missing expected paths.
- Missing build outputs: fail with package-specific guidance and recommended build commands.
- Invalid combined options: keep existing behavior for unrelated options; `--pwa` must remain compatible with `--local-packages`.

### Validation errors

- Package source mismatch: fail if generated `package.json` or installed dependency resolution points to a registry version instead of the repository path.
- Install failure: stop immediately and print the failing command.
- Build failure: stop and record the failure as a parity regression.
- Browser warnings: allow explicit warnings for sample-content-sensitive checks, but do not hide hard failures on required routes or core UI affordances.

## Testing Strategy

### CLI-level checks

- Help output includes `--local-packages`.
- Generated project package manifest rewrites local package entries correctly.
- Repo root inference succeeds when run from the repository build output.
- Explicit repo root override succeeds.
- Invalid repo root fails cleanly.
- Missing build outputs fail cleanly.
- `--pwa --local-packages` together still produce the expected scaffold.

### Integration checks

- Create temp blog from local CLI.
- Install dependencies in temp blog.
- Assert internal packages resolve to local `file:` sources.
- Run `pnpm build` successfully.

### Browser and capability checks

- Reuse `tests/e2e-test.py` where possible.
- Allow temp-blog article slug configuration via existing env vars.
- Extend the harness if needed to cover generated blog API endpoints and CLI command checks not currently covered by the browser script.

## Implementation Boundaries

The work should stay narrowly focused on the local unpublished package workflow.

Files likely to change:

- `packages/cli/src/commands/init.ts`
- `packages/cli/template/package.json` only if help text or defaults need alignment, not for hardcoding local paths
- `packages/cli/src/index.ts` if option help formatting lives there
- `tests/e2e-test.py` if minor parameterization is needed for template-specific routes
- new repository validation script under `scripts/`
- supporting docs describing the maintainer workflow

Avoid expanding this into a general package manager abstraction layer unless implementation reveals a concrete need.

## Success Criteria

The feature is successful when all of the following are true:

- A maintainer can run the latest local CLI and generate a blog that references current repository packages through `file:` dependencies.
- The generated blog installs successfully without fetching published internal packages from npm.
- The repository contains a single repeatable command/script that exercises the full local-package scaffold workflow.
- The generated blog passes the defined core capability baseline aligned with `apps/blog`.
- Default `astro-minimax init` behavior for normal users remains unchanged.
