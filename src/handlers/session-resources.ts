/**
 * 会话状态资源（纯模块，无 import.meta——jest CJS 可转换）
 *
 * 从 StorageRepository 汇聚服务器自身状态（TDD 会话 / feature /
 * 测试方法跟踪），投影为 MCP 资源。resources.ts（含 import.meta）
 * 只做委托，本模块承担全部可测逻辑。
 *
 * 诚实性：数据全部来自真实存储；空集合返回空数组，未知 id 报错，
 * 绝不伪造记录。
 */
import type { Resource, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import type { StorageRepository } from '../core/ports.js';
import type { Feature, TDDSession, TestMethod } from '../types/storage.js';

const SESSIONS_COLLECTION = 'tdd://sessions';
const FEATURES_COLLECTION = 'tdd://features';
const TRACKING_COLLECTION = 'tdd://tracking';

const collectionResources: Resource[] = [
  {
    uri: SESSIONS_COLLECTION,
    name: 'TDD Sessions',
    description: 'All TDD sessions persisted by the server (~/.tdd-flow)',
    mimeType: 'application/json',
  },
  {
    uri: FEATURES_COLLECTION,
    name: 'Features',
    description: 'All features under TDD management',
    mimeType: 'application/json',
  },
  {
    uri: TRACKING_COLLECTION,
    name: 'Test Method Tracking',
    description: 'All registered test methods with execution status',
    mimeType: 'application/json',
  },
];

function jsonResult(uri: string, data: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function gatherSessions(repo: StorageRepository): Promise<TDDSession[]> {
  const projects = await repo.listProjects();
  const sessions: TDDSession[] = [];
  for (const projectId of projects) {
    sessions.push(...await repo.listTDDSessions(projectId));
  }
  return sessions;
}

async function gatherFeatures(repo: StorageRepository): Promise<Feature[]> {
  const projects = await repo.listProjects();
  const features: Feature[] = [];
  for (const projectId of projects) {
    features.push(...await repo.listFeatures(projectId));
  }
  return features;
}

async function gatherTestMethods(repo: StorageRepository): Promise<TestMethod[]> {
  const features = await gatherFeatures(repo);
  const methods: TestMethod[] = [];
  for (const feature of features) {
    methods.push(...await repo.listTestMethods(feature.id));
  }
  return methods;
}

/** 列出状态资源：三个集合恒在，条目资源仅在实际存在时列出 */
export async function listStateResources(repo: StorageRepository): Promise<Resource[]> {
  const [sessions, features] = await Promise.all([
    gatherSessions(repo),
    gatherFeatures(repo),
  ]);

  const resources = [...collectionResources];

  for (const session of sessions) {
    resources.push({
      uri: `${SESSIONS_COLLECTION}/${encodeURIComponent(session.id)}`,
      name: `TDD Session: ${session.id}`,
      description: `TDD session (stage ${session.stage}, feature ${session.featureId})`,
      mimeType: 'application/json',
    });
  }
  for (const feature of features) {
    resources.push({
      uri: `${FEATURES_COLLECTION}/${encodeURIComponent(feature.id)}`,
      name: `Feature: ${feature.name}`,
      description: `Feature "${feature.name}" (${feature.status})`,
      mimeType: 'application/json',
    });
  }

  return resources;
}

/**
 * 读取状态资源；非状态 URI 家族返回 null（交还原有 resources.ts 分支）。
 * 未知条目 id 抛错——不返回占位数据。
 */
export async function readStateResource(
  repo: StorageRepository,
  uri: string,
): Promise<ReadResourceResult | null> {
  if (uri === SESSIONS_COLLECTION) {
    return jsonResult(uri, await gatherSessions(repo));
  }
  if (uri === FEATURES_COLLECTION) {
    return jsonResult(uri, await gatherFeatures(repo));
  }
  if (uri === TRACKING_COLLECTION) {
    return jsonResult(uri, await gatherTestMethods(repo));
  }

  if (uri.startsWith(`${SESSIONS_COLLECTION}/`)) {
    const id = decodeURIComponent(uri.slice(SESSIONS_COLLECTION.length + 1));
    const session = await repo.loadTDDSession(id);
    if (!session) {
      throw new Error(`TDD session not found: ${id}`);
    }
    return jsonResult(uri, session);
  }
  if (uri.startsWith(`${FEATURES_COLLECTION}/`)) {
    const id = decodeURIComponent(uri.slice(FEATURES_COLLECTION.length + 1));
    const feature = await repo.loadFeature(id);
    if (!feature) {
      throw new Error(`Feature not found: ${id}`);
    }
    return jsonResult(uri, feature);
  }

  return null;
}
