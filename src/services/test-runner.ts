import { promises as fs } from 'fs';
import path from 'path';
import {
  TestResults,
} from '../types/tdd.js';
import { SUPPORTED_FRAMEWORKS } from '../types/test-frameworks.js';
import { isNestedExecution } from './execution-guard.js';
// 纯核心解析器（零 IO）：V3 架构下沉层
import * as parsers from '../core/parsers/test-results.js';
// V3：唯一受守卫 spawn 网关
import { GuardedCommandExecutor } from '../adapters/guarded-command-executor.js';
import type { CommandExecutor } from '../core/ports.js';

interface TestRunnerParams {
  projectPath: string;
  testFiles?: string[];
  testFramework: string;
  options?: {
    verbose?: boolean;
    coverage?: boolean;
    watch?: boolean;
    parallel?: boolean;
    timeout?: number;
  };
}

/**
 * 测试执行编排层（V3）：命令构建 + 受守卫执行 + 结果文件定位；
 * 解析逻辑全部委托 src/core/parsers（纯函数）。
 */
export class TestRunnerService {
  private readonly executor: CommandExecutor;

  constructor(executor?: CommandExecutor) {
    this.executor = executor ?? new GuardedCommandExecutor();
  }

  async runTests(params: TestRunnerParams): Promise<TestResults> {
    const { projectPath, testFiles, testFramework, options = {} } = params;

    // Validate framework
    const framework = this.getFrameworkConfig(testFramework);
    if (!framework) {
      throw new Error(`Unsupported test framework: ${testFramework}`);
    }

    // Validate project path
    await this.validateProjectPath(projectPath);

    // Build and execute test command
    const command = this.buildTestCommand(framework, params);

    // 防递归：检测自身嵌套执行。tdd 工具会真实运行测试；若本服务正被
    // 测试进程调用（jest worker / 我方派生的子进程树），再 spawn 测试
    // 命令会形成无限递归（每层固定 worker 数，进程数指数增长直至假死）。
    if (isNestedExecution()) {
      return this.buildRecursiveGuardResult(framework.key, command);
    }

    try {
      const startTime = Date.now();
      // V3：经唯一网关执行（嵌套拒绝/内存上限/maxBuffer/timeout 由网关统一保证）
      const { stdout, stderr } = await this.executor.execute(command, {
        cwd: projectPath,
        timeoutMs: options.timeout || 300000,
      });
      const endTime = Date.now();

      // Parse test results（解析走纯核心层）
      return this.parseTestResults(
        stdout,
        stderr,
        framework,
        endTime - startTime,
        projectPath,
      );
    } catch (error: any) {
      return this.handleTestError(error, testFramework);
    }
  }

  private getFrameworkConfig(frameworkName: string): any {
    const frameworks = SUPPORTED_FRAMEWORKS as Record<string, any>;

    for (const [key, config] of Object.entries(frameworks)) {
      if (config.name.toLowerCase() === frameworkName.toLowerCase() ||
          key === frameworkName.toLowerCase()) {
        return { ...config, key };
      }
    }

    return null;
  }

