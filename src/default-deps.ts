/**
 * handler 缺省依赖构建（V3）
 *
 * 独立模块以避免 handlers ↔ composition-root 循环引用：
 * new-tools.ts 与 composition-root.ts 都从这里取默认对象图。
 * 构造均为轻量操作（无 IO）；真实 IO 由注入的适配器在调用时发生。
 */
import { TestGeneratorService } from './services/test-generator.js';
import { CodeGeneratorService } from './services/code-generator.js';
import { TestRunnerService } from './services/test-runner.js';
import { CoverageAnalyzerService } from './services/coverage-analyzer.js';
import { RefactoringService } from './services/refactoring.js';
import { TDDCycleValidatorService } from './services/tdd-cycle-validator.js';
import { FeatureManagementService } from './services/feature-management.service.js';
import { StorageService } from './services/storage.service.js';
import { GuardedCommandExecutor } from './adapters/guarded-command-executor.js';

export function createDefaultHandlerDeps() {
  const executor = new GuardedCommandExecutor();
  const storage = new StorageService();
  return {
    storageService: storage,
    executor,
    testGenerator: new TestGeneratorService(),
    codeGenerator: new CodeGeneratorService(),
    testRunner: new TestRunnerService(executor),
    coverageAnalyzer: new CoverageAnalyzerService(executor),
    refactoring: new RefactoringService(),
    tddCycleValidator: new TDDCycleValidatorService(executor),
    featureManagementService: new FeatureManagementService(storage),
  };
}
