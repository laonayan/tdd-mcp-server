/**
 * 功能相似度引擎（纯函数，零 IO）
 *
 * 从 FeatureManagementService 下沉的核心算法：
 * 名称/描述/标签/验收条件四维加权相似度计算。
 */
import { Feature } from '../types/storage.js';

export interface SimilarityResult {
  score: number;
  reasons: string[];
}

/** 计算文本与查询的匹配度（完全包含=1；按词全配/部分匹配加权） */
export function calculateTextSimilarity(
  text: string,
  query: string,
  queryWords: string[],
): number {
  if (!text || !query) return 0;

  if (text.includes(query)) {
    return 1;
  }

  const textWords = text.split(/\s+/).map(word => word.toLowerCase());
  let matchedWords = 0;
  let partialMatches = 0;

  for (const queryWord of queryWords) {
    const queryWordLower = queryWord.toLowerCase();

    if (textWords.some(textWord => textWord === queryWordLower)) {
      matchedWords += 1;
    } else if (textWords.some(textWord =>
      textWord.includes(queryWordLower) || queryWordLower.includes(textWord),
    )) {
      partialMatches += 0.7; // 部分匹配权重较低
    }
  }

  const totalScore = matchedWords + partialMatches;
  return queryWords.length > 0 ? Math.min(totalScore / queryWords.length, 1) : 0;
}

/** 计算标签集合与查询词的匹配度（部分匹配权重较高） */
export function calculateTagSimilarity(tags: string[], queryWords: string[]): number {
  if (!tags || tags.length === 0 || queryWords.length === 0) return 0;

  const tagLower = tags.map(tag => tag.toLowerCase());
  let matchedWords = 0;
  let partialMatches = 0;

  for (const queryWord of queryWords) {
    const queryWordLower = queryWord.toLowerCase();

    if (tagLower.some(tag => tag === queryWordLower)) {
      matchedWords += 1;
    } else if (tagLower.some(tag => tag.includes(queryWordLower) || queryWordLower.includes(tag))) {
      partialMatches += 0.8; // 标签部分匹配权重较高
    }
  }

  const totalScore = matchedWords + partialMatches;
  return Math.min(totalScore / queryWords.length, 1);
}

/** 四维加权相似度：名称 40% / 描述 30% / 标签 20% / 验收条件 10% */
export function calculateFeatureSimilarity(
  feature: Feature,
  queryWords: string[],
  queryLower: string,
): SimilarityResult {
  const reasons: string[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;

  const nameScore = calculateTextSimilarity(feature.name.toLowerCase(), queryLower, queryWords);
  totalScore += nameScore * 0.4;
  maxPossibleScore += 0.4;
  if (nameScore > 0.3) {
    reasons.push(`Name similarity: ${(nameScore * 100).toFixed(1)}%`);
  }

  const descriptionScore = calculateTextSimilarity(
    feature.description.toLowerCase(), queryLower, queryWords,
  );
  totalScore += descriptionScore * 0.3;
  maxPossibleScore += 0.3;
  if (descriptionScore > 0.3) {
    reasons.push(`Description similarity: ${(descriptionScore * 100).toFixed(1)}%`);
  }

  if (feature.tags && feature.tags.length > 0) {
    const tagScore = calculateTagSimilarity(feature.tags, queryWords);
    totalScore += tagScore * 0.2;
    maxPossibleScore += 0.2;
    if (tagScore > 0) {
      reasons.push('Tag matches found');
    }
  }

  const criteriaText = feature.acceptanceCriteria.join(' ').toLowerCase();
  const criteriaScore = calculateTextSimilarity(criteriaText, queryLower, queryWords);
  totalScore += criteriaScore * 0.1;
  maxPossibleScore += 0.1;
  if (criteriaScore > 0.3) {
    reasons.push(`Acceptance criteria similarity: ${(criteriaScore * 100).toFixed(1)}%`);
  }

  const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

  return {
    score: Math.min(normalizedScore, 1),
    reasons,
  };
}
