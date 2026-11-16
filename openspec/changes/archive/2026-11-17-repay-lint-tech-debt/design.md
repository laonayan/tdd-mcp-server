# Design

## 策略

182 个 warning 分四批清偿，每批独立提交、独立过质量门，回滚粒度清晰。**全程零行为变化**：只动类型标注与死代码，不动逻辑分支；任何"顺手改逻辑"的冲动都禁止（发现真实缺陷记录下来，不在本变更修）。

## 批次

### T1: no-unused-vars（40 个，机械）

- 死 import 直接删（如 `commands/registry.ts` 的 `I18nService`）
- 未用参数改 `_` 前缀（eslint 配置的 argsIgnorePattern 已是 `^_`）
- 未用赋值删左侧解构/变量（如 `code-generator.ts` 的 `architecturalConstraints`）
- `catch (error)` 未用 → `catch` 无绑定（Node 20 支持）或 `catch (_error)`

### T2: 生产代码 any —— core + commands + adapters（约 18 个）

- `core/parsers/test-results.ts`（7）：解析器入参 `data: any` → `unknown` + 文件内私有形状断言辅助（`as JestJson` 等局部 interface），解析行为不变
- `commands/registry.ts`（4）、adapters（少量）

### T3: 生产代码 any —— handlers + services（约 39 个）

- `handlers/tools.ts`（15）：v1 工具的 args 大多为 `any` → `unknown` + 每工具参数 interface（或复用 v2 注册表已有 zod schema 推断类型）
- `services/test-runner.ts`（12）：`framework: any` → `FrameworkConfig` 类型（从 `types/test-frameworks.ts` 导出）；`convertJsonToTestResults(data: any)` → `unknown`
- `coverage-analyzer.ts`（13）、`code-generator.ts`、`tdd-cycle-validator.ts`（9）、`refactoring.ts`（7）同类处理
- JSON 解析边界统一 `unknown`（`JSON.parse` 返回本来就该按 unknown 对待）

### T4: 测试代码 any（85 个）

- mock 对象用真实接口类型（`jest.Mocked<typeof x>`、注入 fake 已有类型）
- fixture/宽松断言处 `as unknown as X`——类型系统可见的故意绕过，优于裸 `any`

### T5: 上锁

`package.json`: `"lint": "eslint src --max-warnings 0"`；检查 `.github/workflows` 的 CI 是否直接引用 `npm run lint`（是则自动生效，无需改）。

## 不变量

- 测试文件断言与 mock 行为语义不变（只改类型标注）
- 不改 eslint 规则配置本身（不禁用规则、不加 ignore）
- ESM/jest CJS 转换约束不变：不向解析器等纯核心文件引入 `import.meta`

## 验证

每批：`npm test`（202 全绿）+ `tsc` 零错误 + `eslint src`（该批 warning 清零）。终态 `--max-warnings 0` 通过；最后全量 9 集成场景 + `openspec validate --all`。
