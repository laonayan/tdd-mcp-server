# Tasks: architecture-v3

## T1: 纯核心层 src/core/

- [ ] 1.1 抽取解析器纯函数（jest/mocha/pytest/generic/text/xml）到 `src/core/parsers/`，test-runner 委托调用；新增零 mock 单测
- [ ] 1.2 抽取相似度引擎（calculateTextSimilarity/calculateTagSimilarity/calculateFeatureSimilarity）到 `src/core/similarity.ts`，feature-management 委托；新增零 mock 单测
- [ ] 1.3 抽取提交模式分析与代码质量启发式到 `src/core/analysis.ts`，tdd-cycle-validator 委托
- [ ] 1.4 全量门绿，提交

## T2: 端口与唯一执行网关

- [ ] 2.1 `src/core/ports.ts` 定义 `CommandExecutor`；`src/adapters/guarded-command-executor.ts` 实现（嵌套拒绝 + 内存上限 env + maxBuffer/timeout 策略）
- [ ] 2.2 test-runner / coverage-analyzer / tdd-cycle-validator 三处 execAsync 收敛到网关（行为等价，含守卫单测迁移）
- [ ] 2.3 架构守卫测试：`child_process` import 仅限 `src/adapters/` 与 execution-guard
- [ ] 2.4 全量门绿，提交

## T3: 仓储接口与测试去污染

- [ ] 3.1 ports 增加存储仓储接口；`StorageService` implements（JSONL 逻辑不动）
- [ ] 3.2 `InMemoryStorage` fake 实现；new-tools handler 单测改注入 fake（零 `~/.tdd-flow` 写入验证）
- [ ] 3.3 全量门绿，提交

## T4: 组合根与命令注册表

- [ ] 4.1 `src/composition-root.ts` 构建对象图；server.ts 只装配；handlers 构造函数全注入（移除内部 new）
- [ ] 4.2 `src/commands/registry.ts`：tdd/feature/tracking 全部子命令注册（zod 校验 + inputSchema + handler）；new-tools.ts 变注册表投影；tools/list 契约不变
- [ ] 4.3 注册表 zod 校验接入（宽松校验、错误语义沿用 INVALID_PARAMS 本地化文案）；集成 9/9 回归
- [ ] 4.4 全量门绿，提交

## T5: 收尾

- [ ] 5.1 CHANGELOG + README 架构段更新
- [ ] 5.2 全量质量门（带内存上限）+ openspec validate
- [ ] 5.3 勾选全部任务，提交并推送，归档变更
