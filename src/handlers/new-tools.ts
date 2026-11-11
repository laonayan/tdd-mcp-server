import {
  CallToolRequest,
  CallToolResult,
  ListToolsRequest,
  ListToolsResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { I18nService } from '../i18n.js';
import { TestGeneratorService } from '../services/test-generator.js';
import { CodeGeneratorService } from '../services/code-generator.js';
import { TestRunnerService } from '../services/test-runner.js';
import { CoverageAnalyzerService } from '../services/coverage-analyzer.js';
import { RefactoringService } from '../services/refactoring.js';
import { TDDCycleValidatorService } from '../services/tdd-cycle-validator.js';
import { FeatureManagementService } from '../services/feature-management.service.js';
import { StorageService } from '../services/storage.service.js';
import { TDDStage } from '../types/storage.js';
// V3：注册表投影 + 默认依赖（default-deps 独立模块，避免循环引用）
import {
  TOOL_SPECS,
  findToolSpec,
  findCommandSpec,
  unwrap,
  type CommandContext,
} from '../commands/registry.js';
import { createDefaultHandlerDeps } from '../default-deps.js';

/** 可注入依赖（测试注入 fake；缺省经组合根构建，不在 handler 内散落 new） */
export interface NewToolsHandlerDeps {
  storageService?: StorageService;
  executor?: import('../core/ports.js').CommandExecutor;
  testGenerator?: TestGeneratorService;
  codeGenerator?: CodeGeneratorService;
  testRunner?: TestRunnerService;
  coverageAnalyzer?: CoverageAnalyzerService;
  refactoring?: RefactoringService;
  tddCycleValidator?: TDDCycleValidatorService;
  featureManagementService?: FeatureManagementService;
}

/**
 * v2 三工具 handler（V3：注册表投影）
 *
 * 本类只负责：MCP 协议投影（tools/list、tools/call）、TDD 会话生命周期、
 * 完整流程编排。命令定义与分发全部来自 src/commands/registry.ts。
 */
export class NewToolsHandler {
  private services: CommandContext['services'];
  private readonly i18n: I18nService;
  private currentSessionId?: string;
  private readonly storage: StorageService;
  private readonly featureManagement: FeatureManagementService;

  constructor(i18nService: I18nService, deps?: NewToolsHandlerDeps) {
    this.i18n = i18nService;
    // 缺省依赖统一来自组合根（唯一允许组装适配器的地方）；
    // 部分注入时其余字段取默认构建（构造无 IO，代价可忽略）
    const built = createDefaultHandlerDeps();
    this.storage = deps?.storageService ?? built.storageService;
    this.featureManagement = deps?.featureManagementService ?? built.featureManagementService;

    this.services = {
      testGenerator: deps?.testGenerator ?? built.testGenerator,
      codeGenerator: deps?.codeGenerator ?? built.codeGenerator,
      testRunner: deps?.testRunner ?? built.testRunner,
      coverageAnalyzer: deps?.coverageAnalyzer ?? built.coverageAnalyzer,
      refactoring: deps?.refactoring ?? built.refactoring,
      tddCycleValidator: deps?.tddCycleValidator ?? built.tddCycleValidator,
      featureManagement: this.featureManagement,
      storage: this.storage,
    };
  }

  async listTools(_request: ListToolsRequest): Promise<ListToolsResult> {
    const locale = this.i18n.getCurrentLocale();

    const tools: Tool[] = TOOL_SPECS.map(spec => {
      const toolDesc = this.i18n.getToolDescription(spec.name, locale);
      return {
        name: spec.name,
        description: toolDesc.description,
        inputSchema: spec.inputSchema(locale),
      };
    });

    return { tools };
  }

  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    const spec = findToolSpec(name);
    if (!spec) {
      return this.createErrorResult(`Unknown tool: ${name}`);
    }

    const ctx: CommandContext = {
      services: this.services,
      updateSessionStage: stage => this.updateSessionStage(stage),
      invalidParamsError: () => {
        const error = this.i18n.createLocalizedError('INVALID_PARAMS');
        return error.message;
      },
      locale: this.i18n.getCurrentLocale(),
    };

    try {
      // 自动管理TDD Session（tdd 工具语义）
      if (name === 'tdd') {
        await this.ensureActiveSession(args as any);
      }

      const command: string | undefined = (args as any)?.command;

      // 无 command：各工具的默认行为
      if (!command) {
        if (name === 'tdd') {
          if (!args?.requirements) {
            return this.createErrorResult(ctx.invalidParamsError());
          }
          await this.updateSessionStage(TDDStage.RED);
          const result = await this.executeFullTDDWorkflow(args);
          await this.updateSessionStage(TDDStage.REFACTOR);
          return result;
        }
        if (name === 'feature') {
          // create/find 走 name/query；update/link 走 featureId
          const cmdSpec = findCommandSpec(spec, 'create')!;
          return this.toResult(await cmdSpec.handler(args ?? {}, ctx));
        }
        if (name === 'tracking') {
          const cmdSpec = findCommandSpec(spec, 'register')!;
          return this.toResult(await cmdSpec.handler(args ?? {}, ctx));
        }
      }

      const cmdSpec = findCommandSpec(spec, command);
      if (!cmdSpec) {
        return this.createErrorResult(`Invalid command: ${command}`);
      }

      // zod 宽松校验：仅拦类型完全错误的入参，错误语义沿用 INVALID_PARAMS
      const parsed = cmdSpec.schema.safeParse(args ?? {});
      if (!parsed.success) {
        return this.createErrorResult(ctx.invalidParamsError());
      }

      return this.toResult(await cmdSpec.handler(parsed.data, ctx));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return this.createErrorResult(errorMsg);
    }
  }

  private toResult(result: unknown): CallToolResult {
    const unwrapped = unwrap(result);
    if (!unwrapped.ok) {
      return this.createErrorResult(unwrapped.message);
    }
    return this.createSuccessResult(
      typeof unwrapped.value === 'string' ? unwrapped.value : JSON.stringify(unwrapped.value, null, 2),
    );
  }

  /**
   * 完整TDD流程：串行执行五步，每步附带真实产物摘要。
   * 单步失败不中断汇总（TDD 循环中测试失败是常态信息）。
   */
  private async executeFullTDDWorkflow(args: any): Promise<CallToolResult> {
    const results: string[] = [];
    const projectPath = args.projectPath || process.env.PROJECT_PATH || process.cwd();

    await this.appendStepResult(results, '✅ 生成测试用例', async () => {
      const generated = await this.services.testGenerator.generateTests({
        requirements: args.requirements,
        language: args.language,
        framework: args.framework,
        testType: args.testType,
      });
      return `${generated.tests.length} tests, estimated coverage ${generated.metadata.estimatedCoverage}%`;
    });
    await this.updateSessionStage(TDDStage.RED);

    await this.appendStepResult(results, '✅ 生成最小实现', async () => {
      const impl = await this.services.codeGenerator.generateImplementation({
        testCode: args.testCode || `// requirements: ${args.requirements}`,
        language: args.language,
        implementationStyle: 'minimal',
      });
      return `${impl.imports?.length ?? 0} imports, code ${impl.code.length} chars`;
    });
    await this.updateSessionStage(TDDStage.GREEN);

    await this.appendStepResult(results, '✅ 运行测试', async () => {
      const run = await this.services.testRunner.runTests({
        projectPath,
        testFramework: args.framework || 'jest',
        options: {},
      });
      const total = run.suites.reduce((sum: number, s: any) => sum + s.tests.length, 0);
      const passed = run.suites.reduce(
        (sum: number, s: any) => sum + s.tests.filter((t: any) => t.status === 'passed').length,
        0,
      );
      return `${passed}/${total} passed`;
    });

    await this.appendStepResult(results, '✅ 分析覆盖率', async () => {
      try {
        const coverage = await this.services.coverageAnalyzer.analyzeCoverage({
          projectPath,
          testCommand: args.testCommand,
          outputFormat: 'json',
        });
        return `lines ${coverage.overall?.lines ?? 'N/A'}%`;
      } catch (e) {
        return `skipped: ${e instanceof Error ? e.message : String(e)}`;
      }
    });

    await this.appendStepResult(results, '✅ 提供重构建议', async () => {
      const validation = await this.services.tddCycleValidator.validateCycle({
        projectPath,
        timeWindow: '1 hour',
      });
      return validation.isValid ? 'cycle valid' : 'cycle issues found';
    });

    return this.createSuccessResult(`完整TDD流程执行完成:\n${results.join('\n')}`);
  }

  /** 执行单步并把真实摘要追加到结果行；失败时追加错误说明（容错） */
  private async appendStepResult(
    results: string[],
    label: string,
    step: () => Promise<string>,
  ): Promise<void> {
    try {
      const summary = await step();
      results.push(`${label}（${summary}）`);
    } catch (error) {
      results.push(`${label}（错误: ${error instanceof Error ? error.message : String(error)}）`);
    }
  }

  // ---------- TDD 会话生命周期 ----------

  private async ensureActiveSession(args: any): Promise<void> {
    if (!this.currentSessionId) {
      const sessionId = `session-${Date.now()}`;
      const projectId = 'auto-project';
      const developer = args?.developer || 'unknown';

      const session = {
        id: sessionId,
        featureId: args?.featureId || 'auto-feature',
        projectId,
        developer,
        stage: TDDStage.RED,
        startedAt: new Date(),
        updatedAt: new Date(),
        notes: 'Auto-created session',
        cycleCount: 0,
      };

      await this.storage.saveTDDSession(session);
      this.currentSessionId = sessionId;
    }
  }

  private async updateSessionStage(stage: TDDStage): Promise<void> {
    if (this.currentSessionId) {
      await this.storage.updateTDDSessionStage(this.currentSessionId, stage);
    }
  }

  // ---------- MCP 响应构造 ----------

  private createSuccessResult(message: string): CallToolResult {
    return {
      content: [{
        type: 'text',
        text: message,
      }],
    };
  }

  private createErrorResult(message: string): CallToolResult {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: message,
      }],
    };
  }
}

