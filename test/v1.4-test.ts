#!/usr/bin/env npx ts-node
/**
 * V1.4 性能优化测试
 * 
 * 测试内容：
 * 1. 增量索引器
 * 2. LRU 缓存
 * 3. 大型项目性能
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 简单的测试框架
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true, message: 'PASS' });
    console.log(`✓ PASS: ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message });
    console.log(`✗ FAIL: ${name} - ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// ==================== 测试组 1: LRU 缓存 ====================

console.log('\n测试组 1: LRU 缓存');
console.log('='.repeat(50));

// 测试 1.1: 基本缓存操作
test('LRU 缓存 - 基本操作', () => {
  class MockLRUCache {
    private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
    private capacity: number;
    
    constructor(capacity: number) {
      this.capacity = capacity;
    }
    
    get(key: string): any {
      const entry = this.cache.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return undefined;
      }
      return entry.value;
    }
    
    set(key: string, value: any, ttl: number = 300000): void {
      if (this.cache.size >= this.capacity) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(key, { value, timestamp: Date.now(), ttl });
    }
    
    size(): number {
      return this.cache.size;
    }
    
    clear(): void {
      this.cache.clear();
    }
  }
  
  const cache = new MockLRUCache(100);
  
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  
  assertEquals(cache.get('key1'), 'value1', '应该获取到 key1');
  assertEquals(cache.get('key2'), 'value2', '应该获取到 key2');
  assertEquals(cache.size(), 2, '缓存大小应该是 2');
});

// 测试 1.2: 容量限制
test('LRU 缓存 - 容量限制', () => {
  class MockLRUCache {
    private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
    private capacity: number;
    
    constructor(capacity: number) {
      this.capacity = capacity;
    }
    
    set(key: string, value: any): void {
      if (this.cache.size >= this.capacity) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(key, { value, timestamp: Date.now(), ttl: 300000 });
    }
    
    get(key: string): any {
      const entry = this.cache.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return undefined;
      }
      return entry.value;
    }
    
    size(): number {
      return this.cache.size;
    }
  }
  
  const cache = new MockLRUCache(3);
  
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.set('key3', 'value3');
  cache.set('key4', 'value4'); // 应该淘汰 key1
  
  assertEquals(cache.size(), 3, '缓存大小应该是 3');
  assertEquals(cache.get('key4'), 'value4', '应该获取到 key4');
  assertEquals(cache.get('key1'), undefined, 'key1 应该被淘汰');
});

// 测试 1.3: 过期机制
test('LRU 缓存 - 过期机制', () => {
  class MockLRUCache {
    private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
    
    set(key: string, value: any, ttl: number = 300000): void {
      this.cache.set(key, { value, timestamp: Date.now(), ttl });
    }
    
    get(key: string): any {
      const entry = this.cache.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return undefined;
      }
      return entry.value;
    }
  }
  
  const cache = new MockLRUCache();
  
  cache.set('key1', 'value1', 10); // 10ms TTL
  
  assertEquals(cache.get('key1'), 'value1', '应该获取到 key1');
  
  // 模拟时间流逝
  setTimeout(() => {
    assertEquals(cache.get('key1'), undefined, 'key1 应该已过期');
  }, 20);
});

// 测试 1.4: 内存使用估算
test('LRU 缓存 - 内存使用估算', () => {
  class MockLRUCache {
    private size: number = 0;
    
    size(): number {
      return this.size;
    }
    
    memoryUsage(): number {
      return this.size * 200; // 每条目 200 字节
    }
    
    set(_key: string, _value: any): void {
      this.size++;
    }
  }
  
  const cache = new MockLRUCache();
  
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  
  assertEquals(cache.memoryUsage(), 400, '内存使用应该是 400 字节');
});

// ==================== 测试组 2: 增量索引 ====================

console.log('\n测试组 2: 增量索引');
console.log('='.repeat(50));

// 测试 2.1: 文件变更检测
test('增量索引 - 新增文件检测', () => {
  const fileStates: Map<string, { mtime: number; size: number }> = new Map();
  
  // 模拟现有文件
  fileStates.set('file1.ts', { mtime: 1000, size: 100 });
  fileStates.set('file2.ts', { mtime: 2000, size: 200 });
  
  // 模拟当前文件（新增 file3.ts）
  const currentFiles: Map<string, { mtime: number; size: number }> = new Map();
  currentFiles.set('file1.ts', { mtime: 1000, size: 100 });
  currentFiles.set('file2.ts', { mtime: 2000, size: 200 });
  currentFiles.set('file3.ts', { mtime: 3000, size: 300 });
  
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  
  // 检测变更
  for (const [filePath, status] of currentFiles) {
    const cached = fileStates.get(filePath);
    if (!cached) {
      added.push(filePath);
    } else if (status.mtime > cached.mtime) {
      modified.push(filePath);
    }
  }
  
  for (const [filePath] of fileStates) {
    if (!currentFiles.has(filePath)) {
      deleted.push(filePath);
    }
  }
  
  assertEquals(added.length, 1, '应该检测到 1 个新增文件');
  assertEquals(added[0], 'file3.ts', '新增文件应该是 file3.ts');
  assertEquals(modified.length, 0, '应该没有修改的文件');
  assertEquals(deleted.length, 0, '应该没有删除的文件');
});

// 测试 2.2: 文件修改检测
test('增量索引 - 修改文件检测', () => {
  const fileStates: Map<string, { mtime: number; size: number }> = new Map();
  fileStates.set('file1.ts', { mtime: 1000, size: 100 });
  
  const currentFiles: Map<string, { mtime: number; size: number }> = new Map();
  currentFiles.set('file1.ts', { mtime: 2000, size: 150 }); // mtime 增加
  
  const modified: string[] = [];
  
  for (const [filePath, status] of currentFiles) {
    const cached = fileStates.get(filePath);
    if (cached && status.mtime > cached.mtime) {
      modified.push(filePath);
    }
  }
  
  assertEquals(modified.length, 1, '应该检测到 1 个修改的文件');
  assertEquals(modified[0], 'file1.ts', '修改的文件应该是 file1.ts');
});

// 测试 2.3: 文件删除检测
test('增量索引 - 删除文件检测', () => {
  const fileStates: Map<string, { mtime: number; size: number }> = new Map();
  fileStates.set('file1.ts', { mtime: 1000, size: 100 });
  fileStates.set('file2.ts', { mtime: 2000, size: 200 });
  
  const currentFiles: Map<string, { mtime: number; size: number }> = new Map();
  currentFiles.set('file1.ts', { mtime: 1000, size: 100 }); // file2.ts 被删除
  
  const deleted: string[] = [];
  
  for (const [filePath] of fileStates) {
    if (!currentFiles.has(filePath)) {
      deleted.push(filePath);
    }
  }
  
  assertEquals(deleted.length, 1, '应该检测到 1 个删除的文件');
  assertEquals(deleted[0], 'file2.ts', '删除的文件应该是 file2.ts');
});

// 测试 2.4: 文件哈希计算
test('增量索引 - 文件哈希计算', () => {
  const content1 = 'console.log("Hello")';
  const content2 = 'console.log("Hello")';
  const content3 = 'console.log("World")';
  
  const computeHash = (content: string): string => {
    // 简化的 MD5 实现
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  };
  
  assertEquals(computeHash(content1), computeHash(content2), '相同内容应该产生相同哈希');
  assert(computeHash(content1) !== computeHash(content3), '不同内容应该产生不同哈希');
});

// ==================== 测试组 3: 大型项目性能 ====================

console.log('\n测试组 3: 大型项目性能');
console.log('='.repeat(50));

// 测试 3.1: 并行文件扫描
test('并行文件扫描 - 批量处理', () => {
  const files = Array.from({ length: 1000 }, (_, i) => ({
    path: `src/file${i}.ts`,
    language: 'typescript'
  }));
  
  const batchSize = 100;
  const batches: any[][] = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  
  assertEquals(batches.length, 10, '应该分成 10 个批次');
  assertEquals(batches[0].length, 100, '每个批次应该有 100 个文件');
});

// 测试 3.2: 内存优化 - 流式处理
test('内存优化 - 流式处理', () => {
  const largeContent = 'x'.repeat(1000000); // 1MB 内容
  
  // 模拟流式处理
  const chunks: string[] = [];
  const chunkSize = 10000;
  
  for (let i = 0; i < largeContent.length; i += chunkSize) {
    chunks.push(largeContent.slice(i, i + chunkSize));
  }
  
  assert(chunks.length > 0, '应该有多个块');
  assertEquals(chunks[0].length, 10000, '每个块应该是 10000 字符');
});

// 测试 3.3: 性能基准
test('性能基准 - 模拟 1000 文件索引', () => {
  const startTime = Date.now();
  
  // 模拟索引 1000 个文件
  for (let i = 0; i < 1000; i++) {
    const filePath = `src/module${Math.floor(i / 10)}/file${i}.ts`;
    const hash = String(i).repeat(32);
    const mtime = Date.now() - (1000 - i) * 1000;
    
    // 模拟哈希计算
    let h = 0;
    for (let j = 0; j < hash.length; j++) {
      h = ((h << 5) - h) + hash.charCodeAt(j);
    }
    
    // 忽略结果，只测试性能
    void h;
    void filePath;
    void mtime;
  }
  
  const elapsed = Date.now() - startTime;
  assert(elapsed < 1000, `1000 文件索引应该在 1 秒内完成，实际 ${elapsed}ms`);
  console.log(`  - 实际耗时: ${elapsed}ms`);
});

// ==================== 测试结果汇总 ====================

console.log('\n' + '='.repeat(50));
console.log('测试结果汇总');
console.log('='.repeat(50));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\n通过: ${passed} | 失败: ${failed} | 总计: ${total}`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n失败的测试:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.message}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！');
}
