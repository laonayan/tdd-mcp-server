# Proposal

## Why

vitest 目前在结果解析链路中被降级为 `parseGenericJsonResults()`：vitest 项目跑完测试后，已正确拼出 `--reporter=json --outputFile=test-results.json` 并按项目路径读到文件，但 `convertJsonToTestResults` 没有 `case 'vitest'`，落入返回硬编码 "1 passed" 的 generic 分支——**全挂的 vitest 套件会被报告为通过**，违反主规格 "TDD 工具真实执行 / Evidence over Claims" 的红线。同时结果文件解析无新鲜度校验，本次运行失败未写文件时会静默返回上一次的陈旧结果。

## What Changes

- 新增 `parseVitestResults()` 纯函数解析器（vitest JSON reporter 输出），落位 `src/core/parsers/test-results.ts`
- `TestRunnerService.convertJsonToTestResults` 增加 `case 'vitest'` 接线
- 结果文件新鲜度防护：仅当结果文件 mtime 晚于本次测试进程启动时间才采信，否则回退 stdout 文本解析（jest/vitest 共同受益）
- 移除 `parseGenericJsonResults()` 伪造 "1 passed" 的行为，改为显式"无法解析该框架的 JSON 结果"占位（不伪造通过状态）
- 新增单元测试：vitest 解析器（真实失败样本 fixture）、陈旧结果回归、generic 占位行为

## Capabilities

### Modified Capabilities

- `mcp-server`: "TDD 工具真实执行" 能力扩展——vitest 框架的测试结果解析必须真实反映文件内容；结果文件必须通过新鲜度校验；未知框架不得伪造通过结果。

## Impact

- **Code**: `src/core/parsers/test-results.ts`（新增解析器 + generic 行为变更）、`src/services/test-runner.ts`（vitest 接线 + mtime 校验）、`src/core/__tests__`、`src/services/__tests__`（新增测试）
- **兼容性**: vitest 项目从"假通过"变为真实结果（缺陷修复，非破坏）；`parseGenericJsonResults` 的调用方行为变化（从假通过变为显式不可解析占位）
- **测试**: 先写失败测试（RED）再实现；既有 168+ 单测与 9 个集成场景语义不变
