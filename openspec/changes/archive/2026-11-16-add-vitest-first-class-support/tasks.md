# Tasks

- [x] T1(core): vitest 解析器 — 先写失败测试 `src/core/__tests__/vitest-parser.test.ts`（真实失败样本 fixture），再实现 `parseVitestResults()` 于 `src/core/parsers/test-results.ts`
- [x] T2(core): generic 占位修正 — 先写失败测试断言 `parseGenericJsonResults()` 不含 passed 用例且 total=0，再改实现移除伪造 "1 passed"
- [x] T3(service): vitest 接线与新鲜度校验 — 先写失败测试（陈旧 mtime 忽略回退文本解析 / 新鲜文件采信 / `case 'vitest'` 返回结构化结果），再在 `TestRunnerService` 实现 `runStartedAt` 采样与 `convertJsonToTestResults` 分支
- [x] T4(quality): 全量质量门 — `npm test`、`npm run lint`（0 error）、`npm run build`、`./integration-test.sh`（带 NODE_OPTIONS 内存上限）、`openspec validate --all`
- [x] T5(openspec): 归档 — delta 合入 `openspec/specs/mcp-server/spec.md`，变更移入 archive，分步提交推送
