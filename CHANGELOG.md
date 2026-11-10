# Changelog

本项目的所有显著变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 新增 `skills/` 技能资产目录（superpowers 式 `SKILL.md`：YAML frontmatter + 步骤正文）：
  `tdd-workflow`、`test-generation`、`debugging`；`package.json` `files` 已包含 `skills`

### Changed

- MCP prompts 模板加载顺序调整：`tdd-workflow` / `test-generation` 提示优先读取
  `skills/<name>/SKILL.md`（自动剥离 frontmatter），读取失败时回退 `templates/` 旧模板与
  内联默认，保持资源 URI 与参数兼容（openspec 变更 `tdd-honesty-and-workflow` T2）

## [2.1.0] - 2026-11-10

### Added

- **MCP SDK 1.x 迁移测试**（23 个新单测）：
  - `sdk-compat.test.ts` — 请求 schema 形态校验、`Server.setRequestHandler` 装配、双工具系统返回值合规性
  - `esm-paths.test.ts` — ESM 下 `best-practices/`、`templates/` 资源目录解析
  - `version-consistency.test.ts` — 版本号 / engines / 依赖范围一致性守卫
- `npm run test:esm` 脚本（可选的 `--experimental-vm-modules` 运行模式）

### Changed

- **`@modelcontextprotocol/sdk` 0.5.0 → 1.32.2**（核心升级）
  - 兼容 2025-06 后发布的 1.x 协议实现与新版 MCP 客户端
  - 请求 schema 导入路径核验并适配（低阶 `Server` API 保持不变）
- **包声明 `"type": "module"`**：`dist/` 产物按 ESM 语义运行，与编译输出一致
- `resources.ts` / `prompts.ts`：`__dirname` → `import.meta.url` 派生路径（ESM 必需）
- `tsconfig.json`：`module`/`moduleResolution` → `NodeNext`（SDK 1.x 子路径导出所必需）
- `engines.node`：`>=18` → `>=20`（Node 18 已于 2025-04 EOL）
- TypeScript 5.3 → 5.9.3；ESLint 8 → 9（扁平配置 `eslint.config.js`，移除 `.eslintrc.json`）；`typescript-eslint` 8 统一包
- Jest 配置改为 CJS 转换模式以保留 `jest.mock()` 提升语义；`setupTests.ts` 显式导入 `@jest/globals`

### Fixed

- `refactoring.ts` 语言检测中的不可达分支（`no-dupe-else-if`）
- `refactoring.ts` / `tdd-cycle-validator.ts` / `code-generator.ts` 中 20 处正则/模板字符串多余转义
- `test-runner.test.ts` 通过模块工厂 mock `util.promisify`（原 `require()` 突变写法在 interop 下不可写）

### Removed

- 根目录 6 个临时绕过脚本：`mcp-server.js`、`simple-server.js`、`start-server.js`、`stdio-server.js`、`test-server.js`、`test-mcp.sh`（历史注释即标明为"绕过 npm 依赖安装问题的临时方案"；唯一入口为 `dist/server.js` / bin `tdd-mcp-server`）
- `.eslintrc.json`（由 `eslint.config.js` 取代）

### 安全 / 兼容性

- 工具名、工具参数、环境变量（`USE_NEW_TOOLS`、`DEFAULT_LOCALE`、`PROJECT_PATH`）、存储格式（`~/.tdd-flow/` JSONL）全部不变，现有 MCP 客户端配置无需改动
- 存量 `no-unused-vars` 告警降级为 warn（技术债，后续迭代清理）

## [2.0.0] - 2026-11-10（此前未发版的既定状态）

- 15 工具合并为 3 主工具 + 子命令（`tdd` / `feature` / `tracking`）
- 完整中英文国际化，默认中文
- TDD Session 自动管理（RED→GREEN→REFACTOR）
- 对 v1.0 15 工具系统的完整向后兼容

## [1.0.0] - 初始版本

- 15 个独立 MCP 工具：测试生成、实现生成、测试运行、覆盖率分析、重构建议、TDD 循环校验、功能管理、会话管理、测试跟踪
- 8 语言 × 多框架支持
