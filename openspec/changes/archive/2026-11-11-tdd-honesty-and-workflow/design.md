# Design: tdd-honesty-and-workflow

## Context

审计证据（本轮升级会话中实地读取）：

| 事实 | 位置 |
|------|------|
| v2 `handleTDDTool` 全部返回固定字符串 | `src/handlers/new-tools.ts` L225-247 |
| 8 个 service 已实例化未使用 | `src/handlers/new-tools.ts` L29-38 |
| v1 15 工具路径真实调用全部 service | `src/handlers/tools.ts` L551-855 |
| prompts 内联 521 行 | `src/handlers/prompts.ts` |
| 质量基线 | 134 单测 + 4 skip / ESLint 0 error / 集成 9 场景 |

## Goals / Non-Goals

**Goals**

1. v2 `tdd` 子命令产出真实结果
2. 技能资产结构化（`skills/<name>/SKILL.md` 范式）
3. 根 `AGENTS.md` + CI + CONTRIBUTING + openspec validate 质量门
4. 全程保持现有质量门绿色；集成测试断言不破坏

**Non-Goals**

- v1 15 工具系统行为变更
- `feature`/`tracking` 工具接真实现（后续变更）
- MCP sampling、Streamable HTTP 传输
- npm 发版流程

## Decisions

### D1: v2 子命令复用 v1 的 service 调用模式

v1 `tools.ts` 中每个 service 的调用参数与返回结构已被单测覆盖。v2 handler 以相同参数形状调用，返回改为「中文摘要行 + service 原始 JSON」双段内容，兼容集成测试的关键短语断言。

### D2: 完整流程 = 串行五步 + 容错

完整流程按 RED→GREEN→REFACTOR 顺序执行五步。单步失败不中断汇总（记录错误继续），因为 TDD 循环中"测试失败"是常态信息而非致命错误；只有参数校验失败才 `isError: true`。

### D3: skills/ 目录 + 文件加载 prompts

```
skills/
├── tdd-workflow/SKILL.md      ← templates/tdd-workflow.md 增强版
├── test-generation/SKILL.md   ← best-practices/unit-testing.md 精编
└── debugging/SKILL.md         ← 新增（四阶段根因定位的 TDD 适配）
```

`prompts.ts` 的 `getPrompt` 优先读 `skills/<name>/SKILL.md`（frontmatter 作为 name/description，正文作为模板），回退内联默认值。旧 `templates/`、`best-practices/` 文件保留以兼容资源 URI。

### D4: AGENTS.md 面向 AI 贡献者

参照两个上游仓库的根 AGENTS.md：openspec 流程（CLI 命令）、质量门清单、架构速览、提交规范。中文书写。

### D5: CI 最小可用

单工作流 `ci.yml`：matrix Node 20/24 ×（build + test + lint）。npm ci 依赖已有 package-lock.json。集成测试不入 CI（需要 jq/交互环境，注释说明）。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 真实调用使 v2 工具变慢 | 与 v1 行为一致——本来就是同步执行；超时由 service 内部控制 |
| 返回结构变化影响下游 | 保留关键短语前缀（集成断言依赖）；错误语义不变 |
| prompts 改文件加载后部署需带 skills/ | `files` 增加 `skills`；沿用 import.meta.url 解析模式 |
| service 对坏参抛错 | 每个子命令先做参数预检，缺失时返回与现状一致的错误文案 |

## Migration Plan

按 tasks.md 顺序，每完成一组任务提交一次（按功能分步提交）：

1. **T1** openspec CLI 采纳（init 产物 + 规格修复）
2. **T2** skills/ 资产迁移 + prompts 文件加载
3. **T3** v2 tdd 工具接真实现 + 单测
4. **T4** AGENTS.md + CI + CONTRIBUTING
5. **T5** 质量门全量回归 + 归档
