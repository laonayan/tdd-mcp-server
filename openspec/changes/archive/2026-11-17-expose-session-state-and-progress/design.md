# Design

## 背景与约束

- `resources.ts` 与 `prompts.ts` 含 `import.meta`，jest CJS 无法转换——**新逻辑必须落在无 `import.meta` 的新模块**，`resources.ts` 只做委托（该文件保持零单测的现状，风险由纯模块测试覆盖）。
- SDK 1.x：`setRequestHandler` 的 handler 第二参数 `extra` 提供 `sendNotification`；进度通知方法 `notifications/progress`，params `{ progressToken, progress, total?, message? }`；令牌来自 `request.params._meta.progressToken`。
- `StorageService.listProjects()` 现为 private 且不在端口上；`InMemoryStorage` 也没有。

## 方案

### 1. 端口扩展（src/core/ports.ts）

`StorageRepository` 增 `listProjects(): Promise<string[]>`；`StorageService.listProjects` 从 private 改 public（实现不变）；`InMemoryStorage` 从内部数据推导项目 id 集合。

### 2. 会话状态资源纯模块（src/handlers/session-resources.ts，无 import.meta）

```ts
listStateResources(repo: StorageRepository): Promise<Resource[]>
readStateResource(repo: StorageRepository, uri: string): Promise<ReadResourceResult | null>  // null = 非状态 URI 家族
```

- URI 家族：`tdd://sessions`、`tdd://sessions/<id>`、`tdd://features`、`tdd://features/<id>`、`tdd://tracking`
- 数据汇聚：`repo.listProjects()` → 每项目 `listTDDSessions` / `listFeatures`；tracking 通过 feature 的 `listTestMethods` 汇总
- 单条读取：session 用 `loadTDDSession(id)`（现有按项目扫描的 getFeature 语义用于 feature）；不存在 → 抛错（未知 id 如实报错）
- 集合始终列出（即使空），item 资源仅在存在时列出

### 3. resources.ts 工厂化

`createResourcesHandler(storage: StorageRepository)` 返回与现签名兼容的 `{ listResources, readResource }`；既有五类文件资源逻辑不动；`readResource` 先尝试状态 URI 家族（null 则走原有分支）。`server.ts`：`createAppContainer()` 增 `resourcesHandler`（真实 StorageService），导出后绑定。保持模块级 `resourcesHandler` 导出（默认真实存储）以兼容现有引用与集成场景。

### 4. 进度通知（src/handlers/progress-reporter.ts，无 import.meta）

```ts
type SendNotification = (method: string, params: unknown) => Promise<void>;
function createProgressReporter(
  meta: { progressToken?: string | number } | undefined,
  send: SendNotification | undefined,
  total: number,
): { step(index: number, message: string): Promise<void> }
```

- 无 token 或无 send → no-op（静默语义）
- 有 token → `sendNotification('notifications/progress', { progressToken, progress: index + 1, total, message })`
- `new-tools.ts`：`callTool(request, extra?)`；`extra?.sendNotification` 存在且 token 存在时构造 reporter 传入 `executeFullTDDWorkflow`，在 `appendStepResult` 包裹处每步调用（步骤完成或失败后都推进——失败也是"该步已结束"）

### 5. 测试策略（RED 先行）

- `session-resources.test.ts`：InMemoryStorage fake 预置会话/feature/方法 → 列表与读取断言；空存储 → 空数组；未知 id → 抛错
- `progress-reporter.test.ts`：无 token 零调用；有 token 按步调用且参数正确
- 集成测试：新增场景 10（list 含 tdd://sessions）与场景 11（progressToken + 断言 stderr/stdout 收到 notifications/progress…stdio 集成下通知与响应在同一 stdout 流，直接 grep JSON 行）

## 不变量

- 既有五类资源 URI、行为、错误文案不变
- 无 `_meta.progressToken` 的调用路径行为完全不变
- `~/.tdd-flow` 存储格式零变更
- `--max-warnings 0` lint 锁保持零 warning
