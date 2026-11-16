/**
 * 测试结果解析器（纯函数，零 IO）
 *
 * 从 TestRunnerService 下沉的核心解析逻辑：
 * - jest/mocha/pytest/generic：结构化 JSON → TestResults
 * - text：stdout/stderr 文本启发式
 * - xml：轻量 XML 匹配
 * 服务层只做编排（读文件/调网关），解析全部走这里。
 */
import { TestResults, TestSuiteResult, TestResult } from '../../types/tdd.js';

// ---------- JSON 输入形状（解析边界：unknown 入参 + 单点形状断言） ----------

interface CoverageMapJson { [file: string]: { s?: { [id: string]: number } } }
interface JestJson {
  testResults?: {
    name?: string; startTime: number; endTime: number;
    assertionResults?: {
      title?: string; fullName?: string; status: string;
      duration?: number; failureMessages?: string[];
    }[];
  }[];
  coverageMap?: CoverageMapJson;
}
interface MochaSuiteJson {
  title: string; duration?: number;
  tests?: { title: string; state: string; duration?: number; err?: { message?: string } }[];
  suites?: MochaSuiteJson[];
}
interface MochaJson { suites?: MochaSuiteJson[]; stats?: { duration?: number } }
interface PytestJson {
  tests?: {
    nodeid?: string; name?: string; outcome: string;
    call?: { duration?: number; longrepr?: string };
  }[];
}
interface VitestJson {
  numTotalTests?: number; numPassedTests?: number; numFailedTests?: number;
  numPendingTests?: number; numTodoTests?: number;
  testResults?: {
    name?: string; duration?: number;
    assertionResults?: {
      title?: string; fullName?: string; status: string;
      duration?: number; failureMessages?: string[];
    }[];
  }[];
}

// ---------- 状态映射 ----------

export function mapJestStatus(status: string): 'passed' | 'failed' | 'skipped' | 'pending' {
  switch (status) {
    case 'passed': return 'passed';
    case 'failed': return 'failed';
    case 'skipped': return 'skipped';
    case 'pending': return 'pending';
    default: return 'failed';
  }
}

export function mapMochaStatus(state: string): 'passed' | 'failed' | 'skipped' | 'pending' {
  switch (state) {
    case 'passed': return 'passed';
    case 'failed': return 'failed';
    case 'pending': return 'pending';
    default: return 'skipped';
  }
}

export function mapPytestStatus(outcome: string): 'passed' | 'failed' | 'skipped' | 'pending' {
  switch (outcome) {
    case 'passed': return 'passed';
    case 'failed': return 'failed';
    case 'skipped': return 'skipped';
    default: return 'failed';
  }
}

// ---------- 覆盖率汇总 ----------

export function calculateCoverageFromMap(coverageMap: CoverageMapJson): number {
  if (!coverageMap || typeof coverageMap !== 'object') {
    return 0;
  }

  let totalStatements = 0;
  let coveredStatements = 0;

  for (const coverage of Object.values(coverageMap)) {
    if (coverage.s) {
      const statements = Object.values(coverage.s) as number[];
      totalStatements += statements.length;
      coveredStatements += statements.filter(s => s > 0).length;
    }
  }

  return totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
}

// ---------- jest ----------

export function parseJestResults(data: unknown): TestResults {
  const json = data as JestJson;
  const suites: TestSuiteResult[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const testResult of json.testResults || []) {
    const tests: TestResult[] = [];

    for (const assertionResult of testResult.assertionResults || []) {
      tests.push({
        name: assertionResult.title || assertionResult.fullName || 'unknown',
        status: mapJestStatus(assertionResult.status),
        duration: assertionResult.duration || 0,
        error: assertionResult.failureMessages?.join('\n'),
      });
    }

    const suite: TestSuiteResult = {
      name: testResult.name || 'unknown',
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.status === 'passed').length,
        failed: tests.filter(t => t.status === 'failed').length,
        skipped: tests.filter(t => t.status === 'skipped').length,
        duration: testResult.endTime - testResult.startTime || 0,
      },
    };

    suites.push(suite);
    totalTests += suite.summary.total;
    totalPassed += suite.summary.passed;
    totalFailed += suite.summary.failed;
    totalSkipped += suite.summary.skipped;
    totalDuration += suite.summary.duration;
  }

  return {
    framework: 'jest',
    suites,
    overall: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration: totalDuration,
      coverage: json.coverageMap ? calculateCoverageFromMap(json.coverageMap) : undefined,
    },
    timestamp: new Date(),
  };
}

