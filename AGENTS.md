# AGENTS.md — AI 编码代理工作指引

本仓库是 `tdd-mcp-server`：为 AI 编程助手提供 TDD 工作流支持的 MCP 服务器（TypeScript, ESM, MCP SDK 1.x）。任何 AI 代理在此仓库工作前请先读本文件。

## 开发流程（OpenSpec）

本仓库使用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 管理变更，目录在 `openspec/`：

```bash
openspec list                          # 查看进行中的变更
openspec validate --all                # 机器校验 specs 与 changes（质量门之一）
```

**流程**：`/opsx:explore`（探索）→ `/opsx:propose`（提案：proposal/specs/design/tasks 四件套）→ `/opsx:apply`（逐任务实施，按功能分步提交）→ `/opsx:archive`（规格合入 `openspec/specs/`，变更移入 `openspec/changes/archive/`）。

- 任何非平凡改动都必须走 openspec 变更流程；规格用中文书写，结构标题与 SHALL 关键词保持英文
- 归档时把 delta 合入主规格（`openspec/specs/mcp-server/spec.md`），保持 Requirement 必须至少有一个 `#### Scenario:`

## 质量门（每次提交前全部通过）

```bash
npm test                    # 单元测试（当前 168 个）
npm run lint                # ESLint 9（0 error；存量 warning 为已记录技术债）
npm run build               # tsc，零错误
./integration-test.sh       # 9 个 stdio 集成场景（需本机 npm 与 node）
openspec validate --all     # 规格校验
```

CI（GitHub Actions）在 Node 20/24 上执行 build + test + lint。

## 运行安全：内存限制（强制）

**任何需要运行的操作，必须在启动时设置内存限制**——禁止无上限占用内存导致整台设备假死。本仓库曾因递归 spawn 测试进程发生过整机冻结事故（每层按 worker 数派生进程，进程树指数膨胀），见 `src/services/execution-guard.ts` 背景注释与 `src/services/__tests__/nested-execution-guard.test.ts` 回归用例。

- `npm test` 已默认限内存（`node --max-old-space-size=2048 ... --maxWorkers=2 --workerIdleMemoryLimit=512MB`），直接使用即可
- 直接调用 node 工具链时必须显式带上限，例如：
  - `node --max-old-space-size=2048 node_modules/jest/bin/jest.js --maxWorkers=2 --workerIdleMemoryLimit=512MB`
  - `node --max-old-space-size=1536 node_modules/typescript/bin/tsc`
  - `node --max-old-space-size=1536 node_modules/eslint/bin/eslint.js src`
- 运行 `integration-test.sh` 或任何会派生子进程的脚本前，先 `export NODE_OPTIONS="--max-old-space-size=1536"`，让整棵子进程树的每个 node 进程都被封顶；宁可单进程 OOM 快速失败，也不拖垮整机
- 服务代码派生测试/覆盖率子进程必须统一走 `src/services/execution-guard.ts`：注入 `TDD_MCP_NESTED_RUN` 嵌套标记 + `NODE_OPTIONS=--max-old-space-size=<MB>`（默认 1024，可用 `TDD_MCP_CHILD_MEMORY_LIMIT_MB` 覆盖），并在 spawn 前用 `isNestedExecution()` 拒绝嵌套执行——**新增任何 spawn 点都必须接入该守卫**
- 后台运行测试/构建时同样适用上述规则；用管道接 `tail` 会掩盖真实退出码，判断成败以 `$?` 或 `PIPESTATUS` 为准

## 架构速览

- **入口**：`src/server.ts` → `dist/server.js`（唯一入口，bin: `tdd-mcp-server`）
- **双工具系统**：`USE_NEW_TOOLS=true` → 3 主工具 + 子命令（`src/handlers/new-tools.ts`）；`false` → v1 15 工具（`src/handlers/tools.ts`）。两套共用 `src/services/` 核心逻辑
- **v2 工具必须真实调用 service 并返回真实结果**（Evidence over Claims，见 `skills/tdd-workflow/SKILL.md`），禁止返回与输入无关的固定字符串
- **i18n**：`src/i18n.ts`，默认中文，`DEFAULT_LOCALE` 切换
- **存储**：`~/.tdd-flow/projects/<id>/*.jsonl`，格式变更需向后兼容
- **技能资产**：`skills/<name>/SKILL.md`（YAML frontmatter），prompts 优先从此加载，回退 `templates/`
- **ESM**：包声明 `"type": "module"`；源码中禁止裸用 `__dirname`，用 `import.meta.url` 派生（注意：含 `import.meta` 的文件无法被 jest CJS 转换测试，纯逻辑抽到无 ESM 语法的模块）

## 提交规范

- 按功能分步提交，一次提交一件事
- 格式：`<类型>(<范围>): <摘要>`，openspec 变更任务加 `T<n>(<area>):` 前缀与 `Change: <change-id>` 尾注
- 类型：feat / fix / refactor / test / docs / chore / build

## 测试纪律（RED→GREEN→REFACTOR）

新功能先写失败测试再实现；修 bug 先写复现测试。详细纪律见 `skills/tdd-workflow/SKILL.md`。

## 环境要求

- Node ≥ 20；npm（registry 走 npmmirror，见 `.npmrc`）
- SDK 依赖：`@modelcontextprotocol/sdk ^1.32`
