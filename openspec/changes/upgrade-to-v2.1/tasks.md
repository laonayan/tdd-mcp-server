# Tasks: upgrade-to-v2.1

## T1: Version alignment to 2.1.0

- [x] 1.1 Bump `package.json` `version` to `2.1.0`
- [x] 1.2 Bump `SERVER_INFO.version` in `src/server.ts` to `2.1.0`
- [x] 1.3 Commit as `T1(version): align version to 2.1.0`

## T2: Remove temporary workaround scripts

- [x] 2.1 Delete `mcp-server.js`, `simple-server.js`, `start-server.js`, `stdio-server.js`, `test-server.js`, `test-mcp.sh` from repo root (they are pre-npm-install workarounds; the canonical entry is `dist/server.js`)
- [x] 2.2 Commit as `T2(cleanup): remove temporary workaround scripts`

## T3: Dependency & toolchain upgrade

- [x] 3.1 `@modelcontextprotocol/sdk`: `^0.5.0` → `^1.32.2`
- [x] 3.2 `typescript`: `^5.3.3` → `^5.9.3`
- [x] 3.3 Replace `eslint@8` + `@typescript-eslint/*@6` with `eslint@9` + `typescript-eslint@8` flat config (`eslint.config.js`); delete `.eslintrc.json`
- [x] 3.4 Refresh other devDependencies to current minors (`@types/node@^24`, `jest@^30`, `ts-jest@^29.4`, `tsx`, `prettier`)
- [x] 3.5 `engines.node`: `>=18.0.0` → `>=20.0.0`
- [x] 3.6 Reinstall to regenerate `package-lock.json` (npm via DSH node runtime; `.npmrc` npmmirror)
- [x] 3.7 Commit as `T3(deps): upgrade SDK to 1.32.x and toolchain`

## T4: SDK 1.x code migration

- [x] 4.1 `src/server.ts`: import `ListToolsRequestSchema`, `CallToolRequestSchema`, `ListResourcesRequestSchema`, `ReadResourceRequestSchema`, `ListPromptsRequestSchema`, `GetPromptRequestSchema` from `@modelcontextprotocol/sdk/server/index.js`
- [x] 4.2 `src/handlers/tools.ts` + `src/handlers/new-tools.ts`: type-only imports (`CallToolRequest`, `CallToolResult`, `ListToolsRequest`, `ListToolsResult`, `Tool`) stay valid from `types.js` in 1.x — verify no runtime import of schemas remains
- [x] 4.3 `package.json`: add `"type": "module"`
- [x] 4.4 `src/handlers/resources.ts` + `src/handlers/prompts.ts`: replace `__dirname` with `import.meta.url`-derived `__dirname`
- [x] 4.5 `tsconfig.json`: `module: "NodeNext"`, `moduleResolution: "NodeNext"`
- [x] 4.6 `jest.config.js`: adjust ESM/NodeNext as needed for the suite to run
- [x] 4.7 Commit as `T4(sdk): migrate to MCP SDK 1.x APIs`

## T5: Tests — repair and extend

- [x] 5.1 Run `npx jest` (via DSH node runtime); fix regressions until all suites green
- [x] 5.2 New test file `src/__tests__/sdk-compat.test.ts`: asserts schemas imported from the 1.x path are functions with `.parse` (zod schemas), and server constructs with them
- [x] 5.3 New test file `src/__tests__/esm-paths.test.ts`: verifies best-practices/templates dirs resolve under ESM (files exist at computed paths)
- [x] 5.4 New test file `src/__tests__/version-consistency.test.ts`: `package.json` version === `SERVER_INFO.version` === `2.1.0`
- [x] 5.5 Commit as `T5(test): repair suite on SDK 1.x and add migration tests`

## T6: Documentation

- [x] 6.1 README: update 版本说明 (2.1.0), 前置要求 (Node ≥20), remove references to deleted scripts, note SDK 1.x compatibility
- [x] 6.2 Create `CHANGELOG.md` with 2.1.0 entry (Keep a Changelog format)
- [x] 6.3 Tick all tasks checkboxes in this file
- [x] 6.4 Commit as `T6(docs): update README and add CHANGELOG for 2.1.0`
