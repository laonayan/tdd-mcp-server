# Proposal: tdd-honesty-and-workflow

## Why

参考 Superpowers（技能框架 + "Evidence over claims" 方法论）与 OpenSpec（CLI 化规格管理）两个项目审计后，发现三类问题：

1. **诚实性缺口（最严重）**：v2 `tdd` 工具的 `handleTDDTool` 返回硬编码字符串（如 `"✅ 生成测试用例"`），`NewToolsHandler` 构造了 8 个 service 实例却从未调用。一个 TDD 服务器自身不产出真实证据。
2. **规格管理手工化**：openspec 目录是手写模仿，无 CLI 校验（首次 `openspec validate` 即发现 2 处违规）；无 `openspec/AGENTS.md` 指引。
3. **资产零散**：`best-practices/`（1 文件）、`templates/`（1 文件）、prompts 全部内联在 `prompts.ts`（521 行）；无根 `AGENTS.md`；无 CI、无 CONTRIBUTING。

## What Changes

1. **P0 工具诚实性**：v2 `tdd` 工具子命令接入真实 service——
   - `generate` → `TestGeneratorService.generateTests()`（真实解析需求并生成测试）
   - `implement` → `CodeGeneratorService.generateImplementation()`
   - `test` → `TestRunnerService.runTests()`（真实执行项目测试）
   - `coverage` → `CoverageAnalyzerService.analyzeCoverage()`
   - `refactor` → `RefactoringService.refactorCode()`
   - `validate` → `TDDCycleValidatorService.validateCycle()`
   - 完整流程（无 command）串行调用以上并汇总真实结果
2. **P2 技能化**：新建 `skills/` 目录（superpowers 式 SKILL.md 结构：frontmatter + 触发描述 + 步骤），迁移 `best-practices/` 与 `templates/` 内容；`prompts.ts` 从文件加载而非内联
3. **P2 代理指引**：根 `AGENTS.md`（openspec 流程 + 质量门 + 架构说明）
4. **P3 质量基建**：GitHub Actions CI（build + test + lint）、`CONTRIBUTING.md`、`openspec validate` 纳入质量门
5. **规格基建**：采纳 openspec CLI（init 已完成），本变更即按 CLI 工作流执行

## Capabilities

### Modified

- `spec/mcp-server/`: `tdd` 工具子命令行为从固定字符串变为真实执行；prompts 资产来源变更。

## Impact

- **Code**: `src/handlers/new-tools.ts`（核心）、`src/handlers/prompts.ts`、`skills/`（新增）、`AGENTS.md`（新增）、`.github/workflows/ci.yml`（新增）
- **兼容性风险**：v2 工具返回文案变化——从固定成功字符串变为包含真实生成内容/执行结果的 JSON 摘要。工具名、参数、错误语义不变；integration-test.sh 的断言（`完整TDD流程执行完成` 等关键短语）必须保持通过
- **回滚**：git revert；不涉及存储格式变更

## 约束

- 全部现有质量门保持绿色：134 单测、ESLint 0 error、tsc 无错、集成测试 9 场景
- `openspec validate --strict` 全绿
- 中文文档、英文结构标题（项目 config 约定）
