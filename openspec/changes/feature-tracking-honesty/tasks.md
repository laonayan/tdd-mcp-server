# Tasks: feature-tracking-honesty

## T1: v2 feature 工具真实接线

- [x] 1.1 RED：`src/__tests__/new-tools.test.ts` 新增 feature create/update/link/find 用例——断言返回含 `id`/`status` 等真实字段、缺 `acceptanceCriteria` 时 `isError: true`（先跑失败）
- [x] 1.2 GREEN：`handleFeatureTool` 接线 `FeatureManagementService`（create→createFeature、update→updateFeatureStatus、link→linkFeatureFiles、find→findSimilarFeatures），schema 补可选字段
- [x] 1.3 提交（`T1(v2-feature): ... Change: feature-tracking-honesty`）

## T2: v2 tracking 工具真实接线

- [x] 2.1 RED：新增 tracking register/result/status 用例——断言持久化对象回读一致、methodId 不存在时 `isError: true`
- [x] 2.2 GREEN：`handleTrackingTool` 接线 `StorageService`（register 构造 TestMethod 落盘、result/status 更新后回读），schema 补 methodId/result/status 字段
- [x] 2.3 提交

## T3: 测试结果文件按 projectPath 解析

- [x] 3.1 RED：`src/services/__tests__/test-runner.test.ts` 新增用例——`parseJsonResults` 从 projectPath 读取结果文件，且不读 cwd 下同名陈旧文件
- [x] 3.2 GREEN：`parseTestResults`/`parseJsonResults` 签名增加 projectPath，读取改为绝对路径；找不到回退文本解析
- [x] 3.3 提交

## T4: loadTestMethod 按项目文件直读

- [x] 4.1 RED：`src/services/__tests__/storage.service.basic.test.ts` 新增用例——loadTestMethod 命中返回完整记录、未命中返回 null、更新后回读一致
- [x] 4.2 GREEN：消除 `listTestMethods('')` 全量扫描，改为逐项目 `readJsonlFile` 后 find
- [x] 4.3 提交

## T5: 集成断言与收尾

- [x] 5.1 `integration-test.sh` 测试 7/8：入参补 `acceptanceCriteria`/`methodId` 等，断言改为真实证据短语（`"id"`、`"featureId"`、`"status"`）
- [x] 5.2 全量质量门：jest（带内存上限）、ESLint 0 error、tsc 零错误、integration 9/9、`openspec validate --all`
- [x] 5.3 CHANGELOG 增补（Unreleased/Fixed 或 Changed：v2 feature/tracking 诚实化 + 两处修正，标注 `feature create` 缺验收条件行为变化）
- [x] 5.4 提交并勾选本文件全部任务
