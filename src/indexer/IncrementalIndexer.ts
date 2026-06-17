/**
 * Graph-Driven Development - Incremental Indexer
 * 
 * 增量索引系统：
 * - 文件变更检测
 * - 缓存机制
 * - 并行处理
 */

import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

// ==================== 类型定义 ====================

export interface FileCacheEntry {
  filePath: string;
  hash: string;
  mtime: number;
  size: number;
  indexedAt: number;
  analysis?: any;
}

export interface IndexCache {
  version: string;
  projectPath: string;
  lastIndexTime: number;
  files: Map<string, FileCacheEntry>;
}

export interface IncrementalIndexResult {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
  totalFiles: number;
  indexTime: number;
}

interface CacheWrapper<T> {
  value: T;
}

// ==================== 增量索引器 ====================

export class IncrementalIndexer {
  private cache: Map<string, FileCacheEntry>;
  private projectPath: string;
  private cacheFile: string;
  
  constructor(projectPath: string, cacheFile?: string) {
    this.projectPath = path.resolve(projectPath);
    this.cacheFile = cacheFile || path.join(this.projectPath, '.gdd-cache.json');
    this.cache = new Map<string, FileCacheEntry>();
    
    this.loadCache();
  }
  
  /**
   * 加载缓存
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const content = fs.readFileSync(this.cacheFile, 'utf-8');
        const cacheData: IndexCache = JSON.parse(content);
        
        for (const [key, entry] of cacheData.files) {
          this.cache.set(key, entry);
        }
        
        console.log(`[IncrementalIndexer] Loaded cache: ${this.cache.size} entries`);
      }
    } catch (error) {
      console.warn('[IncrementalIndexer] Failed to load cache, starting fresh');
      this.cache.clear();
    }
  }
  
  /**
   * 保存缓存
   */
  private saveCache(): void {
    try {
      const cacheData: IndexCache = {
        version: '1.0',
        projectPath: this.projectPath,
        lastIndexTime: Date.now(),
        files: this.cache
      };
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`[IncrementalIndexer] Saved cache: ${this.cache.size} entries`);
    } catch (error) {
      console.warn('[IncrementalIndexer] Failed to save cache');
    }
  }
  
  /**
   * 计算文件哈希
   */
  private computeHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }
  
  /**
   * 获取文件状态
   */
  private getFileStatus(filePath: string): { mtime: number; size: number } | null {
    try {
      const stats = fs.statSync(filePath);
      return {
        mtime: stats.mtimeMs,
        size: stats.size
      };
    } catch {
      return null;
    }
  }
  
  /**
   * 收集所有文件
   */
  private collectFiles(): Map<string, { mtime: number; size: number }> {
    const files = new Map<string, { mtime: number; size: number }>();
    
    const walkDir = (dir: string, relativePath: string = ''): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
        
        if (entry.isDirectory()) {
          // 跳过隐藏目录和 node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
            continue;
          }
          walkDir(fullPath, relPath);
        } else if (entry.isFile()) {
          // 只索引代码文件
          const ext = path.extname(entry.name).toLowerCase();
          const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb', '.php', '.vue', '.svelte'];
          
          if (allowedExts.includes(ext)) {
            const status = this.getFileStatus(fullPath);
            if (status) {
              files.set(relPath, status);
            }
          }
        }
      }
    };
    
    walkDir(this.projectPath);
    return files;
  }
  
  /**
   * 执行增量索引
   */
  async incrementalIndex(): Promise<IncrementalIndexResult> {
    const startTime = Date.now();
    
    // 收集当前文件状态
    const currentFiles = this.collectFiles();
    
    // 获取缓存的文件
    const cachedFiles = new Map(this.cache.entries());
    
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    const unchanged: string[] = [];
    
    // 检查新增和修改的文件
    for (const [filePath, status] of currentFiles) {
      const cached = cachedFiles.get(filePath);
      
      if (!cached) {
        // 新文件
        added.push(filePath);
        
        // 计算哈希并缓存
        const hash = this.computeHash(path.join(this.projectPath, filePath));
        this.cache.set(filePath, {
          filePath,
          hash,
          mtime: status.mtime,
          size: status.size,
          indexedAt: Date.now()
        });
      } else if (status.mtime > cached.mtime) {
        // 文件修改
        modified.push(filePath);
        
        // 更新缓存
        const hash = this.computeHash(path.join(this.projectPath, filePath));
        this.cache.set(filePath, {
          filePath,
          hash,
          mtime: status.mtime,
          size: status.size,
          indexedAt: Date.now(),
          analysis: cached.analysis // 保留之前的分析结果供参考
        });
      } else {
        // 文件未变
        unchanged.push(filePath);
      }
    }
    
    // 检查删除的文件
    for (const [filePath] of cachedFiles) {
      if (!currentFiles.has(filePath)) {
        deleted.push(filePath);
        this.cache.delete(filePath);
      }
    }
    
    // 保存缓存
    this.saveCache();
    
    const indexTime = Date.now() - startTime;
    
    console.log(`[IncrementalIndexer] Index complete:`);
    console.log(`  - Added: ${added.length}`);
    console.log(`  - Modified: ${modified.length}`);
    console.log(`  - Deleted: ${deleted.length}`);
    console.log(`  - Unchanged: ${unchanged.length}`);
    console.log(`  - Time: ${indexTime}ms`);
    
    return {
      added,
      modified,
      deleted,
      unchanged,
      totalFiles: currentFiles.size,
      indexTime
    };
  }
  
  /**
   * 强制完全重新索引
   */
  async fullReindex(): Promise<IncrementalIndexResult> {
    // 清空缓存
    this.cache.clear();
    
    // 执行索引
    const result = await this.incrementalIndex();
    
    return {
      added: result.added.concat(result.modified),
      modified: [],
      deleted: result.deleted,
      unchanged: [],
      totalFiles: result.totalFiles,
      indexTime: result.indexTime
    };
  }
  
  /**
   * 获取需要重新分析的文件
   */
  getFilesToReanalyze(): string[] {
    // 返回最近修改的文件
    const files = Array.from(this.cache.entries())
      .sort((a, b) => b[1].indexedAt - a[1].indexedAt)
      .slice(0, 100); // 最多返回 100 个文件
    
    return files.map(f => f[0]);
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
        console.log('[IncrementalIndexer] Cache cleared');
      }
    } catch (error) {
      console.warn('[IncrementalIndexer] Failed to clear cache file');
    }
  }
  
  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