  private async validateProjectPath(projectPath: string): Promise<void> {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error(`Project path is not a directory: ${projectPath}`);
      }
    } catch (error) {
      throw new Error(`Invalid project path: ${projectPath}`);
    }
  }

  /** 递归保护时返回的降级结果：如实标注被跳过及原因（不谎报通过） */
  private buildRecursiveGuardResult(frameworkKey: string, command: string): any {
    return {
      framework: frameworkKey,
      suites: [],
      overall: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
      timestamp: new Date(),
      note: 'Skipped nested test execution: already running inside a jest worker ' +
        '(recursive self-invocation guard). Command not run: ' + command,
    };
  }

  private buildTestCommand(framework: any, params: TestRunnerParams): string {
    const { testFiles, options = {} } = params;
    let command = framework.commands.run;

    if (options.coverage && framework.commands.coverage) {
      command = framework.commands.coverage;
    }

    if (options.verbose) {
      command += this.getVerboseFlag(framework.key);
    }

    if (options.parallel !== false) {
      command += this.getParallelFlag(framework.key);
    }

    if (testFiles && testFiles.length > 0) {
      command += ` ${testFiles.join(' ')}`;
    }

    command += this.getJsonOutputFlag(framework.key);

    return command;
  }

  private getVerboseFlag(frameworkKey: string): string {
    const verboseFlags: Record<string, string> = {
      jest: ' --verbose',
      mocha: ' --reporter spec',
      vitest: ' --reporter=verbose',
      pytest: ' -v',
      unittest: ' -v',
      junit5: ' -Dtest.verbose=true',
      xunit: ' -verbose',
      gotest: ' -v',
      cargo_test: ' --verbose',
      phpunit: ' --verbose',
    };

    return verboseFlags[frameworkKey] || '';
  }

  private getParallelFlag(frameworkKey: string): string {
    const parallelFlags: Record<string, string> = {
      // 注意：不使用 --maxWorkers=auto。tdd 工具允许嵌套调用场景，
      // auto 在多层叠加时按 CPU 核数开满 worker，进程数指数增长。
      jest: ' --maxWorkers=2',
      vitest: ' --pool=threads --poolOptions.threads.maxThreads=2',
      pytest: ' -n 2',
      junit5: ' -Djunit.parallel.enabled=true',
      gotest: ' -parallel 2',
      cargo_test: ' --jobs 2',
    };

    return parallelFlags[frameworkKey] || '';
  }

  private getJsonOutputFlag(frameworkKey: string): string {
    const jsonFlags: Record<string, string> = {
      jest: ' --json --outputFile=test-results.json',
      mocha: ' --reporter json --reporter-options output=test-results.json',
      vitest: ' --reporter=json --outputFile=test-results.json',
      pytest: ' --json-report --json-report-file=test-results.json',
      junit5: ' -Djunit.platform.reporting.output.dir=test-results',
      xunit: ' -xml test-results.xml',
      gotest: ' -json > test-results.json',
      cargo_test: ' --format json > test-results.json',
      phpunit: ' --log-json test-results.json',
    };

    return jsonFlags[frameworkKey] || '';
  }

  private async parseTestResults(
    stdout: string,
    stderr: string,
    framework: any,
    duration: number,
    projectPath: string,
  ): Promise<TestResults> {
    try {
      const jsonResults = await this.parseJsonResults(framework.key, projectPath);
      if (jsonResults) {
        return jsonResults;
      }
    } catch (error) {
      // Fall back to parsing stdout/stderr
    }

    return parsers.parseTextResults(stdout, stderr, framework.name, duration);
  }

  private async parseJsonResults(
    frameworkKey: string,
    projectPath: string,
  ): Promise<TestResults | null> {
    const jsonFiles = [
      'test-results.json',
      'test-results.xml',
      'coverage/coverage-final.json',
    ];

    // 结果文件由被测项目的测试命令写入 projectPath，必须按项目路径读取；
    // 相对路径会落到服务器进程 cwd，读到陈旧/无关文件（诚实性缺陷）
    for (const fileName of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(projectPath, fileName), 'utf8');

        if (fileName.endsWith('.json')) {
          const data = JSON.parse(content);
          return this.convertJsonToTestResults(data, frameworkKey);
        } else if (fileName.endsWith('.xml')) {
          return parsers.parseXmlResults(content, frameworkKey);
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  private convertJsonToTestResults(data: any, frameworkKey: string): TestResults {
    switch (frameworkKey) {
      case 'jest':
        return parsers.parseJestResults(data);
      case 'mocha':
        return parsers.parseMochaResults(data);
      case 'pytest':
        return parsers.parsePytestResults(data);
      default:
        return parsers.parseGenericJsonResults();
    }
  }

  private handleTestError(error: any, framework: string): TestResults {
    const errorMessage = error.message || error.toString();

    return {
      framework,
      suites: [{
        name: 'Test Execution Error',
        tests: [{
          name: 'Test Runner Error',
          status: 'failed',
          duration: 0,
          error: errorMessage,
        }],
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0,
        },
      }],
      overall: {
        total: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
      },
      timestamp: new Date(),
    };
  }
}
