import { StorageService } from '../storage.service.js';
import { Feature, FeatureStatus, FeaturePriority, TestMethod } from '../../types/storage.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock fs-extra
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('StorageService - Basic Tests', () => {
  let storageService: StorageService;
  let mockProjectId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectId = 'test-project-123';
    storageService = new StorageService();
    
    // Setup default mocks
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.outputFile.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
  });

  describe('saveFeature', () => {
    it('should save a valid feature', async () => {
      // Arrange
      const mockFeature: Feature = {
        id: 'feature-123',
        projectId: mockProjectId,
        name: 'User Authentication',
        description: 'Implement user login',
        status: FeatureStatus.IN_PROGRESS,
        priority: FeaturePriority.HIGH,
        acceptanceCriteria: ['User can login'],
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };

      // Act
      await storageService.saveFeature(mockFeature);

      // Assert
      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.outputFile).toHaveBeenCalled();
    });

    it('should reject invalid feature data', async () => {
      // Arrange
      const invalidFeature = {
        name: 'Test Feature',
        // Missing required fields
      } as any;

      // Act & Assert
      await expect(storageService.saveFeature(invalidFeature))
        .rejects.toThrow('Invalid feature data');
    });
  });

  describe('listFeatures', () => {
    it('should return empty array when no file exists', async () => {
      // Arrange
      mockFs.pathExists.mockResolvedValue(false);

      // Act
      const result = await storageService.listFeatures(mockProjectId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should parse features from JSONL file', async () => {
      // Arrange
      const mockFeature: Feature = {
        id: 'feature-123',
        projectId: mockProjectId,
        name: 'User Authentication',
        description: 'Implement user login',
        status: FeatureStatus.IN_PROGRESS,
        priority: FeaturePriority.HIGH,
        acceptanceCriteria: ['User can login'],
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };
      
      const jsonlContent = JSON.stringify(mockFeature) + '\n';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(jsonlContent);

      // Act
      const result = await storageService.listFeatures(mockProjectId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockFeature.id);
    });
  });

  describe('loadTestMethod 按项目文件加载（诚实性回归）', () => {
    const makeMethod = (id: string, projectId: string): TestMethod => ({
      id,
      featureId: 'feature-123',
      projectId,
      name: `test_${id}`,
      filePath: './src/test.ts',
      status: 'pending',
      framework: 'jest',
      createdAt: new Date('2024-01-01T10:00:00Z'),
    });

    /** 内存文件表模拟 ~/.tdd-flow：两个项目各一份 test-methods.jsonl；记录读取计数 */
    let files: Map<string, string>;
    let readCounts: Map<string, number>;
    let p1File: string;
    let p2File: string;

    beforeEach(() => {
      const base = path.join(os.homedir(), '.tdd-flow', 'projects');
      p1File = path.join(base, 'project-one', 'test-methods.jsonl');
      p2File = path.join(base, 'project-two', 'test-methods.jsonl');
      files = new Map([
        [p1File, JSON.stringify(makeMethod('m-in-p1', 'project-one')) + '\n'],
        [p2File, JSON.stringify(makeMethod('m-in-p2', 'project-two')) + '\n'],
      ]);
      readCounts = new Map();

      mockFs.readdir.mockResolvedValue([
        { name: 'project-one', isDirectory: () => true } as any,
        { name: 'project-two', isDirectory: () => true } as any,
      ]);
      mockFs.pathExists.mockResolvedValue(true);
      const readImpl = async (p: unknown): Promise<string> => {
        const file = String(p);
        readCounts.set(file, (readCounts.get(file) || 0) + 1);
        const content = files.get(file);
        if (content === undefined) throw new Error('ENOENT');
        return content;
      };
      mockFs.readFile.mockImplementation(readImpl as any);
      const writeImpl = async (p: unknown, content: unknown): Promise<void> => {
        files.set(String(p), String(content));
      };
      mockFs.writeFile.mockImplementation(writeImpl as any);
    });

    it('命中首个项目即返回：不读其他项目文件（逐项目早退），记录完整', async () => {
      const result = await storageService.loadTestMethod('m-in-p1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('m-in-p1');
      expect(result!.projectId).toBe('project-one');
      expect(result!.createdAt).toBeInstanceOf(Date);
      // 早退：找到 project-one 的方法后，project-two 的文件一次都不该读
      expect(readCounts.get(p2File) || 0).toBe(0);
    });

    it('未命中返回 null，不抛错', async () => {
      const result = await storageService.loadTestMethod('m-not-exist');

      expect(result).toBeNull();
    });

    it('更新后回读一致（状态反映刚写入的变更）', async () => {
      const ok = await storageService.updateTestMethodStatus('m-in-p2', 'skipped');
      expect(ok).toBe(true);

      const reread = await storageService.loadTestMethod('m-in-p2');
      expect(reread).not.toBeNull();
      expect(reread!.status).toBe('skipped');
    });
  });
});