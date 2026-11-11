# TDD MCP 服务器 v2.1 | TDD MCP Server v2.1

> 🌐 本文档为中英双文，默认中文（英文紧随其后）。/ This document is bilingual: Chinese first (default), English follows.

一个完整的模型上下文协议（MCP）服务器，为AI编程助手提供**简化且强大**的测试驱动开发（TDD）工作流支持。

A complete Model Context Protocol (MCP) server that provides a **simplified yet powerful** test-driven development (TDD) workflow for AI coding assistants.

**基于 MCP TypeScript SDK 1.x 构建** / **Built on the MCP TypeScript SDK 1.x**

**支持的AI工具 / Supported AI tools:** Claude Desktop、Claude Code、Cursor、Codeium 以及任何兼容MCP的AI助手 / Claude Desktop, Claude Code, Cursor, Codeium, and any MCP-compatible AI assistant

## ✨ v2.1 更新要点 | v2.1 Highlights

### 🔧 MCP SDK 1.x 升级（核心）| MCP SDK 1.x upgrade (core)
- **之前 Before**: `@modelcontextprotocol/sdk` 0.5.0（2024-11 早期版本 / early Nov-2024 release）
- **现在 Now**: **1.32.x**（2025-06 后的 1.x 正式线 / the official 1.x line released after 2025-06）
- **收益 Benefits**: 与新版 MCP 客户端/协议实现互通；低阶 `Server` API 行为不变，客户端零改动 / interoperates with newer MCP clients and protocol implementations; the low-level `Server` API behavior is unchanged, so existing clients need zero changes

### 📦 工程化现代化 | Engineering modernization
- **ESM**: 包声明 `"type": "module"`，产物与运行时语义一致 / the package declares `"type": "module"`, so artifacts match runtime semantics
- **Node**: `engines >= 20`（Node 18 已 EOL / Node 18 is EOL）
- **工具链 Toolchain**: TypeScript 5.9 / ESLint 9 扁平配置（flat config）/ typescript-eslint 8
- **质量门 Quality gates**: 134 个单测 + 9 个集成场景 + 0 lint error / 134 unit tests + 9 integration scenarios + 0 lint errors

### 🚀 v2.0 既有特性（保留）| v2.0 features (retained)

### 🚀 简化的工具架构 | Simplified tool architecture
- **之前 Before**: 15个独立工具，使用复杂 / 15 separate tools, complex to use
- **现在 Now**: **3个主工具 + 子命令**，简洁高效 / **3 main tools + subcommands**, simple and efficient
- **向后兼容 Backward compatible**: 支持旧版15工具系统 / the legacy 15-tool system is still supported

### 🌐 完整国际化支持 | Full internationalization
- **中文优先 Chinese-first**: 默认中文界面，符合国内用户习惯 / Chinese UI by default
- **双语支持 Bilingual**: 中英文动态切换 / dynamic switching between Chinese and English
- **本地化 Localized**: 所有工具描述、参数说明、错误信息都本地化 / all tool descriptions, parameter docs, and error messages are localized

### 🔄 Session 自动管理 | Automatic session management
- **智能化 Smart**: 无需手动创建TDD会话 / no manual TDD session creation needed
- **自动跟踪 Auto-tracking**: RED→GREEN→REFACTOR 循环自动管理 / the RED→GREEN→REFACTOR loop is managed automatically
- **状态感知 Stage-aware**: 智能识别TDD开发阶段 / intelligently detects the current TDD stage

## 🛠️ 核心工具（3个主工具）| Core tools (3 main tools)

### 1. `tdd` - TDD核心工作流工具 | core TDD workflow tool
测试驱动开发的一站式解决方案 / A one-stop solution for test-driven development:
- **默认行为 Default**: 执行完整TDD流程（推荐 / runs the full TDD flow, recommended)
- **子命令 Subcommands**:
  - `generate` - 生成测试用例 / generate test cases
  - `implement` - 根据测试生成实现代码 / generate implementation code from tests
  - `test` - 运行测试 / run tests
  - `coverage` - 分析代码覆盖率 / analyze code coverage
  - `refactor` - 提供重构建议 / provide refactoring suggestions
  - `validate` - 验证TDD循环 / validate the TDD cycle

