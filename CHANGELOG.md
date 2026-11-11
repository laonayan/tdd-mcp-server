# Changelog 更新日志

> 🌐 中英双文，默认中文：每条中文条目下以缩进斜体附英文对照。
> Bilingual (Chinese first by default): each Chinese entry is followed by an indented italic English translation.

本项目的所有显著变更都记录在此文件中。
All notable changes to this project are documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- **V3 分层架构重构**（内部重排，外部行为零变化）：解析/相似度/分析逻辑
  下沉纯核心层 `src/core/`（零 IO、零 mock 测试）；全部子进程执行收敛到
  唯一受守卫网关 `GuardedCommandExecutor`（嵌套拒绝 + 内存上限 + 输出/
  超时上限，架构测试锁定 `child_process` 白名单）；`StorageService` 实现
  仓储端口并新增 `InMemoryStorage` fake（单测不再写 `~/.tdd-flow`）；
  v2 三工具改为命令注册表 `src/commands/registry.ts` 单一事实来源
  （zod 宽松校验 + handler），组合根统一装配（server.ts 只做协议绑定）
  *EN: **V3 layered architecture refactor** (internal restructure, zero
  external behavior change): parsing/similarity/analysis logic moved to the
  pure core `src/core/` (zero IO, mock-free tests); all subprocess execution
  converged into the single guarded gateway `GuardedCommandExecutor` (nested
  refusal + memory caps + output/timeout limits, enforced by an architecture
  test whitelisting `child_process`); `StorageService` implements the storage
  repository port with a new `InMemoryStorage` fake (unit tests no longer
  write to `~/.tdd-flow`); v2 tools now project from the command registry
  `src/commands/registry.ts` as the single source of truth (loose zod
  validation + handlers), assembled by a composition root.*

- v2 `feature` / `tracking` 工具诚实化接线：四个 feature 子命令
  （create/update/link/find）与三个 tracking 子命令（register/result/status）
  现真实调用 `FeatureManagementService` / `StorageService` 并返回持久化产物
  （含 `id`、`status` 等真实字段），错误如实以 `isError` 传播；输入 schema
  补齐可选字段（`acceptanceCriteria`、`priority`、`tags`、`projectId`、
  `status`、`progress`、`filePaths`、`fileType`、`maxResults`、`methodId`、
  `result`、`testType`），既有字段不变
  *EN: v2 `feature` / `tracking` tools are now honestly wired: all four feature
  subcommands and three tracking subcommands call the real
  `FeatureManagementService` / `StorageService` and return persisted artifacts
  (with real fields like `id` and `status`), errors propagate honestly as
  `isError`; input schemas gained optional fields while existing ones are
  unchanged.*
- **行为变化**：`feature` 的 `create` 缺少 `acceptanceCriteria` 时从"固定
  成功文案"变为如实返回 service 校验错误（至少一条验收条件）
  *EN: **Behavior change**: `feature` `create` without `acceptanceCriteria` now
  returns the service's honest validation error instead of a fixed success
  string.*
- 测试结果文件（`test-results.json` 等）改为相对被测项目路径（`projectPath`）
  解析，不再误读 MCP 服务器进程 cwd 下的陈旧同名文件；找不到时维持回退
  stdout 文本解析的既有语义
  *EN: Test result files are now resolved against the tested project's
  `projectPath` instead of the MCP server process cwd (which could pick up a
  stale file); the existing fallback to stdout text parsing is preserved.*
- `StorageService.loadTestMethod` 改为逐项目直读 `test-methods.jsonl` 并早退，
  不再调用 `listTestMethods('')` 聚合全部项目的全部方法（原循环变量
  projectId 从未生效）
  *EN: `StorageService.loadTestMethod` now reads each project's
  `test-methods.jsonl` directly with early exit, instead of aggregating every
  method of every project via `listTestMethods('')` (whose loop variable was
  never effective).*

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
