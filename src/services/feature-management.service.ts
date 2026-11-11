import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage.service.js';
// V3：相似度算法下沉纯核心层
import { calculateFeatureSimilarity } from '../core/similarity.js';
import { 
  Feature, 
  FeatureStatus, 
  FeaturePriority, 
  FileAssociation,
  CreateFeatureParams,
  UpdateFeatureStatusParams,
  LinkFeatureFilesParams,
} from '../types/storage.js';

export interface SimilarFeature {
  feature: Feature;
  similarity: number;
  reasons: string[];
}

export class FeatureManagementService {
  private storageService: StorageService;
  private currentProjectId?: string;

  constructor(storageService?: StorageService) {
    this.storageService = storageService || new StorageService();
  }

  /**
   * 创建新的功能特性
   */
  async createFeature(params: CreateFeatureParams): Promise<Feature> {
    // 验证输入
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Feature name cannot be empty');
    }

    if (!params.acceptanceCriteria || params.acceptanceCriteria.length === 0) {
      throw new Error('Feature must have at least one acceptance criteria');
    }

    // 生成项目ID（如果未提供）
    const projectId = params.projectId || this.currentProjectId || this.generateProjectId();

    // 创建功能特性对象
    const now = new Date();
    const feature: Feature = {
      id: uuidv4(),
      projectId,
      name: params.name.trim(),
      description: params.description.trim(),
      status: FeatureStatus.PLANNING,
      priority: params.priority || FeaturePriority.MEDIUM,
      acceptanceCriteria: params.acceptanceCriteria.map(criteria => criteria.trim()),
      createdAt: now,
      updatedAt: now,
      tags: params.tags || [],
      estimatedHours: params.estimatedHours,
      assignee: params.assignee,
    };

    // 保存到存储
    await this.storageService.saveFeature(feature);

    return feature;
  }

  /**
   * 更新功能特性状态
   */
  async updateFeatureStatus(params: UpdateFeatureStatusParams): Promise<Feature> {
    // 加载现有功能特性
    const existingFeature = await this.storageService.loadFeature(params.featureId);
    if (!existingFeature) {
      throw new Error(`Feature not found: ${params.featureId}`);
    }

    // 更新功能特性
    // 更新功能特性
    const updatedFeature: Feature = {
      ...existingFeature,
      status: params.status,
      updatedAt: new Date(),
    };

    // 如果提供了进度信息，更新进度
    if (params.progress) {
      const existingProgress = existingFeature.progress || {
        testsWritten: 0,
        testsPass: 0,
        implementationFiles: [],
      };
      
      updatedFeature.progress = {
        testsWritten: params.progress.testsWritten ?? existingProgress.testsWritten,
        testsPass: params.progress.testsPass ?? existingProgress.testsPass,
        implementationFiles: params.progress.implementationFiles ?? existingProgress.implementationFiles,
        coveragePercentage: params.progress.coveragePercentage ?? existingProgress.coveragePercentage,
      };
    }

    // 保存更新后的功能特性
    await this.storageService.saveFeature(updatedFeature);

    return updatedFeature;
  }

  /**
   * 关联文件到功能特性
   */
  async linkFeatureFiles(params: LinkFeatureFilesParams): Promise<FileAssociation[]> {
    if (!params.filePaths || params.filePaths.length === 0) {
      throw new Error('At least one file path must be provided');
    }

    const associations: FileAssociation[] = [];
    const now = new Date();

    for (const filePath of params.filePaths) {
      const association: FileAssociation = {
        id: uuidv4(),
        featureId: params.featureId,
        projectId: this.currentProjectId || 'default-project',
        filePath: filePath.trim(),
        fileType: params.fileType,
        createdAt: now,
        lastModified: now,
        size: 0,
        lineCount: undefined,
      };

      await this.storageService.saveFileAssociation(association);
      associations.push(association);
    }

    return associations;
  }

  /**
   * 查找相似的功能特性
   */
  async findSimilarFeatures(
    query: string, 
    projectId: string, 
    maxResults: number = 10,
    minSimilarity: number = 0.3,
  ): Promise<SimilarFeature[]> {
    const features = await this.storageService.listFeatures(projectId);
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    const similarities: SimilarFeature[] = [];

    for (const feature of features) {
      const similarity = calculateFeatureSimilarity(feature, queryWords, queryLower);
      
      if (similarity.score >= minSimilarity) {
        similarities.push({
          feature,
          similarity: similarity.score,
          reasons: similarity.reasons,
        });
      }
    }

    // 按相似度排序并限制结果数量
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * 生成项目ID
   */
  private generateProjectId(): string {
    return `project-${Date.now()}`;
  }

  /**
   * 设置当前项目
   */
  setCurrentProject(projectId: string): void {
    this.currentProjectId = projectId;
  }

  /**
   * 获取当前项目
   */
  getCurrentProject(): string | undefined {
    return this.currentProjectId;
  }

  /**
   * 获取功能特性
   */
  async getFeature(featureId: string): Promise<Feature | null> {
    return await this.storageService.loadFeature(featureId);
  }

  /**
   * 列出项目的所有功能特性
   */
  async listFeatures(projectId?: string): Promise<Feature[]> {
    const targetProjectId = projectId || this.currentProjectId;
    if (!targetProjectId) {
      throw new Error('No project ID provided and no current project set');
    }
    
    return await this.storageService.listFeatures(targetProjectId);
  }

  /**
   * 删除功能特性
   */
  async deleteFeature(featureId: string): Promise<boolean> {
    return await this.storageService.deleteFeature(featureId);
  }
}