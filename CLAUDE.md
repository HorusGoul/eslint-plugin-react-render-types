# CLAUDE.md

## Project

ESLint plugin that brings Flow's Render Types to TypeScript via JSDoc `@renders` annotations. Enforces component composition constraints at lint time using typed linting.

## Commands

```bash
pnpm build          # Compile TypeScript (tsc → dist/)
pnpm test:run       # Run all tests once (vitest)
pnpm test           # Run tests in watch mode
pnpm typecheck      # Type-check without emitting
pnpm lint           # Lint src/ and tests/
```

### Example project (`example/`)

```bash
pnpm install                # Separate install (not a workspace)
pnpm lint                   # Run ESLint — errors expected in InvalidUsage.tsx
pnpm lint:update-snapshot   # Regenerate lint-snapshot.txt after changing expected errors
pnpm typecheck              # Type-check the example
```

## Architecture

```
src/
  index.ts                  # Plugin entry — exports rules + recommended config
  rules/                    # 5 ESLint rules
    valid-render-return.ts    Validates component returns match @renders declaration
    valid-render-prop.ts      Validates props/children with @renders receive correct components
    valid-renders-jsdoc.ts    Validates @renders JSDoc syntax (braces, PascalCase)
    require-renders-annotation.ts   Requires @renders on all components (off by default)
    renders-uses-vars.ts      Marks @renders references as used (prevents no-unused-vars)
  utils/
    cross-file-resolver.ts    Resolves components/annotations across files via TypeScript's type checker
    render-chain.ts           Follows @renders chains (A → B → C) using type IDs
    jsdoc-parser.ts           Parses @renders/@transparent JSDoc annotations
    jsx-extraction.ts         Extracts component names from JSX (ternary, &&, .map())
    component-utils.ts        Component detection helpers
  types/
    index.ts                  RendersAnnotation, ResolvedRendersAnnotation, ComponentTypeInfo
```

## Key concepts

- **Typed linting required**: The plugin uses TypeScript's type checker (`projectService: true`) for cross-file resolution and component identity. Without it, the plugin throws.
- **ComponentTypeId**: Format `"filePath:symbolName"` — ensures two components named `Header` from different files are treated as different types.
- **Source-context resolution**: When resolving `@renders` annotations from external files, type IDs are resolved from the file where the annotation is defined, not the consumer file. Consumers don't need to import target types.
- **Render chains**: `@renders {Header}` on component A means anything that renders A is also valid where Header is expected.
- **Modifiers**: `@renders` (required), `@renders?` (optional — null OK), `@renders*` (zero or more), `@renders!` (unchecked — skip return validation).

## Testing

- **Framework**: Vitest + `@typescript-eslint/rule-tester`
- **Rule tests**: `tests/rules/` — use `RuleTester` with typed linting enabled
- **Cross-file tests**: `tests/rules/valid-render-prop-cross-file.test.ts` with fixtures in `tests/fixtures/cross-file-props/` — uses `projectService: { allowDefaultProject: ["consumer.tsx"] }`
- **Utility tests**: `tests/utils/` — unit tests for parsers, chain logic, resolver

Run a specific test file:
```bash
pnpm vitest run tests/rules/valid-render-prop.test.ts
```

## Workflow

### Starting work

1. Always branch from `main`. Never commit directly to `main`.
2. Use branch name prefixes: `feat/`, `fix/`, `ci/`, `chore/` (e.g., `feat/union-type-support`).

### Validating changes

Run before pushing — all must pass:

```bash
pnpm build && pnpm test:run && pnpm typecheck
```

Then validate the example project:

```bash
cd example && pnpm install && pnpm lint:update-snapshot
```

If `lint-snapshot.txt` changed, check the diff is expected and commit the update. If no plugin changes affected lint output, the snapshot should be unchanged.

### Changesets

Always add a changeset when modifying files under `src/`. Run `pnpm changeset` and select the appropriate semver bump (patch for fixes, minor for features, major for breaking changes).

### PRs and CI

- Create PRs using GitHub MCP tools (`create_pull_request`). Fall back to `gh pr create` if MCP is unavailable. If neither works, ask the user.
- After pushing, check CI status. Use GitHub MCP (`pull_request_read` with `get_status` or `get_files`) or check the PR page.
- Do not merge until CI is green.

### Keeping CLAUDE.md current

When the user corrects a workflow step, naming convention, architecture assumption, or any other project norm during a session, update this file to reflect the correction. This file should always match how the project actually works.

## CI

GitHub Actions (`.github/workflows/ci.yml`): build → test → typecheck → install example deps → lint example (snapshot diff against `example/lint-snapshot.txt`) → changesets release on main.

## Release

Changesets-based. Add a changeset with `pnpm changeset`, commit it, and the CI creates a release PR on main.

## Tech stack

- Node 24 (`.nvmrc`), pnpm 10
- TypeScript 5.9, ESLint 9, `@typescript-eslint` 8
- Vitest 4 for testing
