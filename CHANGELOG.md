# Changelog 更新日志

> 🌐 中英双文，默认中文：每条中文条目下以缩进斜体附英文对照。
> Bilingual (Chinese first by default): each Chinese entry is followed by an indented italic English translation.

本项目的所有显著变更都记录在此文件中。
All notable changes to this project are documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- 修复可导致整机假死的递归测试执行漏洞：`validate`（TDD 循环校验）内部的
  `runQuickTests()` 与 `coverage`（覆盖率分析）此前会无守卫地 spawn `npm test`/`jest`
  等测试命令。当被测项目自身调用本工具（dogfooding / AI 代理循环）时形成
  "测试进程 → tdd 工具 → 再起测试进程" 的无限递归，进程树指数膨胀直至内存耗尽、
  设备假死（上个修复只覆盖了 `runTests` 一条路径）。现新增共享守卫模块
  `execution-guard`：检测 `JEST_WORKER_ID` / `VITEST_POOL_ID` / 子进程标记
  `TDD_MCP_NESTED_RUN` 任一命中即拒绝再派生测试进程，如实降级返回
  *EN: Fixed a recursive test-execution hole that could freeze the whole machine:
  `runQuickTests()` inside `validate` (TDD cycle validation) and `coverage`
  (coverage analysis) used to spawn `npm test`/`jest` without any guard. When the
  project under test itself invokes this tool (dogfooding / AI-agent loops) this
  created infinite "test process → tdd tool → test process again" recursion with
  an exponentially growing process tree until memory exhaustion and system freeze
  (the previous fix only covered the `runTests` path). A shared guard module
  `execution-guard` now refuses to spawn further test processes when
  `JEST_WORKER_ID` / `VITEST_POOL_ID` / the child marker `TDD_MCP_NESTED_RUN` is
  detected, degrading honestly instead.*
- 所有由本工具派生的测试/覆盖率子进程现携带硬性内存上限：
  `NODE_OPTIONS=--max-old-space-size=1024`（可用 `TDD_MCP_CHILD_MEMORY_LIMIT_MB`
  覆盖），并对子进程树打 `TDD_MCP_NESTED_RUN` 标记；即使出现未预期的递归，
  单个 node 进程堆也被封顶，宁可 OOM 快速失败也不拖垮整机。`npm test` 脚本
  亦默认加 `--max-old-space-size=2048 --maxWorkers=2 --workerIdleMemoryLimit=512MB`
  *EN: Every test/coverage child process spawned by this tool now carries a hard
  memory cap: `NODE_OPTIONS=--max-old-space-size=1024` (overridable via
  `TDD_MCP_CHILD_MEMORY_LIMIT_MB`) plus the `TDD_MCP_NESTED_RUN` subtree marker;
  even an unexpected recursion gets its per-process heap capped so it fails fast
  with OOM instead of taking the machine down. The `npm test` script now also
  defaults to `--max-old-space-size=2048 --maxWorkers=2 --workerIdleMemoryLimit=512MB`.*
- `validate` 不再重复运行两次状态探测（`determineCurrentState` 结果复用），
  嵌套场景下探测本身也不再触发任何 spawn
  *EN: `validate` no longer runs state detection twice (the `determineCurrentState`
  result is reused), and the detection itself no longer spawns anything in nested contexts.*
- `coverage` 缺少 `testCommand` 参数时返回明确错误，而非晦涩的 `TypeError`
  *EN: `coverage` without a `testCommand` argument now returns a clear error
  instead of an obscure `TypeError`.*

### Changed

- 文档（README / CHANGELOG）改为中英双文，默认中文（中文在前，英文随后）
  *EN: Docs (README / CHANGELOG) are now bilingual with Chinese as the default (Chinese first, English follows).*
