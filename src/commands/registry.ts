/**
 * 命令注册表（V3：v2 工具的单一事实来源）
 *
 * 每个工具一条 ToolSpec，每个子命令一条 CommandSpec：
 * - zod schema：宽松校验（全字段可选，仅拦类型完全错误的入参）；
 *   业务校验留在 service/handler，保持既有错误文案语义
 * - inputSchema：MCP 工具入参 schema（与既有外部契约逐字段一致）
 * - handler：命令逻辑（原 new-tools.ts 私有方法下沉于此）
 *
 * new-tools.ts 只做投影：tools/list 与 tools/call 全部由注册表驱动。
 */
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { SupportedLocale } from '../i18n.js';
import { TDDStage, TestMethod } from '../types/storage.js';

// ---------- 上下文与类型 ----------

/** 命令上下文：注册表 handler 可用的全部依赖（由 handler 注入） */
export interface CommandContext {
  services: {
    testGenerator: import('../services/test-generator.js').TestGeneratorService;
    codeGenerator: import('../services/code-generator.js').CodeGeneratorService;
    testRunner: import('../services/test-runner.js').TestRunnerService;
    coverageAnalyzer: import('../services/coverage-analyzer.js').CoverageAnalyzerService;
    refactoring: import('../services/refactoring.js').RefactoringService;
    tddCycleValidator: import('../services/tdd-cycle-validator.js').TDDCycleValidatorService;
    featureManagement: import('../services/feature-management.service.js').FeatureManagementService;
    storage: import('../services/storage.service.js').StorageService;
  };
  /** TDD 会话阶段流转（由宿主 handler 管理 session 生命周期） */
  updateSessionStage: (stage: TDDStage) => Promise<void>;
  /** 本地化 INVALID_PARAMS 错误文案 */
  invalidParamsError: () => string;
  locale: SupportedLocale;
}

export interface CommandSpec {
  /** 子命令名；undefined 表示"无 command 的默认行为" */
  command?: string;
  /** 宽松 zod 校验：默认直接放行（对象即可），特殊命令自行收紧 */
  schema: z.ZodTypeAny;
  handler: (args: CommandArgs, ctx: CommandContext) => Promise<unknown>;
}

export interface ToolSpec {
  name: 'tdd' | 'feature' | 'tracking';
  /** 工具级 MCP inputSchema（zh/en 由 locale 决定；与既有契约一致） */
  inputSchema: (locale: SupportedLocale) => Tool['inputSchema'];
  commands: CommandSpec[];
}

const passthrough = z.object({}).passthrough();

/** 子命令入参：MCP 客户端传来的 JSON 对象（zod 已做宽松校验，必需字段在 handler 内显式检查） */
type CommandArgs = Record<string, unknown>;

/** 单点形状断言：把宽松入参投影为 service 参数类型 */
const as = <T>(args: CommandArgs): T => args as unknown as T;

// ---------- 共用小工具 ----------

const err = (message: string) => ({ __error: message });

function isErr(result: unknown): result is { __error: string } {
  return result !== null && typeof result === 'object' && '__error' in result;
}

/** 结果包装：handler 返回 { __error } 时投影为 isError 响应 */
export function unwrap(result: unknown): { ok: true; value: unknown } | { ok: false; message: string } {
  if (isErr(result)) {
    return { ok: false, message: result.__error };
  }
  return { ok: true, value: result };
}

// ---------- tdd 工具 ----------

