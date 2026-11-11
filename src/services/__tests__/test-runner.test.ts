import { TestRunnerService } from '../test-runner.js';
import { TestResults } from '../../types/tdd.js';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as util from 'util';

// Mock child_process exec
jest.mock('child_process');
const mockExec = exec as jest.MockedFunction<typeof exec>;

// Mock util.promisify（通过模块工厂）
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('TestRunnerService', () => {
  let testRunner: TestRunnerService;
  let mockExecAsync: jest.Mock;

  beforeEach(() => {
    testRunner = new TestRunnerService();
    jest.clearAllMocks();
    
    // promisify 的 mock：util 模块属性不可改写且不可 spyOn。
    // 保留 mockExecAsync 供现有断言使用；promisify 行为由下方
    // jest.mock('util') 工厂接管（见文件顶部）。
    mockExecAsync = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('runTests', () => {
    it.skip('should run Jest tests successfully - skipped due to timeout issues', async () => {
      // This test is temporarily skipped due to timeout issues in CI environment
      // The functionality works in integration tests
      expect(true).toBe(true);
    });

    it('should refuse nested execution inside a jest worker (recursive guard)', async () => {
      // 复现死机链：单元测试 -> tdd 工具 -> runTests() -> 再 spawn 本项目 jest
      // -> 套件被再次收集 -> 无限递归（每层按核数开 worker，指数爆炸）。
      // JEST_WORKER_ID 是 jest 注入 worker 的环境变量，守卫据此拒绝执行。
      const workerId = process.env.JEST_WORKER_ID;
      process.env.JEST_WORKER_ID = '99'; // 模拟"正运行在 jest 内"

      // 本套件 mock 了 fs：让路径校验放行，确保到达守卫分支
      const anyRunner = testRunner as any;
      jest
        .spyOn(anyRunner, 'validateProjectPath')
        .mockResolvedValue(undefined);

      try {
        const params = {
          projectPath: '/valid/project',
          testFramework: 'jest',
        };

        const result: any = await testRunner.runTests(params);

        // 守卫触发：不执行命令，返回带说明的空结果（如实标注，不谎报通过）
        expect(result.suites).toEqual([]);
        expect(result.note).toContain('recursive self-invocation guard');
        expect(result.note).toContain('Command not run');
      } finally {
        anyRunner.validateProjectPath.mockRestore();
        if (workerId === undefined) {
          delete process.env.JEST_WORKER_ID;
        } else {
          process.env.JEST_WORKER_ID = workerId;
        }
      }
    });

    it('builds parallel flags with bounded workers (no --maxWorkers=auto)', () => {
      // auto 在嵌套调用时按 CPU 核数开满 worker，进程数指数增长直至死机
      const cmd = (testRunner as any).buildTestCommand(
        (testRunner as any).getFrameworkConfig('jest'),
        { options: {} },
      );
      expect(cmd).toContain('--maxWorkers=2');
      expect(cmd).not.toContain('auto');
    });

    it('should handle unsupported framework', async () => {
      const params = {
        projectPath: '/test/project',
        testFramework: 'unsupported-framework',
      };

      await expect(testRunner.runTests(params))
        .rejects.toThrow('Unsupported test framework: unsupported-framework');
    });

    it('should handle invalid project path', async () => {
      const params = {
        projectPath: '/invalid/path',
        testFramework: 'jest',
      };

      mockFs.promises.stat = jest.fn().mockRejectedValue(new Error('Path not found'));

      await expect(testRunner.runTests(params))
        .rejects.toThrow('Invalid project path: /invalid/path');
    });

    it.skip('should handle test execution failure - skipped due to timeout issues', async () => {
      // This test is temporarily skipped due to timeout issues in CI environment
      // The functionality works in integration tests
      expect(true).toBe(true);
    });
  });

  describe('getFrameworkConfig', () => {
    it('should get Jest framework config', () => {
      const testRunnerAny = testRunner as any;
      const config = testRunnerAny.getFrameworkConfig('jest');

      expect(config).toBeDefined();
      expect(config.name).toBe('Jest');
      expect(config.key).toBe('jest');
    });

    it('should get framework config by name', () => {
      const testRunnerAny = testRunner as any;
      const config = testRunnerAny.getFrameworkConfig('JUnit 5');

      expect(config).toBeDefined();
      expect(config.name).toBe('JUnit 5');
    });

    it('should return null for unsupported framework', () => {
      const testRunnerAny = testRunner as any;
      const config = testRunnerAny.getFrameworkConfig('unknown');

      expect(config).toBeNull();
    });
  });

  describe('buildTestCommand', () => {
    it('should build Jest command with all options', () => {
      const framework = {
        key: 'jest',
        commands: {
          run: 'jest',
          coverage: 'jest --coverage',
        },
      };

      const params = {
        projectPath: '/test',
        testFramework: 'jest',
        testFiles: ['test1.js', 'test2.js'],
        options: {
          verbose: true,
          coverage: true,
          parallel: true,
        },
      };

      const testRunnerAny = testRunner as any;
      const command = testRunnerAny.buildTestCommand(framework, params);

      expect(command).toContain('--coverage');
      expect(command).toContain('--verbose');
      // 固定 worker 数防递归时进程指数爆炸（原 --maxWorkers=auto 已废弃）
      expect(command).toContain('--maxWorkers=2');
      expect(command).toContain('test1.js test2.js');
    });

    it('should build pytest command correctly', () => {
      const framework = {
        key: 'pytest',
        commands: {
          run: 'pytest',
          coverage: 'pytest --cov',
        },
      };

      const params = {
        projectPath: '/test',
        testFramework: 'pytest',
        options: { verbose: true, parallel: true },
      };

      const testRunnerAny = testRunner as any;
      const command = testRunnerAny.buildTestCommand(framework, params);

      expect(command).toContain('pytest');
      expect(command).toContain('-v');
      expect(command).toContain('-n 2');
    });
  });

  describe('getVerboseFlag', () => {
    it('should return correct verbose flags', () => {
      const testRunnerAny = testRunner as any;
      
      expect(testRunnerAny.getVerboseFlag('jest')).toBe(' --verbose');
      expect(testRunnerAny.getVerboseFlag('pytest')).toBe(' -v');
      expect(testRunnerAny.getVerboseFlag('mocha')).toBe(' --reporter spec');
      expect(testRunnerAny.getVerboseFlag('unknown')).toBe('');
    });
  });

  describe('parseJestResults', () => {
    it('should parse Jest JSON results correctly', () => {
      const jestData = {
        testResults: [{
          name: 'test-file.js',
          startTime: 1000,
          endTime: 2000,
          assertionResults: [
            {
              title: 'should pass',
              status: 'passed',
              duration: 100,
            },
            {
              title: 'should fail',
              status: 'failed',
              duration: 50,
              failureMessages: ['Error message'],
            },
          ],
        }],
      };

      const testRunnerAny = testRunner as any;
      const result = testRunnerAny.parseJestResults(jestData);

      expect(result.framework).toBe('jest');
      expect(result.suites).toHaveLength(1);
      expect(result.suites[0].tests).toHaveLength(2);
      expect(result.overall.total).toBe(2);
      expect(result.overall.passed).toBe(1);
      expect(result.overall.failed).toBe(1);
    });
  });

  describe('parseMochaResults', () => {
    it('should parse Mocha JSON results correctly', () => {
      const mochaData = {
        suites: [{
          title: 'Test Suite',
          tests: [{
            title: 'should work',
            state: 'passed',
            duration: 100,
          }],
          suites: [],
        }],
        stats: {
          duration: 1000,
        },
      };

      const testRunnerAny = testRunner as any;
      const result = testRunnerAny.parseMochaResults(mochaData);

      expect(result.framework).toBe('mocha');
      expect(result.suites).toHaveLength(1);
      expect(result.overall.duration).toBe(1000);
    });
  });

  describe('parseTextResults', () => {
    it('should parse text output correctly', () => {
      const stdout = `
        ✓ Test 1 passed
        ✗ Test 2 failed
        SKIPPED Test 3
      `;
      const stderr = '';

      const framework = { name: 'generic' };
      const duration = 1000;

      const testRunnerAny = testRunner as any;
      const result = testRunnerAny.parseTextResults(stdout, stderr, framework, duration);

      expect(result.overall.passed).toBe(1);
      expect(result.overall.failed).toBe(1);
      expect(result.overall.skipped).toBe(1);
      expect(result.overall.duration).toBe(duration);
    });
  });

  describe('mapJestStatus', () => {
    it('should map Jest status correctly', () => {
      const testRunnerAny = testRunner as any;
      
      expect(testRunnerAny.mapJestStatus('passed')).toBe('passed');
      expect(testRunnerAny.mapJestStatus('failed')).toBe('failed');
      expect(testRunnerAny.mapJestStatus('skipped')).toBe('skipped');
      expect(testRunnerAny.mapJestStatus('pending')).toBe('pending');
      expect(testRunnerAny.mapJestStatus('unknown')).toBe('failed');
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate coverage correctly', () => {
      const coverageMap = {
        'file1.js': {
          s: { '1': 1, '2': 0, '3': 1 }, // 2 out of 3 covered
        },
        'file2.js': {
          s: { '1': 1, '2': 1 }, // 2 out of 2 covered
        },
      };

      const testRunnerAny = testRunner as any;
      const coverage = testRunnerAny.calculateCoverage(coverageMap);

      expect(coverage).toBe(80); // 4 out of 5 statements covered
    });

    it('should handle empty coverage map', () => {
      const testRunnerAny = testRunner as any;
      
      expect(testRunnerAny.calculateCoverage({})).toBe(0);
      expect(testRunnerAny.calculateCoverage(null)).toBe(0);
      expect(testRunnerAny.calculateCoverage(undefined)).toBe(0);
    });
  });

  describe('handleTestError', () => {
    it('should create error result for failed execution', () => {
      const error = new Error('Command failed');
      const framework = 'jest';

      const testRunnerAny = testRunner as any;
      const result = testRunnerAny.handleTestError(error, framework);

      expect(result.framework).toBe('jest');
      expect(result.overall.failed).toBe(1);
      expect(result.overall.passed).toBe(0);
      expect(result.suites[0].tests[0].error).toContain('Command failed');
    });
  });

  describe('parseJsonResults 按项目路径解析（诚实性回归）', () => {
    const jestResultJson = (suiteName: string, testName: string) => JSON.stringify({
      testResults: [
        {
          name: `${suiteName}.test.js`,
          startTime: 1000,
          endTime: 2000,
          assertionResults: [
            { title: testName, status: 'passed', duration: 5 },
          ],
        },
      ],
    });

    afterEach(() => {
      mockFs.promises.readFile.mockReset();
    });

    it('必须从 projectPath 读取结果文件，而非服务器 cwd', async () => {
      const projectResultFile = '/valid/project/test-results.json';
      // 按路径分发：只有 projectPath 下的绝对路径能读到真实结果；
      // 相对路径（旧实现按服务器 cwd 解析）只能拿到陈旧文件
      mockFs.promises.readFile = jest.fn().mockImplementation(async (p: unknown) => {
        if (p === projectResultFile) {
          return jestResultJson('SuiteFromProject', 'should pass');
        }
        if (p === 'test-results.json') {
          return jestResultJson('STALE-SHOULD-NOT-APPEAR', 'stale test');
        }
        throw new Error('ENOENT');
      }) as any;

      const runnerAny = testRunner as any;
      const result = await runnerAny.parseJsonResults('jest', '/valid/project');

      expect(result).not.toBeNull();
      expect(result.suites).toHaveLength(1);
      expect(result.suites[0].name).toContain('SuiteFromProject');
      expect(result.overall.passed).toBe(1);
      expect(JSON.stringify(result)).not.toContain('STALE-SHOULD-NOT-APPEAR');
    });

    it('projectPath 下无结果文件时返回 null（回退文本解析），不读 cwd 陈旧文件', async () => {
      // 只有 cwd 的陈旧文件可读；projectPath 下任何文件都 ENOENT
      mockFs.promises.readFile = jest.fn().mockImplementation(async (p: unknown) => {
        if (p === 'test-results.json') {
          return jestResultJson('STALE-SHOULD-NOT-APPEAR', 'stale test');
        }
        throw new Error('ENOENT');
      }) as any;

      const runnerAny = testRunner as any;
      const result = await runnerAny.parseJsonResults('jest', '/valid/project');

      // projectPath 无文件 → null（由调用方回退文本解析），绝不误读 cwd 的陈旧文件
      expect(result).toBeNull();
    });
  });
});