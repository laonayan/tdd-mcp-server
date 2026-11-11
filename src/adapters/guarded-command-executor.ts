/**
 * 受守卫的命令执行器（V3 唯一 spawn 网关）
 *
 * 所有业务代码的子进程执行必须经过这里。网关统一强制：
 * 1. 嵌套测试环境（jest/vitest worker 或我方子进程树标记）直接拒绝；
 * 2. 子进程注入 TDD_MCP_NESTED_RUN 标记 + NODE_OPTIONS 堆内存上限；
 * 3. maxBuffer / timeout 必有上限（禁止无界输出与无限等待）。
 *
 * 架构测试（src/adapters/__tests__/architecture.test.ts）锁定：
 * child_process 仅允许被本目录与 execution-guard 引用。
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { isNestedExecution, buildChildProcessEnv } from '../services/execution-guard.js';

const execAsync = promisify(exec);

/** 网关级默认上限 */
export const DEFAULT_MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10MB
export const DEFAULT_TIMEOUT_MS = 300000; // 5 分钟

/** 嵌套环境拒绝执行时抛出的错误标识（调用方据此降级） */
export class NestedExecutionError extends Error {
  constructor(command: string) {
    super(
      'Skipped nested test execution: already running inside a test runner ' +
      `(recursive self-invocation guard). Command not run: ${command}`,
    );
    this.name = 'NestedExecutionError';
  }
}

export class GuardedCommandExecutor {
  /**
   * @throws NestedExecutionError 处于嵌套测试执行环境
   * @throws Error 命令执行失败（非零退出码/超时/超过 maxBuffer）
   */
  async execute(
    command: string,
    options: { cwd: string; timeoutMs?: number; maxBuffer?: number },
  ): Promise<{ stdout: string; stderr: string }> {
    if (isNestedExecution()) {
      throw new NestedExecutionError(command);
    }

    return execAsync(command, {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER_BYTES,
      env: buildChildProcessEnv(),
    });
  }
}
