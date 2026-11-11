/**
 * TDD 循环分析（纯函数，零 IO）
 *
 * 从 TDDCycleValidatorService 下沉的核心分析：
 * - 提交模式分析（测试/实现/重构提交识别与反模式检测）
 * - 代码质量启发式（重复行、复杂度、长方法检测）
 * - 测试输出解析（快速判定通过/失败数）
 */

// ---------- 提交模式分析 ----------

export interface CommitPatternAnalysis {
  testCommits: number;
  implementationCommits: number;
  refactorCommits: number;
  hasImplementationBeforeTests: boolean;
  lacksTestCommits: boolean;
  lacksRefactorCommits: boolean;
  hasMultipleFeatureCommits: boolean;
}

export function analyzeCommitPatterns(commits: string[]): CommitPatternAnalysis {
  const testKeywords = ['test', 'spec', 'TDD', 'failing test', 'red'];
  const implementationKeywords = ['implement', 'add', 'feature', 'fix', 'green'];
  const refactorKeywords = ['refactor', 'cleanup', 'improve', 'extract', 'rename'];

  let testCommits = 0;
  let implementationCommits = 0;
  let refactorCommits = 0;
  let hasImplementationBeforeTests = false;

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i].toLowerCase();

    const isTest = testKeywords.some(keyword => commit.includes(keyword));
    const isImplementation = implementationKeywords.some(keyword => commit.includes(keyword));
    const isRefactor = refactorKeywords.some(keyword => commit.includes(keyword));

    if (isTest) testCommits++;
    if (isImplementation) implementationCommits++;
    if (isRefactor) refactorCommits++;

    // 检测"实现先于测试"反模式
    if (isImplementation && i > 0) {
      const previousCommit = commits[i - 1].toLowerCase();
      const previousIsTest = testKeywords.some(keyword => previousCommit.includes(keyword));
      if (!previousIsTest) {
        hasImplementationBeforeTests = true;
      }
    }
  }

  return {
    testCommits,
    implementationCommits,
    refactorCommits,
    hasImplementationBeforeTests,
    lacksTestCommits: testCommits === 0 && commits.length > 0,
    lacksRefactorCommits: refactorCommits === 0,
    hasMultipleFeatureCommits: implementationCommits > 2,
  };
}

// ---------- 测试输出快速解析 ----------

export function parseQuickTestOutput(output: string, command: string): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  if (command.includes('jest') || command.includes('npm test')) {
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    passed = passMatch ? parseInt(passMatch[1]) : 0;
    failed = failMatch ? parseInt(failMatch[1]) : 0;
  } else if (command.includes('pytest')) {
    const resultMatch = output.match(/(\d+) passed(?:, (\d+) failed)?/);
    if (resultMatch) {
      passed = parseInt(resultMatch[1]);
      failed = resultMatch[2] ? parseInt(resultMatch[2]) : 0;
    }
  } else if (command.includes('go test')) {
    const passMatch = output.match(/ok\s+\S+/g);
    const failMatch = output.match(/FAIL\s+\S+/g);
    passed = passMatch ? passMatch.length : 0;
    failed = failMatch ? failMatch.length : 0;
  } else {
    const passedLines = output.split('\n').filter(line =>
      line.includes('passed') || line.includes('OK') || line.includes('✓'),
    ).length;
    const failedLines = output.split('\n').filter(line =>
      line.includes('failed') || line.includes('FAIL') || line.includes('✗') || line.includes('ERROR'),
    ).length;

    passed = passedLines;
    failed = failedLines;
  }

  return { passed, failed };
}

// ---------- 代码质量启发式 ----------

export interface CodeQualityAnalysis {
  duplicationCount: number;
  complexityIssues: number;
  longMethods: number;
}

export function detectSimpleDuplication(content: string): number {
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('*'));

  const lineMap = new Map<string, number>();

  for (const line of lines) {
    if (line.length > 20) { // 只统计有实质内容的行
      lineMap.set(line, (lineMap.get(line) || 0) + 1);
    }
  }

  let duplicateLines = 0;
  for (const count of lineMap.values()) {
    if (count > 1) {
      duplicateLines += count - 1;
    }
  }

  return Math.floor(duplicateLines / 3); // 按潜在重复块分组
}

export function detectComplexityIssues(content: string): number {
  let complexity = 0;

  const nestedIfMatches = content.match(/if\s*\([^)]*\)\s*\{[^}]*if\s*\(/g);
  complexity += nestedIfMatches ? nestedIfMatches.length : 0;

  const complexBooleanMatches = content.match(/if\s*\([^)]*(&&|||)[^)]*(&&|||)[^)]*\)/g);
  complexity += complexBooleanMatches ? complexBooleanMatches.length : 0;

  const longParamMatches = content.match(/\([^)]*,[^)]*,[^)]*,[^)]*,[^)]*\)/g);
  complexity += longParamMatches ? longParamMatches.length : 0;

  return complexity;
}

export function detectLongMethods(content: string): number {
  let longMethods = 0;

  const methodPatterns = [
    /function\s+\w+\s*\([^)]*\)\s*\{/g,
    /def\s+\w+\s*\([^)]*\):/g,
    /(?:public|private|protected)?\s*\w+\s+\w+\s*\([^)]*\)\s*\{/g,
  ];

  for (const pattern of methodPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const methodStart = match.index;
      const methodEnd = findMethodEndIndex(content, methodStart);
      const methodLines = content.substring(methodStart, methodEnd).split('\n').length;

      if (methodLines > 20) {
        longMethods++;
      }
    }
  }

  return longMethods;
}

/** 简单花括号配对扫描（跳过字符串字面量） */
export function findMethodEndIndex(content: string, startIndex: number): number {
  let braceCount = 0;
  let inString = false;
  let stringChar = '';

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (inString) {
      if (char === stringChar && content[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === '\'' || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return i + 1;
      }
    }
  }

  return content.length;
}

export function analyzeCodeQualityContent(
  contents: string[],
): CodeQualityAnalysis {
  const analysis: CodeQualityAnalysis = {
    duplicationCount: 0,
    complexityIssues: 0,
    longMethods: 0,
  };

  for (const content of contents) {
    analysis.duplicationCount += detectSimpleDuplication(content);
    analysis.complexityIssues += detectComplexityIssues(content);
    analysis.longMethods += detectLongMethods(content);
  }

  return analysis;
}
