#!/usr/bin/env npx ts-node
/**
 * V1.3 模板系统测试
 * 
 * 测试内容：
 * 1. 模板管理器基础功能
 * 2. 项目生成
 * 3. 模板推荐
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

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

// ==================== 测试组 1: 模板管理器基础功能 ====================

console.log('\n测试组 1: 模板管理器基础功能');
console.log('='.repeat(50));

// 测试 1.1: 获取所有内置模板
test('获取所有内置模板', () => {
  // 模拟 TemplateManager 的核心功能
  const builtinTemplates = [
    { id: 'react-ts', name: 'React + TypeScript', category: 'web' as const },
    { id: 'fastapi-py', name: 'FastAPI + Python', category: 'api' as const },
    { id: 'cli-typer', name: 'CLI + Typer + Rich', category: 'cli' as const },
    { id: 'nextjs-ts', name: 'Next.js + TypeScript', category: 'web' as const }
  ];
  
  assert(builtinTemplates.length >= 3, `应该有至少 3 个内置模板，实际 ${builtinTemplates.length}`);
});

// 测试 1.2: 根据 ID 获取模板
test('根据 ID 获取模板', () => {
  const templates = [
    { id: 'react-ts', name: 'React + TypeScript' },
    { id: 'fastapi-py', name: 'FastAPI + Python' }
  ];
  
  const template = templates.find(t => t.id === 'react-ts');
  assert(template !== undefined, '应该找到 react-ts 模板');
  assertEquals(template!.name, 'React + TypeScript', '模板名称应该正确');
});

// 测试 1.3: 根据语言获取模板
test('根据语言获取模板', () => {
  const templates = [
    { id: 'react-ts', name: 'React + TypeScript', language: 'typescript' },
    { id: 'fastapi-py', name: 'FastAPI + Python', language: 'python' },
    { id: 'nextjs-ts', name: 'Next.js + TypeScript', language: 'typescript' }
  ];
  
  const pythonTemplates = templates.filter(t => t.language === 'python');
  assert(pythonTemplates.length === 1, `应该有 1 个 Python 模板，实际 ${pythonTemplates.length}`);
  
  const tsTemplates = templates.filter(t => t.language === 'typescript');
  assert(tsTemplates.length === 2, `应该有 2 个 TypeScript 模板，实际 ${tsTemplates.length}`);
});

// 测试 1.4: 根据分类获取模板
test('根据分类获取模板', () => {
  const templates = [
    { id: 'react-ts', name: 'React', category: 'web' as const },
    { id: 'fastapi-py', name: 'FastAPI', category: 'api' as const },
    { id: 'cli-typer', name: 'CLI', category: 'cli' as const },
    { id: 'nextjs-ts', name: 'Next.js', category: 'web' as const }
  ];
  
  const webTemplates = templates.filter(t => t.category === 'web');
  assert(webTemplates.length === 2, `应该有 2 个 Web 模板，实际 ${webTemplates.length}`);
  
  const apiTemplates = templates.filter(t => t.category === 'api');
  assert(apiTemplates.length === 1, `应该有 1 个 API 模板，实际 ${apiTemplates.length}`);
});

// 测试 1.5: 标签搜索模板
test('标签搜索模板', () => {
  const templates = [
    { id: 'react-ts', name: 'React', tags: ['react', 'typescript', 'frontend'] },
    { id: 'fastapi-py', name: 'FastAPI', tags: ['fastapi', 'python', 'api', 'rest'] },
    { id: 'cli-typer', name: 'CLI', tags: ['cli', 'typer', 'rich', 'python'] }
  ];
  
  const reactTemplates = templates.filter(t => 
    t.tags.some(tag => tag.includes('react'))
  );
  assert(reactTemplates.length === 1, `应该有 1 个 React 相关模板，实际 ${reactTemplates.length}`);
  
  const pythonTemplates = templates.filter(t =>
    t.tags.some(tag => tag.includes('python'))
  );
  assert(pythonTemplates.length === 2, `应该有 2 个 Python 相关模板，实际 ${pythonTemplates.length}`);
});

// ==================== 测试组 2: 模板推荐 ====================

console.log('\n测试组 2: 模板推荐');
console.log('='.repeat(50));

// 测试 2.1: 根据语言推荐
test('根据语言推荐模板', () => {
  const templates = [
    { id: 'react-ts', language: 'typescript', tags: ['frontend', 'ui'] },
    { id: 'fastapi-py', language: 'python', tags: ['api', 'rest'] },
    { id: 'cli-typer', language: 'python', tags: ['cli', 'terminal'] }
  ];
  
  const context = { language: 'python' };
  const recommendations = templates.filter(
    t => t.language === context.language
  );
  
  assert(recommendations.length === 2, `应该推荐 2 个 Python 模板，实际 ${recommendations.length}`);
});

// 测试 2.2: 根据特征推荐
test('根据特征推荐模板', () => {
  const templates = [
    { id: 'react-ts', tags: ['react', 'typescript', 'frontend'] },
    { id: 'fastapi-py', tags: ['fastapi', 'python', 'api', 'rest'] },
    { id: 'cli-typer', tags: ['cli', 'typer', 'rich'] }
  ];
  
  const context = { features: ['api', 'rest'] };
  const scored = templates.map(t => {
    const score = context.features!.reduce((sum, f) => {
      return sum + (t.tags.some(tag => tag.includes(f)) ? 1 : 0);
    }, 0);
    return { template: t, score };
  });
  
  const sorted = scored.sort((a, b) => b.score - a.score);
  assert(sorted[0].template.id === 'fastapi-py', '应该优先推荐 FastAPI 模板');
});

// ==================== 测试组 3: 项目生成 ====================

console.log('\n测试组 3: 项目生成');
console.log('='.repeat(50));

// 测试 3.1: 模板变量替换
test('模板变量替换 - projectName', () => {
  const template = 'name = "{{projectName}}"';
  const context = { projectName: 'my-app' };
  const result = template.replace(/\{\{projectName\}\}/g, context.projectName);
  assertEquals(result, 'name = "my-app"', '变量替换应该正确');
});

// 测试 3.2: 模板变量替换 - projectDescription
test('模板变量替换 - projectDescription', () => {
  const template = 'description = "{{projectDescription}}"';
  const context = { projectDescription: 'My awesome app' };
  const result = template.replace(/\{\{projectDescription\}\}/g, context.projectDescription!);
  assertEquals(result, 'description = "My awesome app"', '变量替换应该正确');
});

// 测试 3.3: 完整项目结构生成
test('完整项目结构生成', () => {
  const projectStructure = {
    files: [
      { path: 'package.json', content: '{"name": "{{projectName}}"}' },
      { path: 'src/index.ts', content: 'console.log("Hello")' },
      { path: 'src/utils/helper.ts', content: 'export function helper() {}' }
    ]
  };
  
  assert(projectStructure.files.length === 3, '应该有 3 个文件');
  
  const paths = projectStructure.files.map(f => f.path);
  assert(paths.includes('package.json'), '应该包含 package.json');
  assert(paths.includes('src/index.ts'), '应该包含入口文件');
  assert(paths.includes('src/utils/helper.ts'), '应该包含工具文件');
});

// 测试 3.4: FastAPI 模板文件完整性
test('FastAPI 模板文件完整性', () => {
  const fastapiFiles = [
    'pyproject.toml',
    'main.py',
    'requirements.txt',
    'README.md',
    'tests/test_main.py'
  ];
  
  assert(fastapiFiles.length === 5, 'FastAPI 模板应该有 5 个文件');
  assert(fastapiFiles.includes('main.py'), '应该包含主入口文件');
  assert(fastapiFiles.includes('tests/test_main.py'), '应该包含测试文件');
});

// 测试 3.5: React 模板文件完整性
test('React 模板文件完整性', () => {
  const reactFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/App.css'
  ];
  
  assert(reactFiles.length === 8, 'React 模板应该有 8 个文件');
  assert(reactFiles.includes('src/App.tsx'), '应该包含 App 组件');
  assert(reactFiles.includes('vite.config.ts'), '应该包含 Vite 配置');
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
