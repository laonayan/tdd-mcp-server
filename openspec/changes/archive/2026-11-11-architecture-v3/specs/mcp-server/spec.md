# mcp-server spec delta — architecture-v3

## ADDED Requirements

### Requirement: 进程执行网关唯一性

所有对子进程的 spawn SHALL 收敛到唯一的受守卫执行器（`GuardedCommandExecutor`），该执行器 SHALL 强制执行嵌套检测（`execution-guard`）与子进程内存上限；业务代码 SHALL NOT 直接调用 `child_process`。

#### Scenario: 架构守卫测试通过

- **WHEN** 运行架构守卫测试（扫描源码 import）
- **THEN** `child_process` 仅出现在 `src/adapters/` 与 `src/services/execution-guard.ts`，业务层零直接 spawn

#### Scenario: 网关统一注入守卫与限额

- **WHEN** 任何 service 通过网关执行命令
- **THEN** 子进程自动携带 `TDD_MCP_NESTED_RUN` 标记与 `NODE_OPTIONS=--max-old-space-size` 上限，嵌套环境直接拒绝执行

### Requirement: 纯核心层

解析与分析逻辑（测试结果解析、相似度计算、提交模式分析、代码质量启发式）SHALL 位于零 IO 的纯函数模块（`src/core/`），services SHALL 作为编排层调用纯核心，SHALL NOT 在依赖 fs/exec 的类内内联实现这些逻辑。

#### Scenario: 纯模块零 mock 测试

- **WHEN** 为 jest/mocha/pytest 解析器与相似度引擎编写单测
- **THEN** 直接传入数据断言输出，无需 mock `fs`/`child_process`/`util`

### Requirement: 依赖注入组装

服务器对象图 SHALL 由组合根（composition root）统一构建并注入 handlers；handlers SHALL NOT 在内部构造 service 实例。

#### Scenario: handler 全依赖注入

- **WHEN** 实例化任一 handler
- **THEN** 其全部 service 依赖来自构造注入（含测试用 fake），单测不产生对 `~/.tdd-flow` 的真实写入

### Requirement: 命令注册表单一事实来源

v2 工具的每个子命令 SHALL 在统一注册表中声明（输入 zod 校验 schema、MCP inputSchema、handler），工具列表与调用分发 SHALL 从注册表生成，SHALL NOT 在 handler 内散落重复的参数接线。

#### Scenario: 注册表驱动工具定义

- **WHEN** `USE_NEW_TOOLS=true` 调用 `tools/list`
- **THEN** 3 个工具及其子命令 schema 由注册表投影生成，与既有外部契约（工具名、参数、i18n 描述）一致

#### Scenario: 参数经 zod 校验

- **WHEN** 调用 `tdd`/`feature`/`tracking` 任一子命令
- **THEN** 参数先经注册表 zod schema 校验，非法参数返回既有错误语义
