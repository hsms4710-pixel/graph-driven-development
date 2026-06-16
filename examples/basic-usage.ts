/**
 * Graph-Driven Development - 基本使用示例
 * 
 * 本示例展示了如何使用 GDD 的核心功能
 */

// ==================== 导入模块 ====================

import { GraphStore } from '../src/mcp/GraphStore';
import { CodeIndexer } from '../src/indexer/CodeIndexer';
import { SmartBrainstormEngine, smartBrainstormEngine } from '../src/brainstorm/SmartBrainstormEngine';
import { getLogger, initLogger } from '../src/utils/logger';
import { getPerformanceMonitor, perf } from '../src/utils/Performance';

// ==================== 初始化 ====================

// 初始化日志系统
initLogger({
  level: 'info',
  timestamp: true,
  colors: true
});

const logger = getLogger();

// 初始化性能监控
initPerformanceMonitor({
  enabled: true,
  sampleRate: 1,
  warnThreshold: 1000
});

// ==================== 示例 1: 创建图谱 ====================

async function example1_CreateGraph() {
  logger.info('=== 示例 1: 创建图谱 ===');
  
  const timer = perf.start('create_graph');
  
  const graphId = `g_${Date.now()}`;
  const graph = {
    id: graphId,
    name: 'my-project',
    description: '我的项目',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // 在实际应用中，这里会保存到数据库
  console.log('创建图谱:', graph);
  
  const duration = timer.stop();
  logger.info(`图谱创建耗时: ${duration}ms`);
  
  return graphId;
}

// ==================== 示例 2: 索引代码 ====================

async function example2_IndexCode(graphId: string) {
  logger.info('=== 示例 2: 索引代码 ===');
  
  const codeIndexer = new CodeIndexer();
  
  // 模拟代码路径
  const codePaths = ['./src', './lib'];
  
  // 在实际应用中，这里会执行代码索引
  const indexResult = {
    files: [
      { path: 'src/index.ts', language: 'TypeScript' },
      { path: 'src/utils.ts', language: 'TypeScript' }
    ],
    dependencies: [
      { name: 'react', version: '18.0.0' },
      { name: 'typescript', version: '5.0.0' }
    ],
    summary: {
      totalFiles: 2,
      totalLines: 100,
      languages: ['TypeScript'],
      frameworks: ['React']
    }
  };
  
  console.log('代码索引结果:', indexResult);
  
  return indexResult;
}

// ==================== 示例 3: 智能 Brainstorm ====================

async function example3_SmartBrainstorm(graphId: string, indexResult: any) {
  logger.info('=== 示例 3: 智能 Brainstorm ===');
  
  // 启动智能会话
  const session = smartBrainstormEngine.startFromIndexResult(
    indexResult,
    '创建一个电商平台'
  );
  
  console.log('会话已创建:', {
    id: session.id,
    state: session.state,
    projectContext: session.projectContext
  });
  
  // 获取第一个问题
  const firstQuestion = session.questions[0];
  if (firstQuestion) {
    console.log('第一个问题:', firstQuestion.question);
    console.log('选项:', firstQuestion.options.map((o: any) => o.label));
  }
  
  // 模拟回答
  if (firstQuestion && firstQuestion.options.length > 0) {
    const answer = firstQuestion.options[0].id;
    const result = smartBrainstormEngine.answerQuestion(
      session.id,
      firstQuestion.id,
      [answer]
    );
    console.log('回答结果:', result);
  }
  
  // 获取进度
  const progress = smartBrainstormEngine.getProgress(session.id);
  console.log('会话进度:', progress);
  
  return session;
}

// ==================== 示例 4: 性能监控 ====================

async function example4_PerformanceMonitoring() {
  logger.info('=== 示例 4: 性能监控 ===');
  
  const monitor = getPerformanceMonitor();
  
  // 使用装饰器方式
  @perf.measureTime()
  async function slowOperation() {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 手动计时
  const timer = monitor.start('manual_operation');
  await new Promise(resolve => setTimeout(resolve, 200));
  timer.stop();
  
  // 获取统计
  const stats = monitor.getStats();
  console.log('性能统计:', stats);
  
  // 记录自定义指标
  monitor.record({
    name: 'custom_metric',
    duration: 150,
    metadata: { category: 'api' }
  });
}

// ==================== 示例 5: 错误处理 ====================

async function example5_ErrorHandling() {
  logger.info('=== 示例 5: 错误处理 ===');
  
  // 使用 try-catch 处理错误
  try {
    // 模拟可能出错的操作
    const result = await possiblyFailingOperation();
    console.log('操作成功:', result);
  } catch (error) {
    logger.error('操作失败:', error);
    // 在实际应用中，这里会记录错误并返回适当的响应
    console.error('错误详情:', error);
  }
}

async function possiblyFailingOperation(): Promise<string> {
  // 模拟 10% 的失败率
  if (Math.random() < 0.1) {
    throw new Error('模拟的操作失败');
  }
  return '成功';
}

// ==================== 主函数 ====================

async function main() {
  try {
    logger.info('开始 GDD 基本使用示例...');
    
    // 示例 1: 创建图谱
    const graphId = await example1_CreateGraph();
    
    // 示例 2: 索引代码
    const indexResult = await example2_IndexCode(graphId);
    
    // 示例 3: 智能 Brainstorm
    await example3_SmartBrainstorm(graphId, indexResult);
    
    // 示例 4: 性能监控
    await example4_PerformanceMonitoring();
    
    // 示例 5: 错误处理
    await example5_ErrorHandling();
    
    logger.info('所有示例执行完成！');
  } catch (error) {
    logger.error('示例执行失败:', error);
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  main();
}

export {
  example1_CreateGraph,
  example2_IndexCode,
  example3_SmartBrainstorm,
  example4_PerformanceMonitoring,
  example5_ErrorHandling,
  main
};
