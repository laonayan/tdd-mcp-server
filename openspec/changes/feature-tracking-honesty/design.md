# Design

## Context

见 proposal.md（Why）。当前 `NewToolsHandler` 已持有 `featureManagementService` 与 `storageService` 实例但 `handleFeatureTool`/`handleTrackingTool` 未使用它们；v1 `tools.ts` 中同名操作（`handleCreateFeature`、`handleRegisterTestMethod` 等）已有成熟的真实接线与错误传播模式可对照。`parseJsonResults` 的文件列表为相对路径字面量；`loadTestMethod` 的循环体误用 `listTestMethods('')`。

## Goals / Non-Goals

**Goals:**

- v2 `feature`/`tracking` 与 v1 同语义：真实调用、真实持久化、错误如实传播（`isError: true` + 原始 message）
- 修正两处正确性 bug（结果文件解析目录、测试方法加载路径）
- 所有新增行为可由单测与集成测试共同锁定（RED→GREEN）

**Non-Goals:**

- 不改动 v1 十五工具的行为（其接线已真实）
- 不引入新存储格式或迁移；不动 `~/.tdd-flow` 目录结构
- 不做 feature/tracking 的 i18n 文案重构（沿用现有 `createSuccessResult` 直返 JSON 摘要模式，与 `tdd` 工具先例一致）
- 不重构 `FeatureManagementService` 相似度算法

## Decisions

1. **接线模式复用 v1 模板，不抽公共层**
   - v2 handler 直接调用 service 并把返回对象 `JSON.stringify(obj, null, 2)` 放进 content；错误由 `callTool` 顶层 try/catch 统一转 `isError`（v2 现有机制）。
   - 备选：抽 v1/v2 共用 handler 层。放弃——v1/v2 参数形状与返回文案不同，抽象收益低、回归面大，违背最小改动。

2. **`feature create` 的 `acceptanceCriteria` 缺失交由 service 校验报错**
   - 不在 handler 层造默认值（那是变相造假）。service 已有 `Feature must have at least one acceptance criteria` 校验，直接透传。
   - 集成测试 7 同步入参补 `acceptanceCriteria`（其断言同时从固定文案改为真实证据 `"id"`/`"planning"`）。

3. **`tracking register` 的 id 生成沿用 v1 惯例** `test-${Date.now()}`，projectId 取 `args.projectId || featureManagementService.getCurrentProject() || 'default-project'`——与 v1 `handleRegisterTestMethod` 完全一致，保证 v1/v2 行为等价。

4. **结果文件解析改为 `path.join(projectPath, fileName)`**
   - `parseTestResults` 签名增加 `projectPath` 参数；`parseJsonResults(frameworkKey, projectPath)` 用绝对路径读取，找不到时按现状回退文本解析。
   - 备选：让命令 `--outputFile` 写绝对路径。放弃——改变被测项目目录内容布局，副作用更大。

5. **`loadTestMethod` 改为按项目文件直读**
   - 遍历 `listProjects()`，对每个项目直接 `readJsonlFile(getTestMethodsPath(projectId))` 后 `find(m => m.id === id)`，命中即返回；全不命中返回 null。保持"不知 projectId 也能查"的既有语义（v1 调用方只传 methodId），但消除 `listTestMethods('')` 的跨项目重复聚合。

6. **schema 字段增量补充，全部可选**
   - `feature`：`acceptanceCriteria`（string[]）、`priority`、`tags`（string[]）、`projectId`、`status`、`progress`（对象）、`filePaths`（string[]）、`fileType`、`maxResults`
   - `tracking`：`methodId`、`testType`、`result`（`{ passed, duration?, errorMessage? }`）、`status`
   - 不改既有字段与 required，老调用方零感知。

## Risks / Trade-offs

- [集成测试 7/8 断言依赖新真实文案] → 断言改为结构证据（`"id"`、`"status"`、`"featureId"`），文案变化不再脆断；本变更内同步更新并跑全量 9 场景
- [`feature create` 从假成功变真报错，破坏"宽容"调用方] → 这正是诚实性要求；错误信息明确指出缺验收条件，调用方可自愈；CHANGELOG 记录破坏性文案变化
- [`findSimilarFeatures` 需要 projectId，v2 调用方可能没传] → 沿用 `getCurrentProject() || 'default-project'` 兜底，与 v1 `findSimilarFeatures` 处理一致
- [结果文件目录修正后，原"碰巧 cwd==projectPath"场景行为不变] → 该场景下路径等价，无回归；单测覆盖 cwd≠projectPath 场景

## Migration Plan

1. 先写失败单测（feature/tracking 假实现、结果文件路径、loadTestMethod）——RED
2. 实现接线与两处修复——GREEN
3. 更新 `integration-test.sh` 断言与入参，跑全量质量门
4. 回滚：单 commit revert，无存储迁移

## Open Questions

（无）
