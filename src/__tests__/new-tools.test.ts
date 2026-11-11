import { NewToolsHandler } from '../handlers/new-tools.js';
import { I18nService } from '../i18n.js';
import { FeatureManagementService } from '../services/feature-management.service.js';
import { StorageService } from '../services/storage.service.js';
import { Feature, TestMethod } from '../types/storage.js';

describe('NewToolsHandler', () => {
  let toolsHandler: NewToolsHandler;
  let i18nService: I18nService;

  beforeEach(() => {
    i18nService = new I18nService();
    toolsHandler = new NewToolsHandler(i18nService);
  });

  describe('工具列表测试', () => {
    test('应该返回3个主要工具', async () => {
      const result = await toolsHandler.listTools({ method: 'tools/list', params: {} });
      
      expect(result.tools).toHaveLength(3);
      expect(result.tools.map(t => t.name)).toEqual(['tdd', 'feature', 'tracking']);
    });

    test('应该支持中文工具描述', async () => {
      i18nService.setLocale('zh');
      const result = await toolsHandler.listTools({ method: 'tools/list', params: {} });
      
      const tddTool = result.tools.find(t => t.name === 'tdd');
      expect(tddTool?.description).toContain('测试驱动开发');
    });

    test('应该支持英文工具描述', async () => {
      i18nService.setLocale('en');
      const result = await toolsHandler.listTools({ method: 'tools/list', params: {} });
      
      const tddTool = result.tools.find(t => t.name === 'tdd');
      expect(tddTool?.description).toContain('Test-Driven Development');
    });
  });

  describe('TDD工具调用测试', () => {
    test('应该支持默认完整TDD流程（真实结果摘要）', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tdd',
          arguments: {
            requirements: '用户登录功能 should authenticate user',
          },
        },
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
      const text = (result.content as { type: string; text: string }[])[0].text;
      expect(text).toContain('完整TDD流程执行完成');
      // 真实产物摘要：每步带括号内的执行证据（Evidence over Claims）
      expect(text).toMatch(/生成测试用例（/);
      expect(text).toMatch(/生成最小实现（/);
    });

    test('应该支持generate子命令（返回真实生成的测试结构）', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tdd',
          arguments: {
            command: 'generate',
            requirements: '用户登录功能 should authenticate with valid credentials',
            language: 'typescript',
            framework: 'jest',
            testType: 'unit',
          },
        },
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
      const text = (result.content as { type: string; text: string }[])[0].text;
      // 真实输出：测试数量 + JSON 结构（而非固定文案）
      expect(text).toMatch(/Test cases generated successfully \(\d+ tests/);
      expect(text).toContain('"tests"');
    });

    test('应该支持implement子命令（真实生成实现代码）', async () => {
      const testCode = `
        describe('UserLogin', () => {
          test('should login with valid credentials', () => {
            const svc = new UserLogin();
            const result = svc.login('user@example.com', 'pass123');
            expect(result.success).toBe(true);
          });
        });
      `;

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tdd',
          arguments: {
            command: 'implement',
            testCode,
            language: 'typescript',
          },
        },
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
      const text = (result.content as { type: string; text: string }[])[0].text;
      expect(text).toContain('Implementation code generated successfully');
      expect(text).toContain('"code"');
    });

    test('应该处理无效的子命令', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tdd',
          arguments: {
            command: 'invalid',
            requirements: '测试',
          },
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('invalid');
    });
  });

  describe('Feature工具调用测试', () => {
    test('应该支持默认创建功能（缺验收条件时如实报错）', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'feature',
          arguments: {
            name: '用户认证',
            description: '实现用户登录和注册功能',
          },
        },
      });

      // 诚实化：service 要求至少一条验收条件，缺省时如实返回校验错误
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('acceptance criteria');
    });

    test('应该支持find子命令', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'feature',
          arguments: {
            command: 'find',
            query: '用户登录',
          },
        },
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Tracking工具调用测试', () => {
    test('应该支持默认注册测试方法', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tracking',
          arguments: {
            featureId: 'feature-123',
            name: 'test_user_login',
            filePath: './src/__tests__/user.test.ts',
            framework: 'jest',
          },
        },
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
    });
  });

  describe('错误处理测试', () => {
    test('应该处理未知工具', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'unknown',
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });

    test('应该处理缺少必需参数', async () => {
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tdd',
          arguments: {
            // 缺少 requirements
          },
        },
      });

      expect(result.isError).toBe(true);
    });

    test('应该返回本地化错误消息', async () => {
      i18nService.setLocale('zh');
      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tdd',
          arguments: {
          },
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('验证失败');
    });
  });
});

