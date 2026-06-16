#!/usr/bin/env npx ts-node
/**
 * V1.1 Bug 修复测试
 * 
 * 测试内容：
 * 1. SmartQuestionGenerator 空值安全
 * 2. Python 框架检测
 * 3. ContextAnalyzer 集成
 */

import { CodeIndexer } from '../dist/indexer/CodeIndexer.js';
import { ContextAnalyzer } from '../dist/brainstorm/ContextAnalyzer.js';
import { SmartQuestionGenerator } from '../dist/brainstorm/SmartQuestionGenerator.js';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(testName: string, passed: boolean, message?: string) {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`${status}: ${testName}`);
  if (message) {
    console.log(`  ${message}`);
  }
}

// ProjectContext 类型定义（内联）
interface ProjectContext {
  languages: string[];
  frameworks: string[];
  runtimes: string[];
  packageManagers: string[];
  dependencies?: { name: string; version?: string }[];
  architecturePatterns: { name: string; confidence: number; indicators: string[] }[];
  designPatterns: { name: string; usageCount: number; locations: string[] }[];
  codeMetrics: {
    totalFiles: number;
    totalLines: number;
    commentDensity: number;
    testCoverage: number;
    complexity: 'low' | 'medium' | 'high';
    moduleCount: number;
  };
  existingFeatures: string[];
  integrationPoints: string[];
  configFiles: string[];
  ciCdConfigured: boolean;
  testingFramework?: string;
  inferredRequirements: {
    category: string;
    name: string;
    confidence: number;
    source: string;
    evidence: string[];
  }[];
  confidence: number;
  gaps: string[];
}

