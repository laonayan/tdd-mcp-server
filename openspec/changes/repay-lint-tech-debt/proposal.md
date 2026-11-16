# Proposal

## Why

存量 182 个 ESLint warning（142 `no-explicit-any` + 40 `no-unused-vars`）长期挂账为"已记录技术债"，没有任何机制阻止继续增长；其中 57 个 `any` 位于生产代码（解析器、handlers、services），正在侵蚀 V3 分层引入的类型边界。

## What Changes

- 清偿全部 40 个 `no-unused-vars`：删死 import/死赋值、未用参数改 `_` 前缀（零行为风险）
- 清偿生产代码 57 个 `no-explicit-any`：按层替换为真实类型 / `unknown` / 泛型；解析器 JSON 输入统一收敛为 `unknown` 入参 + 内部形状断言
- 清偿测试代码 85 个 `no-explicit-any`：mock 正确类型化；确需宽松处用显式 `as unknown as X`
- **上锁**：`lint` 脚本改 `eslint src --max-warnings 0`，CI 同步，防止技术债回流

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无——纯内部质量变更，零外部行为变化，规格零 delta，`.openspec.yaml` 已声明 `skip_specs: true`）

## Impact

- **Code**: `src/` 全量（production ~40 处 warning 位点 + test 文件），`package.json` lint 脚本，CI workflow
- **兼容性**: 零外部行为变化；全部既有测试（202 单测 + 9 集成场景）语义与断言不变
- **风险**: 类型收紧可能暴露潜在 null/undefined 边界——如实修复而非绕过；若发现真实缺陷单独评估是否上升为独立变更
