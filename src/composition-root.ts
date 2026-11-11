/**
 * 组合根（V3）：唯一允许"知道一切并组装一切"的地方。
 *
 * server.ts 只调用 createAppContainer() 拿到装配好的 handler；
 * 测试用 createTestContainer(overrides) 注入 fake（内存仓储/假执行器）。
 * 业务代码不再散落 new（handlers → services → core/ports ← adapters）。
 */
import { I18nService } from './i18n.js';
import { NewToolsHandler } from './handlers/new-tools.js';
import { TestGeneratorService } from './services/test-generator.js';
import { CodeGeneratorService } from './services/code-generator.js';
import { TestRunnerService } from './services/test-runner.js';
import { CoverageAnalyzerService } from './services/coverage-analyzer.js';
import { RefactoringService } from './services/refactoring.js';
import { TDDCycleValidatorService } from './services/tdd-cycle-validator.js';
import { FeatureManagementService } from './services/feature-management.service.js';
import { StorageService } from './services/storage.service.js';
import { InMemoryStorage } from './adapters/in-memory-storage.js';
import { GuardedCommandExecutor } from './adapters/guarded-command-executor.js';
import { createDefaultHandlerDeps } from './default-deps.js';
import type { CommandExecutor, StorageRepository } from './core/ports.js';

export interface AppContainer {
  i18nService: I18nService;
  newToolsHandler: NewToolsHandler;
}

/** 默认对象图：真实适配器（JSONL 存储 + 受守卫执行网关） */
export function createAppContainer(): AppContainer {
  const i18nService = I18nService.getInstance();
  const newToolsHandler = new NewToolsHandler(i18nService, createDefaultHandlerDeps());
  return { i18nService, newToolsHandler };
}

/** 测试对象图：内存仓储（零磁盘 IO），其余依赖可覆写 */
export function createTestContainer(
  overrides?: {
    executor?: CommandExecutor;
    storage?: StorageRepository;
  },
): AppContainer {
  const i18nService = I18nService.getInstance();
  const executor = overrides?.executor ?? new GuardedCommandExecutor();
  const storage = overrides?.storage ?? new InMemoryStorage();

  const newToolsHandler = new NewToolsHandler(i18nService, {
    storageService: storage as StorageService,
    executor,
    testGenerator: new TestGeneratorService(),
    codeGenerator: new CodeGeneratorService(),
    testRunner: new TestRunnerService(executor),
    coverageAnalyzer: new CoverageAnalyzerService(executor),
    refactoring: new RefactoringService(),
    tddCycleValidator: new TDDCycleValidatorService(executor),
    featureManagementService: new FeatureManagementService(storage as StorageService),
  });

  return { i18nService, newToolsHandler };
}
