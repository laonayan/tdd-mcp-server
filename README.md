# TDD MCP 服务器

为 AI 编程助手提供测试驱动开发（TDD）工作流支持的 MCP 服务器：测试生成、实现生成、测试执行、覆盖率分析、重构建议、TDD 循环校验，以及功能管理与测试跟踪。

- TypeScript + ESM，MCP SDK 1.x，stdio 传输，Node ≥ 20
- V3 分层架构：`core`（纯函数）← `services`（编排）← `handlers`（注册表投影），组合根统一装配
- 子进程执行收敛唯一受守卫网关（嵌套拒绝 + 内存上限），架构测试锁定
- 双工具系统：v2 三工具 + 子命令（推荐）／ v1 十五工具（向后兼容）
- 中英文界面，默认中文；工具真实调用核心 service 并返回真实结果

## 核心工具（v2，共 3 个）

| 工具 | 默认行为 | 子命令 |
|---|---|---|
| `tdd` | 完整 TDD 流程（生成→实现→测试→覆盖率→重构建议） | `generate` / `implement` / `test` / `coverage` / `refactor` / `validate` |
| `feature` | 创建功能（需 `acceptanceCriteria`，返回含 `id`/`status` 的持久化对象） | `create` / `update` / `link` / `find` |
| `tracking` | 注册测试方法（真实落盘，返回 `test-*` id 与 `pending` 状态） | `register` / `result` / `status` |

## 快速开始

```bash
git clone https://github.com/laonayan/tdd-mcp-server.git
cd tdd-mcp-server
npm install
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | USE_NEW_TOOLS=true node dist/server.js
```

## MCP 客户端配置

Claude Code：

```bash
claude mcp add tdd-server-v2 node "/绝对路径/tdd-mcp-server/dist/server.js" \
  -e USE_NEW_TOOLS=true -e DEFAULT_LOCALE=zh -e PROJECT_PATH="."
```

通用 JSON（Claude Desktop / Cursor 等，按客户端放入对应配置文件）：

```json
{
  "mcpServers": {
    "tdd-server-v2": {
      "command": "node",
      "args": ["/绝对路径/tdd-mcp-server/dist/server.js"],
      "env": {
        "USE_NEW_TOOLS": "true",
        "DEFAULT_LOCALE": "zh",
        "PROJECT_PATH": "."
      }
    }
  }
}
```

配置文件位置：Claude Desktop `~/Library/Application Support/Claude/claude_desktop_config.json`；Cursor `.cursor/mcp.json`。

## 使用示例

```javascript
// 一键完整 TDD 流程（推荐）
tdd({ requirements: "实现用户登录功能，包括邮箱验证与 JWT 令牌生成" })

// 分步：生成测试 → 生成实现 → 运行测试
tdd({ command: "generate", requirements: "用户登录", language: "typescript", framework: "jest" })
tdd({ command: "implement", testCode: "describe('UserLogin', ...)", language: "typescript" })
tdd({ command: "test", projectPath: "/你的项目", framework: "jest" })

// 功能管理（真实持久化）
feature({ name: "密码重置", description: "邮件重置密码", acceptanceCriteria: ["重置链接1小时过期"], priority: "high" })
feature({ command: "find", query: "用户认证 登录" })

// 测试跟踪（真实落盘并回读）
tracking({ featureId: "feature-123", name: "test_user_login", filePath: "./src/__tests__/auth.test.ts", framework: "jest" })
tracking({ command: "result", methodId: "test-456", result: { passed: true, duration: 150 } })
```

详细用法见 [examples/v2-usage-guide.md](examples/v2-usage-guide.md)。

## 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| `USE_NEW_TOOLS` | `true` 启用 v2 三工具系统 | `false` |
| `DEFAULT_LOCALE` | 界面语言（zh/en） | `zh` |
| `PROJECT_PATH` | 默认项目路径 | `process.cwd()` |
| `TDD_MCP_NESTED_RUN` | 嵌套执行标记（派生子进程树自动注入，树内拒绝再 spawn 测试进程） | 未设置 |
| `TDD_MCP_CHILD_MEMORY_LIMIT_MB` | 派生子进程 node 堆上限（MB） | `1024` |

### 运行安全：内存限制

本服务派生的所有测试/覆盖率子进程均带硬性堆上限（`NODE_OPTIONS=--max-old-space-size`），并检测嵌套测试环境（jest/vitest worker 或本服务子进程树）后拒绝递归 spawn——宁可单进程 OOM 快速失败，也不拖垮整机。

## 开发

```bash
npm test           # 单元测试（默认限内存：2GB 堆 + 2 worker + 512MB 空闲回收；当前 168 个）
npm run lint       # ESLint 9（0 error）
npm run build      # tsc 零错误
./integration-test.sh   # 9 个 stdio 集成场景（先 export NODE_OPTIONS="--max-old-space-size=1536"）
openspec validate --all # 规格校验
```

**运行任何命令必须在启动时设置内存限制**（禁止无上限运行导致设备假死）。变更流程走 [OpenSpec](openspec/)，TDD 纪律与提交规范见 [AGENTS.md](AGENTS.md)。

## 项目结构

```
tdd-mcp-server/
├── src/
│   ├── server.ts            # 唯一入口（只做协议绑定）
│   ├── composition-root.ts  # 组合根：统一构建对象图
│   ├── commands/registry.ts # v2 命令注册表（单一事实来源：zod + inputSchema + handler）
│   ├── core/                # 纯核心层：parsers / similarity / analysis / ports（零 IO）
│   ├── adapters/            # 适配器：受守卫执行网关 / JSONL 存储 / 内存 fake
│   ├── handlers/            # MCP 投影：tools.ts（v1）/ new-tools.ts（v2）/ resources / prompts
│   ├── services/            # 编排层：生成、执行、覆盖率、重构、校验、存储
│   ├── i18n.ts              # 国际化
│   └── types/               # 类型定义
├── skills/                  # 技能资产（SKILL.md，prompts 数据源）
├── openspec/                # 变更管理（specs + changes）
└── integration-test.sh      # 集成测试
```

## 贡献与支持

- 贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，变更记录见 [CHANGELOG.md](CHANGELOG.md)
- License：MIT（见 [LICENSE](LICENSE)）
