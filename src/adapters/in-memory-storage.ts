/**
 * 内存版存储仓储（V3 测试基础设施）
 *
 * 实现 StorageRepository 全接口，行为语义与 JSONL 版一致
 * （追加保存、跨项目查找、更新后可回读），但零磁盘 IO——
 * handler/服务层单测注入它即可，不再污染 ~/.tdd-flow。
 */
import type { StorageRepository } from '../core/ports.js';
import {
  Feature,
  FeatureStatus,
  TDDSession,
  TDDStage,
  TestMethod,
  TestExecutionResult,
  FileAssociation,
} from '../types/storage.js';

export class InMemoryStorage implements StorageRepository {
  private features = new Map<string, Feature>(); // key: featureId
  private sessions = new Map<string, TDDSession>(); // key: sessionId
  private methods = new Map<string, TestMethod>(); // key: methodId
  private associations = new Map<string, FileAssociation>(); // key: associationId

  // ---------- Feature ----------

  async saveFeature(feature: Feature): Promise<void> {
    this.features.set(feature.id, { ...feature });
  }

  async loadFeature(id: string): Promise<Feature | null> {
    return this.features.get(id) ?? null;
  }

  async listFeatures(projectId: string): Promise<Feature[]> {
    return [...this.features.values()].filter(f => f.projectId === projectId);
  }

  async deleteFeature(id: string): Promise<boolean> {
    return this.features.delete(id);
  }

  async updateFeatureStatus(id: string, status: FeatureStatus): Promise<boolean> {
    const feature = this.features.get(id);
    if (!feature) return false;
    feature.status = status;
    feature.updatedAt = new Date();
    return true;
  }

  // ---------- TDD Session ----------

  async saveTDDSession(session: TDDSession): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }

  async loadTDDSession(id: string): Promise<TDDSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async listTDDSessions(projectId: string): Promise<TDDSession[]> {
    return [...this.sessions.values()].filter(s => s.projectId === projectId);
  }

  async updateTDDSessionStage(id: string, stage: TDDStage): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.stage = stage;
    session.updatedAt = new Date();
    return true;
  }

  // ---------- Test Method ----------

  async registerTestMethod(method: TestMethod): Promise<void> {
    this.methods.set(method.id, { ...method });
  }

  async loadTestMethod(id: string): Promise<TestMethod | null> {
    return this.methods.get(id) ?? null;
  }

  async listTestMethods(featureId: string): Promise<TestMethod[]> {
    return [...this.methods.values()].filter(m =>
      featureId ? m.featureId === featureId : true,
    );
  }

  async updateTestExecutionResult(
    methodId: string,
    result: TestExecutionResult,
  ): Promise<boolean> {
    const method = this.methods.get(methodId);
    if (!method) return false;
    method.executionResults = result;
    method.lastExecutedAt = new Date();
    method.status = result.passed ? 'passed' : 'failed';
    return true;
  }

  async updateTestMethodStatus(methodId: string, status: string): Promise<boolean> {
    const method = this.methods.get(methodId);
    if (!method) return false;
    method.status = status as TestMethod['status'];
    return true;
  }

  // ---------- File Association ----------

  async saveFileAssociation(association: FileAssociation): Promise<void> {
    this.associations.set(association.id, { ...association });
  }

  async listFileAssociations(featureId: string): Promise<FileAssociation[]> {
    return [...this.associations.values()].filter(a => a.featureId === featureId);
  }

  async deleteFileAssociation(id: string): Promise<boolean> {
    return this.associations.delete(id);
  }

  // ---------- 测试辅助 ----------

  /** 当前存储的对象总数（测试断言用） */
  get size(): { features: number; sessions: number; methods: number; associations: number } {
    return {
      features: this.features.size,
      sessions: this.sessions.size,
      methods: this.methods.size,
      associations: this.associations.size,
    };
  }
}
