/**
 * Code Indexer - 类型定义
 */

// ==================== 索引结果 ====================

export interface CodeIndexResult {
  files: FileAnalysis[];
  dependencies: DependencyInfo[];
  summary: IndexSummary;
}

export interface FileAnalysis {
  path: string;
  language?: string;
  className?: string;
  lineCount?: number;
  commentCount?: number;
  complexity?: number;
  isTest?: boolean;
  isModule?: boolean;
}

export interface DependencyInfo {
  name: string;
  version?: string;
  type?: 'direct' | 'transitive';
}

export interface IndexSummary {
  totalFiles: number;
  totalLines: number;
  commentDensity: number;  // 0-1
  testCoverage: number;    // 0-1
  complexity: 'low' | 'medium' | 'high';
  moduleCount: number;
}