### 2. `feature` - 功能管理工具 | feature management tool
项目功能和需求管理 / Manage project features and requirements（真实持久化，返回含 `id`/`status` 的对象 / real persistence, returns the stored object with `id`/`status`）:
- **默认行为 Default**: 创建新功能 / create a new feature（需 `acceptanceCriteria`，至少一条 / requires at least one acceptance criterion）
- **子命令 Subcommands**:
  - `create` - 创建新功能（默认 / create a feature, default）
  - `update` - 更新功能状态 / update feature status
  - `link` - 关联文件到功能 / link files to a feature
  - `find` - 查找相似功能（返回相似度与理由 / returns similarity scores and reasons）

### 3. `tracking` - 测试跟踪工具 | test tracking tool
测试方法执行跟踪 / Track test-method execution（真实落盘并回读 / real persistence with read-back）:
- **默认行为 Default**: 注册测试方法 / register a test method
- **子命令 Subcommands**:
  - `register` - 注册测试方法（默认 / register a test method, default）
  - `result` - 更新测试执行结果（`methodId` + `result.passed` / update execution results）
  - `status` - 更新测试方法状态（`methodId` + `status` / update test-method status）

## 🌍 语言和框架支持 | Language & framework support

| 编程语言 Language | 测试框架 Framework | 状态 Status |
|----------|---------|------|
| **TypeScript/JavaScript** | Jest, Mocha, Vitest | ✅ 完全支持 Fully supported |
| **Python** | pytest, unittest | ✅ 完全支持 Fully supported |  
| **Java** | JUnit 5 | ✅ 完全支持 Fully supported |
| **C#** | xUnit, NUnit | ✅ 完全支持 Fully supported |
| **Go** | Go Test | ✅ 完全支持 Fully supported |
| **Rust** | Cargo test | ✅ 完全支持 Fully supported |
| **PHP** | PHPUnit | ✅ 完全支持 Fully supported |

## 🚀 快速开始 | Quick Start

### 前置要求 | Prerequisites
- Node.js 20.0.0+（Node 18 已于 2025-04 停止维护 / Node 18 reached end of maintenance in Apr 2025）
- npm 或 yarn / npm or yarn

### 安装步骤 | Installation

```bash
# 克隆仓库 / Clone the repository
git clone https://github.com/laonayan/tdd-mcp-server.git
cd tdd-mcp-server

# 安装依赖 / Install dependencies
npm install

# 构建项目 / Build the project
npm run build

# 测试安装 / Verify the installation
npm test
```

## 🔧 配置指南 | Configuration Guide

### Claude Code（推荐 / recommended）

#### 快速配置 - v2.0新工具系统（推荐）| Quick setup — v2.0 tool system (recommended)
```bash
claude mcp add tdd-server-v2 node "/绝对路径/tdd-mcp-server/dist/server.js" \
  -e USE_NEW_TOOLS=true \
  -e DEFAULT_LOCALE=zh \
  -e PROJECT_PATH="."
```

#### 传统工具系统配置 | Legacy tool system
```bash
claude mcp add tdd-server-legacy node "/绝对路径/tdd-mcp-server/dist/server.js" \
  -e USE_NEW_TOOLS=false \
  -e DEFAULT_LOCALE=zh \
  -e PROJECT_PATH="."
```

#### 配置示例 | Configuration examples

**中文界面配置（推荐）| Chinese UI (default, recommended)**:
```bash
claude mcp add tdd-server-v2 node "/Users/username/tdd-mcp-server/dist/server.js" \
  -e USE_NEW_TOOLS=true \
  -e DEFAULT_LOCALE=zh \
  -e PROJECT_PATH="/Users/username/my-project"
```

**英文界面配置 | English UI**:
```bash
claude mcp add tdd-server-v2 node "/Users/username/tdd-mcp-server/dist/server.js" \
  -e USE_NEW_TOOLS=true \
  -e DEFAULT_LOCALE=en \
  -e PROJECT_PATH="/Users/username/my-project"
```

#### 手动配置文件方式 | Manual config file

在项目根目录创建 `.claude.json` / Create `.claude.json` in the project root:

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

### 其他AI工具配置 | Other AI tools

