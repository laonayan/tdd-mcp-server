/**
 * TestRunnerService：vitest 接线与结果文件新鲜度校验
 *
 * 注入 fake CommandExecutor（零真实 spawn）；
 * fs 全 mock：stat 提供 mtime，readFile 提供结果文件内容。
 */
import { TestRunnerService } from '../test-runner.js';
import type { CommandExecutor } from '../../core/ports.js';
import * as fs from 'fs';

jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

function fakeExecutor(stdout = '', stderr = ''): CommandExecutor {
  return {
    execute: jest.fn().mockResolvedValue({ stdout, stderr }),
  } as unknown as CommandExecutor;
}

const vitestJson = {
  numTotalTests: 2,
  numPassedTests: 1,
  numFailedTests: 1,
  numPendingTests: 0,
  testResults: [
    {
      name: '/project/math.test.ts',
      duration: 40,
      assertionResults: [
        { title: 'adds', status: 'pass', failureMessages: [] },
        {
          title: 'subtracts',
          status: 'fail',
          failureMessages: ['AssertionError: expected 5 to be 3'],
        },
      ],
    },
  ],
};

describe('TestRunnerService vitest 接线与新鲜度校验', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JEST_WORKER_ID;
    // 路径校验放行（目录）
    (mockFs.promises.stat as jest.Mock).mockImplementation(async () => ({
      isDirectory: () => true,
      mtimeMs: Date.now(),
    }));
  });

  it('vitest 结果文件被结构化解析（不再落到 generic 假数据）', async () => {
    (mockFs.promises.stat as jest.Mock).mockImplementation(async (p: string) => ({
      isDirectory: () => !String(p).includes('.json'),
      // 结果文件比进程启动"更晚"写出
      mtimeMs: Date.now() + 10_000,
    }));
    (mockFs.promises.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(vitestJson),
    );

    const service = new TestRunnerService(
      fakeExecutor('Test Files 1 failed', ''),
    );
    const result = await service.runTests({
      projectPath: '/project',
      testFramework: 'vitest',
    });

    expect(result.framework).toBe('vitest');
    expect(result.overall.failed).toBe(1);
    expect(result.overall.passed).toBe(1);
    expect(result.suites[0].tests.find(t => t.status === 'failed')?.error)
      .toContain('AssertionError');
  });

  it('陈旧结果文件被忽略，回退本次 stdout 文本解析', async () => {
    (mockFs.promises.stat as jest.Mock).mockImplementation(async (p: string) => ({
      isDirectory: () => !String(p).includes('.json'),
      // 结果文件比本次运行"更早"：上一次运行遗留
      mtimeMs: Date.now() - 60_000,
    }));
    (mockFs.promises.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(vitestJson),
    );

    const service = new TestRunnerService(
      fakeExecutor('FAILED src/math.test.ts > subtracts\n', ''),
    );
    const result = await service.runTests({
      projectPath: '/project',
      testFramework: 'vitest',
    });

    // 不采信陈旧 JSON；文本解析反映本次失败
    expect(result.overall.passed).toBe(0);
    expect(result.overall.failed).toBeGreaterThanOrEqual(1);
    expect(result.suites[0].tests[0].error).toContain('subtracts');
  });

  it('stat 失败时不因新鲜度校验崩溃（回退文本解析）', async () => {
    (mockFs.promises.stat as jest.Mock).mockImplementation(async (p: string) => {
      if (String(p).endsWith('.json')) {
        throw new Error('ENOENT');
      }
      return { isDirectory: () => true };
    });

    const service = new TestRunnerService(fakeExecutor('OK all passed', ''));
    const result = await service.runTests({
      projectPath: '/project',
      testFramework: 'jest',
    });

    expect(result.framework).toBe('Jest');
  });
});