// ---------- mocha ----------

export function parseMochaResults(data: unknown): TestResults {
  const json = data as MochaJson;
  const suites: TestSuiteResult[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  const processSuite = (suite: MochaSuiteJson): TestSuiteResult => {
    const tests: TestResult[] = [];

    for (const test of suite.tests || []) {
      tests.push({
        name: test.title,
        status: mapMochaStatus(test.state),
        duration: test.duration || 0,
        error: test.err?.message,
      });
    }

    for (const nestedSuite of suite.suites || []) {
      const nestedResult = processSuite(nestedSuite);
      tests.push(...nestedResult.tests);
    }

    return {
      name: suite.title,
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.status === 'passed').length,
        failed: tests.filter(t => t.status === 'failed').length,
        skipped: tests.filter(t => t.status === 'skipped').length,
        duration: suite.duration || 0,
      },
    };
  };

  for (const suite of json.suites || []) {
    const suiteResult = processSuite(suite);
    suites.push(suiteResult);
    totalTests += suiteResult.summary.total;
    totalPassed += suiteResult.summary.passed;
    totalFailed += suiteResult.summary.failed;
    totalSkipped += suiteResult.summary.skipped;
  }

  return {
    framework: 'mocha',
    suites,
    overall: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration: json.stats?.duration || 0,
    },
    timestamp: new Date(),
  };
}

// ---------- pytest ----------

export function parsePytestResults(data: unknown): TestResults {
  const json = data as PytestJson;
  const suites: TestSuiteResult[] = [];
  const testsByFile = new Map<string, TestResult[]>();

  for (const test of json.tests || []) {
    const fileName = test.nodeid?.split('::')[0] || 'unknown';

    if (!testsByFile.has(fileName)) {
      testsByFile.set(fileName, []);
    }

    testsByFile.get(fileName)!.push({
      name: test.nodeid?.split('::').pop() || test.name || 'unknown',
      status: mapPytestStatus(test.outcome),
      duration: test.call?.duration || 0,
      error: test.call?.longrepr,
    });
  }

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const [fileName, tests] of testsByFile.entries()) {
    const suite: TestSuiteResult = {
      name: fileName,
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.status === 'passed').length,
        failed: tests.filter(t => t.status === 'failed').length,
        skipped: tests.filter(t => t.status === 'skipped').length,
        duration: tests.reduce((sum, test) => sum + test.duration, 0),
      },
    };

    suites.push(suite);
    totalTests += suite.summary.total;
    totalPassed += suite.summary.passed;
    totalFailed += suite.summary.failed;
    totalSkipped += suite.summary.skipped;
    totalDuration += suite.summary.duration;
  }

  return {
    framework: 'pytest',
    suites,
    overall: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration: totalDuration,
    },
    timestamp: new Date(),
  };
}

// ---------- vitest ----------

export function mapVitestStatus(status: string): 'passed' | 'failed' | 'skipped' {
  switch (status) {
    case 'pass': return 'passed';
    case 'fail': return 'failed';
    // skip 与 todo 均视为未执行用例
    case 'skip':
    case 'todo':
    case 'skipped': return 'skipped';
    default: return 'failed';
  }
}

