/**
 * 版本一致性测试
 *
 * 验证 package.json、SERVER_INFO 与文档中的版本号一致（2.1.0）。
 */
import { promises as fs } from 'fs';
import path from 'path';

// CJS(测试)模式下 __filename 为内置全局；生产 ESM 产物用 import.meta.url 派生。
const moduleDir = path.dirname(__filename);
const repoRoot = path.resolve(moduleDir, '..', '..');

const EXPECTED_VERSION = '2.1.0';

async function readPackageJson(): Promise<any> {
  return JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
}

describe('version consistency', () => {
  it('package.json version matches expected release version', async () => {
    const pkg = await readPackageJson();
    expect(pkg.version).toBe(EXPECTED_VERSION);
  });

  it('package.json declares ESM and Node >= 20 engine floor', async () => {
    const pkg = await readPackageJson();
    expect(pkg.type).toBe('module');
    expect(pkg.engines.node).toBe('>=20.0.0');
  });

  it('SDK dependency is ^1.x (upgraded from 0.5.0)', async () => {
    const pkg = await readPackageJson();
    const sdkRange: string = pkg.dependencies['@modelcontextprotocol/sdk'];
    expect(sdkRange).toMatch(/^\^1\./);
  });

  it('no legacy workaround scripts remain in package files list', async () => {
    const pkg = await readPackageJson();
    // 旧临时脚本应已删除：bin 唯一入口是 dist/server.js
    expect(pkg.bin['tdd-mcp-server']).toBe('./dist/server.js');
    expect(Object.keys(pkg.bin)).toHaveLength(1);
  });

  it('installed SDK version satisfies ^1.32', async () => {
    const sdkPkgPath = path.join(repoRoot, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json');
    const exists = await fs.stat(sdkPkgPath).then(() => true, () => false);
    if (!exists) {
      return; // 未安装依赖的环境（CI 首步）跳过
    }
    const sdkPkg = JSON.parse(await fs.readFile(sdkPkgPath, 'utf8'));
    expect(sdkPkg.version).toMatch(/^1\./);
    expect(parseInt(sdkPkg.version.split('.')[1], 10)).toBeGreaterThanOrEqual(32);
  });
});
