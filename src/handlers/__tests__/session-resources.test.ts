/**
 * 会话状态资源模块测试（纯逻辑，注入 InMemoryStorage fake，零磁盘 IO）
 */
import { InMemoryStorage } from '../../adapters/in-memory-storage.js';
import {
  listStateResources,
  readStateResource,
} from '../session-resources.js';
import type { Feature, TDDSession, TestMethod } from '../../types/storage.js';

async function seed(storage: InMemoryStorage): Promise<void> {
  const feature: Feature = {
    id: 'feat-1', name: '登录', description: '', acceptanceCriteria: ['可登录'],
    status: 'in_progress', projectId: 'proj-1', priority: 'high', tags: [],
    createdAt: new Date(), updatedAt: new Date(),
  } as unknown as Feature;
  await storage.saveFeature(feature);

  const session: TDDSession = {
    id: 'sess-1', featureId: 'feat-1', projectId: 'proj-1', stage: 1,
    startedAt: new Date(), updatedAt: new Date(), cycleCount: 2,
  } as unknown as TDDSession;
  await storage.saveTDDSession(session);

  const method: TestMethod = {
    id: 'm-1', featureId: 'feat-1', projectId: 'proj-1', name: 'logs in',
    filePath: 'auth.test.ts', status: 'passed', framework: 'jest', createdAt: new Date(),
  } as unknown as TestMethod;
  await storage.registerTestMethod(method);
}

describe('listStateResources', () => {
  it('列出集合与条目资源（真实存储驱动）', async () => {
    const storage = new InMemoryStorage();
    await seed(storage);

    const resources = await listStateResources(storage);
    const uris = resources.map(r => r.uri);

    expect(uris).toContain('tdd://sessions');
    expect(uris).toContain('tdd://features');
    expect(uris).toContain('tdd://tracking');
    expect(uris).toContain('tdd://sessions/sess-1');
    expect(uris).toContain('tdd://features/feat-1');
  });

  it('空存储仍列出三个集合资源（诚实空集合）', async () => {
    const resources = await listStateResources(new InMemoryStorage());
    const uris = resources.map(r => r.uri);

    expect(uris).toEqual(['tdd://sessions', 'tdd://features', 'tdd://tracking']);
  });
});

describe('readStateResource', () => {
  it('读取会话集合返回真实记录', async () => {
    const storage = new InMemoryStorage();
    await seed(storage);

    const result = await readStateResource(storage, 'tdd://sessions');
    const parsed = JSON.parse(result!.contents[0].text) as TDDSession[];

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('sess-1');
    expect(parsed[0].featureId).toBe('feat-1');
  });

  it('读取单条 feature 返回真实记录', async () => {
    const storage = new InMemoryStorage();
    await seed(storage);

    const result = await readStateResource(storage, 'tdd://features/feat-1');
    const parsed = JSON.parse(result!.contents[0].text) as Feature;

    expect(parsed.id).toBe('feat-1');
    expect(parsed.name).toBe('登录');
  });

  it('读取 tracking 返回测试方法', async () => {
    const storage = new InMemoryStorage();
    await seed(storage);

    const result = await readStateResource(storage, 'tdd://tracking');
    const parsed = JSON.parse(result!.contents[0].text) as TestMethod[];

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('logs in');
  });

  it('空集合如实返回 []，不伪造记录', async () => {
    const result = await readStateResource(new InMemoryStorage(), 'tdd://features');
    expect(JSON.parse(result!.contents[0].text)).toEqual([]);
  });

  it('未知会话 id 抛错（不返回占位数据）', async () => {
    const storage = new InMemoryStorage();
    await seed(storage);

    await expect(readStateResource(storage, 'tdd://sessions/ghost'))
      .rejects.toThrow(/not found|不存在/i);
  });

  it('非状态 URI 家族返回 null（交还原有资源处理）', async () => {
    const result = await readStateResource(new InMemoryStorage(), 'tdd://test-files/foo.test.ts');
    expect(result).toBeNull();
  });
});