// RequirementAnalysis 类型定义（内联）
interface RequirementAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  extractedFeatures: string[];
  gaps: string[];
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('GDD V1.1 Bug 修复测试');
  console.log('='.repeat(60) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  // ==================== 测试 1: SmartQuestionGenerator 空值安全 ====================
  console.log(colors.blue + '测试组 1: SmartQuestionGenerator 空值安全' + colors.reset);
  
  // 测试 1.1: 空上下文
  try {
    const emptyContext: ProjectContext = {
      languages: [],
      frameworks: [],
      runtimes: [],
      packageManagers: [],
      architecturePatterns: [],
      designPatterns: [],
      codeMetrics: {
        totalFiles: 0,
        totalLines: 0,
        commentDensity: 0,
        testCoverage: 0,
        complexity: 'low',
        moduleCount: 0
      },
      existingFeatures: [],
      integrationPoints: [],
      configFiles: [],
      ciCdConfigured: false,
      testingFramework: undefined,
      inferredRequirements: [],
      confidence: 0,
      gaps: []
    };
    
    const analysis: RequirementAnalysis = {
      complexity: 'simple',
      extractedFeatures: [],
      gaps: []
    };
    
    const questions = SmartQuestionGenerator.generateSmartQuestions(analysis, emptyContext);
    log('空上下文不抛出错误', true, `生成了 ${questions.length} 个问题`);
    passed++;
  } catch (error: any) {
    log('空上下文不抛出错误', false, error.message);
    failed++;
  }
  
  // 测试 1.2: undefined 依赖
  try {
    const contextWithUndefinedDeps: ProjectContext = {
      languages: ['TypeScript'],
      frameworks: [],
      runtimes: [],
      packageManagers: [],
      architecturePatterns: [],
      designPatterns: [],
      codeMetrics: {
        totalFiles: 10,
        totalLines: 500,
        commentDensity: 0.1,
        testCoverage: 0.2,
        complexity: 'medium',
        moduleCount: 5
      },
      existingFeatures: [],
      integrationPoints: [],
      configFiles: [],
      ciCdConfigured: false,
      testingFramework: undefined,
      inferredRequirements: [],
      confidence: 0.5,
      gaps: []
    };
    
    const analysis: RequirementAnalysis = {
      complexity: 'complex',
      extractedFeatures: ['API', '数据库'],
      gaps: ['数据存储']
    };
    
    const questions = SmartQuestionGenerator.generateSmartQuestions(analysis, contextWithUndefinedDeps);
    log('undefined 依赖不抛出错误', true, `生成了 ${questions.length} 个问题`);
    passed++;
  } catch (error: any) {
    log('undefined 依赖不抛出错误', false, error.message);
    failed++;
  }
  
  // 测试 1.3: 空架构模式
  try {
    const contextWithEmptyPatterns: ProjectContext = {
      languages: ['Python'],
      frameworks: ['FastAPI'],
      runtimes: [],
      packageManagers: [],
      architecturePatterns: [],  // 空数组
      designPatterns: [],
      codeMetrics: {
        totalFiles: 50,
        totalLines: 2000,
        commentDensity: 0.15,
        testCoverage: 0.3,
        complexity: 'high',
        moduleCount: 15
      },
      existingFeatures: [],
      integrationPoints: [],
      configFiles: [],
      ciCdConfigured: false,
      testingFramework: 'PyTest',
      inferredRequirements: [],
      confidence: 0.7,
      gaps: []
    };
    
    const analysis: RequirementAnalysis = {
      complexity: 'complex',
      extractedFeatures: ['用户认证', 'API'],
      gaps: []
    };
    
    const questions = SmartQuestionGenerator.generateSmartQuestions(analysis, contextWithEmptyPatterns);
    log('空架构模式不抛出错误', true, `生成了 ${questions.length} 个问题`);
    passed++;
  } catch (error: any) {
    log('空架构模式不抛出错误', false, error.message);
    failed++;
  }
  
  // ==================== 测试 2: Python 框架检测 ====================
  console.log('\n' + colors.blue + '测试组 2: Python 框架检测' + colors.reset);
  
  // 测试 2.1: spec-kit-test 项目（应该检测到 Typer/Rich）
  const specKitPath = '/Users/jiangqiyuan/WorkBuddy/2026-06-15-15-42-19/spec-kit-test';
  
  try {
    const indexer = new CodeIndexer('test-graph', specKitPath);
    const result = await indexer.index();
    
    // 从 summary 获取信息
    console.log(`  扫描文件数: ${result.summary.filesScanned}`);
    console.log(`  生成节点数: ${result.summary.nodesGenerated}`);
    console.log(`  生成边数: ${result.summary.edgesGenerated}`);
    
    // 检查是否有框架信息
    const frameworkNode = result.nodes.find(n => n.layer === 'L1_Constitution');
    if (frameworkNode) {
      console.log(`  检测到框架: ${frameworkNode.properties.framework || 'none'}`);
    }
    
    log('spec-kit-test 项目索引成功', true);
    passed++;
  } catch (error: any) {
    log('spec-kit-test 项目索引成功', false, error.message);
    failed++;
  }
  
  // ==================== 测试 3: ContextAnalyzer 集成 ====================
  console.log('\n' + colors.blue + '测试组 3: ContextAnalyzer 集成' + colors.reset);
  
  // 测试 3.1: 从索引结果构建上下文
  try {
    const analyzer = new ContextAnalyzer();
    
    // 模拟一个索引结果
    const mockIndexResult = {
      files: [
        { path: 'main.py', language: 'python', lineCount: 100 },
        { path: 'api.py', language: 'python', lineCount: 200 },
        { path: 'models.py', language: 'python', lineCount: 150 },
      ],
      dependencies: [
        { name: 'fastapi', version: '0.100.0' },
        { name: 'uvicorn', version: '0.23.0' },
        { name: 'pydantic', version: '2.0.0' },
        { name: 'pytest', version: '7.4.0' },
        { name: 'python-jose', version: '3.3.0' },
      ]
    };
    
    const context = analyzer.analyzeFromIndexResult(mockIndexResult);
    
    console.log(`  检测到语言: ${context.languages.join(', ')}`);
    console.log(`  检测到框架: ${context.frameworks.join(', ')}`);
    console.log(`  检测到测试框架: ${context.testingFramework || 'none'}`);
    console.log(`  置信度: ${Math.round(context.confidence * 100)}%`);
    console.log(`  缺口: ${context.gaps.join(', ')}`);
    
    // 验证框架检测
    const hasFastAPI = context.frameworks.includes('FastAPI');
    const hasPydantic = context.frameworks.includes('Pydantic');
    
    log('FastAPI 框架检测', hasFastAPI, hasFastAPI ? '成功检测到 FastAPI' : '未检测到 FastAPI');
    if (hasFastAPI) passed++;
    else failed++;
    
    log('Pydantic 库检测', hasPydantic, hasPydantic ? '成功检测到 Pydantic' : '未检测到 Pydantic');
    if (hasPydantic) passed++;
    else failed++;
    
    log('pytest 测试框架检测', context.testingFramework === 'PyTest', 
      context.testingFramework === 'PyTest' ? '成功检测到 PyTest' : `检测到: ${context.testingFramework}`);
    if (context.testingFramework === 'PyTest') passed++;
    else failed++;
    
  } catch (error: any) {
    log('ContextAnalyzer 集成测试', false, error.message);
    failed++;
  }
  
  // ==================== 测试 4: 端到端测试 ====================
  console.log('\n' + colors.blue + '测试组 4: 端到端测试' + colors.reset);
  
  try {
    // 1. 索引项目
    const indexer = new CodeIndexer('e2e-test', specKitPath);
    const indexResult = await indexer.index();
    
    // 2. 分析上下文
    const analyzer = new ContextAnalyzer();
    const context = analyzer.analyzeFromIndexResult(indexResult);
    
    // 3. 生成问题
    const analysis: RequirementAnalysis = {
      complexity: context.codeMetrics.complexity,
      extractedFeatures: context.existingFeatures.slice(0, 5),
      gaps: context.gaps
    };
    
    const questions = SmartQuestionGenerator.generateSmartQuestions(analysis, context);
    
    console.log(`  项目: ${specKitPath.split('/').pop()}`);
    console.log(`  节点数: ${indexResult.summary.nodesGenerated}`);
    console.log(`  框架: ${context.frameworks.join(', ') || 'none'}`);
    console.log(`  生成问题数: ${questions.length}`);
    
    // 验证整个流程不抛出错误
    log('端到端流程无错误', true, '索引 -> 分析 -> 问题生成 全流程成功');
    passed++;
    
  } catch (error: any) {
    log('端到端流程无错误', false, error.message);
    failed++;
  }
  
  // ==================== 测试总结 ====================
  console.log('\n' + '='.repeat(60));
  console.log('测试总结');
  console.log('='.repeat(60));
  
  console.log(`${colors.green}通过: ${passed}${colors.reset}`);
  console.log(`${colors.red}失败: ${failed}${colors.reset}`);
  console.log(`总计: ${passed + failed}`);
  
  console.log('\n修复内容:');
  console.log('1. SmartQuestionGenerator 添加空值安全检查');
  console.log('2. CodeIndexer 支持 Python 依赖文件解析 (pyproject.toml, requirements.txt, poetry.lock, Pipfile)');
  console.log('3. ContextAnalyzer 增强 Python 框架检测 (FastAPI, Django, Flask, Typer, Rich, Pydantic 等)');
  console.log('4. ContextAnalyzer 增强 Python 测试框架检测 (pytest, hypothesis, factory_boy 等)');
  
  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(console.error);
