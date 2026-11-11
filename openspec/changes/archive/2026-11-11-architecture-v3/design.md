# Design

## Context

见 proposal（Why）。现有痛点均有本会话实证：v2 滞后 v1（修两遍）、spawn 守卫逐点接入、fs/exec 重度 mock、handler 真实写用户主目录。

## Goals / Non-Goals

**Goals:**
- 分层：core（纯）← services（编排）← handlers（MCP 投影）；依赖只能向内
- spawn 收敛唯一网关；存储走仓储接口；handler 全注入
- v2 子命令注册表化；每步提交后质量门全绿

**Non-Goals:**
- 不改 MCP 协议/传输/存储格式/外部文案与错误语义
- 不迁移 v1 十五工具到注册表（兼容层维持直调 service，行为已被 168 测试锁定）
- 不新增运行时依赖、不动 CI 矩阵

## Decisions

1. **渐进分层而非推倒重写**：services 保留类形态作为编排层，逻辑搬入 core 纯函数，服务方法变薄委托。既有测试大部分照旧（少部分从 `(svc as any).parseX` 改为直接 import 纯函数，断言不变）。相比全新目录树重写，风险低一个数量级且每步可验证。
2. **`CommandExecutor` 端口先行**：`execute(command, {cwd, timeoutMs, maxBuffer})`。`GuardedCommandExecutor` 实现里做：`isNestedExecution()` 拒绝 → `buildChildProcessEnv()` → 统一 maxBuffer 默认值。三处 execAsync 收敛后，"漏接守卫"在结构上不可能（架构测试锁 `child_process` import 白名单）。
3. **仓储接口贴合现有 StorageService 公共方法**（Feature/TestMethod/Session/FileAssociation 的读写），`StorageService` 直接 `implements`，JSONL 逻辑零改动；另提供 `InMemoryStorage` 实现同接口供 handler 单测注入。
4. **注册表条目三件套**：`{ zod schema, mcpInputSchema, handler }`。zod 校验失败 → 沿用现有 INVALID_PARAMS 本地化错误语义（校验层只做宽松 coerce，不改变既有错误文案）。MCP inputSchema 仍手写（避免新增 zod→json-schema 依赖），但与 handler 同文件同条目，漂移半径缩到一行。
5. **架构守卫测试**：简单 import 扫描测试（读 src/**/*.ts 源码，断言 `from 'child_process'` 只出现在白名单文件），不引入 dependency-cruiser 依赖。

## Risks / Trade-offs

- [大搬迁引入回归] → 每阶段独立提交 + 全量门；既有 168 测试作安全网；解析器搬迁采用"先建纯模块 + 服务委托"双轨，测试逐步切换
- [zod 校验改变错误语义] → schema 全字段 optional/宽松，校验仅拦"类型完全错误"的入参；既有错误路径（service 校验、参数缺失提示）保持原位
- [注册表与 i18n 描述耦合] → 注册表引用 i18nService 生成描述，与现行为一致
- [v1 不迁移造成长期双轨] → 明确 v1 为冻结兼容层；规格不阻止未来迁移

## Migration Plan

T1 core 纯函数层（含测试切换）→ T2 端口+网关+架构测试 → T3 仓储接口+InMemory fake+handler 测试去污染 → T4 组合根+注册表投影 v2 → T5 全量门+文档+归档。每步一提交。

## Open Questions

（无）
