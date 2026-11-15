/**
 * vitest JSON 结果解析器测试（纯函数，零 mock）
 *
 * fixture 采用 vitest --reporter=json 的真实输出形状：
 * - assertionResults[].status: 'pass' | 'fail' | 'skip' | 'todo'
 * - 顶层 num* 计数字段
 * - testResults[].duration 为 suite 耗时
 */
import {
  parseVitestResults,
  parseGenericJsonResults,
} from '../parsers/test-results.js';

const failingVitestJson = {
  numTotalTestSuites: 1,
  numPassedTestSuites: 0,
  numFailedTestSuites: 1,
  numPendingTestSuites: 0,
  numTotalTests: 3,
  numPassedTests: 1,
  numFailedTests: 1,
  numPendingTests: 0,
  numTodoTests: 1,
  startTime: 1731000000000,
  success: false,
  testResults: [
    {
      assertionResults: [
        {
          ancestorTitles: ['math'],
          fullName: 'math adds two numbers',
          status: 'pass',
          title: 'adds two numbers',
          failureMessages: [],
        },
        {
          ancestorTitles: ['math'],
          fullName: 'math subtracts two numbers',
          status: 'fail',
          title: 'subtracts two numbers',
          failureMessages: ['AssertionError: expected 5 to be 3\n    at /src/math.test.ts:4:20'],
        },
        {
          ancestorTitles: ['math'],
          fullName: 'math divides two numbers',
          status: 'todo',
          title: 'divides two numbers',
          failureMessages: [],
        },
      ],
      name: '/project/math.test.ts',
      status: 'failed',
      startTime: 1731000000000,
      endTime: 1731000000150,
      duration: 150,
    },
  ],
};

describe('parseVitestResults', () => {
  it('如实报告失败用例（不伪造通过）', () => {
    const results = parseVitestResults(failingVitestJson);

    expect(results.framework).toBe('vitest');
    expect(results.overall.total).toBe(3);
    expect(results.overall.failed).toBe(1);
    expect(results.overall.passed).toBe(1);
    expect(results.overall.skipped).toBe(1);
  });

  it('失败用例携带文件中的错误信息', () => {
    const results = parseVitestResults(failingVitestJson);
    const failed = results.suites[0].tests.find(t => t.status === 'failed');

    expect(failed).toBeDefined();
    expect(failed?.error).toContain('AssertionError: expected 5 to be 3');
    expect(failed?.error).toContain('math.test.ts');
  });

  it('pass/fail/skip/todo 状态正确映射，todo/skip 计入 skipped', () => {
    const results = parseVitestResults(failingVitestJson);
    const statuses = results.suites[0].tests.map(t => t.status);

    expect(statuses).toEqual(['passed', 'failed', 'skipped']);
  });

  it('suite 名称与耗时来自 testResults 条目', () => {
    const results = parseVitestResults(failingVitestJson);

    expect(results.suites[0].name).toBe('/project/math.test.ts');
    expect(results.suites[0].summary.duration).toBe(150);
    expect(results.overall.duration).toBe(150);
  });

  it('顶层计数缺失时按 suite 汇总兜底', () => {
    const minimal = {
      testResults: [
        {
          assertionResults: [{ status: 'pass', title: 'ok', fullName: 'ok' }],
          name: '/project/a.test.ts',
          duration: 10,
        },
      ],
    };
    const results = parseVitestResults(minimal);

    expect(results.overall.total).toBe(1);
    expect(results.overall.passed).toBe(1);
    expect(results.overall.failed).toBe(0);
  });

  it('全挂套件不会被报告为通过（诚实性回归）', () => {
    const allFail = {
      ...failingVitestJson,
      numPassedTests: 0,
      numFailedTests: 3,
      testResults: [
        {
          ...failingVitestJson.testResults[0],
          assertionResults: failingVitestJson.testResults[0].assertionResults.map(a => ({
            ...a,
            status: 'fail',
          })),
        },
      ],
    };
    const results = parseVitestResults(allFail);

    expect(results.overall.passed).toBe(0);
    expect(results.overall.failed).toBe(3);
  });
});

describe('parseGenericJsonResults（不伪造结果）', () => {
  it('不包含任何 passed 用例且 total=0', () => {
    const results = parseGenericJsonResults();

    expect(results.overall.total).toBe(0);
    expect(results.overall.passed).toBe(0);
    expect(results.overall.failed).toBe(0);
    expect(results.suites).toHaveLength(1);
    expect(results.suites[0].tests.every(t => t.status !== 'passed')).toBe(true);
  });

  it('占位结果说明结构化解析不可用', () => {
    const results = parseGenericJsonResults();

    const flat = JSON.stringify(results);
    expect(flat).toContain('无法解析');
  });
});
