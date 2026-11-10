# MCP Server Specification

> Capability: mcp-server — TDD 工作流 MCP 服务器（stdio 传输，双工具系统，中英双语）

状态基线：由变更 `upgrade-to-v2.1`（2026-11-10 完成）归档确立。

## Purpose

`tdd-mcp-server` 通过 MCP（Model Context Protocol）向 AI 编程助手提供测试驱动开发工作流：测试生成、实现生成、测试执行、覆盖率分析、重构建议、TDD 循环校验，以及功能管理与测试跟踪。基于 stdio 传输运行，唯一入口为 `dist/server.js`（bin: `tdd-mcp-server`）。

## Requirements

### Requirement: SDK 1.x 兼容

服务器 SHALL 运行于 `@modelcontextprotocol/sdk` >= 1.32 且 < 2。

#### Scenario: 服务器在 SDK 1.x 上启动

- **WHEN** 依赖以 `@modelcontextprotocol/sdk@^1.32.2` 安装
- **THEN** `node dist/server.js` 启动并通过 stdio 完成 MCP `initialize` 握手

#### Scenario: 请求 schema 自 server 入口可解析

- **WHEN** server 模块被导入
- **THEN** `ListToolsRequestSchema`、`CallToolRequestSchema`、`ListResourcesRequestSchema`、`ReadResourceRequestSchema`、`ListPromptsRequestSchema`、`GetPromptRequestSchema` 为可用的 zod schema

### Requirement: ESM 模块语义

包 SHALL 声明 `"type": "module"` 并以 ESM 发射/运行；运行时路径解析 SHALL NOT 依赖 `__dirname`。

#### Scenario: 编译产物以 ESM 执行

- **WHEN** `npm run build` 完成后运行 `node dist/server.js`
- **THEN** 不出现 `Cannot use import statement outside a module` 或 `__dirname is not defined` 错误

#### Scenario: 打包资产目录可解析

- **WHEN** 请求 `tdd://best-practices/` 下的资源 URI 或提示词模板
- **THEN** handler 使用 `import.meta.url` 解析 `best-practices/` 与 `templates/` 目录并找到文件

### Requirement: Node 引擎下限

包 SHALL 声明 `engines.node >= 20`。

#### Scenario: engines 字段

- **WHEN** 检查 `package.json`
- **THEN** `engines.node` 为 `">=20.0.0"`

### Requirement: 版本一致性

`package.json` 版本、代码内 `SERVER_INFO.version` 与文档版本 SHALL 一致。

#### Scenario: 版本号一致

- **WHEN** 比对发布准备完成后的三处版本
- **THEN** 均等于 `2.1.0`

### Requirement: 双工具系统

服务器 SHALL 通过 `USE_NEW_TOOLS` 环境变量同时支持 v2.0 三工具系统（`tdd` / `feature` / `tracking`，含子命令）与 v1.0 十五工具系统，二者返回格式均 SHALL 为 MCP 合规的 `content` 数组。

#### Scenario: 新工具系统

- **WHEN** `USE_NEW_TOOLS=true` 时调用 `tools/list`
- **THEN** 返回 3 个工具（`tdd`、`feature`、`tracking`）

#### Scenario: 旧工具系统

- **WHEN** `USE_NEW_TOOLS=false` 时调用 `tools/list`
- **THEN** 返回 15 个工具

### Requirement: 国际化

服务器 SHALL 支持中英文界面（`DEFAULT_LOCALE`，默认 `zh`），工具描述、参数说明、错误信息 SHALL 本地化。

#### Scenario: 中文界面

- **WHEN** `DEFAULT_LOCALE=zh` 时调用 `tools/list`
- **THEN** `tdd` 工具描述包含「测试驱动开发」

### Requirement: 会话与存储

TDD 会话 SHALL 自动管理（RED→GREEN→REFACTOR 阶段跟踪），数据 SHALL 以 JSONL 格式持久化于 `~/.tdd-flow/projects/<projectId>/`，格式变更需向后兼容。

#### Scenario: 自动创建会话

- **WHEN** `tdd` 工具被调用且无活动会话
- **THEN** 服务器自动创建 TDD 会话并进入 RED 阶段，会话写入 `~/.tdd-flow/projects/<projectId>/tdd-sessions.jsonl`

#### Scenario: 阶段流转

- **WHEN** 完整 TDD 流程执行
- **THEN** 会话阶段按 RED→GREEN→REFACTOR 顺序更新且持久化

### Requirement: 质量门

每次变更 SHALL 保持：全部单元测试通过、`tsc` 构建无错、ESLint 0 error、`integration-test.sh` 9 个场景通过。

#### Scenario: 质量门全部通过

- **WHEN** 变更提交前在 Node 20+ 环境执行 `npm test`、`npm run lint`、`npm run build`、`./integration-test.sh`
- **THEN** 四项检查全部以零错误退出
