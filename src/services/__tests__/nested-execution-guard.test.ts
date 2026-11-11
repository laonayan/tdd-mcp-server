import { TestRunnerService } from '../test-runner.js';
import { CoverageAnalyzerService } from '../coverage-analyzer.js';
import { TDDCycleValidatorService } from '../tdd-cycle-validator.js';
import {
  isNestedExecution,
  buildChildProcessEnv,
  NESTED_RUN_ENV_KEY,
  CHILD_MEMORY_LIMIT_ENV_KEY,
  DEFAULT_CHILD_MEMORY_LIMIT_MB,
} from '../execution-guard.js';
import * as util from 'util';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

// 复现路径（系统假死根因）：单元测试 -> tdd 工具 -> validateCycle ->
// runQuickTests() -> 再 spawn `npm test`/`jest` -> 套件被再次收集执行 ->
// 无限递归；每层固定派生 worker，进程树指数膨胀直至整台设备假死。
// 本文件锁定回归：任何 spawn 测试命令的路径都必须先过嵌套执行守卫，
// 且派生子进程必须携带内存上限（NODE_OPTIONS）与嵌套标记。
jest.mock('util', () => {
  const actual = jest.requireActual('util');
  // 单例 mock：所有 service 顶层的 promisify(exec) 拿到同一个受控实例
  const sharedExecAsync = jest.fn();
  return {
    ...actual,
    promisify: jest.fn(() => sharedExecAsync),
    __sharedExecAsync: sharedExecAsync,
  };
});

const utilMock = util as unknown as { __sharedExecAsync: jest.Mock };
const mockExecAsync: jest.Mock = utilMock.__sharedExecAsync;

describe('嵌套执行守卫（递归进程爆炸回归）', () => {
  let tmpDir: string;
  let runner: TestRunnerService;
  let coverage: CoverageAnalyzerService;
  let validator: TDDCycleValidatorService;

  const ENV_KEYS = ['JEST_WORKER_ID', 'TDD_MCP_NESTED_RUN', 'NODE_OPTIONS'] as const;
  let savedEnv: Record<string, string | undefined>;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tdd-nested-guard-'));
    // 让 hasTestFiles() 判定为"存在测试文件"，从而走到 runQuickTests
    await fs.writeFile(path.join(tmpDir, 'sample.test.ts'), 'it("x", () => {});\n', 'utf8');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
    }
    runner = new TestRunnerService();
    coverage = new CoverageAnalyzerService();
    validator = new TDDCycleValidatorService();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
    mockExecAsync.mockReset();
  });

  /** 模拟"正运行在测试运行器内/我们的子进程树内" */
  function setNested(nested: boolean): void {
    if (nested) {
      process.env.JEST_WORKER_ID = '99';
      process.env.TDD_MCP_NESTED_RUN = '1';
    } else {
      delete process.env.JEST_WORKER_ID;
      delete process.env.TDD_MCP_NESTED_RUN;
    }
  }

  it('runQuickTests 在嵌套环境中必须拒绝 spawn 任何测试命令', async () => {
    setNested(true);
    mockExecAsync.mockResolvedValue({ stdout: '1 passed', stderr: '' });

    const result = await (validator as any).runQuickTests(tmpDir);

    // 降级返回全零（不谎报），但绝不派生进程
    expect(result).toEqual({ passed: 0, failed: 0 });
    expect(mockExecAsync).not.toHaveBeenCalled();
  });

  it('validateCycle 在嵌套环境中必须零 spawn 完成（含状态探测）', async () => {
    setNested(true);
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

    const validation = await validator.validateCycle({
      projectPath: tmpDir,
      // 提供 gitHistory，避免 getRecentCommits 走真实 git 命令
      gitHistory: ['abc1234 test: add login flow'],
    });

    expect(validation).toBeDefined();
    expect(mockExecAsync).not.toHaveBeenCalled();
  });

  it('analyzeCoverage 在嵌套环境中必须拒绝执行覆盖率（测试）命令', async () => {
    setNested(true);
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

    await expect(
      coverage.analyzeCoverage({
        projectPath: tmpDir,
        testCommand: 'jest',
        outputFormat: 'json',
      }),
    ).rejects.toThrow(/nested/i);

    expect(mockExecAsync).not.toHaveBeenCalled();
  });

  it('runTests 派生子进程必须携带嵌套标记与 node 堆内存上限', async () => {
    setNested(false);
    delete process.env.NODE_OPTIONS;
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

    await runner.runTests({ projectPath: tmpDir, testFramework: 'jest' });

    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    const opts = mockExecAsync.mock.calls[0][1] as {
      env?: Record<string, string | undefined>;
      maxBuffer?: number;
    };

    // 子进程树带上嵌套标记：树内任何再入的 tdd 调用都会被守卫拒绝
    expect(opts.env?.TDD_MCP_NESTED_RUN).toBe('1');
    // 内存硬上限：即使发生未预期的递归，单进程堆也被封顶
    expect(opts.env?.NODE_OPTIONS).toMatch(/--max-old-space-size=\d+/);
    expect(opts.maxBuffer).toBe(10 * 1024 * 1024);
  });

  it('runQuickTests 在非嵌套环境中 spawn 时也必须携带标记与输出上限', async () => {
    setNested(false);
    mockExecAsync.mockResolvedValue({ stdout: '5 passed, 0 failed', stderr: '' });

    const result = await (validator as any).runQuickTests(tmpDir);

    expect(result).toEqual({ passed: 5, failed: 0 });
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    const opts = mockExecAsync.mock.calls[0][1] as {
      env?: Record<string, string | undefined>;
      maxBuffer?: number;
    };
    expect(opts.env?.TDD_MCP_NESTED_RUN).toBe('1');
    expect(opts.env?.NODE_OPTIONS).toMatch(/--max-old-space-size=\d+/);
    expect(opts.maxBuffer).toBeGreaterThanOrEqual(1024 * 1024);
  });
});