- MCP prompts 模板加载顺序调整：`tdd-workflow` / `test-generation` 提示优先读取
  `skills/<name>/SKILL.md`（自动剥离 frontmatter），读取失败时回退 `templates/` 旧模板与
  内联默认，保持资源 URI 与参数兼容（openspec 变更 `tdd-honesty-and-workflow` T2）
  *EN: MCP prompt template loading order changed: the `tdd-workflow` / `test-generation` prompts now read `skills/<name>/SKILL.md` first (frontmatter stripped automatically), falling back to the legacy `templates/` files and inline defaults, keeping resource URIs and parameters compatible (openspec change `tdd-honesty-and-workflow`, task T2).*

### Added

- 新增 `skills/` 技能资产目录（superpowers 式 `SKILL.md`：YAML frontmatter + 步骤正文）：
  `tdd-workflow`、`test-generation`、`debugging`；`package.json` `files` 已包含 `skills`
  *EN: Added the `skills/` asset directory (superpowers-style `SKILL.md`: YAML frontmatter + step body): `tdd-workflow`, `test-generation`, `debugging`; `skills` is now included in `package.json` `files`.*

## [2.1.0] - 2026-11-10

### Added

- **MCP SDK 1.x 迁移测试**（23 个新单测）：
  *EN: **MCP SDK 1.x migration tests** (23 new unit tests):*
  - `sdk-compat.test.ts` — 请求 schema 形态校验、`Server.setRequestHandler` 装配、双工具系统返回值合规性
    *EN: `sdk-compat.test.ts` — request-schema shape checks, `Server.setRequestHandler` wiring, return-value compliance for both tool systems.*
  - `esm-paths.test.ts` — ESM 下 `best-practices/`、`templates/` 资源目录解析
    *EN: `esm-paths.test.ts` — resolution of the `best-practices/` and `templates/` asset directories under ESM.*
  - `version-consistency.test.ts` — 版本号 / engines / 依赖范围一致性守卫
    *EN: `version-consistency.test.ts` — guards for version / engines / dependency-range consistency.*
- `npm run test:esm` 脚本（可选的 `--experimental-vm-modules` 运行模式）
  *EN: the `npm run test:esm` script (an optional `--experimental-vm-modules` run mode).*

### Changed

- **`@modelcontextprotocol/sdk` 0.5.0 → 1.32.2**（核心升级）
  *EN: **`@modelcontextprotocol/sdk` 0.5.0 → 1.32.2** (the core upgrade).*
  - 兼容 2025-06 后发布的 1.x 协议实现与新版 MCP 客户端
    *EN: compatible with 1.x protocol implementations released after 2025-06 and newer MCP clients.*
  - 请求 schema 导入路径核验并适配（低阶 `Server` API 保持不变）
    *EN: request-schema import paths verified and adapted (the low-level `Server` API is unchanged).*
- **包声明 `"type": "module"`**：`dist/` 产物按 ESM 语义运行，与编译输出一致
  *EN: **package declares `"type": "module"`**: `dist/` artifacts run with ESM semantics, matching the compiled output.*
- `resources.ts` / `prompts.ts`：`__dirname` → `import.meta.url` 派生路径（ESM 必需）
  *EN: `resources.ts` / `prompts.ts`: `__dirname` → paths derived from `import.meta.url` (required by ESM).*
- `tsconfig.json`：`module`/`moduleResolution` → `NodeNext`（SDK 1.x 子路径导出所必需）
  *EN: `tsconfig.json`: `module`/`moduleResolution` → `NodeNext` (required by SDK 1.x subpath exports).*
- `engines.node`：`>=18` → `>=20`（Node 18 已于 2025-04 EOL）
  *EN: `engines.node`: `>=18` → `>=20` (Node 18 reached EOL in 2025-04).*
- TypeScript 5.3 → 5.9.3；ESLint 8 → 9（扁平配置 `eslint.config.js`，移除 `.eslintrc.json`）；`typescript-eslint` 8 统一包
  *EN: TypeScript 5.3 → 5.9.3; ESLint 8 → 9 (flat config `eslint.config.js`, removed `.eslintrc.json`); unified `typescript-eslint` 8 package.*
