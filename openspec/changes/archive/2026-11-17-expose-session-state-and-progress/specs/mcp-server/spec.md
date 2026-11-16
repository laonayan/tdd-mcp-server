# Spec Delta

## ADDED Requirements

### Requirement: 会话状态资源暴露

`resources/list` SHALL 包含由真实存储支撑的状态资源集合：`tdd://sessions`（全部 TDD 会话）、`tdd://features`（全部功能特性）、`tdd://tracking`（全部已注册测试方法）；`resources/read` SHALL 对集合 URI 返回存储中的真实 JSON 数据，对 `tdd://sessions/<id>` 与 `tdd://features/<id>` 返回对应单条记录。存储为空时集合 SHALL 如实返回空数组，SHALL NOT 伪造记录。

#### Scenario: 列出状态资源集合

- **WHEN** 存储中存在至少一个 TDD 会话与一个 feature 时调用 `resources/list`
- **THEN** 返回的资源列表包含 `tdd://sessions`、`tdd://features`、`tdd://tracking`，以及 `tdd://sessions/<id>`、`tdd://features/<id>` 条目资源

#### Scenario: 读取会话集合返回真实数据

- **WHEN** 读取 `tdd://sessions` 且存储中有 2 个会话
- **THEN** 返回 JSON 数组含 2 条会话记录（含 stage、featureId 等真实字段）

#### Scenario: 空存储如实返回空集合

- **WHEN** 存储中无任何数据时读取 `tdd://features`
- **THEN** 返回 `[]`，不包含伪造记录

#### Scenario: 未知 id 如实报错

- **WHEN** 读取 `tdd://sessions/<不存在的 id>`
- **THEN** 返回错误说明会话不存在，SHALL NOT 返回占位数据

### Requirement: 长任务进度通知

当客户端请求 `_meta` 携带 `progressToken` 时，完整 TDD 工作流（无 command 的 `tdd` 调用）SHALL 在每个执行步骤发送 `notifications/progress`（携带 progressToken、递增 progress、total 与步骤说明）；未携带 progressToken 时 SHALL NOT 发送任何进度通知。

#### Scenario: 携带 progressToken 时按步通知

- **WHEN** 调用 `tdd` 工具（无 command）且 `_meta.progressToken` 为 `"tok-1"`
- **THEN** 五个工作流步骤各触发一条 `notifications/progress`，progressToken 均为 `"tok-1"`，progress 递增且 total 为 5

#### Scenario: 未携带 progressToken 时静默

- **WHEN** 调用 `tdd` 工具（无 command）且请求不含 `_meta.progressToken`
- **THEN** 工作流正常执行，不发送任何 `notifications/progress`

#### Scenario: 步骤失败不中断通知序列

- **WHEN** 工作流中某步骤抛错（工作流容错继续）
- **THEN** 后续步骤的进度通知仍正常发送（通知反映实际推进，不因单步失败丢失）
