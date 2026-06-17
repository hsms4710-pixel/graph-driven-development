#!/usr/bin/env npx ts-node
/**
 * V5.0 测试 - 上下文增强功能
 */

import { ContextTools, contextTools } from '../dist/mcp/ContextTools.js';
import { GDDCommandManager, gddCommandManager } from '../dist/mcp/GDDCommandManager.js';
import { NodeTemplateManager, nodeTemplateManager } from '../dist/mcp/NodeTemplateManager.js';

// 直接使用 GraphStore 而不是通过 index
import { graphStore } from '../dist/mcp/GraphStore.js';

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

// ============ 测试辅助 ============

function createTestGraph() {
  const graph = graphStore.createGraph({
    id: `test_graph_${Date.now()}`,
    name: 'Test Project',
    description: 'Test project for V5.0',
    nodes: [
      {
        id: 'node_constitution',
        label: 'Project Constitution',
        layer: 'L1_Constitution',
        type: 'principles',
        properties: {
          principles: ['Code quality first', 'Type safety'],
          standards: ['ESLint', 'Prettier']
        }
      },
      {
        id: 'node_techstack',
        label: 'Tech Stack',
        layer: 'L2_TechStack',
        type: 'framework',
        properties: {
          name: 'React',
          version: '18.0',
          purpose: 'frontend'
        }
      },
      {
        id: 'node_epic_1',
        label: 'User Authentication',
        layer: 'L3_Epic',
        type: 'epic',
        properties: {
          goal: 'Implement secure auth',
          priority: 'P1'
        }
      },
      {
        id: 'node_story_1',
        label: 'Email Registration',
        layer: 'L4_Story',
        type: 'user_story',
        properties: {
          userStory: 'As a user, I want to register...',
          epicId: 'node_epic_1'
        }
      },
      {
        id: 'node_task_1',
        label: 'Create User Model',
        layer: 'L5_Task',
        type: 'task',
        properties: {
          description: 'Define User schema',
          storyId: 'node_story_1',
          filePath: 'src/models/User.ts',
          startLine: 1,
          endLine: 20
        }
      },
      {
        id: 'node_task_2',
        label: 'Create Auth Service',
        layer: 'L5_Task',
        type: 'task',
        properties: {
          description: 'Implement auth logic',
          storyId: 'node_story_1',
          filePath: 'src/services/AuthService.ts',
          startLine: 1,
          endLine: 50
        }
      }
    ],
    edges: [
      {
        id: 'edge_1',
        from: 'node_constitution',
        to: 'node_techstack',
        type: 'contains',
        label: 'contains'
      },
      {
        id: 'edge_2',
        from: 'node_techstack',
        to: 'node_epic_1',
        type: 'contains',
        label: 'contains'
      },
      {
        id: 'edge_3',
        from: 'node_epic_1',
        to: 'node_story_1',
        type: 'contains',
        label: 'contains'
      },
      {
        id: 'edge_4',
        from: 'node_story_1',
        to: 'node_task_1',
        type: 'depends_on',
        label: 'depends on'
      },
      {
        id: 'edge_5',
        from: 'node_task_1',
        to: 'node_task_2',
        type: 'depends_on',
        label: 'depends on'
      }
    ]
  });
  
  return graph;
}

let testGraphId: string;
let passCount = 0;
let failCount = 0;

// ============ ContextTools 测试 ============

