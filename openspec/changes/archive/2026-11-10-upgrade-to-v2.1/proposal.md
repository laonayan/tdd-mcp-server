# Proposal: Upgrade to v2.1 (MCP SDK 1.x migration + toolchain modernization)

## Why

The repository currently depends on `@modelcontextprotocol/sdk` **0.5.0** (Nov 2024), while npm `latest` is **1.32.2**. The SDK reached 1.0 in June 2025 with breaking changes (request schemas moved from `types.js` to `server/index.js`, mandatory `content` array in tool results, new `McpServer` high-level API). Modern MCP clients may refuse to connect to a 0.5.0-era server.

Additionally:

- Version numbers are inconsistent: README claims v2.0.0, `package.json` and `src/server.ts` say 1.0.0.
- Root directory contains 5 temporary workaround scripts (`mcp-server.js`, `simple-server.js`, `start-server.js`, `stdio-server.js`, `test-server.js`, `test-mcp.sh`) explicitly labeled "临时解决方案：绕过npm依赖安装问题".
- Node 18 (current `engines` floor) reached EOL in April 2025.
- ESLint 8 is EOL; TypeScript 5.3 is outdated.
- No CHANGELOG, no CI, and `package.json` is missing `"type": "module"` while the compiled output is ESM.
- `resources.ts` / `prompts.ts` use `__dirname`, which is undefined under ESM.

## What Changes

1. **Version alignment** — bump to `2.1.0` everywhere (`package.json`, `src/server.ts`).
2. **Cleanup** — remove the 5 temporary root-level workaround scripts; README references to them removed.
3. **Dependencies** — `@modelcontextprotocol/sdk` `^0.5.0` → `^1.32.2`; TypeScript `^5.9` (latest 5.x); ESLint 9 flat config (`eslint.config.js` replacing `.eslintrc.json`); dev toolchain refresh; `engines.node` → `>=20`.
4. **SDK migration** —
   - Import request schemas from `@modelcontextprotocol/sdk/server/index.js` instead of `types.js`.
   - Keep the low-level `Server` API (both tool systems + resources + prompts handlers already return spec-compliant shapes; minimal-diff migration preferred over rewriting to `McpServer` in this change).
   - Replace `__dirname` with `import.meta.url`-based resolution in `resources.ts` / `prompts.ts`.
   - Add `"type": "module"` to `package.json` so `dist/` ESM output runs correctly.
   - `tsconfig.json`: `moduleResolution` `node` → `NodeNext` (required by SDK 1.x), `module` `ESNext` → `NodeNext`.
5. **Tests** — existing 111 unit tests must still pass; add new unit tests covering: SDK-1.x-compatible schema import paths, ESM path resolution, version consistency, and i18n.
6. **Docs** — update README (version, install, requirements), add CHANGELOG.md.

## Capabilities

### Modified

- `spec/mcp-server/`: SDK import paths, module system (CJS-default → ESM), Node engine floor, lint toolchain.

## Impact

- **Code**: `src/server.ts`, `src/handlers/*.ts`, `package.json`, `tsconfig.json`, `jest.config.js`, lint config.
- **Risk**: moderate — SDK 1.x renamed/moved exports; mitigated by keeping the low-level `Server` API whose handler signatures are unchanged (`ListToolsRequest` → `ListToolsResult`, etc.).
- **Compatibility**: tool names, tool arguments, env vars (`USE_NEW_TOOLS`, `DEFAULT_LOCALE`, `PROJECT_PATH`) and storage format (`~/.tdd-flow/`) are all unchanged. Existing MCP client configs keep working.
- **Rollback**: git revert of the migration commit(s); storage format untouched.
