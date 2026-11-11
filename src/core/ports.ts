/**
 * 端口定义（V3 分层架构）
 *
 * 业务层只依赖这些接口；适配器提供具体实现。
 * 依赖方向：handlers → services → core/ports ← adapters。
 */

/** 受守卫的子进程执行端口：唯一允许 spawn 的网关 */
export interface CommandExecutor {
  /**
   * 执行命令并返回 stdout/stderr。
   * 实现必须：嵌套测试环境拒绝执行、子进程注入嵌套标记与
   * node 堆内存上限、强制 maxBuffer/timeout 上限。
   */
  execute(
    command: string,
    options: {
      cwd: string;
      timeoutMs?: number;
      maxBuffer?: number;
    },
  ): Promise<{ stdout: string; stderr: string }>;
}

/** 功能特性仓储 */
export interface FeatureRepository {
  saveFeature(feature: import('../types/storage.js').Feature): Promise<void>;
  loadFeature(id: string): Promise<import('../types/storage.js').Feature | null>;
  listFeatures(projectId: string): Promise<import('../types/storage.js').Feature[]>;
  deleteFeature(id: string): Promise<boolean>;
  updateFeatureStatus(
    id: string,
    status: import('../types/storage.js').FeatureStatus,
  ): Promise<boolean>;
}

/** TDD 会话仓储 */
export interface SessionRepository {
  saveTDDSession(session: import('../types/storage.js').TDDSession): Promise<void>;
  loadTDDSession(id: string): Promise<import('../types/storage.js').TDDSession | null>;
  listTDDSessions(projectId: string): Promise<import('../types/storage.js').TDDSession[]>;
  updateTDDSessionStage(
    id: string,
    stage: import('../types/storage.js').TDDStage,
  ): Promise<boolean>;
}

/** 测试方法仓储 */
export interface TestMethodRepository {
  registerTestMethod(method: import('../types/storage.js').TestMethod): Promise<void>;
  loadTestMethod(id: string): Promise<import('../types/storage.js').TestMethod | null>;
  listTestMethods(featureId: string): Promise<import('../types/storage.js').TestMethod[]>;
  updateTestExecutionResult(
    methodId: string,
    result: import('../types/storage.js').TestExecutionResult,
  ): Promise<boolean>;
  updateTestMethodStatus(methodId: string, status: string): Promise<boolean>;
}

/** 文件关联仓储 */
export interface FileAssociationRepository {
  saveFileAssociation(
    association: import('../types/storage.js').FileAssociation,
  ): Promise<void>;
  listFileAssociations(featureId: string): Promise<import('../types/storage.js').FileAssociation[]>;
  deleteFileAssociation(id: string): Promise<boolean>;
}

/** 存储总仓储（四个子仓储的聚合根） */
export interface StorageRepository
  extends FeatureRepository, SessionRepository, TestMethodRepository, FileAssociationRepository {
}
