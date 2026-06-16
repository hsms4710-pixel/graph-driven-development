/**
 * Agent Adapter 模块导出
 * 
 * 多 Agent 平台适配模块
 * 支持 Claude Code, Codex CLI, CodeBuddy, TRAE 等平台
 */

// 基类和管理器
export { AgentAdapterBase } from './AgentAdapterBase';
export type { IAgentAdapter } from './AgentAdapterBase';
export { AgentAdapterManager, agentAdapterManager } from './AgentAdapterManager';

// 类型导出
export type {
  AgentPlatform,
  TransportType,
  AgentAdapterConfig,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  ToolCallParams,
  ToolCallResult,
  MCPTool,
  AgentEvent,
  AgentEventPayload,
  GraphChange,
  AgentSession,
  SessionContext,
  HealthCheckResult,
  AgentCapabilities
} from './types';

// 适配器导出
export { ClaudeCodeAdapter } from './adapters/ClaudeCodeAdapter';
export { CodexCLIAdapter } from './adapters/CodexCLIAdapter';
export { CodeBuddyAdapter } from './adapters/CodeBuddyAdapter';
export { TRAEAdapter } from './adapters/TRAEAdapter';
