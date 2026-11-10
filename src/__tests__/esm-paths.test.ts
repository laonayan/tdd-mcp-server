/**
 * ESM 路径解析测试
 *
 * 验证 package 声明 "type": "module" 后，
 * best-practices/ 与 templates/ 目录通过 import.meta.url 正确解析。
 */
import { promises as fs } from 'fs';
import path from 'path';

// CJS(测试)模式下 __filename 为内置全局；生产 ESM 产物用 import.meta.url 派生。
// 测试以 CJS 转换运行，因此此处直接使用内建 __filename。
const moduleDir = path.dirname(__filename);

// 与 src/handlers/resources.ts / prompts.ts 相同的解析逻辑：
// dist/handlers/x.js -> repo root（向上两级）
const repoRoot = path.resolve(moduleDir, '..', '..');

describe('ESM path resolution', () => {
  describe('packaged asset directories', () => {
    it('best-practices directory exists at computed path', async () => {
      const dir = path.join(repoRoot, 'best-practices');
      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('best-practices contains at least one markdown file', async () => {
      const dir = path.join(repoRoot, 'best-practices');
      const files = await fs.readdir(dir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThanOrEqual(1);
      expect(mdFiles).toContain('unit-testing.md');
    });

    it('templates directory exists with tdd-workflow.md', async () => {
      const templatePath = path.join(repoRoot, 'templates', 'tdd-workflow.md');
      const content = await fs.readFile(templatePath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('module semantics', () => {
    it('this module resolves to a path inside the repository', () => {
      expect(moduleDir.includes(path.join('tdd-mcp-server', 'src'))).toBe(true);
    });

    it('package.json declares "type": "module"', async () => {
      const pkgPath = path.join(repoRoot, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      expect(pkg.type).toBe('module');
    });
  });
});
