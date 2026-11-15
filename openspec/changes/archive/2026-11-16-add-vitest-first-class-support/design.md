# Design

## 背景

vitest 的 `--reporter=json` 输出是 jest JSON 的变体：顶层 `testResults[].assertionResults[]` 结构相似，但存在关键差异——status 枚举为 `pass`/`fail`/`skip`/`todo`（jest 是 `passed`/`failed`/`pending`/`todo`），assertion 无 `duration` 字段（需从 suite 层或 0 填充），suite 级 `startTime`/`endTime` 语义不同（vitest 为相对耗时数字而非绝对时间戳）。复用 `parseJestResults` 会把所有用例解析成未知状态，因此需要独立解析器。

## 方案

### 1. `parseVitestResults()`（src/core/parsers/test-results.ts）

- 输入 vitest JSON（`numTotalTests`/`numPassedTests`/`numFailedTests`/`numPendingTests`/`testResults[]`）
- suite：`testResults[].name` + `assertionResults[]`；用例状态映射 `pass→passed`、`fail→failed`、`skip/todo→skipped`；错误取 `failureMessages`
- overall 优先信任顶层 `num*` 计数（vitest 官方字段），缺失时按 suite 汇总；duration 用 `testResults[].duration` 累加（vitest 有此字段，jest 无）
- 纯函数、零 IO，符合纯核心层架构约束

### 2. 接线（src/services/test-runner.ts）

`convertJsonToTestResults` 增加 `case 'vitest': return parsers.parseVitestResults(data)`。

### 3. 新鲜度校验（同文件）

`parseJsonResults` 接收本次执行的 `runStartedAt`（`Date`，在 spawn 前采样）；读取候选文件后用 `fs.stat` 比较 `mtimeMs > runStartedAt.getTime()`，不满足则 continue 检查下一个候选/返回 null 走文本解析。jest 与 vitest 共同受益。

### 4. generic 占位修正（src/core/parsers/test-results.ts）

`parseGenericJsonResults()` 从硬编码 "1 passed" 改为：`overall.total: 0`、空用例、framework `generic`、附注说明"结构化解析不可用（无该框架解析器）"。调用方（`parseJsonResults` 的 default 分支）语义变为"读到文件但无法结构化解析"，仍是真实表达而非伪造。

## 取舍与不变量

- **不改变** MCP 工具接口、i18n、存储格式、命令拼接（`--reporter=json --outputFile` 已存在）
- **不变** jest/mocha/pytest 解析行为
- 文本解析回退（`parseTextResults`）保持现状，作为 JSON 不可用时的兜底
- ESM 注意：解析器文件不含 `import.meta`，保持 jest CJS 可转换性

## 测试策略（RED → GREEN）

1. `src/core/__tests__/vitest-parser.test.ts`：真实 vitest JSON fixture（含失败、跳过、错误信息）→ 期望结构化断言
2. `src/services/__tests__/`：陈旧 mtime 文件被忽略（回退文本解析）；新鲜文件被采信；generic 占位不再含 passed 用例
3. 回归：全量单测 + 9 集成场景不回归