export function parseVitestResults(data: unknown): TestResults {
  const json = data as VitestJson;
  const suites: TestSuiteResult[] = [];
  let totalDuration = 0;

  for (const testResult of json.testResults || []) {
    const tests: TestResult[] = [];

    for (const assertionResult of testResult.assertionResults || []) {
      tests.push({
        name: assertionResult.title || assertionResult.fullName || 'unknown',
        status: mapVitestStatus(assertionResult.status),
        // vitest 的 assertion 级无 duration 字段，用 0 占位（suite 层有耗时）
        duration: typeof assertionResult.duration === 'number' ? assertionResult.duration : 0,
        error: assertionResult.failureMessages?.length
          ? assertionResult.failureMessages.join('\n')
          : undefined,
      });
    }

    const duration = typeof testResult.duration === 'number'
      ? testResult.duration
      : 0;
    const suite: TestSuiteResult = {
      name: testResult.name || 'unknown',
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.status === 'passed').length,
        failed: tests.filter(t => t.status === 'failed').length,
        skipped: tests.filter(t => t.status === 'skipped').length,
        duration,
      },
    };

    suites.push(suite);
    totalDuration += duration;
  }

  const suiteTotals = suites.reduce(
    (acc, s) => ({
      total: acc.total + s.summary.total,
      passed: acc.passed + s.summary.passed,
      failed: acc.failed + s.summary.failed,
      skipped: acc.skipped + s.summary.skipped,
    }),
    { total: 0, passed: 0, failed: 0, skipped: 0 },
  );

  return {
    framework: 'vitest',
    suites,
    overall: {
      // 顶层 num* 为 vitest 官方计数，优先采信；缺失时按 suite 汇总兜底
      total: json.numTotalTests ?? suiteTotals.total,
      passed: json.numPassedTests ?? suiteTotals.passed,
      failed: json.numFailedTests ?? suiteTotals.failed,
      skipped: (json.numPendingTests ?? 0) + (json.numTodoTests ?? 0),
      duration: totalDuration,
    },
    timestamp: new Date(),
  };
}

// ---------- generic / text / xml ----------

export function parseGenericJsonResults(): TestResults {
  // 诚实性：读到 JSON 文件但没有该框架的专用解析器时，
  // 返回显式"无法解析"占位，绝不伪造通过状态或与输入无关的计数
  return {
    framework: 'generic',
    suites: [{
      name: '无法解析的结构化结果（该框架暂无专用 JSON 解析器）',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
    }],
    overall: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
    timestamp: new Date(),
  };
}

export function parseTextResults(
  stdout: string,
  stderr: string,
  frameworkName: string,
  duration: number,
): TestResults {
  const lines = (stdout + '\n' + stderr).split('\n');

  const passedTests = lines.filter(line =>
    line.includes('✓') || line.includes('PASSED') || line.includes('OK'),
  );
  const failedTests = lines.filter(line =>
    line.includes('✗') || line.includes('FAILED') || line.includes('ERROR'),
  );
  const skippedTests = lines.filter(line =>
    line.includes('SKIPPED') || line.includes('PENDING'),
  );

  const tests: TestResult[] = [
    ...passedTests.map((line, index) => ({
      name: `Test ${index + 1}`,
      status: 'passed' as const,
      duration: 0,
    })),
    ...failedTests.map((line, index) => ({
      name: `Failed Test ${index + 1}`,
      status: 'failed' as const,
      duration: 0,
      error: line,
    })),
    ...skippedTests.map((line, index) => ({
      name: `Skipped Test ${index + 1}`,
      status: 'skipped' as const,
      duration: 0,
    })),
  ];

  const suite: TestSuiteResult = {
    name: 'Test Suite',
    tests,
    summary: {
      total: tests.length,
      passed: passedTests.length,
      failed: failedTests.length,
      skipped: skippedTests.length,
      duration,
    },
  };

  return {
    framework: frameworkName,
    suites: [suite],
    overall: { ...suite.summary, duration },
    timestamp: new Date(),
  };
}

export function parseXmlResults(xmlContent: string, frameworkKey: string): TestResults {
  const testMatches = xmlContent.match(/<test[^>]*name="([^"]*)"[^>]*>/g);
  const tests: TestResult[] = [];

  if (testMatches) {
    for (const match of testMatches) {
      const nameMatch = match.match(/name="([^"]*)"/);
      const name = nameMatch?.[1] || 'Unknown Test';
      const status = xmlContent.includes('failure') ? 'failed' : 'passed';

      tests.push({ name, status, duration: 0 });
    }
  }

  const suite: TestSuiteResult = {
    name: 'Test Suite',
    tests,
    summary: {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      skipped: tests.filter(t => t.status === 'skipped').length,
      duration: 0,
    },
  };

  return {
    framework: frameworkKey,
    suites: [suite],
    overall: suite.summary,
    timestamp: new Date(),
  };
}
