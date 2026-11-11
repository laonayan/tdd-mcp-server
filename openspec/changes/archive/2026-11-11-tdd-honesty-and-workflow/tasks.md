# Tasks: tdd-honesty-and-workflow

## T1: openspec CLI 采纳

- [x] 1.1 提交 `openspec init` 产物（`.agents/` 技能、`openspec/config.yaml`）与已修复的 `openspec/specs/mcp-server/spec.md`（补齐缺失 Scenario）
- [x] 1.2 确认 `openspec validate --all` 全绿，提交

## T2: 技能资产结构化

- [x] 2.1 创建 `skills/tdd-workflow/SKILL.md`（frontmatter + RED 证据纪律步骤）
- [x] 2.2 创建 `skills/test-generation/SKILL.md`（best-practices/unit-testing.md 精编）
- [x] 2.3 创建 `skills/debugging/SKILL.md`（四阶段根因定位 TDD 适配）
- [x] 2.4 `prompts.ts`：`getPrompt` 优先从 `skills/<name>/SKILL.md` 加载（frontmatter 解析 + 正文作为模板），回退内联默认；`package.json` `files` 增加 `skills`
- [x] 2.5 单测：skills 文件存在且 frontmatter 合法；prompts 经文件加载成功
- [x] 2.6 提交（按功能：资产 + 加载器可分两笔）

## T3: v2 tdd 工具接真实现

- [x] 3.1 `generate` 子命令 → `testGenerator.generateTests()`，参数预检保持现有错误文案
- [x] 3.2 `implement` 子命令 → `codeGenerator.generateImplementation()`
- [x] 3.3 `test` 子命令 → `testRunner.runTests()`
- [x] 3.4 `coverage` 子命令 → `coverageAnalyzer.analyzeCoverage()`
- [x] 3.5 `refactor` 子命令 → `refactoring.refactorCode()`（需 sourceCode 参数预检）
- [x] 3.6 `validate` 子命令 → `tddCycleValidator.validateCycle()`
- [x] 3.7 完整流程串行五步 + 容错汇总，保留 `完整TDD流程执行完成` 关键短语
- [x] 3.8 单测更新：每个子命令断言真实结构（非固定文案）；集成测试 9 场景回归
- [x] 3.9 提交

## T4: 代理指引与 CI

- [x] 4.1 根 `AGENTS.md`（openspec 流程、质量门、架构速览、提交规范）
- [x] 4.2 `.github/workflows/ci.yml`（Node 20/24 matrix：build+test+lint）
- [x] 4.3 `CONTRIBUTING.md`（issue-first 流程 + 质量门对齐）
- [x] 4.4 提交

## T5: 回归与归档

- [x] 5.1 全量质量门：jest、eslint、tsc、integration-test.sh、openspec validate --all
- [x] 5.2 勾选本文件全部任务
- [x] 5.3 归档（specs 合入 + change 移入 archive）并推送

> 归档备注（2026-11-11）：全部任务经核验后勾选。T1/T2/T4 对应提交 4d7774a/52914d5/3304b3a/1304fbd；T3 对应 e6a4d7c 与 398e321/7d5bbbb 两轮递归防护修复；T5 质量门五项全绿（jest 155、ESLint 0 error、tsc 0 error、集成 9/9、openspec validate --all）。T5.3 的"推送"未执行：本地领先 origin/master 多个提交，推送需维护者执行。
