#!/usr/bin/env npx ts-node
/**
 * 查询优化器
 * 
 * V4.0 性能优化 - 查询索引、缓存策略
 */

// ==================== 类型定义 ====================

export interface QueryPlan {
  query: string;
  tables: string[];
  filters: QueryFilter[];
  joins: QueryJoin[];
  estimatedCost: number;
  executionTime: number;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: unknown;
}

export interface QueryJoin {
  left: string;
  right: string;
  type: 'inner' | 'left' | 'right' | 'full';
  on: { leftField: string; rightField: string };
}

export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  type: 'btree' | 'hash' | 'fulltext';
  unique: boolean;
}

export interface QueryCacheEntry {
  queryHash: string;
  result: unknown;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
}

export interface QueryStatistics {
  totalQueries: number;
  cachedQueries: number;
  cacheHitRate: number;
  avgExecutionTime: number;
  slowestQuery: { query: string; time: number };
  byType: Record<string, number>;
}

// ==================== 索引管理器 ====================

export class IndexManager {
  private indexes: Map<string, IndexDefinition> = new Map();
  private indexData: Map<string, Map<unknown, Set<string>>> = new Map();
  
  /**
   * 创建索引
   */
  createIndex(
    tableName: string,
    columns: string[],
    options?: { unique?: boolean; type?: IndexDefinition['type'] }
  ): IndexDefinition {
    const indexName = `idx_${tableName}_${columns.join('_')}`;
    
    const index: IndexDefinition = {
      name: indexName,
      tableName,
      columns,
      type: options?.type || 'btree',
      unique: options?.unique || false,
    };
    
    this.indexes.set(indexName, index);
    this.indexData.set(indexName, new Map());
    
    return index;
  }
  
  /**
   * 删除索引
   */
  dropIndex(indexName: string): boolean {
    if (this.indexes.has(indexName)) {
      this.indexes.delete(indexName);
      this.indexData.delete(indexName);
      return true;
    }
    return false;
  }
  
  /**
   * 获取索引
   */
  getIndex(indexName: string): IndexDefinition | undefined {
    return this.indexes.get(indexName);
  }
  
  /**
   * 获取表的所有索引
   */
  getTableIndexes(tableName: string): IndexDefinition[] {
    return [...this.indexes.values()].filter(i => i.tableName === tableName);
  }
  
  /**
   * 添加索引数据
   */
  addIndexData(indexName: string, key: unknown, rowId: string): void {
    const index = this.indexes.get(indexName);
    if (!index) return;
    
    const data = this.indexData.get(indexName)!;
    if (!data.has(key)) {
      data.set(key, new Set());
    }
    
    data.get(key)!.add(rowId);
  }
  
  /**
   * 查询索引
   */
  queryIndex(indexName: string, key: unknown): string[] {
    const data = this.indexData.get(indexName);
    if (!data) return [];
    
    return [...(data.get(key) || [])];
  }
  
  /**
   * 估算查询成本
   */
  estimateQueryCost(query: {
    tableName: string;
    filters?: QueryFilter[];
    useIndex?: string;
  }): number {
    const baseCost = 10;
    let cost = baseCost;
    
    const index = query.useIndex ? this.indexes.get(query.useIndex) : undefined;
    
    if (index && index.type === 'hash') {
      cost += 1;
    } else if (index && index.type === 'btree') {
      cost += 5;
    } else {
      cost += 100; // 全表扫描
    }
    
    if (query.filters) {
      for (const filter of query.filters) {
        cost += 2;
        if (filter.operator === 'like') {
          cost += 10;
        }
      }
    }
    
    return cost;
  }
  
  /**
   * 优化查询
   */
  optimizeQuery(query: {
    tableName: string;
    filters: QueryFilter[];
  }): OptimizedQuery {
    // 分析过滤条件，选择最佳索引
    const availableIndexes = this.getTableIndexes(query.tableName);
    let bestIndex: IndexDefinition | undefined;
    let bestCost = Infinity;
    
    for (const index of availableIndexes) {
      // 检查过滤条件是否匹配索引列
      const matchingFilters = query.filters.filter(f => 
        index.columns.includes(f.field)
      );
      
      if (matchingFilters.length > 0) {
        const cost = this.estimateQueryCost({
          tableName: query.tableName,
          filters: matchingFilters,
          useIndex: index.name,
        });
        
        if (cost < bestCost) {
          bestCost = cost;
          bestIndex = index;
        }
      }
    }
    
    return {
      originalQuery: query,
      useIndex: bestIndex?.name,
      optimizedFilters: bestIndex
        ? query.filters.filter(f => bestIndex!.columns.includes(f.field))
        : query.filters,
      estimatedCost: bestCost === Infinity ? 100 : bestCost,
      optimizationNotes: bestIndex
        ? `Using index ${bestIndex.name}`
        : 'No suitable index found',
    };
  }
}

