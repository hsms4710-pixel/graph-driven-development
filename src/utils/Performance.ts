/**
 * Performance - 性能监控和优化工具
 * 
 * 提供性能测量、缓存管理和优化建议
 */

import { Logger, initLogger } from './logger';

// 性能指标
export interface PerformanceMetrics {
  name: string;
  duration: number;  // 毫秒
  memoryUsage?: number;  // MB
  cpuUsage?: number;  // 0-100%
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// 性能配置
export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;  // 0-1，采样率
  warnThreshold: number;  // 警告阈值（毫秒）
  logSlowOperations: boolean;
}

// 默认配置
const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: true,
  sampleRate: 1,
  warnThreshold: 1000,
  logSlowOperations: true
};

// 性能统计
interface PerformanceStats {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

// 性能历史记录
const metricsHistory: Map<string, number[]> = new Map();
const metricsStats: Map<string, PerformanceStats> = new Map();

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private logger: Logger;
  
  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = initLogger();
  }
  
  /**
   * 开始计时
   */
  start(name: string): PerformanceTimer {
    return new PerformanceTimer(name, this);
  }
  
  /**
   * 记录性能指标
   */
  record(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    if (!this.config.enabled) return;
    
    // 采样
    if (Math.random() > this.config.sampleRate) return;
    
    // 记录到历史
    if (!metricsHistory.has(metrics.name)) {
      metricsHistory.set(metrics.name, []);
    }
    metricsHistory.get(metrics.name)!.push(metrics.duration);
    
    // 更新统计
    this.updateStats(metrics.name, metrics.duration);
    
    // 慢操作警告
    if (this.config.logSlowOperations && metrics.duration > this.config.warnThreshold) {
      this.logger.warn(`Slow operation: ${metrics.name} took ${metrics.duration}ms`, metrics.metadata);
    }
  }
  
  /**
   * 获取性能统计
   */
  getStats(name?: string): PerformanceStats | Map<string, PerformanceStats> {
    if (name) {
      return metricsStats.get(name) || this.createEmptyStats();
    }
    
    const stats = new Map<string, PerformanceStats>();
    for (const [key, value] of metricsStats) {
      stats.set(key, { ...value });
    }
    return stats;
  }
  
  /**
   * 获取性能历史
   */
  getHistory(name: string, limit?: number): number[] {
    const history = metricsHistory.get(name) || [];
    return limit ? history.slice(-limit) : history;
  }
  
  /**
   * 重置统计
   */
  reset(name?: string): void {
    if (name) {
      metricsHistory.delete(name);
      metricsStats.delete(name);
    } else {
      metricsHistory.clear();
      metricsStats.clear();
    }
  }
  
  /**
   * 更新统计
   */
  private updateStats(name: string, duration: number): void {
    let stats = metricsStats.get(name);
    if (!stats) {
      stats = this.createEmptyStats();
      metricsStats.set(name, stats);
    }
    
    stats.count++;
    stats.total += duration;
    stats.min = Math.min(stats.min, duration);
    stats.max = Math.max(stats.max, duration);
    stats.avg = stats.total / stats.count;
    
    // 计算百分位
    const history = metricsHistory.get(name) || [];
    if (history.length > 0) {
      const sorted = [...history].sort((a, b) => a - b);
      const p50Index = Math.floor(sorted.length * 0.5);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);
      
      stats.p50 = sorted[p50Index] || 0;
      stats.p95 = sorted[p95Index] || 0;
      stats.p99 = sorted[p99Index] || 0;
    }
  }
  
  /**
   * 创建空统计
   */
  private createEmptyStats(): PerformanceStats {
    return {
      count: 0,
      total: 0,
      min: Infinity,
      max: 0,
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0
    };
  }
}

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private name: string;
  private startTime: number;
  private monitor: PerformanceMonitor;
  private metadata: Record<string, unknown> = {};
  
  constructor(name: string, monitor: PerformanceMonitor) {
    this.name = name;
    this.monitor = monitor;
    this.startTime = Date.now();
  }
  
  /**
   * 添加元数据
   */
  withMetadata(key: string, value: unknown): this {
    this.metadata[key] = value;
    return this;
  }
  
  /**
   * 结束计时并记录
   */
  stop(): number {
    const duration = Date.now() - this.startTime;
    
    this.monitor.record({
      name: this.name,
      duration,
      metadata: this.metadata
    });
    
    return duration;
  }
  
  /**
   * 结束计时但不记录
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

// 全局性能监控器
let globalMonitor: PerformanceMonitor | null = null;

/**
 * 获取全局性能监控器
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * 初始化全局性能监控器
 */
export function initPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  globalMonitor = new PerformanceMonitor(config);
  return globalMonitor;
}

// 便捷方法
export const perf = {
  start: (name: string) => getPerformanceMonitor().start(name),
  record: (metrics: Omit<PerformanceMetrics, 'timestamp'>) => getPerformanceMonitor().record(metrics),
  getStats: (name?: string) => getPerformanceMonitor().getStats(name),
  getHistory: (name: string, limit?: number) => getPerformanceMonitor().getHistory(name, limit)
};

// 装饰器：测量函数执行时间
export function measureTime<T extends (...args: any[]) => any>(
  name?: string
): MethodDecorator {
  return function(
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${String(propertyKey)}`;
    
    descriptor.value = async function(...args: any[]): Promise<T> {
      const timer = getPerformanceMonitor().start(metricName);
      
      try {
        const result = await originalMethod.apply(this, args);
        timer.stop();
        return result;
      } catch (error) {
        timer.stop();
        throw error;
      }
    };
    
    return descriptor;
  };
}

// 缓存管理
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class LRUCache<T, K = string> {
  private capacity: number;
  private cache: Map<K, CacheEntry<T>>;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  /**
   * 获取缓存项
   */
  get(key: K): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    // 移到末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }
  
  /**
   * 设置缓存项
   */
  set(key: K, value: T, ttl: number = 300000): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 如果超出容量，删除最旧的
    if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * 删除缓存项
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}