async function testContextTools() {
  console.log('\n📦 Testing ContextTools...\n');
  
  // 创建测试图
  const graph = createTestGraph();
  testGraphId = graph.id;
  
  try {
    // 测试 queryGraph
    const queryResult = await contextTools.queryGraph({
      graphId: testGraphId,
      query: 'auth',
      limit: 10
    });
    
    log('queryGraph by keyword', 
      queryResult.totalNodes > 0,
      `Found ${queryResult.totalNodes} nodes`
    );
    if (queryResult.totalNodes > 0) passCount++;
    else failCount++;
    
    // 测试 filter by layer
    const layerResult = await contextTools.queryGraph({
      graphId: testGraphId,
      query: '',
      layer: 'L4_Story',
      limit: 10
    });
    
    const allLayersSame = layerResult.nodes.every(n => n.layer === 'L4_Story');
    log('queryGraph filter by layer', 
      allLayersSame,
      `All ${layerResult.nodes.length} nodes are L4_Story`
    );
    if (allLayersSame) passCount++;
    else failCount++;
    
    // 测试 getContext
    const contextResult = await contextTools.getContext({
      graphId: testGraphId,
      nodeId: 'node_story_1',
      includeRelated: true
    });
    
    log('getContext by node ID', 
      contextResult.context !== null,
      contextResult.context ? `Found context for ${contextResult.context.node.label}` : 'Context is null'
    );
    if (contextResult.context !== null) passCount++;
    else failCount++;
    
    // 测试 getContext by file path
    const fileContextResult = await contextTools.getContext({
      graphId: testGraphId,
      filePath: 'src/models/User.ts',
      includeRelated: false
    });
    
    log('getContext by file path', 
      fileContextResult.context !== null,
      fileContextResult.context ? `Found context for file` : 'Context is null'
    );
    if (fileContextResult.context !== null) passCount++;
    else failCount++;
    
    // 测试 analyzeImpact
    const impactResult = await contextTools.analyzeImpact({
      graphId: testGraphId,
      target: 'node_task_1',
      targetType: 'node',
      depth: 2
    });
    
    log('analyzeImpact', 
      impactResult.directlyAffected.nodes.length > 0,
      `Found ${impactResult.directlyAffected.nodes.length} directly affected nodes`
    );
    if (impactResult.directlyAffected.nodes.length > 0) passCount++;
    else failCount++;
    
    // 测试 getRelated
    const relatedResult = await contextTools.getRelated({
      graphId: testGraphId,
      nodeId: 'node_task_1',
      direction: 'both',
      limit: 10
    });
    
    log('getRelated', 
      relatedResult.relatedItems.length > 0,
      `Found ${relatedResult.relatedItems.length} related items`
    );
    if (relatedResult.relatedItems.length > 0) passCount++;
    else failCount++;
    
  } catch (e: any) {
    log('ContextTools tests', false, e.message);
    failCount++;
  }
}

// ============ GDDCommandManager 测试 ============

