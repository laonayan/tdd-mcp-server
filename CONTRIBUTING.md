# 贡献指南

感谢关注 `tdd-mcp-server`！本仓库用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 管理变更，任何非平凡改动都走规格流程。

## 流程（issue first）

1. **先开 issue**：描述问题或提议，维护者确认方向后再动手
2. **Fork + 分支**：从 `master` 切出 `feat/<topic>` 或 `fix/<topic>`
3. **创建 openspec 变更**（非平凡改动）：

   ```bash
   openspec new change "<kebab-case-name>"
   # 或在你的 AI 助手里用 /opsx:propose
   ```

   填写 proposal / specs / design / tasks 四件套（中文书写，结构标题与 SHALL 英文）
4. **实施**：逐任务完成，按功能分步提交（`T<n>(<area>): 摘要` + `Change: <id>` 尾注）
5. **质量门全绿后**提交 PR（见下）

## 质量门（PR 合并前必须全过）

```bash
npm ci
npm run build               # tsc 零错误
npm test                    # 全部单元测试通过
npm run lint                # ESLint 0 error（存量 warning 不阻塞）
./integration-test.sh       # 9 个集成场景（需要本机 jq）
openspec validate --all     # 规格校验通过
```

CI 在 Node 20 / 24 上自动执行 build + test + lint。

## 提交规范

`<类型>(<范围>): <摘要>`；类型：feat / fix / refactor / test / docs / chore / build。

## 开发约定

- **TDD 纪律**：先写失败测试，再写实现（详见 [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md)）
- **v2 工具诚实性**：新工具必须真实调用 service，禁止返回固定成功文案
- **ESM**：`"type": "module"`；路径用 `import.meta.url` 派生；待单测的纯逻辑放在不含 ESM 语法的模块
- **存储兼容**：`~/.tdd-flow/` JSONL 格式变更需向后兼容
- **文档**：用户可见变更更新 `CHANGELOG.md` 与 `README.md`

## AI 代理贡献者

请先阅读 [AGENTS.md](AGENTS.md)。
