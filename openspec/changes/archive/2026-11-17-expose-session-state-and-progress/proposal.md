# Proposal

## Why

服务器的核心数据（`~/.tdd-flow` 中的 TDD 会话、feature、测试方法跟踪）没有暴露为 MCP 资源——`resources/list` 只扫项目文件，客户端无法订阅式浏览服务器自身状态；同时全代码库零 `sendNotification`，完整 TDD 工作流这类长任务对客户端是黑盒等待，SDK 1.x 的 `notifications/progress` 通道完全未用。

## What Changes

- `StorageRepository` 端口新增 `listProjects(): Promise<string[]>`（StorageService 公开化 + InMemoryStorage 实现补齐）
- 新模块 `src/handlers/session-resources.ts`（无 `import.meta`，jest 可测）：从仓储构建 `tdd://sessions`、`tdd://sessions/<id>`、`tdd://features`、`tdd://features/<id>`、`tdd://tracking` 资源（数据来自真实存储，空集合如实返回空数组）
- `resources.ts` 改为工厂 `createResourcesHandler(storage)`，新 URI 家族委托给上述纯模块；`server.ts` 经组合根注入真实 StorageService
- 新模块 `src/handlers/progress-reporter.ts`：客户端在 `_meta.progressToken` 提供令牌时，完整 TDD 工作流五个步骤各发一条 `notifications/progress`（含 progress/total/message）；未提供令牌则零通知
- `new-tools.callTool` 接收 SDK 的 `extra`，把 `sendNotification` 传入工作流

## Capabilities

### Modified Capabilities

- `mcp-server`: 新增两条 Requirement——"会话状态资源暴露"（资源列表/读取反映真实存储）与"长任务进度通知"（progressToken 存在时按步发通知、不存在时静默）。

## Impact

- **Code**: `src/core/ports.ts`、`src/adapters/in-memory-storage.ts`、`src/services/storage.service.ts`（listProjects 公开化）、`src/handlers/resources.ts`（工厂化）、新 `session-resources.ts` / `progress-reporter.ts`、`src/handlers/new-tools.ts`、`src/composition-root.ts`、`src/server.ts`
- **兼容性**: 既有五类 `tdd://` 资源 URI 与行为不变；新增 URI 家族与通知为纯增量；无 progressToken 的客户端行为完全不变
- **测试**: RED 先行——session-resources 与 progress-reporter 用 fake 仓储/假 sendNotification 单测；集成测试补 2 个场景（资源列出会话、progressToken 触发通知）
