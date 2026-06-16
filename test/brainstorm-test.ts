/**
 * Brainstorm 智能化测试
 */

import { smartBrainstormEngine } from '../src/brainstorm/SmartBrainstormEngine';
import { CodeIndexer } from '../src/indexer/CodeIndexer';

async function main() {
    console.log('=== Brainstorm 智能化测试 ===\n');
    
    // 1. 先索引代码
    console.log('Step 1: Indexing code...');
    const projectPath = '/Users/jiangqiyuan/WorkBuddy/2026-06-15-15-42-19/graph-driven-development/src';
    const graphId = 'brainstorm-test-' + Date.now();
    
    const indexer = new CodeIndexer(graphId, projectPath);
    const indexResult = await indexer.index();
    
    console.log(`  - Files scanned: ${indexResult.summary.filesScanned}`);
    console.log(`  - Nodes generated: ${indexResult.summary.nodesGenerated}`);
    
    // 2. 启动智能 Brainstorm 会话
    console.log('\nStep 2: Starting smart brainstorm session...');
    
    // 从索引结果开始会话
    const session = smartBrainstormEngine.startFromIndexResult(
        {
            files: [],
            dependencies: [],
            summary: {
                totalFiles: indexResult.summary.filesScanned,
                totalLines: 0,
                languages: ['TypeScript'],
                frameworks: ['React', 'Express', 'Zustand']
            }
        },
        '创建一个 AI 代码助手工具，支持代码审查和自动修复'
    );
    
    console.log(`  - Session ID: ${session.id}`);
    console.log(`  - State: ${session.state}`);
    console.log(`  - Confidence: ${session.projectContext?.confidence?.toFixed(2) || 'N/A'}`);
    
    // 3. 获取第一个问题
    console.log('\nStep 3: Getting first question...');
    const firstQuestion = smartBrainstormEngine.getNextQuestion(session.id);
    
    if (firstQuestion) {
        console.log(`  - Question: ${firstQuestion.question}`);
        console.log(`  - Type: ${firstQuestion.type}`);
        console.log(`  - Priority: ${firstQuestion.priority}`);
        console.log('\n  Options:');
        firstQuestion.options.slice(0, 5).forEach(opt => {
            const disabled = opt.disabled ? ' [DISABLED]' : '';
            console.log(`    - [${opt.id}] ${opt.label}: ${opt.description}${disabled}`);
        });
    }
    
    // 4. 获取进度
    console.log('\nStep 4: Getting progress...');
    const progress = smartBrainstormEngine.getProgress(session.id);
    console.log(`  - Completed questions: ${progress.completedQuestions}`);
    console.log(`  - Total questions: ${progress.totalQuestions}`);
    console.log(`  - Completion: ${progress.completionPercentage}%`);
    
    // 5. 查看推断的需求
    console.log('\nStep 5: Inferred requirements...');
    const requirements = session.projectContext?.inferredRequirements || [];
    if (requirements.length > 0) {
        requirements.slice(0, 5).forEach(req => {
            console.log(`  - [${req.category}] ${req.description} (confidence: ${req.confidence?.toFixed(2) || 'N/A'})`);
        });
    } else {
        console.log('  No requirements inferred yet');
    }
    
    // 6. 查看识别的架构模式
    console.log('\nStep 6: Detected architecture patterns...');
    const patterns = session.projectContext?.architecturePatterns || [];
    if (patterns.length > 0) {
        patterns.forEach(p => {
            console.log(`  - ${p.name} (confidence: ${p.confidence?.toFixed(2) || 'N/A'})`);
        });
    } else {
        console.log('  No patterns detected');
    }
    
    // 7. 模拟回答一个问题
    console.log('\nStep 7: Simulating answer...');
    if (firstQuestion && firstQuestion.options.length > 0) {
        const selectedOptions = firstQuestion.options.slice(0, 2).map(o => o.id);
        smartBrainstormEngine.answerQuestion(session.id, firstQuestion.id, selectedOptions);
        console.log(`  - Selected options: ${selectedOptions.join(', ')}`);
    }
    
    // 8. 获取更新后的进度
    console.log('\nStep 8: Updated progress...');
    const updatedProgress = smartBrainstormEngine.getProgress(session.id);
    console.log(`  - Completed questions: ${updatedProgress.completedQuestions}`);
    console.log(`  - Total questions: ${updatedProgress.totalQuestions}`);
    console.log(`  - Completion: ${updatedProgress.completionPercentage}%`);
    
    console.log('\n=== Test Complete ===');
}

main().catch(console.error);
