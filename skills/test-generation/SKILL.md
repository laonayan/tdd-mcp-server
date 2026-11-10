---
name: test-generation
description: 从需求生成高质量测试用例的最佳实践——AAA 结构、边界分析、错误路径覆盖与测试命名规范。
---

# 测试生成指南

## 适用场景

- 需求: {{REQUIREMENTS}}
{% if EXISTING_CODE %}
- 既有代码上下文: 需针对现有行为生成回归测试
{% endif %}

## 生成流程

### 1. 行为拆解

把需求拆成可独立验证的行为单元，每个行为产出三类测试：

1. **Happy path** — 正常输入的预期输出
2. **边界条件** — 空值、零、极大值、单元素、并发
3. **错误路径** — 非法输入、依赖失败、超时

### 2. AAA 结构（Arrange-Act-Assert）

```typescript
it('should 返回两数之和', () => {
  // Arrange
  const calc = new Calculator();
  // Act
  const result = calc.add(5, 3);
  // Assert
  expect(result).toBe(8);
});
```

### 3. 命名规范

`should <预期行为> when <条件>`——读测试名即可理解规格，例如：
- `should reject expired token when JWT validation runs`
- `should return empty array when no matches found`

### 4. 覆盖目标

| 维度 | 最低要求 |
|------|---------|
| 语句覆盖 | ≥ 80% |
| 分支覆盖 | ≥ 75% |
| 错误路径 | 每个抛错点至少 1 个测试 |

## 反模式清单

- ❌ 测试依赖执行顺序或共享可变状态
- ❌ 断言模糊（`expect(x).toBeDefined()` 滥用）
- ❌ 一个测试验证多个行为
- ❌ mock 掉被测对象本身

## 生成后自检

- [ ] 每个测试独立可运行
- [ ] 失败信息可读（能定位到行为）
- [ ] 无对实现细节（私有方法）的断言
- [ ] 运行一次全部通过（在实现存在的回归场景）
