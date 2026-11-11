# mcp-server spec delta — tdd-honesty-and-workflow

## ADDED Requirements

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

## ADDED Requirements

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