const tddCommands: CommandSpec[] = [
  {
    command: 'generate',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<Parameters<CommandContext['services']['testGenerator']['generateTests']>[0]>(args);
      if (!p.requirements) {
        return err('requirements is required for generate command');
      }
      await ctx.updateSessionStage(TDDStage.RED);
      const generated = await ctx.services.testGenerator.generateTests(p);
      return `Test cases generated successfully (${generated.tests.length} tests, ` +
        `estimated coverage ${generated.metadata.estimatedCoverage}%):\n` +
        JSON.stringify(generated, null, 2);
    },
  },
  {
    command: 'implement',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<Parameters<CommandContext['services']['codeGenerator']['generateImplementation']>[0]>(args);
      if (!p.testCode) {
        return err('testCode is required for implement command');
      }
      await ctx.updateSessionStage(TDDStage.GREEN);
      const impl = await ctx.services.codeGenerator.generateImplementation({
        ...p,
        implementationStyle: p.implementationStyle || 'minimal',
      });
      return 'Implementation code generated successfully:\n' + JSON.stringify(impl, null, 2);
    },
  },
  {
    command: 'test',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<{ projectPath?: string; testFiles?: string[]; framework?: string; testFramework?: string; options?: Record<string, unknown> }>(args);
      const run = await ctx.services.testRunner.runTests({
        projectPath: p.projectPath || process.env.PROJECT_PATH || process.cwd(),
        testFiles: p.testFiles,
        testFramework: p.framework || p.testFramework || 'jest',
        options: p.options || {},
      });
      return 'Tests executed:\n' + JSON.stringify(run, null, 2);
    },
  },
  {
    command: 'coverage',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<{ projectPath?: string; testCommand: string; thresholds?: Record<string, number>; outputFormat?: 'json' | 'html' | 'lcov' | 'text' }>(args);
      const coverage = await ctx.services.coverageAnalyzer.analyzeCoverage({
        projectPath: p.projectPath || process.env.PROJECT_PATH || process.cwd(),
        testCommand: p.testCommand,
        thresholds: p.thresholds,
        outputFormat: p.outputFormat || 'json',
      });
      return 'Coverage analysis completed:\n' + JSON.stringify(coverage, null, 2);
    },
  },
  {
    command: 'refactor',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<Parameters<CommandContext['services']['refactoring']['refactorCode']>[0]>(args);
      if (!p.sourceCode) {
        return err('sourceCode is required for refactor command');
      }
      await ctx.updateSessionStage(TDDStage.REFACTOR);
      const refactor = await ctx.services.refactoring.refactorCode({
        ...p,
        preserveTests: p.preserveTests !== false,
        refactoringGoals: p.refactoringGoals || [],
      });
      return 'Refactoring suggestions provided:\n' + JSON.stringify(refactor, null, 2);
    },
  },
  {
    command: 'validate',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<{ projectPath?: string; gitHistory?: string[]; timeWindow?: string }>(args);
      const validation = await ctx.services.tddCycleValidator.validateCycle({
        projectPath: p.projectPath || process.env.PROJECT_PATH || process.cwd(),
        gitHistory: p.gitHistory,
        timeWindow: p.timeWindow || '1 hour',
      });
      return 'TDD cycle validation completed:\n' + JSON.stringify(validation, null, 2);
    },
  },
];

// ---------- feature 工具 ----------

const featureCommands: CommandSpec[] = [
  {
    command: 'create',
    schema: passthrough,
    handler: async (args, ctx) => {
      try {
        const p = as<Parameters<CommandContext['services']['featureManagement']['createFeature']>[0]>(args);
        const feature = await ctx.services.featureManagement.createFeature({
          ...p,
          description: p.description ?? '',
        });
        return 'Feature created successfully:\n' + JSON.stringify(feature, null, 2);
      } catch (error) {
        return err(error instanceof Error ? error.message : String(error));
      }
    },
  },
  {
    command: 'update',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<Parameters<CommandContext['services']['featureManagement']['updateFeatureStatus']>[0]>(args);
      if (!p.featureId || !p.status) {
        return err('featureId and status are required for update command');
      }
      try {
        const updated = await ctx.services.featureManagement.updateFeatureStatus(p);
        return 'Feature updated successfully:\n' + JSON.stringify(updated, null, 2);
      } catch (error) {
        return err(error instanceof Error ? error.message : String(error));
      }
    },
  },
  {
    command: 'link',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<Parameters<CommandContext['services']['featureManagement']['linkFeatureFiles']>[0]>(args);
      if (!p.featureId || !p.filePaths || p.filePaths.length === 0) {
        return err('featureId and filePaths are required for link command');
      }
      try {
        const associations = await ctx.services.featureManagement.linkFeatureFiles(p);
        return 'Files linked to feature successfully:\n' + JSON.stringify(associations, null, 2);
      } catch (error) {
        return err(error instanceof Error ? error.message : String(error));
      }
    },
  },
  {
    command: 'find',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<{ query: string; projectId?: string; maxResults?: number }>(args);
      if (!p.query) {
        return err('query is required for find command');
      }
      try {
        const projectId = p.projectId
          || ctx.services.featureManagement.getCurrentProject()
          || 'default-project';
        const similar = await ctx.services.featureManagement.findSimilarFeatures(
          p.query,
          projectId,
          p.maxResults,
        );
        if (similar.length === 0) {
          return 'No similar features found: []';
        }
        return `Similar features found (${similar.length}):\n` + JSON.stringify(similar, null, 2);
      } catch (error) {
        return err(error instanceof Error ? error.message : String(error));
      }
    },
  },
];

// ---------- tracking 工具 ----------

