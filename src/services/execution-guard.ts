/**
 * 嵌套执行防护 + 子进程资源上限（防进程树指数爆炸导致整机假死）
 *
 * 背景：tdd 工具会真实执行目标项目的测试命令（jest/vitest/pytest...）。
 * 当被测项目自身又调用本工具（dogfooding / AI 代理循环）时，会形成
 * "测试进程 -> tdd 工具 -> 再起测试进程" 的递归；每层按固定 worker 数
 * 派生进程，进程数与内存指数增长，直至整台设备假死。
 *
 * 防护策略（双层）：
 * 1. 检测：isNestedExecution() —— 当前进程已处于任何测试运行器内
 *    （JEST_WORKER_ID / VITEST_POOL_ID），或处于我们派生的子进程树中
 *    （TDD_MCP_NESTED_RUN 标记）时，禁止再派生测试进程。
 * 2. 限额：buildChildProcessEnv() —— 我们派生的所有子进程继承
 *    NODE_OPTIONS=--max-old-space-size=<MB>（默认 1024MB，可用
 *    TDD_MCP_CHILD_MEMORY_LIMIT_MB 覆盖）。即使出现未预期的递归，
 * 每个 node 进程的堆也被硬性封顶，宁可单进程 OOM 退出，也不拖死整机。
 */

/** 子进程树嵌套标记：由 buildChildProcessEnv() 注入，树内所有后代继承 */
export const NESTED_RUN_ENV_KEY = 'TDD_MCP_NESTED_RUN';

/** 子进程 node 堆上限（MB）覆盖开关（环境变量名） */
export const CHILD_MEMORY_LIMIT_ENV_KEY = 'TDD_MCP_CHILD_MEMORY_LIMIT_MB';

/** 子进程 node 堆默认上限：1024MB（足够常规测试套件，异常时快速失败） */
export const DEFAULT_CHILD_MEMORY_LIMIT_MB = 1024;

/**
 * 当前是否处于嵌套测试执行环境。
 * 为 true 时，任何"再 spawn 测试命令"的路径都必须拒绝执行并降级返回。
 */
export function isNestedExecution(): boolean {
  return (
    Boolean(process.env.JEST_WORKER_ID) ||
    Boolean(process.env.VITEST_POOL_ID) ||
    process.env[NESTED_RUN_ENV_KEY] === '1'
  );
}

/**
 * 构造派生子进程用的环境变量：
 * - 打上嵌套标记（TDD_MCP_NESTED_RUN=1），子树内任何再入的测试执行都会被守卫拒绝；
 * - 在 NODE_OPTIONS 末尾追加 --max-old-space-size（V8 取最后一个 flag，
 *   确保我们的上限生效），对整棵子树中所有 node 进程硬性封顶堆内存。
 */
export function buildChildProcessEnv(): NodeJS.ProcessEnv {
  const raw = parseInt(process.env[CHILD_MEMORY_LIMIT_ENV_KEY] || '', 10);
  const limitMb =
    Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CHILD_MEMORY_LIMIT_MB;

  const existing = (process.env.NODE_OPTIONS || '').trim();
  const nodeOptions = `${existing} --max-old-space-size=${limitMb}`.trim();

  return {
    ...process.env,
    [NESTED_RUN_ENV_KEY]: '1',
    NODE_OPTIONS: nodeOptions,
  };
}
