import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * V3 架构守卫：child_process 只允许出现在唯一 spawn 网关与 execution-guard。
 * 业务代码直接 spawn 在结构上被禁止（漏接守卫=整机假死风险）。
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

/** 允许 import child_process 的白名单（相对 src/） */
const ALLOWED = new Set([
  'adapters/guarded-command-executor.ts',
  'services/execution-guard.ts',
]);

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.name.endsWith('.ts')) {
      yield full;
    }
  }
}

describe('架构守卫：child_process 白名单', () => {
  it('src 内只有网关与 execution-guard 引用 child_process', async () => {
    const violations: string[] = [];

    for await (const file of walk(SRC_DIR)) {
      const rel = path.relative(SRC_DIR, file).split(path.sep).join('/');
      if (rel.includes('__tests__')) {
        continue; // 测试可以 mock child_process
      }
      const content = await fs.readFile(file, 'utf8');
      if (/from\s+'(node:)?child_process'/.test(content) && !ALLOWED.has(rel)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });

  it('core 纯层不 import adapters/services（依赖只能向内）', async () => {
    const violations: string[] = [];

    for await (const file of walk(path.join(SRC_DIR, 'core'))) {
      const rel = path.relative(SRC_DIR, file).split(path.sep).join('/');
      const content = await fs.readFile(file, 'utf8');
      if (/from\s+'(\.\.\/)+(adapters|services)\//.test(content)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });
});
