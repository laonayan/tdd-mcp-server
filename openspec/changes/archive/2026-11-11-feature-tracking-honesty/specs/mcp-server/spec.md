# mcp-server spec delta — feature-tracking-honesty

## ADDED Requirements

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
