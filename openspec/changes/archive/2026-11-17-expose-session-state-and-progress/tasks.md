# Tasks

- [x] T1(port): `StorageRepository` 增 `listProjects()`（StorageService 公开化 + InMemoryStorage 实现）——先写 InMemory fake 失败测试
- [x] T2(state-resources): 新模块 `src/handlers/session-resources.ts`（无 import.meta）——RED 测试（列表/读取/空集合/未知 id）后实现
- [x] T3(wire): `resources.ts` 工厂化 `createResourcesHandler(storage)` + 组合根/server.ts 接线，既有五类资源行为不变
- [x] T4(progress): 新模块 `src/handlers/progress-reporter.ts`（RED 测试）+ `new-tools.ts` 接 `extra.sendNotification`，工作流五步发通知
- [x] T5(quality): 全量质量门（lint 0 warning / tsc / 202+ 单测 / 集成场景含新增 / openspec validate）
- [x] T6(openspec): 归档（delta 合入主规格），分步提交推送
