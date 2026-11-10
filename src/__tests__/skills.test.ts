/**
 * 技能资产测试
 *
 * 验证 skills/<name>/SKILL.md 存在、frontmatter 合法，
 * 以及 skill-template 纯函数（解析 + 插值）的正确性。
 */
import { promises as fs } from 'fs';
import path from 'path';
import { parseSkill, interpolate } from '../lib/skill-template.js';

const skillsDir = path.resolve(__dirname, '..', '..', 'skills');
const EXPECTED_SKILLS = ['tdd-workflow', 'test-generation', 'debugging'];

describe('skills assets', () => {
  it.each(EXPECTED_SKILLS)('%s/SKILL.md exists with valid frontmatter', async (name) => {
    const raw = await fs.readFile(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
    const { frontmatter, body } = parseSkill(raw);

    expect(frontmatter.name).toBe(name);
    expect(frontmatter.description).toMatch(/\S+/);
    expect(body.length).toBeGreaterThan(100);
  });

  it('tdd-workflow skill carries evidence discipline (Evidence over Claims)', async () => {
    const { body } = parseSkill(
      await fs.readFile(path.join(skillsDir, 'tdd-workflow', 'SKILL.md'), 'utf8'),
    );
    expect(body).toContain('Evidence over Claims');
    expect(body).toMatch(/RED/);
    expect(body).toMatch(/GREEN/);
    expect(body).toMatch(/REFACTOR/);
  });

  it('debugging skill has four-phase process', async () => {
    const { body } = parseSkill(
      await fs.readFile(path.join(skillsDir, 'debugging', 'SKILL.md'), 'utf8'),
    );
    expect(body).toContain('Phase 1');
    expect(body).toContain('Phase 4');
  });

  it('legacy assets remain readable (best-practices compat)', async () => {
    const bp = await fs.readFile(
      path.resolve(skillsDir, '..', 'best-practices', 'unit-testing.md'),
      'utf8',
    );
    expect(bp.length).toBeGreaterThan(100);
  });
});

describe('skill-template pure functions', () => {
  it('parseSkill strips frontmatter and extracts fields', () => {
    const raw = '---\nname: demo\ndescription: 一个演示\n---\n\n# 正文\n内容';
    const { frontmatter, body } = parseSkill(raw);
    expect(frontmatter.name).toBe('demo');
    expect(frontmatter.description).toBe('一个演示');
    expect(body).not.toMatch(/^---/);
    expect(body).toContain('# 正文');
  });

  it('parseSkill passes through files without frontmatter', () => {
    const { frontmatter, body } = parseSkill('# 纯正文');
    expect(frontmatter.name).toBeUndefined();
    expect(body).toBe('# 纯正文');
  });

  it('interpolate replaces known keys and keeps unknown placeholders', () => {
    const out = interpolate(
      '语言 {{LANGUAGE}}，需求 {{REQUIREMENTS}}，未知 {{UNKNOWN_KEY}}',
      { language: 'typescript', REQUIREMENTS: '登录' },
    );
    expect(out).toContain('typescript');
    expect(out).toContain('登录');
    expect(out).toContain('{{UNKNOWN_KEY}}');
  });
});
