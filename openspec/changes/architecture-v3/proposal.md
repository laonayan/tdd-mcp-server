# Proposal

## Why

当前实现是"服务类大杂烩"架构，本会话已两次为同类问题买单：

1. **双工具系统漂移**：v1 `tools.ts` 与 v2 `new-tools.ts` 各自维护 args→service 接线，v2 曾长期滞后 v1（固定字符串假实现、缺字段 schema），同类缺陷修两遍。
2. **spawn 网关分散**：3 个 service 各自 `promisify(exec)` + 各自组装 exec 选项，嵌套守卫靠人肉逐点接入——新 spawn 点漏接守卫就是下一次整机假死。
3. **测试与生产耦合**：解析/分析逻辑（jest/mocha/pytest 解析、相似度、提交模式分析、代码质量启发式）埋在依赖 fs/exec 的服务类里，单测只能重度 mock（本会话两次与 fs-mock 缠斗）；handler 单测真实写 `~/.tdd-flow`（测试污染用户主目录）。
4. **隐藏构造**：handler 内部 `new` 一切服务，依赖关系不可见、不可替换。

## What Changes（V3 分层架构）

1. **纯核心层 `src/core/`**：解析器（jest/mocha/pytest/text/xml/generic）、相似度引擎、提交模式分析、代码质量启发式抽为纯函数模块——零 IO、零 mock 即可测试。
2. **端口与适配器**：`src/core/ports.ts` 定义 `CommandExecutor` 与存储仓储接口；`src/adapters/` 提供 `GuardedCommandExecutor`（唯一 spawn 网关：执行 execution-guard 嵌套检测 + 内存上限 env + maxBuffer/timeout 策略，三处 exec 收敛为一处）与 `StorageService`（实现仓储接口，JSONL 格式不变）。
3. **组合根与依赖注入**：`src/composition-root.ts` 构建全部对象图；`server.ts` 只做装配；两个 handler 全依赖注入，不再内部构造服务。
4. **统一命令注册表 `src/commands/registry.ts`**：v2 三工具的每个子命令一条注册项（zod 校验 schema + MCP inputSchema + handler 引用），`new-tools.ts` 变为注册表的薄投影——单一事实来源，v1 保持现状（兼容层，直接调用同一批 service）。
5. **测试架构**：新增 `InMemoryStorage` 仓储 fake，handler 单测全部改用注入 fake（不再写用户主目录）；纯核心模块测试零 mock；新增架构守卫测试（`child_process` 仅允许出现在 adapters/execution-guard）。

### 不变（由规格与质量门锁定）

- MCP 协议行为、双工具系统开关、i18n、stdio 传输
- `~/.tdd-flow` JSONL 存储格式（向后兼容）
- 集成测试 9 场景与关键短语、全部既有单测语义
- 嵌套执行守卫与内存上限行为（收敛进唯一网关后由架构测试锁定）

## Capabilities

### Modified

- `spec/mcp-server/`: 内部架构约束成文（spawn 网关唯一性、纯核心层、注入式组装），外部行为不变。

## Impact

- **Code**: 新增 `src/core/`、`src/adapters/`、`src/commands/`、`src/composition-root.ts`；重排 `src/services/`（服务类瘦身为编排层，逻辑下沉 core）；`src/handlers/` 改注入；测试目录跟随调整。
- **兼容性**: 零外部行为变化；既有测试语义保留（部分测试改从纯模块导入，断言不变）。
- **回滚**: 按阶段分步提交，git revert 粒度清晰。

## 约束

- 全部质量门每阶段保持绿色（jest、ESLint 0 error、tsc、集成 9/9、openspec validate）
- 不新增运行时依赖（无 npm 可用环境也能构建）
- 中文文档、英文结构标题
