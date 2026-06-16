/**
 * 真实使用场景示例
 * 
 * 展示如何在不同场景下使用 Graph-Driven Development
 */

import { CodeIndexer } from '../src/indexer/CodeIndexer';
import { smartBrainstormEngine } from '../src/brainstorm/SmartBrainstormEngine';
import { ContextAnalyzer } from '../src/brainstorm/ContextAnalyzer';

// ==================== 场景 1: 新项目开发 ====================

async function scenario1_NewProjectDevelopment() {
    console.log('【场景 1】新项目开发');
    console.log('======================');
    console.log('场景描述: 用户想要创建一个电商后台管理系统\n');
    
    // 1. 启动智能 Brainstorm 会话
    console.log('Step 1: 启动智能 Brainstorm 会话');
    const session = smartBrainstormEngine.startSmartSession(
        '帮我创建一个电商后台管理系统，支持商品管理、订单处理和用户管理',
        undefined,  // 新项目，无现有图谱
        { indexCode: false }
    );
    
    console.log(`  - 会话 ID: ${session.sessionId}`);
    console.log(`  - 状态: ${session.state}`);
    console.log(`  - 初始置信度: ${(session.projectContext?.confidence * 100).toFixed(0)}%`);
    
    // 2. 获取第一个问题
    console.log('\nStep 2: 获取澄清问题');
    const question = smartBrainstormEngine.getNextQuestion(session.sessionId!);
    
    if (question) {
        console.log(`  问题: ${question.question}`);
        console.log(`  类型: ${question.type}`);
        console.log('  选项:');
        question.options.slice(0, 3).forEach(opt => {
            console.log(`    - ${opt.label}: ${opt.description}`);
        });
    }
    
    // 3. 模拟回答问题
    console.log('\nStep 3: 回答问题');
    if (question && question.options.length > 0) {
        const selectedOptions = question.options.slice(0, 2).map(o => o.id);
        smartBrainstormEngine.answerQuestion(session.sessionId!, question.id, selectedOptions);
        console.log(`  选择: ${selectedOptions.join(', ')}`);
    }
    
    console.log('\n完成! Agent 可以根据这些问题和答案来生成代码。');
}

// ==================== 场景 2: 现有项目分析 ====================

async function scenario2_ExistingProjectAnalysis() {
    console.log('\n\n【场景 2】现有项目分析');
    console.log('======================');
    console.log('场景描述: 分析现有代码库，生成项目图谱\n');
    
    // 1. 索引现有代码
    console.log('Step 1: 索引代码库');
    const projectPath = '/Users/jiangqiyuan/WorkBuddy/2026-06-15-15-42-19/graph-driven-development/src';
    const graphId = 'analysis-' + Date.now();
    
    const indexer = new CodeIndexer(graphId, projectPath);
    const result = await indexer.index();
    
    console.log(`  - 扫描文件: ${result.summary.filesScanned}`);
    console.log(`  - 生成节点: ${result.summary.nodesGenerated}`);
    console.log(`  - 生成边: ${result.summary.edgesGenerated}`);
    
    // 2. 分析项目上下文
    console.log('\nStep 2: 分析项目上下文');
    const contextAnalyzer = new ContextAnalyzer();
    
    const mockIndexResult = {
        files: result.nodes.map(n => ({ path: n.filePath || n.label, language: 'TypeScript' })),
        dependencies: [
            { name: 'react', version: '18.2.0' },
            { name: 'express', version: '4.18.2' }
        ],
        summary: {
            totalFiles: result.summary.filesScanned,
            totalLines: 5000,
            languages: ['TypeScript'],
            frameworks: ['React', 'Express']
        }
    };
    
    const projectContext = contextAnalyzer.analyzeFromIndexResult(mockIndexResult);
    console.log(`  - 检测语言: ${projectContext.languages.join(', ')}`);
    console.log(`  - 检测框架: ${projectContext.frameworks.join(', ')}`);
    console.log(`  - 置信度: ${(projectContext.confidence * 100).toFixed(0)}%`);
    
    // 3. 基于代码上下文启动 Brainstorm
    console.log('\nStep 3: 基于代码上下文启动 Brainstorm');
    const brainstormSession = smartBrainstormEngine.startFromIndexResult(
        mockIndexResult,
        '基于现有代码库，添加用户认证功能'
    );
    
    console.log(`  - 会话 ID: ${brainstormSession.sessionId}`);
    console.log(`  - 状态: ${brainstormSession.state}`);
    
    // 4. 获取智能问题
    console.log('\nStep 4: 获取智能问题');
    const question = smartBrainstormEngine.getNextQuestion(brainstormSession.sessionId!);
    
    if (question) {
        console.log(`  问题: ${question.question}`);
        console.log(`  类型: ${question.type}`);
        console.log(`  上下文: ${question.context}`);
    }
    
    console.log('\n完成! 可以继续回答问题来细化需求。');
}

// ==================== 场景 3: MCP 工具调用 ====================

async function scenario3_MCPToolUsage() {
    console.log('\n\n【场景 3】MCP 工具调用');
    console.log('======================');
    console.log('场景描述: 展示 Agent 如何通过 MCP 调用 GDD 工具\n');
    
    // 模拟 MCP 调用流程
    const mcpCalls = [
        {
            tool: 'gdd_create_graph',
            args: { name: 'My Project', description: 'My first GDD project' },
            description: '创建新项目图谱'
        },
        {
            tool: 'gdd_add_node',
            args: {
                graph_id: 'graph_xxx',
                layer: 'L1_Constitution',
                label: '项目宪法',
                properties: { principles: ['简洁', '可维护', '可扩展'] }
            },
            description: '添加项目宪法节点'
        },
        {
            tool: 'gdd_add_node',
            args: {
                graph_id: 'graph_xxx',
                layer: 'L2_TechStack',
                label: '技术栈',
                properties: { framework: 'React', language: 'TypeScript' }
            },
            description: '添加技术栈节点'
        },
        {
            tool: 'gdd_add_edge',
            args: {
                graph_id: 'graph_xxx',
                source: 'node_l1_xxx',
                target: 'node_l2_xxx',
                type: 'refines'
            },
            description: '建立层级关系'
        },
        {
            tool: 'gdd_get_pending_clarifications',
            args: { graph_id: 'graph_xxx' },
            description: '获取待澄清问题'
        },
        {
            tool: 'gdd_export_graph',
            args: { graph_id: 'graph_xxx', format: 'markdown' },
            description: '导出为 Markdown 文档'
        }
    ];
    
    console.log('MCP 调用流程:');
    mcpCalls.forEach((call, i) => {
        console.log(`\n  ${i + 1}. ${call.tool}`);
        console.log(`     描述: ${call.description}`);
        console.log(`     参数: ${JSON.stringify(call.args, null, 2).replace(/\n/g, '\n     ')}`);
    });
    
    console.log('\n完成! Agent 可以按照这个流程与 GDD 交互。');
}

// ==================== 运行所有场景 ====================

async function main() {
    console.log('='.repeat(60));
    console.log('Graph-Driven Development - 真实使用场景示例');
    console.log('='.repeat(60));
    
    try {
        await scenario1_NewProjectDevelopment();
        await scenario2_ExistingProjectAnalysis();
        await scenario3_MCPToolUsage();
        
        console.log('\n\n' + '='.repeat(60));
        console.log('所有示例运行完成!');
        console.log('='.repeat(60));
    } catch (error) {
        console.error('运行示例时出错:', error);
    }
}

// 导出供其他模块使用
export { scenario1_NewProjectDevelopment, scenario2_ExistingProjectAnalysis, scenario3_MCPToolUsage };

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
