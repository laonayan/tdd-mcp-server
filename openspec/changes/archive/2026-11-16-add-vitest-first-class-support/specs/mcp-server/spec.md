# Spec Delta

## ADDED Requirements

### Requirement: vitest 结果真实解析

测试执行结果解析 SHALL 针对框架 `vitest` 使用专用解析器读取 JSON 结果文件，真实反映其中的通过/失败/跳过计数与错误信息，SHALL NOT 降级为与文件内容无关的占位结果。

#### Scenario: vitest 全挂套件被如实报告

- **WHEN** vitest 项目执行测试且 `test-results.json` 记录 2 个失败、0 个通过
- **THEN** 返回的 `TestResults.overall.failed` 为 2、`passed` 为 0，且失败用例携带文件中的错误信息

#### Scenario: vitest 跳过与通过计数一致

- **WHEN** vitest JSON 结果包含 skipped 用例
- **THEN** 解析结果将该用例标记为 `skipped` 并计入 `overall.skipped`

#### Scenario: vitest 解析器为纯函数

- **WHEN** 调用 vitest 解析器
- **THEN** 其实现位于 `src/core/parsers/` 纯核心层，零 IO 依赖，可直接以 JSON 输入单测

### Requirement: 结果文件新鲜度校验

测试结果 JSON 文件 SHALL 仅在其 mtime 晚于本次测试进程启动时间时被采信；陈旧文件 SHALL 被弃用并回退到本次进程 stdout/stderr 的文本解析。

#### Scenario: 本次运行未写文件时忽略旧文件

- **WHEN** 测试命令执行失败未写出 `test-results.json`，但 projectPath 下存在上一次运行留下的旧文件
- **THEN** 旧文件内容不被当作本次结果返回，回退文本解析并反映本次失败

#### Scenario: 新文件正常采信

- **WHEN** 本次运行写出的 `test-results.json` mtime 晚于进程启动时间
- **THEN** JSON 解析结果被正常返回

### Requirement: 未知框架不伪造结果

当某框架没有专用 JSON 解析器时，系统 SHALL 返回明确标记"无法解析该框架的结构化结果"的占位结果，SHALL NOT 伪造任何通过状态或与输入无关的计数。

#### Scenario: 无解析器框架返回显式占位

- **WHEN** 某框架的 JSON 结果文件存在但系统未注册该框架的解析器
- **THEN** 返回的占位结果 `overall.total` 为 0 且不包含任何标记为 `passed` 的用例，并说明结构化解析不可用