async function testGDDCommandManager() {
  console.log('\n📦 Testing GDDCommandManager...\n');
  
  if (!testGraphId) {
    const graph = createTestGraph();
    testGraphId = graph.id;
  }
  
  try {
    // 测试 analyze 命令
    const analyzeResult = await gddCommandManager.execute({
      command: 'analyze',
      graphId: testGraphId
    });
    
    log('analyze command', 
      analyzeResult.success,
      analyzeResult.success ? 'Analysis completed' : analyzeResult.error
    );
    if (analyzeResult.success) passCount++;
    else failCount++;
    
    // 测试 status 命令
    const statusResult = await gddCommandManager.execute({
      command: 'status',
      graphId: testGraphId
    });
    
    log('status command', 
      statusResult.success,
      statusResult.success ? 'Status retrieved' : statusResult.error
    );
    if (statusResult.success) passCount++;
    else failCount++;
    
    // 测试 help 命令
    const helpResult = await gddCommandManager.execute({
      command: 'help',
      graphId: testGraphId
    });
    
    log('help command', 
      helpResult.success,
      helpResult.success ? 'Help displayed' : helpResult.error
    );
    if (helpResult.success) passCount++;
    else failCount++;
    
    // 测试 query 命令
    const queryResult = await gddCommandManager.execute({
      command: 'query',
      graphId: testGraphId,
      options: { query: 'user' }
    });
    
    log('query command', 
      queryResult.success,
      queryResult.success ? 'Query executed' : queryResult.error
    );
    if (queryResult.success) passCount++;
    else failCount++;
    
    // 测试 context 命令
    const contextResult = await gddCommandManager.execute({
      command: 'context',
      graphId: testGraphId,
      options: { node: 'node_story_1' }
    });
    
    log('context command', 
      contextResult.success,
      contextResult.success ? 'Context retrieved' : contextResult.error
    );
    if (contextResult.success) passCount++;
    else failCount++;
    
    // 测试 impact 命令
    const impactResult = await gddCommandManager.execute({
      command: 'impact',
      graphId: testGraphId,
      options: { target: 'node_task_1', type: 'node' }
    });
    
    log('impact command', 
      impactResult.success,
      impactResult.success ? 'Impact analyzed' : impactResult.error
    );
    if (impactResult.success) passCount++;
    else failCount++;
    
    // 测试 related 命令
    const relatedResult = await gddCommandManager.execute({
      command: 'related',
      graphId: testGraphId,
      options: { node: 'node_task_1' }
    });
    
    log('related command', 
      relatedResult.success,
      relatedResult.success ? 'Related items found' : relatedResult.error
    );
    if (relatedResult.success) passCount++;
    else failCount++;
    
    // 测试 plan 命令
    const planResult = await gddCommandManager.execute({
      command: 'plan',
      graphId: testGraphId,
      options: { scope: 'all' }
    });
    
    log('plan command', 
      planResult.success,
      planResult.success ? 'Plan generated' : planResult.error
    );
    if (planResult.success) passCount++;
    else failCount++;
    
    // 测试 tasks 命令
    const tasksResult = await gddCommandManager.execute({
      command: 'tasks',
      graphId: testGraphId
    });
    
    log('tasks command', 
      tasksResult.success,
      tasksResult.success ? 'Tasks listed' : tasksResult.error
    );
    if (tasksResult.success) passCount++;
    else failCount++;
    
    // 测试未知命令
    const unknownResult = await gddCommandManager.execute({
      command: 'unknown' as any,
      graphId: testGraphId
    });
    
    log('unknown command handling', 
      !unknownResult.success,
      unknownResult.error || 'Command not found'
    );
    if (!unknownResult.success) passCount++;
    else failCount++;
    
  } catch (e: any) {
    log('GDDCommandManager tests', false, e.message);
    failCount++;
  }
}

// ============ NodeTemplateManager 测试 ============

function testNodeTemplateManager() {
  console.log('\n📦 Testing NodeTemplateManager...\n');
  
  try {
    // 测试获取所有层级模板
    const l1Templates = nodeTemplateManager.getTemplatesByLayer('L1_Constitution');
    const l2Templates = nodeTemplateManager.getTemplatesByLayer('L2_TechStack');
    const l3Templates = nodeTemplateManager.getTemplatesByLayer('L3_Epic');
    const l4Templates = nodeTemplateManager.getTemplatesByLayer('L4_Story');
    const l5Templates = nodeTemplateManager.getTemplatesByLayer('L5_Task');
    
    log('getTemplatesByLayer - L1', 
      l1Templates.length > 0,
      `Found ${l1Templates.length} templates`
    );
    if (l1Templates.length > 0) passCount++;
    else failCount++;
    
    log('getTemplatesByLayer - L2', 
      l2Templates.length > 0,
      `Found ${l2Templates.length} templates`
    );
    if (l2Templates.length > 0) passCount++;
    else failCount++;
    
    log('getTemplatesByLayer - L3', 
      l3Templates.length > 0,
      `Found ${l3Templates.length} templates`
    );
    if (l3Templates.length > 0) passCount++;
    else failCount++;
    
    log('getTemplatesByLayer - L4', 
      l4Templates.length > 0,
      `Found ${l4Templates.length} templates`
    );
    if (l4Templates.length > 0) passCount++;
    else failCount++;
    
    log('getTemplatesByLayer - L5', 
      l5Templates.length > 0,
      `Found ${l5Templates.length} templates`
    );
    if (l5Templates.length > 0) passCount++;
    else failCount++;
    
    // 测试获取特定模板
    const frameworkTemplate = nodeTemplateManager.getTemplate('L2_TechStack', 'framework');
    
    log('getTemplate - framework', 
      frameworkTemplate !== undefined,
      frameworkTemplate ? `Found: ${frameworkTemplate.name}` : 'Template not found'
    );
    if (frameworkTemplate !== undefined) passCount++;
    else failCount++;
    
    // 测试未知模板
    const unknownTemplate = nodeTemplateManager.getTemplate('L9_Unknown', 'type');
    
    log('getTemplate - unknown', 
      unknownTemplate === undefined,
      unknownTemplate === undefined ? 'Correctly returned undefined' : 'Should be undefined'
    );
    if (unknownTemplate === undefined) passCount++;
    else failCount++;
    
    // 测试验证有效节点
    const validResult = nodeTemplateManager.validateNode(
      'L2_TechStack',
      'framework',
      {
        name: 'React',
        version: '18.0'
      }
    );
    
    log('validateNode - valid', 
      validResult.valid,
      validResult.valid ? 'Node is valid' : `Missing: ${validResult.missingRequired.join(', ')}`
    );
    if (validResult.valid) passCount++;
    else failCount++;
    
    // 测试验证缺少必需属性的节点
    const invalidResult = nodeTemplateManager.validateNode(
      'L2_TechStack',
      'framework',
      {
        name: 'React'
        // version is missing
      }
    );
    
    log('validateNode - missing required', 
      !invalidResult.valid && invalidResult.missingRequired.includes('version'),
      `Missing: ${invalidResult.missingRequired.join(', ')}`
    );
    if (!invalidResult.valid && invalidResult.missingRequired.includes('version')) passCount++;
    else failCount++;
    
    // 测试默认属性
    const defaults = nodeTemplateManager.createDefaultProperties(
      'L4_Story',
      'user_story'
    );
    
    log('createDefaultProperties', 
      defaults.priority === 'medium',
      `Default priority: ${defaults.priority}`
    );
    if (defaults.priority === 'medium') passCount++;
    else failCount++;
    
  } catch (e: any) {
    log('NodeTemplateManager tests', false, e.message);
    failCount++;
  }
}

