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

### Requirement: TDD 工具真实执行

v2 `tdd` 工具的每个子命令 SHALL 调用对应的核心 service 并返回真实结果，SHALL NOT 返回与输入无关的固定字符串。

#### Scenario: generate 子命令生成真实测试

- **WHEN** 调用 `tdd` 且 `command: "generate"`、`requirements`、`language`、`framework`、`testType` 齐备
- **THEN** 返回内容包含 `TestGeneratorService.generateTests()` 的真实输出（测试名、代码、估算覆盖率），而非固定文案

#### Scenario: test 子命令真实执行

- **WHEN** 调用 `tdd` 且 `command: "test"`、`projectPath`、`framework` 齐备
- **THEN** `TestRunnerService.runTests()` 被真实调用，返回内容反映实际执行结果（含失败时的错误信息）

#### Scenario: 完整流程汇总真实结果

- **WHEN** 调用 `tdd` 仅提供 `requirements`（无 command）
- **THEN** 依次执行生成→实现→测试→覆盖率→重构建议，汇总文案保留 `完整TDD流程执行完成` 关键短语（集成测试依赖），每步附带真实产物摘要

#### Scenario: 错误如实传播

- **WHEN** service 抛出错误（如不支持的语言/框架组合）
- **THEN** 返回 `isError: true` 且内容包含原始错误信息

### Requirement: 技能资产结构

工作流知识资产 SHALL 以 `skills/<name>/SKILL.md`（YAML frontmatter：name、description；正文为步骤指引）组织；MCP prompts SHALL 从 `skills/` 与 `templates/` 文件加载。

#### Scenario: SKILL.md 可被发现与加载

- **WHEN** 列出 MCP prompts 或读取 `skills/` 目录
- **THEN** 至少存在 `tdd-workflow`、`test-generation`、`debugging` 技能文件，且每个文件有合法 frontmatter

#### Scenario: 旧资产保留兼容

- **WHEN** 用户通过旧 `tdd://best-practices/` 资源 URI 访问
- **THEN** 原文件仍可读（目录保留或重定向），不产生 404

### Requirement: 代理指引文件

仓库根 SHALL 包含 `AGENTS.md`，内容涵盖：openspec 变更流程（propose→apply→archive）、质量门清单（单测/lint/构建/集成/openspec validate）、双工具系统与 i18n 架构要点。

#### Scenario: AI 贡献者可自举

- **WHEN** AI 编码代理打开本仓库
- **THEN** 通过 `AGENTS.md` 可获知完整工作流程与质量门，无需询问维护者

### Requirement: CI 质量门

仓库 SHALL 包含 GitHub Actions 工作流，在 push/PR 时执行 build、test、lint 三项检查，任一失败 SHALL 阻断合并。

#### Scenario: CI 全绿基线

- **WHEN** CI 在 Node 20 与 24 上运行 `npm ci && npm run build && npm test && npm run lint`
- **THEN** 全部步骤通过（以本变更合入后的 master 为基线）

### Requirement: OpenSpec 机器校验

`openspec validate --strict --all` SHALL 纳入变更质量门，当前所有 specs 与 changes SHALL 校验通过。

#### Scenario: 规格合规

- **WHEN** 在仓库根运行 `openspec validate --all`
- **THEN** 所有 specs 与 changes 以零错误通过

### Requirement: feature 工具真实执行

v2 `feature` 工具的每个子命令 SHALL 调用对应的核心 service 并返回真实结果，SHALL NOT 返回与输入无关的固定字符串。

#### Scenario: create 返回真实 Feature 对象

- **WHEN** 调用 `feature` 且 `command: "create"`（或省略 command）、`name`、`description`、`acceptanceCriteria` 齐备
- **THEN** 返回内容包含 `FeatureManagementService.createFeature()` 持久化产物的真实字段（`id`、`status: "planning"`、`acceptanceCriteria`），而非固定文案

#### Scenario: create 缺少验收条件如实报错

- **WHEN** 调用 `feature` 且 `command: "create"` 但未提供 `acceptanceCriteria`
- **THEN** 返回 `isError: true` 且内容包含 service 的原始校验错误（至少一条验收条件）

#### Scenario: find 返回真实相似度结果

- **WHEN** 调用 `feature` 且 `command: "find"`、`query` 齐备
- **THEN** 返回内容反映 `findSimilarFeatures()` 的真实匹配（相似度分数与理由列表），无匹配时如实返回空结果

#### Scenario: update 与 link 真实生效

- **WHEN** 调用 `feature` 且 `command: "update"`（`featureId` + `status`）或 `command: "link"`（`featureId` + `filePaths`）
- **THEN** 状态更新/文件关联被持久化并返回更新后的真实对象；目标 feature 不存在时返回 `isError: true` 及原始错误

### Requirement: tracking 工具真实执行

v2 `tracking` 工具的每个子命令 SHALL 调用真实持久化并返回真实结果，SHALL NOT 返回与输入无关的固定字符串。

#### Scenario: register 持久化并返回对象

- **WHEN** 调用 `tracking` 且 `command: "register"`（或省略 command）、`featureId`、`name`、`filePath`、`framework` 齐备
- **THEN** 测试方法被写入存储并返回含 `id`、`status: "pending"` 的真实对象

#### Scenario: result 更新后回读真实状态

- **WHEN** 调用 `tracking` 且 `command: "result"`、`methodId`、`result`（含 `passed`）齐备
- **THEN** 执行结果被持久化，返回内容反映更新后的真实状态（`passed`/`failed` 与 `lastExecutedAt`）；`methodId` 不存在时返回 `isError: true` 及原始错误

#### Scenario: status 更新后回读真实状态

- **WHEN** 调用 `tracking` 且 `command: "status"`、`methodId`、`status` 齐备
- **THEN** 状态被持久化并返回更新后的真实对象；`methodId` 不存在时返回 `isError: true` 及原始错误

### Requirement: 测试结果文件按项目路径解析

`TestRunnerService` 解析测试结果文件时 SHALL 相对于被测项目路径（`projectPath`）读取，SHALL NOT 读取 MCP 服务器进程工作目录下的同名文件。

#### Scenario: projectPath 与服务器 cwd 不同时读取正确文件

- **WHEN** `tdd test` 在 `projectPath` 下执行测试并生成 `test-results.json`，且该路径不同于服务器进程 cwd
- **THEN** 结果解析读取 `projectPath` 下的结果文件并返回真实通过/失败统计

#### Scenario: 项目下无结果文件时回退文本解析

- **WHEN** `projectPath` 下不存在任何已知结果文件
- **THEN** 回退到对 stdout/stderr 的文本解析（现状语义），且不读取服务器 cwd 下的陈旧同名文件

### Requirement: 测试方法按项目文件加载

`StorageService.loadTestMethod` SHALL 按项目存储文件定位测试方法，SHALL NOT 对全部项目的全部方法做无差别重复扫描。

#### Scenario: 命中项目内方法

- **WHEN** 以存在的 `methodId` 调用 `loadTestMethod`
- **THEN** 返回该项目 `test-methods.jsonl` 中的对应记录，字段完整（含执行结果与时间戳）

#### Scenario: 未命中返回空

- **WHEN** 以不存在的 `methodId` 调用 `loadTestMethod`
- **THEN** 返回 `null`，不抛出错误

#### Scenario: 更新后回读一致

- **WHEN** `updateTestMethodStatus` 或 `updateTestExecutionResult` 成功后立即 `loadTestMethod`
- **THEN** 回读结果反映刚写入的状态变更
