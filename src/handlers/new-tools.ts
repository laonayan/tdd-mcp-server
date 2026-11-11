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
import { TDDStage, TestMethod } from '../types/storage.js';

/** 可注入依赖（测试用；缺省时与既有行为完全一致） */
export interface NewToolsHandlerDeps {
  featureManagementService?: FeatureManagementService;
  storageService?: StorageService;
}

export class NewToolsHandler {
  private testGenerator: TestGeneratorService;
  private codeGenerator: CodeGeneratorService;
  private testRunner: TestRunnerService;
  private coverageAnalyzer: CoverageAnalyzerService;
  private refactoring: RefactoringService;
  private tddCycleValidator: TDDCycleValidatorService;
  private storageService: StorageService;
  private featureManagementService: FeatureManagementService;

  constructor(
    private i18nService: I18nService,
    deps?: NewToolsHandlerDeps,
  ) {
    this.testGenerator = new TestGeneratorService();
    this.codeGenerator = new CodeGeneratorService();
    this.testRunner = new TestRunnerService();
    this.coverageAnalyzer = new CoverageAnalyzerService();
    this.refactoring = new RefactoringService();
    this.tddCycleValidator = new TDDCycleValidatorService();
    this.storageService = deps?.storageService ?? new StorageService();
    this.featureManagementService =
      deps?.featureManagementService ?? new FeatureManagementService(this.storageService);
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
          acceptanceCriteria: {
            type: 'array',
            items: { type: 'string' },
            description: locale === 'zh'
              ? '验收条件（create 必填，至少一条）'
              : 'Acceptance criteria (required for create, at least one)',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: locale === 'zh' ? '优先级' : 'Priority',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: locale === 'zh' ? '标签' : 'Tags',
          },
          projectId: {
            type: 'string',
            description: locale === 'zh' ? '项目ID（缺省用当前项目）' : 'Project ID (defaults to current project)',
          },
          featureId: {
            type: 'string',
            description: locale === 'zh' ? '功能ID（update/link 用）' : 'Feature ID (for update/link)',
          },
          status: {
            type: 'string',
            enum: ['planning', 'in_progress', 'completed', 'on_hold', 'cancelled'],
            description: locale === 'zh' ? '目标状态（update 用）' : 'Target status (for update)',
          },
          progress: {
            type: 'object',
            description: locale === 'zh'
              ? '进度信息（update 可选：testsWritten/testsPass/implementationFiles/coveragePercentage）'
              : 'Progress info (optional for update: testsWritten/testsPass/implementationFiles/coveragePercentage)',
          },
          filePaths: {
            type: 'array',
            items: { type: 'string' },
            description: locale === 'zh' ? '关联文件路径（link 用）' : 'File paths to link',
          },
          fileType: {
            type: 'string',
            enum: ['test', 'implementation', 'config', 'documentation'],
            description: locale === 'zh' ? '文件类型（link 用）' : 'File type (for link)',
          },
          query: {
            type: 'string',
            description: locale === 'zh' ? '搜索查询' : 'Search query',
          },
          maxResults: {
            type: 'number',
            description: locale === 'zh' ? '最大返回数（find 用）' : 'Max results (for find)',
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
          testType: {
            type: 'string',
            enum: ['unit', 'integration', 'e2e', 'performance'],
            description: locale === 'zh' ? '测试类型（register 可选）' : 'Test type (optional for register)',
          },
          projectId: {
            type: 'string',
            description: locale === 'zh' ? '项目ID（缺省用当前项目）' : 'Project ID (defaults to current project)',
          },
          methodId: {
            type: 'string',
            description: locale === 'zh' ? '测试方法ID（result/status 用）' : 'Test method ID (for result/status)',
          },
          result: {
            type: 'object',
            description: locale === 'zh'
              ? '执行结果（result 用）：{ passed: boolean, duration?: number, output?: string, error?: string, coverage?: number }'
              : 'Execution result (for result): { passed: boolean, duration?: number, output?: string, error?: string, coverage?: number }',
          },
          status: {
            type: 'string',
            enum: ['passed', 'failed', 'skipped', 'pending'],
            description: locale === 'zh' ? '目标状态（status 用）' : 'Target status (for status)',
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
    // create/find 走 name/query；update/link 走 featureId——三者皆缺才是参数缺失
    if (!args.name && !args.query && !args.featureId) {
      const error = this.i18nService.createLocalizedError('INVALID_PARAMS');
      return this.createErrorResult(error.message);
    }

    const command = args.command || 'create';

    // 真实接线：每个子命令调用 FeatureManagementService 并返回真实产物
    // （Evidence over Claims——禁止与输入无关的固定成功文案）
    switch (command) {
      case 'create': {
        try {
          const feature = await this.featureManagementService.createFeature({
            name: args.name,
            description: args.description ?? '',
            acceptanceCriteria: args.acceptanceCriteria,
            priority: args.priority,
            projectId: args.projectId,
            tags: args.tags,
            estimatedHours: args.estimatedHours,
            assignee: args.assignee,
          });
          return this.createSuccessResult(
            'Feature created successfully:\n' + JSON.stringify(feature, null, 2),
          );
        } catch (error) {
          return this.createErrorResult(error instanceof Error ? error.message : String(error));
        }
      }
      case 'update': {
        if (!args.featureId || !args.status) {
          return this.createErrorResult('featureId and status are required for update command');
        }
        try {
          const updated = await this.featureManagementService.updateFeatureStatus({
            featureId: args.featureId,
            status: args.status,
            progress: args.progress,
          });
          return this.createSuccessResult(
            'Feature updated successfully:\n' + JSON.stringify(updated, null, 2),
          );
        } catch (error) {
          return this.createErrorResult(error instanceof Error ? error.message : String(error));
        }
      }
      case 'link': {
        if (!args.featureId || !args.filePaths || args.filePaths.length === 0) {
          return this.createErrorResult('featureId and filePaths are required for link command');
        }
        try {
          const associations = await this.featureManagementService.linkFeatureFiles({
            featureId: args.featureId,
            filePaths: args.filePaths,
            fileType: args.fileType,
          });
          return this.createSuccessResult(
            'Files linked to feature successfully:\n' + JSON.stringify(associations, null, 2),
          );
        } catch (error) {
          return this.createErrorResult(error instanceof Error ? error.message : String(error));
        }
      }
      case 'find': {
        if (!args.query) {
          return this.createErrorResult('query is required for find command');
        }
        try {
          const projectId = args.projectId
            || this.featureManagementService.getCurrentProject()
            || 'default-project';
          const similar = await this.featureManagementService.findSimilarFeatures(
            args.query,
            projectId,
            args.maxResults,
          );
          if (similar.length === 0) {
            return this.createSuccessResult('No similar features found: []');
          }
          return this.createSuccessResult(
            `Similar features found (${similar.length}):\n` + JSON.stringify(similar, null, 2),
          );
        } catch (error) {
          return this.createErrorResult(error instanceof Error ? error.message : String(error));
        }
      }
      default:
        return this.createErrorResult(`Invalid command: ${command}`);
    }
  }

  private async handleTrackingTool(args: any): Promise<CallToolResult> {
    const command = args.command || 'register';

    // 真实接线：调用 StorageService 持久化并返回/回读真实对象
    switch (command) {
      case 'register': {
        if (!args.featureId || !args.name || !args.filePath || !args.framework) {
          return this.createErrorResult('featureId, name, filePath, and framework are required');
        }
        const methodId = `test-${Date.now()}`;
        const projectId = args.projectId
          || this.featureManagementService.getCurrentProject()
          || 'default-project';

        const testMethod: TestMethod = {
          id: methodId,
          featureId: args.featureId,
          projectId,
          name: args.name,
          filePath: args.filePath,
          status: 'pending',
          framework: args.framework,
          createdAt: new Date(),
          testType: args.testType,
        };

        try {
          await this.storageService.registerTestMethod(testMethod);
          return this.createSuccessResult(
            'Test method registered successfully:\n' + JSON.stringify(testMethod, null, 2),
          );
        } catch (error) {
          return this.createErrorResult(error instanceof Error ? error.message : String(error));
        }
      }
      case 'result': {
        if (!args.methodId || !args.result || typeof args.result.passed !== 'boolean') {
          return this.createErrorResult(
            'methodId and result (with boolean passed) are required for result command',
          );
        }
        try {
          const ok = await this.storageService.updateTestExecutionResult(args.methodId, {
            duration: args.result.duration ?? 0,
            passed: args.result.passed,
            output: args.result.output,
            error: args.result.error,
            coverage: args.result.coverage,
          });
          if (!ok) {
            return this.createErrorResult(
              `Failed to update test execution result: ${args.methodId}`,
            );
          }
          const updated = await this.storageService.loadTestMethod(args.methodId);
          return this.createSuccessResult(
            'Test execution result updated:\n' + JSON.stringify(updated, null, 2),
          );
        } catch (error) {
          return this.createErrorResult(error instanceof Error ? error.message : String(error));
        }
      }
      case 'status': {
        if (!args.methodId || !args.status) {
          return this.createErrorResult('methodId and status are required for status command');
        }
        try {
          const ok = await this.storageService.updateTestMethodStatus(args.methodId, args.status);
          if (!ok) {
            return this.createErrorResult(`Failed to update test method status: ${args.methodId}`);
          }
          const updated = await this.storageService.loadTestMethod(args.methodId);
          return this.createSuccessResult(
            'Test method status updated:\n' + JSON.stringify(updated, null, 2),
          );
        } catch (error) {
          return this.createErrorResult(error instanceof Error ? error.message : String(error));
        }
      }
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