// ============ 集成测试 ============

async function testIntegration() {
  console.log('\n📦 Testing V5.0 Integration...\n');
  
  try {
    // 创建新图
    const graph = createTestGraph();
    const graphId = graph.id;
    
    // 测试命令
    const statusResult = await gddCommandManager.execute({
      command: 'status',
      graphId
    });
    if (!statusResult.success) throw new Error('Status command failed');
    
    // 测试查询
    const queryResult = await contextTools.queryGraph({
      graphId,
      query: 'auth',
      limit: 10
    });
    if (queryResult.totalNodes === 0) throw new Error('Query returned no results');
    
    // 测试上下文
    const contextResult = await contextTools.getContext({
      graphId,
      nodeId: 'node_story_1',
      includeRelated: true
    });
    if (contextResult.context === null) throw new Error('Context is null');
    
    // 测试影响分析
    const impactResult = await contextTools.analyzeImpact({
      graphId,
      target: 'node_task_1',
      targetType: 'node'
    });
    if (impactResult.directlyAffected.nodes.length === 0) throw new Error('No affected nodes found');
    
    // 测试模板验证
    const validation = nodeTemplateManager.validateNode(
      'L5_Task',
      'task',
      {
        name: 'Test Task',
        description: 'Test description'
      }
    );
    if (!validation.valid) throw new Error('Template validation failed');
    
    log('V5.0 Integration', true, 'All integrated features working');
    passCount++;
    
  } catch (e: any) {
    log('V5.0 Integration', false, e.message);
    failCount++;
  }
}

// ============ 主函数 ============

async function main() {
  console.log('='.repeat(60));
  console.log('GDD V5.0 Test Suite - Context Enhancement');
  console.log('='.repeat(60));
  
  try {
    await testContextTools();
    await testGDDCommandManager();
    testNodeTemplateManager();
    await testIntegration();
    
    // 清理
    if (testGraphId) {
      graphStore.deleteGraph(testGraphId);
    }
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`${colors.green}Passed: ${passCount}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);
    console.log(`Total: ${passCount + failCount}`);
    console.log('='.repeat(60));
    
    process.exit(failCount > 0 ? 1 : 0);
    
  } catch (e: any) {
    console.error('Test suite error:', e);
    process.exit(1);
  }
}

main();