const trackingCommands: CommandSpec[] = [
  {
    command: 'register',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<{ featureId: string; name: string; filePath: string; framework: string; projectId?: string; testType?: string }>(args);
      if (!p.featureId || !p.name || !p.filePath || !p.framework) {
        return err('featureId, name, filePath, and framework are required');
      }
      const methodId = `test-${Date.now()}`;
      const projectId = p.projectId
        || ctx.services.featureManagement.getCurrentProject()
        || 'default-project';

      const testMethod: TestMethod = {
        id: methodId,
        featureId: p.featureId,
        projectId,
        name: p.name,
        filePath: p.filePath,
        status: 'pending',
        framework: p.framework,
        createdAt: new Date(),
        testType: p.testType as TestMethod['testType'],
      };

      try {
        await ctx.services.storage.registerTestMethod(testMethod);
        return 'Test method registered successfully:\n' + JSON.stringify(testMethod, null, 2);
      } catch (error) {
        return err(error instanceof Error ? error.message : String(error));
      }
    },
  },
  {
    command: 'result',
    schema: z.object({}).passthrough().superRefine((value: Record<string, unknown>, zctx) => {
      const result = value.result as { passed?: unknown } | undefined;
      if (result !== undefined && typeof result?.passed !== 'boolean') {
        zctx.addIssue({ code: z.ZodIssueCode.custom, message: 'result.passed must be boolean' });
      }
    }),
    handler: async (args, ctx) => {
      const p = as<{ methodId: string; result: { passed: boolean; duration?: number; output?: string; error?: string; coverage?: number } }>(args);
      if (!p.methodId || !p.result || typeof p.result.passed !== 'boolean') {
        return err('methodId and result (with boolean passed) are required for result command');
      }
      try {
        const ok = await ctx.services.storage.updateTestExecutionResult(p.methodId, {
          duration: p.result.duration ?? 0,
          passed: p.result.passed,
          output: p.result.output,
          error: p.result.error,
          coverage: p.result.coverage,
        });
        if (!ok) {
          return err(`Failed to update test execution result: ${p.methodId}`);
        }
        const updated = await ctx.services.storage.loadTestMethod(p.methodId);
        return 'Test execution result updated:\n' + JSON.stringify(updated, null, 2);
      } catch (error) {
        return err(error instanceof Error ? error.message : String(error));
      }
    },
  },
  {
    command: 'status',
    schema: passthrough,
    handler: async (args, ctx) => {
      const p = as<{ methodId: string; status: string }>(args);
      if (!p.methodId || !p.status) {
        return err('methodId and status are required for status command');
      }
      try {
        const ok = await ctx.services.storage.updateTestMethodStatus(p.methodId, p.status);
        if (!ok) {
          return err(`Failed to update test method status: ${p.methodId}`);
        }
        const updated = await ctx.services.storage.loadTestMethod(p.methodId);
        return 'Test method status updated:\n' + JSON.stringify(updated, null, 2);
      } catch (error) {
        return err(error instanceof Error ? error.message : String(error));
      }
    },
  },
];

// ---------- 工具级定义（inputSchema 与既有契约一致） ----------

function tddInputSchema(locale: SupportedLocale): Tool['inputSchema'] {
  return {
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
  };
}

function featureInputSchema(locale: SupportedLocale): Tool['inputSchema'] {
  return {
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
  };
}

function trackingInputSchema(_locale: SupportedLocale): Tool['inputSchema'] {
  return {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['register', 'result', 'status'],
        description: _locale === 'zh' ? '跟踪操作' : 'Tracking operation',
      },
      featureId: {
        type: 'string',
        description: _locale === 'zh' ? '功能ID' : 'Feature ID',
      },
      name: {
        type: 'string',
        description: _locale === 'zh' ? '测试方法名' : 'Test method name',
      },
      filePath: {
        type: 'string',
        description: _locale === 'zh' ? '测试文件路径' : 'Test file path',
      },
      framework: {
        type: 'string',
        description: _locale === 'zh' ? '测试框架' : 'Testing framework',
      },
      testType: {
        type: 'string',
        enum: ['unit', 'integration', 'e2e', 'performance'],
        description: _locale === 'zh' ? '测试类型（register 可选）' : 'Test type (optional for register)',
      },
      projectId: {
        type: 'string',
        description: _locale === 'zh' ? '项目ID（缺省用当前项目）' : 'Project ID (defaults to current project)',
      },
      methodId: {
        type: 'string',
        description: _locale === 'zh' ? '测试方法ID（result/status 用）' : 'Test method ID (for result/status)',
      },
      result: {
        type: 'object',
        description: _locale === 'zh'
          ? '执行结果（result 用）：{ passed: boolean, duration?: number, output?: string, error?: string, coverage?: number }'
          : 'Execution result (for result): { passed: boolean, duration?: number, output?: string, error?: string, coverage?: number }',
      },
      status: {
        type: 'string',
        enum: ['passed', 'failed', 'skipped', 'pending'],
        description: _locale === 'zh' ? '目标状态（status 用）' : 'Target status (for status)',
      },
    },
  };
}

/** 注册表主体：新增工具/子命令只改这里 */
export const TOOL_SPECS: ToolSpec[] = [
  { name: 'tdd', inputSchema: tddInputSchema, commands: tddCommands },
  { name: 'feature', inputSchema: featureInputSchema, commands: featureCommands },
  { name: 'tracking', inputSchema: trackingInputSchema, commands: trackingCommands },
];

export function findToolSpec(name: string): ToolSpec | undefined {
  return TOOL_SPECS.find(spec => spec.name === name);
}

export function findCommandSpec(tool: ToolSpec, command?: string): CommandSpec | undefined {
  return tool.commands.find(cmd => cmd.command === command);
}
