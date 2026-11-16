/**
 * 进度通知（纯模块，无 import.meta——jest CJS 可转换）
 *
 * MCP 规范：客户端在请求 _meta.progressToken 提供令牌时，服务端可
 * 在长任务执行期间发送 notifications/progress（progressToken 必须回传）。
 * 未提供令牌或无发送通道时静默 no-op——对不使用进度的客户端零影响。
 */
export type SendNotification = (method: string, params: unknown) => Promise<void>;

export interface ProgressMeta {
  progressToken?: string | number;
}

export interface ProgressReporter {
  /** 第 index 步（0 基）结束/推进时调用；progress 发 index+1 */
  step(index: number, message: string): Promise<void>;
}

const noop: ProgressReporter = { step: async () => undefined };

export function createProgressReporter(
  meta: ProgressMeta | undefined,
  send: SendNotification | undefined,
  total: number,
): ProgressReporter {
  const token = meta?.progressToken;
  if (token === undefined || !send) {
    return noop;
  }

  return {
    step: async (index: number, message: string) => {
      await send('notifications/progress', {
        progressToken: token,
        progress: index + 1,
        total,
        message,
      });
    },
  };
}