describe('NewToolsHandler - feature/tracking 真实接线（诚实性回归）', () => {
  let i18nService: I18nService;
  let featureService: { createFeature: jest.Mock; updateFeatureStatus: jest.Mock; linkFeatureFiles: jest.Mock; findSimilarFeatures: jest.Mock; getCurrentProject: jest.Mock };
  let storageService: {
    registerTestMethod: jest.Mock;
    updateTestExecutionResult: jest.Mock;
    updateTestMethodStatus: jest.Mock;
    loadTestMethod: jest.Mock;
  };
  let toolsHandler: NewToolsHandler;

  const resultText = (r: { content: { type: string; text: string }[] }): string =>
    r.content[0].text;

  beforeEach(() => {
    i18nService = new I18nService();
    featureService = {
      createFeature: jest.fn(),
      updateFeatureStatus: jest.fn(),
      linkFeatureFiles: jest.fn(),
      findSimilarFeatures: jest.fn(),
      getCurrentProject: jest.fn().mockReturnValue(undefined),
    };
    storageService = {
      registerTestMethod: jest.fn(),
      updateTestExecutionResult: jest.fn(),
      updateTestMethodStatus: jest.fn(),
      loadTestMethod: jest.fn(),
    };
    toolsHandler = new NewToolsHandler(i18nService, {
      featureManagementService: featureService as unknown as FeatureManagementService,
      storageService: storageService as unknown as StorageService,
    });
  });

  describe('feature 工具', () => {
    it('create 必须调用真实 service 并返回持久化对象（含 id 与 status）', async () => {
      const created: Feature = {
        id: 'feature-uuid-1',
        projectId: 'p1',
        name: '密码重置',
        description: '用户密码重置功能',
        status: 'planning',
        priority: 'medium',
        acceptanceCriteria: ['可通过邮箱重置密码'],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      featureService.createFeature.mockResolvedValue(created);

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'feature',
          arguments: {
            name: '密码重置',
            description: '用户密码重置功能',
            acceptanceCriteria: ['可通过邮箱重置密码'],
          },
        },
      });

      expect(result.isError).toBeFalsy();
      expect(featureService.createFeature).toHaveBeenCalledWith(
        expect.objectContaining({ name: '密码重置', acceptanceCriteria: ['可通过邮箱重置密码'] }),
      );
      const text = resultText(result as any);
      expect(text).toContain('feature-uuid-1');
      expect(text).toContain('"planning"');
    });

    it('create 缺少验收条件时必须如实返回 service 校验错误', async () => {
      featureService.createFeature.mockRejectedValue(
        new Error('Feature must have at least one acceptance criteria'),
      );

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: { name: 'feature', arguments: { name: '裸名功能' } },
      });

      expect(result.isError).toBe(true);
      expect(resultText(result as any)).toContain('at least one acceptance criteria');
    });

    it('find 必须返回真实相似度结果（含理由），空结果如实返回', async () => {
      featureService.findSimilarFeatures.mockResolvedValue([
        {
          feature: { id: 'f-2', name: '登录', status: 'completed' },
          similarity: 0.75,
          reasons: ['Name similarity: 75.0%'],
        },
      ]);

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: { name: 'feature', arguments: { command: 'find', query: '用户登录' } },
      });

      expect(featureService.findSimilarFeatures).toHaveBeenCalledWith(
        '用户登录',
        expect.any(String),
        undefined,
      );
      const text = resultText(result as any);
      expect(text).toContain('0.75');
      expect(text).toContain('Name similarity');

      // 空结果
      featureService.findSimilarFeatures.mockResolvedValue([]);
      const empty = await toolsHandler.callTool({
        method: 'tools/call',
        params: { name: 'feature', arguments: { command: 'find', query: '不存在的功能' } },
      });
      expect(empty.isError).toBeFalsy();
      expect(resultText(empty as any)).toContain('No similar features');
    });

    it('update 必须真实更新并返回更新后对象；目标不存在时如实报错', async () => {
      featureService.updateFeatureStatus.mockResolvedValue({
        id: 'f-1', status: 'in_progress', name: 'x',
      });

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: { name: 'feature', arguments: { command: 'update', featureId: 'f-1', status: 'in_progress' } },
      });

      expect(featureService.updateFeatureStatus).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'f-1', status: 'in_progress' }),
      );
      expect(resultText(result as any)).toContain('in_progress');

      featureService.updateFeatureStatus.mockRejectedValue(new Error('Feature not found: f-404'));
      const notFound = await toolsHandler.callTool({
        method: 'tools/call',
        params: { name: 'feature', arguments: { command: 'update', featureId: 'f-404', status: 'completed' } },
      });
      expect(notFound.isError).toBe(true);
      expect(resultText(notFound as any)).toContain('Feature not found: f-404');
    });

    it('link 必须真实关联文件并返回关联对象', async () => {
      featureService.linkFeatureFiles.mockResolvedValue([
        { id: 'assoc-1', featureId: 'f-1', filePath: './src/login.ts' },
      ]);

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'feature',
          arguments: { command: 'link', featureId: 'f-1', filePaths: ['./src/login.ts'], fileType: 'implementation' },
        },
      });

      expect(featureService.linkFeatureFiles).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'f-1', filePaths: ['./src/login.ts'] }),
      );
      expect(resultText(result as any)).toContain('assoc-1');
    });
  });

  describe('tracking 工具', () => {
    it('register 必须持久化并返回含 id/status 的真实对象', async () => {
      storageService.registerTestMethod.mockResolvedValue(undefined);

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tracking',
          arguments: {
            featureId: 'feature-123',
            name: 'test_user_login',
            filePath: './src/__tests__/user.test.ts',
            framework: 'jest',
          },
        },
      });

      expect(result.isError).toBeFalsy();
      expect(storageService.registerTestMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          featureId: 'feature-123',
          name: 'test_user_login',
          framework: 'jest',
          status: 'pending',
        }),
      );
      const text = resultText(result as any);
      expect(text).toMatch(/"id":\s*"test-/);
      expect(text).toContain('"pending"');
    });

    it('result 必须真实更新并回读；methodId 不存在时如实报错', async () => {
      storageService.updateTestExecutionResult.mockResolvedValue(true);
      storageService.loadTestMethod.mockResolvedValue({
        id: 'm-1', status: 'passed', lastExecutedAt: new Date('2026-01-01T00:00:00Z'),
        executionResults: { duration: 120, passed: true },
      });

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tracking',
          arguments: { command: 'result', methodId: 'm-1', result: { passed: true, duration: 120 } },
        },
      });

      expect(storageService.updateTestExecutionResult).toHaveBeenCalledWith('m-1', { duration: 120, passed: true });
      const text = resultText(result as any);
      expect(text).toContain('"passed"');

      storageService.updateTestExecutionResult.mockResolvedValue(false);
      const failed = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tracking',
          arguments: { command: 'result', methodId: 'm-404', result: { passed: true, duration: 1 } },
        },
      });
      expect(failed.isError).toBe(true);
      expect(resultText(failed as any)).toContain('m-404');
    });

    it('status 必须真实更新并回读', async () => {
      storageService.updateTestMethodStatus.mockResolvedValue(true);
      storageService.loadTestMethod.mockResolvedValue({
        id: 'm-2', status: 'skipped',
      } as TestMethod);

      const result = await toolsHandler.callTool({
        method: 'tools/call',
        params: {
          name: 'tracking',
          arguments: { command: 'status', methodId: 'm-2', status: 'skipped' },
        },
      });

      expect(storageService.updateTestMethodStatus).toHaveBeenCalledWith('m-2', 'skipped');
      expect(resultText(result as any)).toContain('"skipped"');
    });
  });
});