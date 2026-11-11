# Proposal

## Why

上一变更 `tdd-honesty-and-workflow` 完成了 v2 `tdd` 工具的诚实化接线，但审计发现同类的"固定字符串假实现"仍残留在另外两个 v2 工具中，且测试执行链路上有两个正确性 bug：

1. **v2 `feature` 工具假实现**：`handleFeatureTool` 对 create/update/link/find 四个子命令一律返回 `"Feature created successfully"` 等固定文案，从未调用已构造好的 `FeatureManagementService`（`NewToolsHandler` 构造函数第 37 行注入后闲置）。这直接违反主规格「TDD 工具真实执行」的精神与 `AGENTS.md` 的 Evidence over Claims 纪律。
2. **v2 `tracking` 工具假实现**：`handleTrackingTool` 对 register/result/status 同样返回固定文案，未调用 `StorageService` 的真实持久化方法。
3. **测试结果文件读错目录**：`TestRunnerService.parseJsonResults()` 用相对路径读取 `test-results.json`（相对 MCP 服务器进程 cwd），而 spawn 的测试命令把文件写入 `projectPath`。当 `projectPath ≠ 服务器 cwd` 时会读到陈旧/无关文件或读不到，返回错误结果——又是"结果不诚实"问题。
4. **`StorageService.loadTestMethod` 忽略 projectId**：实现里循环每个项目却调用 `listTestMethods('')`（全量扫描所有项目），既 O(项目数×方法数) 浪费，也让 v1 `updateTestExecutionResult`/`updateTestMethodStatus` 的"更新后回读"链路低效且语义含混。

## What Changes

1. **v2 `feature` 工具真实接线**（`src/handlers/new-tools.ts`）：
   - `create` → `FeatureManagementService.createFeature()`，返回真实 Feature 对象（id、status、acceptanceCriteria 等）；缺 `acceptanceCriteria` 时如实返回 service 的校验错误
   - `update` → `updateFeatureStatus()`；`link` → `linkFeatureFiles()`；`find` → `findSimilarFeatures()`（返回相似度与理由）
   - 输入 schema 补齐缺失字段（acceptanceCriteria、priority、tags、projectId、status、progress、filePaths、fileType、maxResults），向后兼容（均为可选追加）
2. **v2 `tracking` 工具真实接线**：
   - `register` → 构造 TestMethod 并 `StorageService.registerTestMethod()`，返回持久化对象
   - `result` → `updateTestExecutionResult()` + 回读；`status` → `updateTestMethodStatus()` + 回读
   - schema 补齐 methodId、testType、result（passed、duration、errorMessage）、status 字段
3. **测试结果文件按项目路径解析**：`parseJsonResults` 改为从 `projectPath` 读取结果文件；找不到时回退 stdout 文本解析（现状语义），不再读服务器 cwd 的陈旧文件
4. **`loadTestMethod` 按项目文件直读**：优先从各项目的 `test-methods.jsonl` 直读查找，消除全量 `listTestMethods('')` 扫描；找不到返回 null（语义不变）
5. **测试与集成断言同步**：单测断言真实结构（create 返回含 `id`/`status: "planning"`，register 返回持久化对象）；`integration-test.sh` 测试 7/8 的断言从固定文案改为真实证据短语（如 `"id"`、`"featureId"`），并给测试 7 补 `acceptanceCriteria` 入参

## Capabilities

### Modified

- `spec/mcp-server/`: v2 `feature`/`tracking` 工具行为从固定字符串变为真实执行；测试结果解析路径与测试方法加载行为修正。

## Impact

- **Code**: `src/handlers/new-tools.ts`（核心）、`src/services/test-runner.ts`、`src/services/storage.service.ts`、`src/__tests__/new-tools.test.ts`、`src/services/__tests__/`（新增/更新）、`integration-test.sh`
- **兼容性风险**：
  - v2 `feature`/`tracking` 返回文案变化——从固定成功字符串变为真实结果 JSON（工具名、子命令、错误语义不变；与 `tdd` 工具上一轮诚实化的先例一致）
  - `feature create` 缺 `acceptanceCriteria` 将从"假成功"变为如实报错（service 既有校验）；集成测试入参同步补齐
  - 结果文件读取目录修正后，`projectPath ≠ cwd` 场景的 `tdd test` 结果将从"陈旧/文本回退"变为正确解析——行为修正而非破坏
- **存储**: 无格式变更（沿用 JSONL），仅读取逻辑修正
- **回滚**: git revert；不涉及迁移

## 约束

- 全部现有质量门保持绿色：单测（含新增）、ESLint 0 error、tsc 零错误、`integration-test.sh` 9 场景、`openspec validate --all`
- 遵循 TDD：先写失败测试再实现（RED→GREEN）
- 中文文档、英文结构标题（项目 config 约定）
