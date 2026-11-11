import {
  parseJestResults,
  parseMochaResults,
  parsePytestResults,
  parseTextResults,
  parseXmlResults,
  mapJestStatus,
  calculateCoverageFromMap,
} from '../parsers/test-results.js';
import {
  calculateTextSimilarity,
  calculateTagSimilarity,
  calculateFeatureSimilarity,
} from '../similarity.js';
import {
  analyzeCommitPatterns,
  parseQuickTestOutput,
  detectSimpleDuplication,
  detectComplexityIssues,
  detectLongMethods,
  findMethodEndIndex,
} from '../analysis.js';
import { Feature } from '../../types/storage.js';

/**
 * V3 纯核心层测试：直接数据进出，零 mock（无 fs/child_process/util 依赖）。
 */

const feature = (over: Partial<Feature> = {}): Feature => ({
  id: 'f1',
  projectId: 'p1',
  name: 'User Login',
  description: 'Authenticate users with email and password',
  status: 'planning',
  priority: 'medium',
  acceptanceCriteria: ['User can login with email'],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  tags: ['auth'],
  ...over,
});

describe('core/parsers/test-results（纯函数）', () => {
  it('jest：通过/失败/失败信息与覆盖率汇总', () => {
    const result = parseJestResults({
      testResults: [{
        name: 'a.test.js',
        startTime: 1000,
        endTime: 2500,
        assertionResults: [
          { title: 'ok', status: 'passed', duration: 10 },
          { title: 'bad', status: 'failed', duration: 5, failureMessages: ['boom'] },
        ],
      }],
      coverageMap: { 'a.js': { s: { '1': 1, '2': 0 } } },
    });

    expect(result.framework).toBe('jest');
    expect(result.overall.total).toBe(2);
    expect(result.overall.passed).toBe(1);
    expect(result.overall.failed).toBe(1);
    expect(result.overall.duration).toBe(1500);
    expect(result.overall.coverage).toBe(50);
    expect(result.suites[0].tests[1].error).toContain('boom');
  });

  it('mocha：嵌套 suite 展平', () => {
    const result = parseMochaResults({
      suites: [{
        title: 'outer',
        tests: [{ title: 't1', state: 'passed', duration: 3 }],
        suites: [{
          title: 'inner',
          tests: [{ title: 't2', state: 'failed', err: { message: 'x' } }],
          suites: [],
        }],
      }],
      stats: { duration: 42 },
    });

    expect(result.suites[0].tests).toHaveLength(2);
    expect(result.overall.duration).toBe(42);
    expect(result.overall.failed).toBe(1);
  });

  it('pytest：按文件分组、nodeid 拆解', () => {
    const result = parsePytestResults({
      tests: [
        { nodeid: 'tests/a.py::test_one', outcome: 'passed', call: { duration: 2 } },
        { nodeid: 'tests/a.py::test_two', outcome: 'failed', call: { duration: 4, longrepr: 'err' } },
        { nodeid: 'tests/b.py::test_three', outcome: 'skipped' },
      ],
    });

    expect(result.suites).toHaveLength(2);
    expect(result.suites[0].name).toBe('tests/a.py');
    expect(result.suites[0].summary.failed).toBe(1);
  });

  it('text：✓/✗/SKIPPED 计数', () => {
    const result = parseTextResults('✓ a\n✗ b\nSKIPPED c\n', '', 'generic', 999);
    expect(result.overall).toMatchObject({ passed: 1, failed: 1, skipped: 1, duration: 999 });
  });

  it('xml：test 节点与 failure 判定', () => {
    const result = parseXmlResults('<tests><test name="x"/></tests>', 'xunit');
    expect(result.overall.total).toBe(1);
    expect(result.overall.passed).toBe(1);
  });

  it('状态映射边界', () => {
    expect(mapJestStatus('unknown')).toBe('failed');
  });

  it('覆盖率：空/异常输入归零', () => {
    expect(calculateCoverageFromMap({})).toBe(0);
    expect(calculateCoverageFromMap(null)).toBe(0);
  });
});

describe('core/similarity（纯函数）', () => {
  it('完全包含查询文本得满分', () => {
    expect(calculateTextSimilarity('user login page', 'user login page', ['user', 'login'])).toBe(1);
  });

  it('词级匹配与部分匹配加权', () => {
    const score = calculateTextSimilarity('user login page', 'zzz', ['user', 'login', 'zzz']);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('标签完全匹配', () => {
    expect(calculateTagSimilarity(['auth', 'user'], ['auth'])).toBe(1);
  });

  it('四维加权：名称命中给出理由', () => {
    const r = calculateFeatureSimilarity(feature(), ['user', 'login'], 'user login');
    expect(r.score).toBeGreaterThan(0.3);
    expect(r.reasons.some(x => x.startsWith('Name similarity'))).toBe(true);
  });

  it('无关联查询得零分', () => {
    const r = calculateFeatureSimilarity(feature(), ['database', 'migration'], 'database migration');
    expect(r.score).toBe(0);
  });
});

describe('core/analysis（纯函数）', () => {
  it('提交模式：测试/实现/重构计数与反模式检测', () => {
    const r = analyzeCommitPatterns([
      'abc test: add login spec',
      'def feat: implement login',
      'ghi refactor: extract helper',
    ]);
    expect(r.testCommits).toBe(1);
    // 既有语义：关键词集合有重叠（"add" 同时是 test 提交里的实现关键词），如实断言
    expect(r.implementationCommits).toBe(2);
    expect(r.refactorCommits).toBe(1);
    // abc 是 test 提交，紧随其后的实现提交不构成反模式
    expect(r.hasImplementationBeforeTests).toBe(false);

    const bad = analyzeCommitPatterns([
      'abc chore: update deps',
      'def feat: implement login',
    ]);
    expect(bad.hasImplementationBeforeTests).toBe(true);
  });

  it('jest 输出快速解析', () => {
    expect(parseQuickTestOutput('Tests: 5 passed, 2 failed', 'npm test'))
      .toEqual({ passed: 5, failed: 2 });
  });

  it('重复行检测按块计（floor(重复行数/3)）', () => {
    const line = '    const veryLongUniqueLine = computeSomething(now);';
    // 3 次重复 → 2 条多余行 → floor(2/3) = 0（既有语义：凑满 3 条多余才计 1 块）
    const three = [line, line, line, 'const other = 1;'].join('\n');
    expect(detectSimpleDuplication(three)).toBe(0);
    // 4 次重复 → 3 条多余行 → 1 块
    const four = [line, line, line, line, 'const other = 1;'].join('\n');
    expect(detectSimpleDuplication(four)).toBe(1);
  });

  it('复杂度启发式：多条正则叠加计数（既有语义）', () => {
    const code = 'if (a) { if (b) { x(); } }';
    // 嵌套 if 命中 1 + 复杂布尔/长参启发式再命中 2 → 合计 3
    expect(detectComplexityIssues(code)).toBe(3);
  });

  it('长方法检测与括号配对（跳过字符串）', () => {
    expect(findMethodEndIndex('f("{") } tail', 0)).toBeGreaterThan(0);
    const longBody = Array.from({ length: 25 }, (_, i) => `  // line ${i}`).join('\n');
    const method = `function big() {\n${longBody}\n}`;
    // 既有语义：function 声明同时命中两条方法识别正则 → 计 2
    expect(detectLongMethods(method)).toBe(2);
    expect(detectLongMethods('function small() { return 1; }')).toBe(0);
  });
});