#### Claude Desktop
编辑配置文件 / Edit the config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tdd-server-v2": {
      "command": "node",
      "args": ["/绝对路径/tdd-mcp-server/dist/server.js"],
      "env": {
        "USE_NEW_TOOLS": "true",
        "DEFAULT_LOCALE": "zh",
        "PROJECT_PATH": "/你的项目路径"
      }
    }
  }
}
```

#### Cursor IDE
在项目根目录创建 `.cursor/mcp.json` / Create `.cursor/mcp.json` in the project root:

```json
{
  "servers": {
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

## 🎯 使用教程 | Usage Tutorial

### 基础用法 - v2.0简化命令 | Basics — simplified v2.0 commands

#### 1. 一键完整TDD流程（最推荐）| One-shot full TDD flow (most recommended)
```javascript
// 中文环境 - 自动执行完整TDD流程 / Chinese UI — runs the full TDD flow automatically
tdd({
  requirements: "实现用户登录功能，包括邮箱验证、密码加密、JWT令牌生成"
})
```

**执行结果 / Result**:
```
完整TDD流程执行完成:
✅ 生成测试用例
✅ 生成最小实现
✅ 运行测试
✅ 分析覆盖率
✅ 提供重构建议
```

#### 2. 分步TDD流程 | Step-by-step TDD flow

**RED阶段 - 生成测试用例 | RED — generate test cases**:
```javascript
tdd({
  command: "generate",
  requirements: "用户登录功能",
  language: "typescript",
  framework: "jest",
  testType: "unit"
})
```

**GREEN阶段 - 生成实现代码 | GREEN — generate implementation**:
```javascript
tdd({
  command: "implement",
  testCode: `
    describe('UserLogin', () => {
      test('should authenticate user with valid credentials', () => {
        const loginService = new LoginService();
        const result = loginService.authenticate('user@example.com', 'password123');
        expect(result.success).toBe(true);
        expect(result.token).toBeDefined();
      });
    });
  `,
  language: "typescript"
})
```

**REFACTOR阶段 - 代码重构 | REFACTOR — refactor the code**:
```javascript
tdd({
  command: "refactor",
  sourceCode: "..."
})
```

#### 3. 功能管理 | Feature management

**创建新功能 / Create a new feature**:
```javascript
feature({
  name: "密码重置功能",
  description: "允许用户通过邮件重置密码",
  acceptanceCriteria: [
    "用户可以请求密码重置",
    "系统发送重置链接到邮箱", 
    "重置链接1小时后过期",
    "用户可以设置新密码"
  ],
  priority: "high",
  estimatedHours: 8
})
```

**查找相似功能 / Find similar features**:
```javascript
feature({
  command: "find",
  query: "用户认证 登录 密码"
})
```

#### 4. 测试跟踪 | Test tracking

**注册测试方法 / Register a test method**:
```javascript
tracking({
  featureId: "user-auth-feature",
  name: "test_user_login_success",
  filePath: "./src/__tests__/auth.test.ts",
  framework: "jest",
  testType: "unit"
})
```

### 完整使用场景示例 | End-to-end scenario examples

#### 场景1：新功能完整TDD开发 | Scenario 1: full TDD development for a new feature

```
用户: 我想用TDD方式实现一个用户认证系统，包括注册、登录和JWT令牌生成

AI助手: 我来帮你用TDD方式实现用户认证系统。使用v2.0的简化工具：

1. 首先创建功能：
feature({
  name: "用户认证系统",
  description: "实现用户注册、登录和JWT令牌管理",
  acceptanceCriteria: [
    "用户可以使用邮箱和密码注册",
    "用户可以使用有效凭据登录", 
    "成功登录后返回JWT令牌",
    "无效凭据时返回错误信息"
  ]
})

2. 执行完整TDD流程：
tdd({
  requirements: "用户认证系统：用户注册、登录验证、JWT令牌生成和验证"
})

这将自动完成：
✅ 生成全面的测试用例
✅ 生成最小化实现代码
✅ 运行测试并验证
✅ 分析代码覆盖率
✅ 提供重构建议
```

<details>
<summary>English</summary>

```
User: I want to build a user authentication system with TDD — registration, login, and JWT token generation.

AI assistant: I'll help you build it with TDD using the simplified v2.0 tools:

1. First, create the feature:
feature({
  name: "User authentication system",
  description: "User registration, login, and JWT token management",
  acceptanceCriteria: [
    "Users can register with email and password",
    "Users can log in with valid credentials",
    "A JWT token is returned on successful login",
    "An error is returned for invalid credentials"
  ]
})

2. Run the full TDD flow:
tdd({
  requirements: "User authentication system: registration, login verification, JWT token generation and validation"
})

This automatically:
✅ Generates comprehensive test cases
✅ Generates a minimal implementation
✅ Runs and verifies the tests
✅ Analyzes code coverage
✅ Provides refactoring suggestions
```

</details>

#### 场景2：现有项目功能扩展 | Scenario 2: extending an existing project

```
用户: 我的项目已经有用户管理功能，现在要添加密码重置功能

AI助手: 让我帮你扩展现有功能：

1. 先查找相似功能：
feature({
  command: "find", 
  query: "密码重置 忘记密码 邮件验证"
})

2. 基于现有架构添加新功能：
feature({
  name: "密码重置功能",
  description: "扩展用户管理，支持安全的密码重置流程"
})

3. 针对新功能执行TDD：
tdd({
  requirements: "密码重置功能：邮件验证、临时令牌、密码更新",
  language: "typescript",
  framework: "jest"
})
```

<details>
<summary>English</summary>

```
User: My project already has user management; I now want to add password reset.

AI assistant: Let me help you extend the existing feature set:

1. First find similar features:
feature({ command: "find", query: "password reset forgot password email verification" })

2. Add the new feature on top of the existing architecture:
feature({
  name: "Password reset",
  description: "Extend user management with a secure password-reset flow"
})

3. Run TDD for the new feature:
tdd({
  requirements: "Password reset: email verification, temporary token, password update",
  language: "typescript",
  framework: "jest"
})
```

</details>

#### 场景3：代码质量提升 | Scenario 3: improving code quality

```
用户: 我想改进现有代码的测试覆盖率和代码质量

AI助手: 我来帮你分析和改进代码质量：

1. 分析现有测试覆盖率：
tdd({
  command: "coverage",
  projectPath: "./"
})

2. 针对覆盖率低的模块生成测试：
tdd({
  command: "generate",
  requirements: "为现有PaymentService模块生成全面的单元测试",
  language: "typescript",
  testType: "unit"
})

3. 重构代码改进质量：
tdd({
  command: "refactor", 
  sourceCode: "...现有代码..."
})
```

<details>
<summary>English</summary>

```
User: I want to improve test coverage and code quality of the existing code.

AI assistant: Let me analyze and improve the quality:

1. Analyze current coverage:
tdd({ command: "coverage", projectPath: "./" })

2. Generate tests for low-coverage modules:
tdd({
  command: "generate",
  requirements: "Generate comprehensive unit tests for the existing PaymentService module",
  language: "typescript",
  testType: "unit"
})

3. Refactor to improve quality:
tdd({ command: "refactor", sourceCode: "...existing code..." })
```

</details>

### 高级用法 | Advanced usage

#### 自定义TDD工作流 | Custom TDD workflow
```javascript
// 仅生成测试，不执行完整流程 / Generate tests only, without the full flow
tdd({
  command: "generate",
  requirements: "支付处理功能",
  language: "python",
  framework: "pytest", 
  testType: "integration"
})

// 仅运行测试和覆盖率分析 / Run tests and coverage analysis only
tdd({
  command: "coverage",
  projectPath: "./"
})

// 验证TDD最佳实践 / Validate TDD best practices
tdd({
  command: "validate"
})
```

#### 功能生命周期管理 | Feature lifecycle management
```javascript
// 更新功能状态 / Update feature status
feature({
  command: "update",
  featureId: "feature-123",
  status: "in_progress",
  progress: {
    testsWritten: 15,
    testsPass: 12,
    coveragePercentage: 85
  }
})

// 关联文件到功能 / Link files to a feature
feature({
  command: "link", 
  featureId: "feature-123",
  filePaths: [
    "./src/payment.service.ts",
    "./src/__tests__/payment.test.ts"
  ],
  fileType: "implementation"
})
```

#### 测试方法详细跟踪 | Detailed test-method tracking
```javascript
// 更新测试执行结果 / Update test execution results
tracking({
  command: "result",
  methodId: "test-456",
  result: {
    duration: 150,
    passed: true,
    coverage: 92
  }
})
```

## 🔧 环境配置 | Environment

### 环境变量 | Environment variables

| 变量名 Variable | 描述 Description | 默认值 Default |
|-------|------|-------|
| `USE_NEW_TOOLS` | 启用v2.0新工具系统 / enable the v2.0 tool system | `false` |
| `DEFAULT_LOCALE` | 默认语言(zh/en) / default locale | `zh` |
| `PROJECT_PATH` | 项目路径 / project path | `process.cwd()` |
| `TDD_MCP_NESTED_RUN` | 嵌套执行标记（由本服务派生的子进程树自动注入，树内拒绝再 spawn 测试进程 / nested-run marker injected into spawned subtrees; further test spawning is refused inside） | 未设置 / unset |
| `TDD_MCP_CHILD_MEMORY_LIMIT_MB` | 派生子进程 node 堆上限（MB）/ heap cap (MB) for spawned child node processes | `1024` |

### 运行安全：内存限制 | Run safety: memory limits

本服务派生的所有测试/覆盖率子进程都会被硬性封顶内存（`NODE_OPTIONS=--max-old-space-size`，默认 1024MB，可用 `TDD_MCP_CHILD_MEMORY_LIMIT_MB` 覆盖），并检测嵌套执行环境（jest/vitest worker 或本服务子进程树）后拒绝递归 spawn——宁可单进程 OOM 快速失败，也不拖垮整机。

Every test/coverage child process spawned by this server carries a hard memory cap (`NODE_OPTIONS=--max-old-space-size`, default 1024 MB, overridable via `TDD_MCP_CHILD_MEMORY_LIMIT_MB`) and refuses to spawn further test processes when running inside a nested test environment (jest/vitest worker or our own spawned subtree) — fail fast with OOM rather than taking the machine down.

### 开发命令 | Development commands

```bash
npm run build          # 构建项目 / build the project
npm run dev           # 开发模式 / development mode
npm run start         # 生产模式 / production mode
npm run test          # 运行测试（默认限内存：2GB 堆 + 2 worker + 512MB 空闲回收）/ run tests (memory-bounded by default)
npm run test:esm      # 运行测试（原生 ESM 模式，实验性）/ run tests (native ESM mode, experimental)
npm run test:watch    # 监视模式测试 / watch-mode tests
npm run lint          # ESLint 9 扁平配置 / ESLint 9 flat config
npm run clean         # 清理构建文件 / clean build artifacts
```

### 测试和验证 | Test and verify

```bash
# 运行集成测试（先 export NODE_OPTIONS="--max-old-space-size=1536" 封顶子进程树）
# Run integration tests (export NODE_OPTIONS first to cap the child-process tree)
./integration-test.sh

# 运行单元测试（脚本已内置内存上限与 worker 限制）
# Run unit tests (the script already caps heap and workers)
npm test

# 检查构建 / Check the build
npm run build
```

## 📊 系统架构对比 | Architecture comparison

### v2.0新架构（推荐）| v2.0 architecture (recommended)
```
3个主工具 + 子命令系统 / 3 main tools + subcommand system
├── tdd (测试驱动开发 / TDD)
│   ├── 默认 Default: 完整TDD流程 / full TDD flow
│   ├── generate: 生成测试 / generate tests
│   ├── implement: 生成实现 / generate implementation
│   ├── test: 运行测试 / run tests
│   ├── coverage: 覆盖率分析 / coverage analysis
│   ├── refactor: 重构建议 / refactoring suggestions
│   └── validate: 验证TDD循环 / validate the TDD cycle
├── feature (功能管理 / feature management)
│   ├── 默认 Default: 创建功能 / create a feature
│   ├── update: 更新状态 / update status
│   ├── link: 关联文件 / link files
│   └── find: 查找相似功能 / find similar features
└── tracking (测试跟踪 / test tracking)
    ├── 默认 Default: 注册测试方法 / register a test method
    ├── result: 更新执行结果 / update execution results
    └── status: 更新方法状态 / update method status
```

### v1.0传统架构（向后兼容）| v1.0 architecture (backward compatible)
```
15个独立工具 / 15 separate tools
├── generate_test_cases
├── implement_from_tests
├── run_tests
├── analyze_coverage
├── refactor_code
├── validate_tdd_cycle
├── createFeature
├── updateFeatureStatus
├── linkFeatureFiles
├── findSimilarFeatures
├── createTDDSession
├── updateTDDStage
├── registerTestMethod
├── updateTestExecutionResult
└── updateTestMethodStatus
```

## 🛠️ 故障排除 | Troubleshooting

### 常见问题 | FAQ

#### 切换工具系统版本 | Switch tool-system version
```bash
# 使用v2.0新工具系统（推荐）/ Use the v2.0 tool system (recommended)
USE_NEW_TOOLS=true node dist/server.js

# 使用v1.0传统工具系统 / Use the v1.0 legacy tool system
USE_NEW_TOOLS=false node dist/server.js
```

#### 语言切换 | Switch language
```bash
# 中文界面（默认）/ Chinese UI (default)
DEFAULT_LOCALE=zh node dist/server.js

# 英文界面 / English UI
DEFAULT_LOCALE=en node dist/server.js
```

#### 验证配置 | Verify the configuration
```bash
# 在Claude Code中检查工具列表 / List tools in Claude Code
/mcp list

# 检查特定服务器工具 / Inspect tools of a specific server
/mcp tools tdd-server-v2

# 测试工具连接 / Test the tool connection
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  USE_NEW_TOOLS=true DEFAULT_LOCALE=zh node dist/server.js
```

#### 集成测试验证 | Integration-test verification
```bash
# 运行完整集成测试 / Run the full integration test
./integration-test.sh

# 手动测试新工具系统 / Manually test the new tool system
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tdd","arguments":{"requirements":"测试功能"}}}' | \
  USE_NEW_TOOLS=true DEFAULT_LOCALE=zh node dist/server.js
```

### 性能优化 | Performance

#### v2.0系统优势 | v2.0 advantages
- **简化API Simplified API**: 3个工具替代15个工具，减少工具切换开销 / 3 tools replace 15, reducing tool-switching overhead
- **智能默认 Smart defaults**: 大多数参数有合理默认值，减少配置复杂度 / most parameters have sensible defaults, reducing configuration complexity
- **自动Session管理 Automatic session management**: 无需手动管理TDD会话状态 / no manual TDD session state management
- **本地化支持 Localization**: 根据配置自动切换界面语言 / the UI language switches automatically per configuration

## 📈 最新更新 | Latest changes

### Unreleased（未发布 / next release）

- ✅ **诚实化接线 Honest wiring**: v2 `feature` / `tracking` 全部子命令真实调用 service 并返回持久化产物（含 `id`、`status`）；`feature create` 缺少 `acceptanceCriteria` 时如实报错（原先返回固定成功文案）/ all subcommands call real services and return persisted artifacts; `feature create` without `acceptanceCriteria` now errors honestly instead of returning a fixed success string
- ✅ **运行安全 Run safety**: 修复可致整机假死的递归测试执行漏洞（`validate`/`coverage` 未设防的 spawn 路径），新增共享守卫 `execution-guard`：嵌套环境拒绝再派生 + 子进程 node 堆硬上限（默认 1024MB）/ fixed a recursive test-execution hole that could freeze the machine; added the shared `execution-guard` (nested-run refusal + hard heap cap on every spawned process)
- ✅ **结果正确性 Result correctness**: 测试结果文件按 `projectPath` 解析（不再误读服务器 cwd 陈旧文件）；`loadTestMethod` 逐项目早退读取 / test result files resolve against `projectPath`; `loadTestMethod` reads per-project files with early exit
- ✅ **测试基建 Test infra**: `npm test` 默认带 `--max-old-space-size=2048 --maxWorkers=2 --workerIdleMemoryLimit=512MB`；新增嵌套守卫与诚实性回归用例 / `npm test` now ships bounded memory by default; added nested-guard and honesty regression tests

### v2.1.0 (当前版本 / current)
- ✅ **SDK 升级 SDK upgrade**: `@modelcontextprotocol/sdk` 0.5.0 → 1.32.2，兼容新版 MCP 客户端 / compatible with newer MCP clients
- ✅ **ESM 化 ESM**: `"type": "module"` + `import.meta.url` 路径解析 / path resolution
- ✅ **工具链 Toolchain**: TypeScript 5.9 / ESLint 9 / Node ≥20
- ✅ **修复 Fixes**: ESLint 9 发现的不可达分支与 20 处多余转义 / unreachable branches and 20 redundant escapes found by ESLint 9
- ✅ **清理 Cleanup**: 移除 6 个根目录临时绕过脚本 / removed 6 temporary bypass scripts from the root

### v2.0.0
- ✅ **架构简化 Simplified architecture**: 15个工具合并为3个主工具 + 子命令 / 15 tools merged into 3 main tools + subcommands
- ✅ **国际化 i18n**: 完整中英文支持，默认中文界面 / full Chinese/English support, Chinese UI by default
- ✅ **自动化 Automation**: Session自动管理，智能TDD流程 / automatic session management, smart TDD flow
- ✅ **兼容性 Compatibility**: 保持对v1.0工具系统的完整向后兼容 / full backward compatibility with the v1.0 tool system

### 测试状态 | Test status
- **单元测试 Unit tests**: 168个通过 ✅（含嵌套守卫与诚实性回归用例 / incl. nested-guard and honesty regression tests）
- **集成测试 Integration tests**: 9个场景全部通过 ✅（SDK 1.32.2 实测 / verified against SDK 1.32.2）  
- **构建状态 Build**: 无错误 ✅ / no errors
- **兼容性 Compatibility**: 新旧工具系统都正常工作 ✅ / both tool systems work

## 🏗️ 项目结构 | Project structure

```
tdd-mcp-server/
├── src/
│   ├── handlers/           
│   │   ├── tools.ts           # v1.0传统15工具系统 / legacy 15-tool system
│   │   ├── new-tools.ts       # v2.0新3工具系统 / v2.0 3-tool system
│   │   ├── resources.ts       # 文件和报告访问 / file & report access
│   │   └── prompts.ts         # TDD工作流提示（优先从 skills/ 加载技能文件，回退 templates/ 模板）/ TDD workflow prompts (skills/ first, templates/ fallback)
│   ├── services/              # 核心业务逻辑 / core business logic
│   │   ├── storage.service.ts 
│   │   ├── feature-management.service.ts
│   │   ├── test-generator.ts
│   │   ├── code-generator.ts
│   │   └── ...
│   ├── i18n.ts               # 国际化服务 / internationalization
│   └── types/                # TypeScript类型定义 / TypeScript types
├── skills/                  # 技能资产（SKILL.md：frontmatter + 步骤指引，prompts 数据源）/ skill assets (SKILL.md: frontmatter + step guidance, prompt data source)
│   ├── tdd-workflow/
│   ├── test-generation/
│   └── debugging/
├── examples/
│   └── v2-usage-guide.md    # v2.0详细使用指南 / detailed v2.0 usage guide
├── openspec/                # openspec 变更管理（proposal/design/tasks/spec）/ openspec change management
├── CHANGELOG.md             # 版本变更日志 / changelog
├── integration-test.sh      # 集成测试脚本 / integration test script
└── dist/                    # 构建输出 / build output
```

## 🤝 贡献指南 | Contributing

我们欢迎贡献！特别欢迎 / Contributions are welcome! Especially:

### 优先需求 | Priority needs
1. **新测试框架支持 New framework support** - 添加更多测试框架 / add more test frameworks
2. **语言扩展 Language expansion** - 支持更多编程语言 / support more languages
3. **AI工具集成 AI tool integration** - 支持更多AI编程助手 / support more AI coding assistants
4. **本地化 Localization** - 支持更多语言界面 / support more UI languages

### 文档约定 | Documentation convention
文档为中英双文，默认中文：中文在前，英文紧随其后（`中文 / English`）。
Docs are bilingual with Chinese as the default: Chinese first, English follows (`Chinese / English`).

### 开发环境设置 | Development setup

```bash
git clone https://github.com/laonayan/tdd-mcp-server.git
cd tdd-mcp-server
npm install
npm run dev
npm run test:watch
```

## 📄 开源协议 | License

MIT License - 详见 / See [LICENSE](LICENSE).

## 🆘 获取支持 | Support

- 🐛 **Bug报告 Bug reports**: [GitHub Issues](https://github.com/laonayan/tdd-mcp-server/issues)
- 💬 **功能建议 Feature requests**: [GitHub Discussions](https://github.com/laonayan/tdd-mcp-server/discussions)
- 📖 **使用文档 Documentation**: [examples/v2-usage-guide.md](examples/v2-usage-guide.md)

---

**🎯 立即开始v2.0简化TDD开发！/ Start simplified TDD development with v2.0 today!**

通过智能化的测试驱动开发支持，在所有主要AI编程助手中转变你的开发工作流。v2.0带来更简洁、更智能、更本土化的TDD体验。

Transform your development workflow across all major AI coding assistants with intelligent, test-driven development support. v2.0 delivers a simpler, smarter, and more localized TDD experience.
