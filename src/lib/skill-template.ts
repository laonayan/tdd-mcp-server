/**
 * 技能模板纯函数（无 fs、无 import.meta —— 可在 jest CJS 模式下单测）
 */

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  raw: string;
}

/** 解析 YAML frontmatter（--- ... ---），返回字段与剥离后的正文 */
export function parseSkill(raw: string): { frontmatter: SkillFrontmatter; body: string } {
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) {
    return { frontmatter: { raw: '' }, body: raw.trim() };
  }

  const fields: Record<string, string> = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) fields[m[1]] = m[2].trim();
  }

  return {
    frontmatter: { name: fields['name'], description: fields['description'], raw: fm[1] },
    body: raw.slice(fm[0].length).trim(),
  };
}

/** 模板变量插值：{{KEY}} 按 args[key] / args[KEY]（大小写不敏感）替换 */
export function interpolate(
  template: string,
  args: Record<string, string | undefined>
): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key: string) => {
    const lower = key.toLowerCase();
    const value = args[key] ?? args[lower];
    return value !== undefined && value !== '' ? value : whole;
  });
}
