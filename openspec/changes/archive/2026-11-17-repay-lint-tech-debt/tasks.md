# Tasks

- [x] T1(unused): 清 40 个 no-unused-vars（死 import / `_` 前缀 / 死赋值），lint 该规则归零，测试全绿
- [x] T2(core): 清 core/commands/adapters 生产代码 no-explicit-any（解析器入参 unknown + 局部形状类型），测试全绿
- [x] T3(services): 清 handlers/services 生产代码 no-explicit-any（FrameworkConfig 等真实类型），测试全绿
- [x] T4(tests): 清测试代码 85 个 no-explicit-any（正确类型化 mock / as unknown as X），测试全绿
- [x] T5(lock): lint 脚本加 --max-warnings 0，CI 验证生效；全量质量门（test/lint/build/integration/validate）
- [x] T6(openspec): 归档（skip_specs 零 delta），分步提交推送
