import { InMemoryStorage } from '../in-memory-storage.js';
import {
  Feature,
  FeatureStatus,
  FeaturePriority,
  TDDSession,
  TDDStage,
  TestMethod,
  FileAssociation,
} from '../../types/storage.js';

/**
 * V3：内存仓储 fake 语义测试——与 JSONL 版行为对齐
 * （追加保存、跨项目查询、更新可回读），供 handler 单测零 IO 注入。
 */

const feature = (id: string, projectId: string): Feature => ({
  id,
  projectId,
  name: `feature-${id}`,
  description: 'desc',
  status: FeatureStatus.PLANNING,
  priority: FeaturePriority.MEDIUM,
  acceptanceCriteria: ['c1'],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

const method = (id: string, featureId: string): TestMethod => ({
  id,
  featureId,
  projectId: 'p1',
  name: `test_${id}`,
  filePath: './x.ts',
  status: 'pending',
  framework: 'jest',
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('InMemoryStorage（仓储 fake）', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it('feature：保存后跨项目列表过滤、状态更新可回读', async () => {
    await storage.saveFeature(feature('f1', 'p1'));
    await storage.saveFeature(feature('f2', 'p2'));

    expect(await storage.listFeatures('p1')).toHaveLength(1);
    expect(await storage.loadFeature('f2')).not.toBeNull();

    expect(await storage.updateFeatureStatus('f1', FeatureStatus.COMPLETED)).toBe(true);
    const updated = await storage.loadFeature('f1');
    expect(updated!.status).toBe(FeatureStatus.COMPLETED);

    expect(await storage.deleteFeature('f1')).toBe(true);
    expect(await storage.loadFeature('f1')).toBeNull();
  });

  it('session：阶段更新可回读', async () => {
    const session: TDDSession = {
      id: 's1',
      featureId: 'f1',
      projectId: 'p1',
      developer: 'dev',
      stage: TDDStage.RED,
      startedAt: new Date(),
      updatedAt: new Date(),
      cycleCount: 0,
    };
    await storage.saveTDDSession(session);

    expect(await storage.updateTDDSessionStage('s1', TDDStage.GREEN)).toBe(true);
    expect((await storage.loadTDDSession('s1'))!.stage).toBe(TDDStage.GREEN);
    expect(await storage.updateTDDSessionStage('ghost', TDDStage.RED)).toBe(false);
  });

  it('method：执行结果与状态更新后回读一致；未命中返回 null/false', async () => {
    await storage.registerTestMethod(method('m1', 'f1'));

    expect(await storage.updateTestExecutionResult('m1', {
      duration: 5, passed: true,
    })).toBe(true);
    const executed = await storage.loadTestMethod('m1');
    expect(executed!.status).toBe('passed');
    expect(executed!.lastExecutedAt).toBeInstanceOf(Date);

    expect(await storage.updateTestMethodStatus('m1', 'skipped')).toBe(true);
    expect((await storage.loadTestMethod('m1'))!.status).toBe('skipped');

    expect(await storage.loadTestMethod('ghost')).toBeNull();
    expect(await storage.updateTestMethodStatus('ghost', 'failed')).toBe(false);
    expect(await storage.listTestMethods('f1')).toHaveLength(1);
  });

  it('association：保存与删除', async () => {
    const assoc: FileAssociation = {
      id: 'a1',
      featureId: 'f1',
      projectId: 'p1',
      filePath: './src/x.ts',
      fileType: 'implementation',
      createdAt: new Date(),
      lastModified: new Date(),
      size: 0,
    };
    await storage.saveFileAssociation(assoc);

    expect(await storage.listFileAssociations('f1')).toHaveLength(1);
    expect(await storage.deleteFileAssociation('a1')).toBe(true);
    expect(await storage.listFileAssociations('f1')).toHaveLength(0);
  });
});
