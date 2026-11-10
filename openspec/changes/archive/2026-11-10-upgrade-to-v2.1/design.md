# Design: Upgrade to v2.1

## Context

Verification performed before this change (from repository audit):

| Fact | Evidence |
|------|----------|
| Locked SDK is 0.5.0 | `package-lock.json` → `packages["node_modules/@modelcontextprotocol/sdk"].version === "0.5.0"` |
| npm latest SDK | `pnpm view @modelcontextprotocol/sdk dist-tags` → `latest: 1.32.2` |
| SDK 0.5.0 exports request schemas from `types.js` | `dist/types.d.ts` lines 10006/12361 declare `ListToolsRequestSchema` / `CallToolRequestSchema` |
| Handlers already return `content` arrays | `src/handlers/tools.ts` L537-546, `src/handlers/new-tools.ts` L340-357 |
| `__dirname` used under ESM target | `src/handlers/prompts.ts:340`, `src/handlers/resources.ts:72,323` |
| `package.json` has no `"type"` field | defaults to CommonJS while `dist/` emits `.js` ESM files |
| README/代码版本不一致 | README says v2.0.0; `package.json` + `SERVER_INFO.version` say 1.0.0 |

## Goals / Non-Goals

**Goals:**

1. Server runs on `@modelcontextprotocol/sdk` 1.32.x over stdio.
2. Both tool systems (`USE_NEW_TOOLS` true/false) still list and call identically.
3. Resources (`tdd://...`) and prompts still resolve; file lookup must work under ESM.
4. All existing unit tests pass; new tests cover the migration seams.
5. Deterministic, per-task commits (openspec checklist discipline).

**Non-Goals:**

- Rewriting handlers to the high-level `McpServer`/`registerTool` API (candidate for a future change; low-level `Server` remains fully supported in 1.x).
- Adding Streamable HTTP transport, sampling, or elicitation (future).
- Migrating Jest → Vitest.
- Behavior changes to tools (return strings stay identical so `integration-test.sh` expectations hold).

## Decisions

### D1: Keep the low-level `Server` class

The current code passes handler functions via `server.setRequestHandler(Schema, handler)`. In SDK 1.x these schemas moved to `@modelcontextprotocol/sdk/server/index.js`; the method name and handler signature are unchanged. Handler return types (`CallToolResult` with `content: [{type:'text',...}]`) are still valid in 1.x. Therefore the minimal correct migration is an import-path change, not a rewrite. `McpServer` migration is deferred.

### D2: ESM by declaration

`dist/` is emitted ESM (imports carry `.js` extensions). Under a CJS-default `package.json`, `node dist/server.js` treats those files as CJS and fails with `Cannot use import statement outside a module` — it only worked before if run through a CJS-interop host. Adding `"type": "module"` makes runtime semantics match the compiler output. Handler files that need runtime paths must switch from `__dirname` to:

```ts
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### D3: `moduleResolution: NodeNext`

SDK 1.x ships subpath `exports`; `moduleResolution: "node"` (classic node10 lookup) cannot resolve `@modelcontextprotocol/sdk/server/index.js`. Setting `module: NodeNext` + `moduleResolution: NodeNext` is the TypeScript-supported pairing. This may surface new type errors (e.g. ` Tool` now requires nothing extra — our usages are plain object literals conforming to `Tool`).

### D4: ESLint 9 flat config

`.eslintrc.json` + `@typescript-eslint` 6 are EOL. Replace with `eslint.config.js` using `typescript-eslint` (the unified package) `recommended` preset, preserving the custom rules that matter (single quotes, semicolons, 2-space indent, trailing commas). Keep `*.js` root files out of lint via `ignores`.

### D5: Version 2.1.0

README already documents "v2.0 新特性" as shipped; the working tree just never bumped numbers. Take 2.1.0 as the iteration baseline (a patch-level "1.0.1" would contradict published docs; 2.0.0 was never released to npm — `files`/`bin` exist but no publish artifacts).

### D6: Commit discipline (openspec)

One commit per checklist task, message format `T<n>(<area>): <summary>` referencing the change id. The openspec archive step (`openspec archive`) is deferred until the user validates, per instructions not to run local verification beyond unit tests.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| `tools.ts` (855 lines) may have type incompatibilities with 1.x `Tool` type | The `Tool` interface in 1.x accepts `inputSchema` as raw JSON Schema (our definitions are plain literals); type errors, if any, are expected to be localized |
| `ts-jest` + ESM + NodeNext combination can be finicky | Keep jest transform as-is (`ts-jest` with `useESM`), only adjust `moduleNameMapper` if resolution breaks; tests import handlers directly, not the SDK transports |
| Removing root workaround scripts may break someone's muscle memory | They are documented in-tree as temporary; README quick-start points at `dist/server.js` already |
| `engines: >=20` excludes Node 18 users | Node 18 is EOL (Apr 2025); SDK 1.x itself requires >=18, staying conservative |

## Migration Plan

Ordered, each step independently committable:

1. `T1` version bump (package.json + server.ts) — zero-risk, establishes baseline.
2. `T2` delete workaround scripts + drop their README mentions — zero-risk.
3. `T3` dependency bump + lockfile regen + engines + ESLint 9 flat config (config-only, code not yet migrated — `npm run build` may transiently fail until T4; acceptable within one push, tasks land together).
4. `T4` code migration: schema import paths, `"type": "module"`, `__dirname` → `import.meta.url`, tsconfig NodeNext.
5. `T5` fix/extend tests; run full suite (`npx jest`); new tests added in this step.
6. `T6` docs: README + CHANGELOG; `openspec/changes/upgrade-to-v2.1/tasks.md` checkboxes ticked as tasks complete.
