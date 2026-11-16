/**
 * 进度通知模块测试（纯逻辑，假 sendNotification 收集调用）
 */
import { createProgressReporter } from '../progress-reporter.js';

function fakeSend(): { send: jest.Mock; calls: Array<{ method: string; params: unknown }> } {
  const calls: Array<{ method: string; params: unknown }> = [];
  const send = jest.fn(async (method: string, params: unknown) => {
    calls.push({ method, params });
  });
  return { send, calls };
}

describe('createProgressReporter', () => {
  it('携带 progressToken 时按步发送 notifications/progress', async () => {
    const { send, calls } = fakeSend();
    const reporter = createProgressReporter({ progressToken: 'tok-1' }, send, 5);

    await reporter.step(0, '生成测试用例');
    await reporter.step(1, '生成最小实现');

    expect(send).toHaveBeenCalledTimes(2);
    expect(calls[0]).toEqual({
      method: 'notifications/progress',
      params: { progressToken: 'tok-1', progress: 1, total: 5, message: '生成测试用例' },
    });
    expect(calls[1].params.progress).toBe(2);
  });

  it('数字 token 原样透传', async () => {
    const { send, calls } = fakeSend();
    const reporter = createProgressReporter({ progressToken: 42 }, send, 3);
    await reporter.step(2, 'done');
    expect(calls[0].params.progressToken).toBe(42);
    expect(calls[0].params.progress).toBe(3);
  });

  it('无 progressToken 时完全静默', async () => {
    const { send } = fakeSend();
    const reporter = createProgressReporter({}, send, 5);
    await reporter.step(0, 'x');
    expect(send).not.toHaveBeenCalled();
  });

  it('无 send 通道时静默（不抛错）', async () => {
    const reporter = createProgressReporter({ progressToken: 't' }, undefined, 5);
    await expect(reporter.step(0, 'x')).resolves.toBeUndefined();
  });

  it('_meta 缺失时静默', async () => {
    const { send } = fakeSend();
    const reporter = createProgressReporter(undefined, send, 5);
    await reporter.step(0, 'x');
    expect(send).not.toHaveBeenCalled();
  });
});