- Jest 配置改为 CJS 转换模式以保留 `jest.mock()` 提升语义；`setupTests.ts` 显式导入 `@jest/globals`
  *EN: Jest switched to CJS transform mode to preserve `jest.mock()` hoisting semantics; `setupTests.ts` imports `@jest/globals` explicitly.*

### Fixed

- `refactoring.ts` 语言检测中的不可达分支（`no-dupe-else-if`）
  *EN: an unreachable branch in `refactoring.ts` language detection (`no-dupe-else-if`).*
- `refactoring.ts` / `tdd-cycle-validator.ts` / `code-generator.ts` 中 20 处正则/模板字符串多余转义
  *EN: 20 redundant regex/template-string escapes in `refactoring.ts` / `tdd-cycle-validator.ts` / `code-generator.ts`.*
- `test-runner.test.ts` 通过模块工厂 mock `util.promisify`（原 `require()` 突变写法在 interop 下不可写）
  *EN: `test-runner.test.ts` mocks `util.promisify` via a module factory (the previous `require()` mutation is not writable under interop).*

### Removed

- 根目录 6 个临时绕过脚本：`mcp-server.js`、`simple-server.js`、`start-server.js`、`stdio-server.js`、`test-server.js`、`test-mcp.sh`（历史注释即标明为"绕过 npm 依赖安装问题的临时方案"；唯一入口为 `dist/server.js` / bin `tdd-mcp-server`）
  *EN: 6 temporary bypass scripts from the repo root: `mcp-server.js`, `simple-server.js`, `start-server.js`, `stdio-server.js`, `test-server.js`, `test-mcp.sh` (historical comments already marked them as "a temporary workaround for npm dependency-install issues"; the only entry points are `dist/server.js` / the bin `tdd-mcp-server`).*
- `.eslintrc.json`（由 `eslint.config.js` 取代）
  *EN: `.eslintrc.json` (replaced by `eslint.config.js`).*

### 安全 / 兼容性 | Security / Compatibility

- 工具名、工具参数、环境变量（`USE_NEW_TOOLS`、`DEFAULT_LOCALE`、`PROJECT_PATH`）、存储格式（`~/.tdd-flow/` JSONL）全部不变，现有 MCP 客户端配置无需改动
  *EN: tool names, tool parameters, environment variables (`USE_NEW_TOOLS`, `DEFAULT_LOCALE`, `PROJECT_PATH`), and the storage format (`~/.tdd-flow/` JSONL) are all unchanged; existing MCP client configurations need no changes.*
- 存量 `no-unused-vars` 告警降级为 warn（技术债，后续迭代清理）
  *EN: existing `no-unused-vars` warnings downgraded to warn (tech debt, to be cleaned up in later iterations).*

## [2.0.0] - 2026-11-10（此前未发版的既定状态 / previously unreleased established state）

- 15 工具合并为 3 主工具 + 子命令（`tdd` / `feature` / `tracking`）
  *EN: 15 tools merged into 3 main tools + subcommands (`tdd` / `feature` / `tracking`).*
- 完整中英文国际化，默认中文
  *EN: full Chinese/English internationalization with Chinese as the default.*
- TDD Session 自动管理（RED→GREEN→REFACTOR）
  *EN: automatic TDD session management (RED→GREEN→REFACTOR).*
- 对 v1.0 15 工具系统的完整向后兼容
  *EN: full backward compatibility with the v1.0 15-tool system.*

## [1.0.0] - 初始版本 / Initial release

- 15 个独立 MCP 工具：测试生成、实现生成、测试运行、覆盖率分析、重构建议、TDD 循环校验、功能管理、会话管理、测试跟踪
  *EN: 15 standalone MCP tools: test generation, implementation generation, test running, coverage analysis, refactoring suggestions, TDD-cycle validation, feature management, session management, test tracking.*
- 8 语言 × 多框架支持
  *EN: 8 languages × multiple frameworks supported.*
