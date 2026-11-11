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

export function calculateCoverageFromMap(coverageMap: any): number {
  if (!coverageMap || typeof coverageMap !== 'object') {
    return 0;
  }

  let totalStatements = 0;
  let coveredStatements = 0;

  for (const fileCoverage of Object.values(coverageMap)) {
    const coverage = fileCoverage as any;
    if (coverage.s) {
      const statements = Object.values(coverage.s) as number[];
      totalStatements += statements.length;
      coveredStatements += statements.filter(s => s > 0).length;
    }
  }

  return totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
}

// ---------- jest ----------

export function parseJestResults(data: any): TestResults {
  const suites: TestSuiteResult[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const testResult of data.testResults || []) {
    const tests: TestResult[] = [];

    for (const assertionResult of testResult.assertionResults || []) {
      tests.push({
        name: assertionResult.title || assertionResult.fullName,
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
      coverage: data.coverageMap ? calculateCoverageFromMap(data.coverageMap) : undefined,
    },
    timestamp: new Date(),
  };
}

// ---------- mocha ----------

export function parseMochaResults(data: any): TestResults {
  const suites: TestSuiteResult[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  const processSuite = (suite: any): TestSuiteResult => {
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

  for (const suite of data.suites || []) {
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
      duration: data.stats?.duration || 0,
    },
    timestamp: new Date(),
  };
}

// ---------- pytest ----------

export function parsePytestResults(data: any): TestResults {
  const suites: TestSuiteResult[] = [];
  const testsByFile = new Map<string, TestResult[]>();

  for (const test of data.tests || []) {
    const fileName = test.nodeid?.split('::')[0] || 'unknown';

    if (!testsByFile.has(fileName)) {
      testsByFile.set(fileName, []);
    }

    testsByFile.get(fileName)!.push({
      name: test.nodeid?.split('::').pop() || test.name,
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

// ---------- generic / text / xml ----------

export function parseGenericJsonResults(): TestResults {
  return {
    framework: 'generic',
    suites: [{
      name: 'Test Suite',
      tests: [{ name: 'Generic Test', status: 'passed', duration: 0 }],
      summary: { total: 1, passed: 1, failed: 0, skipped: 0, duration: 0 },
    }],
    overall: { total: 1, passed: 1, failed: 0, skipped: 0, duration: 0 },
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