interface OptimizedQuery {
  originalQuery: { tableName: string; filters: QueryFilter[] };
  useIndex?: string;
  optimizedFilters: QueryFilter[];
  estimatedCost: number;
  optimizationNotes: string;
}

// ==================== 查询缓存 ====================

export class QueryCache {
  private cache: Map<string, QueryCacheEntry> = new Map();
  private maxSize: number;
  private hits = 0;
  private misses = 0;
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }
  
  /**
   * 获取缓存
   */
  get(query: string): { value: unknown; hit: boolean } {
    const hash = this.hashQuery(query);
    const entry = this.cache.get(hash);
    
    if (!entry) {
      this.misses++;
      return { value: undefined, hit: false };
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hash);
      this.misses++;
      return { value: undefined, hit: false };
    }
    
    entry.accessCount++;
    
    // 移到末尾
    this.cache.delete(hash);
    this.cache.set(hash, entry);
    
    this.hits++;
    return { value: entry.result, hit: true };
  }
  
  /**
   * 设置缓存
   */
  set(query: string, result: unknown, ttl: number = 300000): void {
    const hash = this.hashQuery(query);
    
    if (this.cache.has(hash)) {
      this.cache.delete(hash);
    }
    
    if (this.cache.size >= this.maxSize) {
      // 删除最久未使用的
      const oldest = [...this.cache.entries()].sort(
        (a, b) => a[1].createdAt - b[1].createdAt
      )[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }
    
    this.cache.set(hash, {
      queryHash: hash,
      result,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
    });
  }
  
  /**
   * 删除缓存
   */
  delete(query: string): boolean {
    const hash = this.hashQuery(query);
    return this.cache.delete(hash);
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取统计
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
  
  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// ==================== 查询优化器 ====================

export class QueryOptimizer {
  private indexManager: IndexManager;
  private cache: QueryCache;
  private stats: QueryStatistics;
  
  constructor() {
    this.indexManager = new IndexManager();
    this.cache = new QueryCache(1000);
    this.stats = this.initStats();
  }
  
  /**
   * 执行查询
   */
  async execute<T>(
    query: string,
    executor: (query: string) => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(query);
    
    if (cached.hit) {
      this.stats.cachedQueries++;
      this.stats.cacheHitRate = this.cache.getStats().hitRate;
      return cached.value as T;
    }
    
    this.stats.totalQueries++;
    
    const startTime = Date.now();
    const result = await executor(query);
    const duration = Date.now() - startTime;
    
    this.stats.avgExecutionTime = (
      this.stats.avgExecutionTime * (this.stats.totalQueries - 1) + duration
    ) / this.stats.totalQueries;
    
    // 缓存结果
    if (duration < 1000) { // 只缓存快速查询
      this.cache.set(query, result);
    }
    
    // 记录最慢查询
    if (duration > this.stats.slowestQuery.time) {
      this.stats.slowestQuery = { query, time: duration };
    }
    
    return result;
  }
  
  /**
   * 创建索引
   */
  createIndex(tableName: string, columns: string[], options?: { unique?: boolean }): IndexDefinition {
    const index = this.indexManager.createIndex(tableName, columns, options);
    this.stats.byType['index_create'] = (this.stats.byType['index_create'] || 0) + 1;
    return index;
  }
  
  /**
   * 获取查询统计
   */
  getStats(): QueryStatistics {
    return { ...this.stats };
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  private initStats(): QueryStatistics {
    return {
      totalQueries: 0,
      cachedQueries: 0,
      cacheHitRate: 0,
      avgExecutionTime: 0,
      slowestQuery: { query: '', time: 0 },
      byType: {},
    };
  }
}

// 导出单例
export const queryOptimizer = new QueryOptimizer();
export const indexManager = new IndexManager();
export const queryCache = new QueryCache();