describe('execution-guard 模块单元测试', () => {
  const ENV_KEYS = [
    'JEST_WORKER_ID',
    'VITEST_POOL_ID',
    NESTED_RUN_ENV_KEY,
    CHILD_MEMORY_LIMIT_ENV_KEY,
    'NODE_OPTIONS',
  ] as const;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('无任何测试运行器标记时不是嵌套环境', () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    expect(isNestedExecution()).toBe(false);
  });

  it('JEST_WORKER_ID / VITEST_POOL_ID / 嵌套标记任一命中即为嵌套环境', () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    process.env.JEST_WORKER_ID = '1';
    expect(isNestedExecution()).toBe(true);
    delete process.env.JEST_WORKER_ID;

    process.env.VITEST_POOL_ID = '0';
    expect(isNestedExecution()).toBe(true);
    delete process.env.VITEST_POOL_ID;

    process.env[NESTED_RUN_ENV_KEY] = '1';
    expect(isNestedExecution()).toBe(true);
  });

  it('buildChildProcessEnv 默认注入 1024MB 堆上限与嵌套标记', () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    const env = buildChildProcessEnv();

    expect(env[NESTED_RUN_ENV_KEY]).toBe('1');
    expect(env.NODE_OPTIONS).toBe(`--max-old-space-size=${DEFAULT_CHILD_MEMORY_LIMIT_MB}`);
  });

  it('buildChildProcessEnv 保留既有 NODE_OPTIONS，且内存上限追加在末尾生效', () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    process.env.NODE_OPTIONS = '--enable-source-maps --max-old-space-size=8192';

    const env = buildChildProcessEnv();

    // 保留既有 flag；V8 对重复 flag 取最后一个，我方上限必须排在末尾
    expect(env.NODE_OPTIONS).toContain('--enable-source-maps');
    expect(env.NODE_OPTIONS?.endsWith(
      `--max-old-space-size=${DEFAULT_CHILD_MEMORY_LIMIT_MB}`,
    )).toBe(true);
  });

  it('TDD_MCP_CHILD_MEMORY_LIMIT_MB 可覆盖默认堆上限', () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    process.env[CHILD_MEMORY_LIMIT_ENV_KEY] = '512';

    const env = buildChildProcessEnv();

    expect(env.NODE_OPTIONS).toBe('--max-old-space-size=512');
  });
});
