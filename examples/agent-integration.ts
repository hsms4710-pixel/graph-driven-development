/**
 * Graph-Driven Development - Agent 集成示例
 * 
 * 本示例展示了如何将 GDD 集成到不同的 Agent 平台
 */

import { AgentAdapterManager, agentAdapterManager } from '../src/agent-adapter';
import { ClaudeCodeAdapter } from '../src/agent-adapter/adapters/ClaudeCodeAdapter';
import { CodeBuddyAdapter } from '../src/agent-adapter/adapters/CodeBuddyAdapter';
import { getLogger, initLogger } from '../src/utils/logger';

// 初始化日志
initLogger({ level: 'info' });
const logger = getLogger();

// ==================== Claude Code 集成示例 ====================

async function example_ClaudeCodeIntegration() {
  logger.info('=== Claude Code 集成示例 ===');
  
  // 创建适配器配置
  const config = {
    platform: 'claude-code',
    transport: 'stdio',
    logLevel: 'info' as const
  };
  
  // 连接到 Claude Code
  const adapter = await agentAdapterManager.connectToPlatform('claude-code', config);
  
  try {
    // 调用 GDD 工具
    const result = await adapter.callTool({
      name: 'gdd_create_graph',
      arguments: {
        name: 'claude-demo-project',
        description: 'Claude Code 集成演示项目'
      }
    });
    
    logger.info('创建项目结果:', result);
    
    // 获取可用工具列表
    const tools = await adapter.listTools();
    logger.info('可用工具数量:', tools.length);
    
    // 监听事件
    adapter.on('connected', (data: any) => {
      logger.info('Claude Code 已连接:', data);
    });
    
    adapter.on('tool:result', (data: any) => {
      logger.info('工具执行完成:', {
        toolName: data.toolName,
        duration: data.duration
      });
    });
    
  } finally {
    // 断开连接
    await adapter.disconnect();
  }
}

// ==================== CodeBuddy 集成示例 ====================

async function example_CodeBuddyIntegration() {
  logger.info('=== CodeBuddy 集成示例 ===');
  
  // CodeBuddy 支持两种模式：内置插件和 MCP Server
  const config = {
    platform: 'codebuddy',
    transport: 'inprocess'  // 内置模式
  };
  
  const adapter = await agentAdapterManager.connectToPlatform('codebuddy', config);
  
  // 创建会话
  const session = adapter.createSession('graph_123');
  logger.info('会话已创建:', session.id);
  
  // 调用工具
  const result = await adapter.callTool({
    name: 'gdd_smart_start_session',
    arguments: {
      user_input: '创建一个 React 应用',
      auto_index: true
    }
  });
  
  logger.info('智能会话结果:', result);
  
  // 更新会话
  adapter.updateSession(session.id, { 
    recentNodes: ['node_1', 'node_2'] 
  });
  
  // 关闭会话
  agentAdapterManager.closeSession(session.id);
}

// ==================== 多平台适配器管理 ====================

async function example_MultiPlatformManagement() {
  logger.info('=== 多平台适配器管理示例 ===');
  
  // 获取所有已注册的平台
  const platforms = agentAdapterManager.getRegisteredPlatforms();
  logger.info('已注册平台:', platforms);
  
  // 获取所有平台的能力
  const capabilities = agentAdapterManager.getCapabilities();
  for (const [platform, caps] of capabilities) {
    logger.info(`平台 ${platform} 能力:`, {
      tools: caps.tools.length,
      resources: caps.resources.length,
      prompts: caps.prompts.length
    });
  }
  
  // 健康检查
  const healthResults = await agentAdapterManager.healthCheckAll();
  for (const result of healthResults) {
    logger.info(`平台 ${result.platform} 状态:`, result.status);
  }
}

// ==================== 事件驱动通信 ====================

async function example_EventDrivenCommunication() {
  logger.info('=== 事件驱动通信示例 ===');
  
  const adapter = await agentAdapterManager.connectToPlatform('claude-code', {
    transport: 'stdio'
  });
  
  // 注册事件处理器
  adapter.on('connected', (data: any) => {
    logger.info('连接事件:', data);
  });
  
  adapter.on('tool:called', (data: any) => {
    logger.info('工具调用:', data.toolName);
  });
  
  adapter.on('graph:changed', (data: any) => {
    logger.info('图谱变更:', {
      graphId: data.graphId,
      changes: data.changes.length
    });
  });
  
  adapter.on('error', (data: any) => {
    logger.error('错误事件:', data.message);
  });
  
  // 触发一些操作来产生事件
  try {
    await adapter.callTool({
      name: 'gdd_add_node',
      arguments: {
        graph_id: 'test',
        layer: 'L3_Epic',
        label: '测试功能'
      }
    });
  } catch (e) {
    // 忽略错误，只是为了演示事件
  }
  
  // 移除事件处理器
  const handler = (data: any) => {
    logger.info('临时处理器:', data);
  };
  adapter.on('connected', handler);
  adapter.off('connected', handler);
  
  await adapter.disconnect();
}

// ==================== 主函数 ====================

async function main() {
  try {
    // 示例 1: Claude Code 集成
    // await example_ClaudeCodeIntegration();
    
    // 示例 2: CodeBuddy 集成
    // await example_CodeBuddyIntegration();
    
    // 示例 3: 多平台管理
    await example_MultiPlatformManagement();
    
    // 示例 4: 事件驱动通信
    // await example_EventDrivenCommunication();
    
    logger.info('所有 Agent 集成示例执行完成！');
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
  example_ClaudeCodeIntegration,
  example_CodeBuddyIntegration,
  example_MultiPlatformManagement,
  example_EventDrivenCommunication,
  main
};
