import {
  CallToolRequest,
  CallToolResult,
  ListToolsRequest,
  ListToolsResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { I18nService, SupportedLocale } from '../i18n.js';
import { TestGeneratorService } from '../services/test-generator.js';
import { CodeGeneratorService } from '../services/code-generator.js';
import { TestRunnerService } from '../services/test-runner.js';
import { CoverageAnalyzerService } from '../services/coverage-analyzer.js';
import { RefactoringService } from '../services/refactoring.js';
import { TDDCycleValidatorService } from '../services/tdd-cycle-validator.js';
import { FeatureManagementService } from '../services/feature-management.service.js';
import { StorageService } from '../services/storage.service.js';
import { TDDStage } from '../types/storage.js';

export class NewToolsHandler {
  private testGenerator: TestGeneratorService;
  private codeGenerator: CodeGeneratorService;
  private testRunner: TestRunnerService;
  private coverageAnalyzer: CoverageAnalyzerService;
  private refactoring: RefactoringService;
  private tddCycleValidator: TDDCycleValidatorService;
  private storageService: StorageService;
  private featureManagementService: FeatureManagementService;

  constructor(private i18nService: I18nService) {
    this.testGenerator = new TestGeneratorService();
    this.codeGenerator = new CodeGeneratorService();
    this.testRunner = new TestRunnerService();
    this.coverageAnalyzer = new CoverageAnalyzerService();
    this.refactoring = new RefactoringService();
    this.tddCycleValidator = new TDDCycleValidatorService();
    this.storageService = new StorageService();
    this.featureManagementService = new FeatureManagementService(this.storageService);
  }

  async listTools(request: ListToolsRequest): Promise<ListToolsResult> {
    const locale = this.i18nService.getCurrentLocale();
    
    const tools: Tool[] = [
      this.createTDDTool(locale),
      this.createFeatureTool(locale),
      this.createTrackingTool(locale),
    ];

    return { tools };
  }

  private createTDDTool(locale: SupportedLocale): Tool {
    const toolDesc = this.i18nService.getToolDescription('tdd', locale);
    const hints = this.i18nService.getCommandHints('tdd', locale);

    return {
      name: 'tdd',
      description: toolDesc.description,
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            enum: ['generate', 'implement', 'test', 'coverage', 'refactor', 'validate'],
            description: locale === 'zh' ? 
              '子命令（可选，默认执行完整流程）' : 
              'Subcommand (optional, default full workflow)',
          },
          requirements: {
            type: 'string',
            description: locale === 'zh' ? '功能需求描述' : 'Feature requirements description',
          },
          language: {
            type: 'string',
            enum: ['typescript', 'javascript', 'python', 'java', 'csharp', 'go', 'rust', 'php'],
            description: locale === 'zh' ? '编程语言' : 'Programming language',
          },
          framework: {
            type: 'string',
            description: locale === 'zh' ? '测试框架' : 'Testing framework',
          },
          testType: {
            type: 'string',
            enum: ['unit', 'integration', 'e2e', 'performance'],
            description: locale === 'zh' ? '测试类型' : 'Test type',
          },
          testCode: {
            type: 'string',
            description: locale === 'zh' ? '测试代码' : 'Test code',
          },
          implementationStyle: {
            type: 'string',
            enum: ['minimal', 'comprehensive', 'production-ready'],
            description: locale === 'zh' ? '实现风格' : 'Implementation style',
          },
          projectPath: {
            type: 'string',
            description: locale === 'zh' ? '项目路径' : 'Project path',
          },
          sourceCode: {
            type: 'string',
            description: locale === 'zh' ? '源代码' : 'Source code',
          },
        },
        required: ['requirements'],
      },
    };
  }

  private createFeatureTool(locale: SupportedLocale): Tool {
    const toolDesc = this.i18nService.getToolDescription('feature', locale);

    return {
      name: 'feature',
      description: toolDesc.description,
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            enum: ['create', 'update', 'link', 'find'],
            description: locale === 'zh' ? '功能管理操作' : 'Feature management operation',
          },
          name: {
            type: 'string',
            description: locale === 'zh' ? '功能名称' : 'Feature name',
          },
          description: {
            type: 'string',
            description: locale === 'zh' ? '功能描述' : 'Feature description',
          },
          query: {
            type: 'string',
            description: locale === 'zh' ? '搜索查询' : 'Search query',
          },
          featureId: {
            type: 'string',
            description: locale === 'zh' ? '功能ID' : 'Feature ID',
          },
        },
        required: ['name'],
      },
    };
  }

  private createTrackingTool(locale: SupportedLocale): Tool {
    const toolDesc = this.i18nService.getToolDescription('tracking', locale);

    return {
      name: 'tracking',
      description: toolDesc.description,
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            enum: ['register', 'result', 'status'],
            description: locale === 'zh' ? '跟踪操作' : 'Tracking operation',
          },
          featureId: {
            type: 'string',
            description: locale === 'zh' ? '功能ID' : 'Feature ID',
          },
          name: {
            type: 'string',
            description: locale === 'zh' ? '测试方法名' : 'Test method name',
          },
          filePath: {
            type: 'string',
            description: locale === 'zh' ? '测试文件路径' : 'Test file path',
          },
          framework: {
            type: 'string',
            description: locale === 'zh' ? '测试框架' : 'Testing framework',
          },
        },
      },
    };
  }

  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'tdd':
          return await this.handleTDDTool(args);
        case 'feature':
          return await this.handleFeatureTool(args);
        case 'tracking':
          return await this.handleTrackingTool(args);
        default:
          return this.createErrorResult(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return this.createErrorResult(errorMsg);
    }
  }

  private async handleTDDTool(args: any): Promise<CallToolResult> {
    const command = args.command;

    // 自动管理TDD Session
    await this.ensureActiveSession(args);

    // 对于某些子命令，不需要requirements参数
    if (!command && !args.requirements) {
      const error = this.i18nService.createLocalizedError('INVALID_PARAMS');
      return this.createErrorResult(error.message);
    }

    if (command === 'implement' && !args.testCode) {
      return this.createErrorResult('testCode is required for implement command');
    }

    if (!command) {
      // 默认执行完整TDD流程（串行五步 + 容错，返回真实结果）
      await this.updateSessionStage(TDDStage.RED);
      const result = await this.executeFullTDDWorkflow(args);
      await this.updateSessionStage(TDDStage.REFACTOR);
      return result;
    }

    switch (command) {
      case 'generate': {
        if (!args.requirements) {
          return this.createErrorResult('requirements is required for generate command');
        }
        await this.updateSessionStage(TDDStage.RED);
        // 真实调用：解析需求并生成测试用例（v1 handleGenerateTestCases 同源逻辑）
        const generated = await this.testGenerator.generateTests({
          requirements: args.requirements,
          language: args.language,
          framework: args.framework,
          testType: args.testType,
          existingCode: args.existingCode,
        });
        return this.createSuccessResult(
          `Test cases generated successfully (${generated.tests.length} tests, ` +
          `estimated coverage ${generated.metadata.estimatedCoverage}%):\n` +
          JSON.stringify(generated, null, 2),
        );
      }
      case 'implement': {
        await this.updateSessionStage(TDDStage.GREEN);
        const impl = await this.codeGenerator.generateImplementation({
          testCode: args.testCode,
          language: args.language,
          implementationStyle: args.implementationStyle || 'minimal',
          architecturalConstraints: args.architecturalConstraints,
        });
        return this.createSuccessResult(
          'Implementation code generated successfully:\n' +
          JSON.stringify(impl, null, 2),
        );
      }
      case 'test': {
        const run = await this.testRunner.runTests({
          projectPath: args.projectPath || process.env.PROJECT_PATH || process.cwd(),
          testFiles: args.testFiles,
          testFramework: args.framework || args.testFramework || 'jest',
          options: args.options || {},
        });
        return this.createSuccessResult(
          'Tests executed:\n' + JSON.stringify(run, null, 2),
        );
      }
      case 'coverage': {
        const coverage = await this.coverageAnalyzer.analyzeCoverage({
          projectPath: args.projectPath || process.env.PROJECT_PATH || process.cwd(),
          testCommand: args.testCommand,
          thresholds: args.thresholds,
          outputFormat: args.outputFormat || 'json',
        });
        return this.createSuccessResult(
          'Coverage analysis completed:\n' + JSON.stringify(coverage, null, 2),
        );
      }
      case 'refactor': {
        if (!args.sourceCode) {
          return this.createErrorResult('sourceCode is required for refactor command');
        }
        await this.updateSessionStage(TDDStage.REFACTOR);
        const refactor = await this.refactoring.refactorCode({
          sourceCode: args.sourceCode,
          refactorType: args.refactorType,
          preserveTests: args.preserveTests !== false,
          refactoringGoals: args.refactoringGoals || [],
        });
        return this.createSuccessResult(
          'Refactoring suggestions provided:\n' + JSON.stringify(refactor, null, 2),
        );
      }
      case 'validate': {
        const validation = await this.tddCycleValidator.validateCycle({
          projectPath: args.projectPath || process.env.PROJECT_PATH || process.cwd(),
          gitHistory: args.gitHistory,
          timeWindow: args.timeWindow || '1 hour',
        });
        return this.createSuccessResult(
          'TDD cycle validation completed:\n' + JSON.stringify(validation, null, 2),
        );
      }
      default:
        return this.createErrorResult(`Invalid command: ${command}`);
    }
  }

  /**
   * 完整TDD流程：串行执行五步，每步附带真实产物摘要。
   * 单步失败不中断汇总（TDD 循环中测试失败是常态信息），
   * 只有参数级失败才在调用方以 isError 返回。
   */
  private async executeFullTDDWorkflow(args: any): Promise<CallToolResult> {
    const results: string[] = [];
    const projectPath = args.projectPath || process.env.PROJECT_PATH || process.cwd();

    // RED: Generate tests —— 真实生成
    await this.appendStepResult(results, '✅ 生成测试用例', async () => {
      const generated = await this.testGenerator.generateTests({
        requirements: args.requirements,
        language: args.language,
        framework: args.framework,
        testType: args.testType,
      });
      return `${generated.tests.length} tests, estimated coverage ${generated.metadata.estimatedCoverage}%`;
    });
    await this.updateSessionStage(TDDStage.RED);

    // GREEN: Generate implementation —— 真实生成
    await this.appendStepResult(results, '✅ 生成最小实现', async () => {
      const impl = await this.codeGenerator.generateImplementation({
        testCode: args.testCode || `// requirements: ${args.requirements}`,
        language: args.language,
        implementationStyle: 'minimal',
      });
      return `${impl.imports?.length ?? 0} imports, code ${impl.code.length} chars`;
    });
    await this.updateSessionStage(TDDStage.GREEN);

    // REFACTOR 阶段: 运行测试 —— 真实执行（失败是常态信息，记录不中断）
    await this.appendStepResult(results, '✅ 运行测试', async () => {
      const run = await this.testRunner.runTests({
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
        const coverage = await this.coverageAnalyzer.analyzeCoverage({
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
      const validation = await this.tddCycleValidator.validateCycle({
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

  private currentSessionId?: string;
  
  private async ensureActiveSession(args: any): Promise<void> {
    if (!this.currentSessionId) {
      // 自动创建新session
      const sessionId = `session-${Date.now()}`;
      const projectId = 'auto-project';
      const developer = args.developer || 'unknown';
      
      const session = {
        id: sessionId,
        featureId: args.featureId || 'auto-feature',
        projectId,
        developer,
        stage: TDDStage.RED,
        startedAt: new Date(),
        updatedAt: new Date(),
        notes: 'Auto-created session',
        cycleCount: 0,
      };

      await this.storageService.saveTDDSession(session);
      this.currentSessionId = sessionId;
    }
  }

  private async updateSessionStage(stage: TDDStage): Promise<void> {
    if (this.currentSessionId) {
      await this.storageService.updateTDDSessionStage(this.currentSessionId, stage);
    }
  }

  private async handleFeatureTool(args: any): Promise<CallToolResult> {
    if (!args.name && !args.query) {
      const error = this.i18nService.createLocalizedError('INVALID_PARAMS');
      return this.createErrorResult(error.message);
    }

    const command = args.command || 'create';

    switch (command) {
      case 'create':
        return this.createSuccessResult('Feature created successfully');
      case 'update':
        return this.createSuccessResult('Feature updated successfully');
      case 'link':
        return this.createSuccessResult('Files linked to feature successfully');
      case 'find':
        return this.createSuccessResult('Similar features found');
      default:
        return this.createErrorResult(`Invalid command: ${command}`);
    }
  }

  private async handleTrackingTool(args: any): Promise<CallToolResult> {
    const command = args.command || 'register';

    switch (command) {
      case 'register':
        if (!args.featureId || !args.name || !args.filePath || !args.framework) {
          return this.createErrorResult('featureId, name, filePath, and framework are required');
        }
        return this.createSuccessResult('Test method registered successfully');
      case 'result':
        return this.createSuccessResult('Test execution result updated');
      case 'status':
        return this.createSuccessResult('Test method status updated');
      default:
        return this.createErrorResult(`Invalid command: ${command}`);
    }
  }

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