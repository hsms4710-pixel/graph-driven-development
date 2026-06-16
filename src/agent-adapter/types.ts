/**
 * Agent Adapter - 类型定义
 * 
 * 定义多 Agent 平台适配的统一接口和类型
 */

// ==================== Agent 平台类型 ====================

export type AgentPlatform = 
  | 'claude-code'
  | 'codex-cli'
  | 'codebuddy'
  | 'trae'
  | 'cursor'
  | 'windsurf'
  | 'github-copilot';

export type TransportType = 
  | 'stdio'
  | 'http'
  | 'sse'
  | 'websocket'
  | 'inprocess';

// ==================== Agent 配置 ====================

export interface AgentAdapterConfig {
  /** Agent 平台类型 */
  platform: AgentPlatform;
  /** 传输方式 */
  transport: TransportType;
  /** 服务器地址（HTTP/SSE/WebSocket） */
  serverUrl?: string;
  /** 认证令牌 */
  token?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** 自定义头部 */
  headers?: Record<string, string>;
  /** 额外配置 */
  extra?: Record<string, unknown>;
}

// ==================== MCP 消息类型 ====================

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

// ==================== 工具调用 ====================

export interface ToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  content: Array<{
    type: 'text' | 'resource' | 'error';
    text?: string;
    resource?: {
      uri: string;
      mimeType?: string;
      text?: string;
      blob?: string;
    };
  }>;
  isError?: boolean;
}

// ==================== 适配器接口 ====================

/**
 * Agent 适配器接口
 * 所有 Agent 平台适配器必须实现此接口
 */
export interface IAgentAdapter {
  /** 适配器名称 */
  readonly name: string;
  /** 支持的平台 */
  readonly platform: AgentPlatform;
  /** 传输类型 */
  readonly transport: TransportType;
  
  /** 初始化适配器 */
  initialize(config: AgentAdapterConfig): Promise<void>;
  
  /** 连接到 Agent */
  connect(): Promise<void>;
  
  /** 断开连接 */
  disconnect(): Promise<void>;
  
  /** 检查连接状态 */
  isConnected(): boolean;
  
  /** 调用 MCP 工具 */
  callTool(params: ToolCallParams): Promise<ToolCallResult>;
  
  /** 列出可用工具 */
  listTools(): Promise<MCPTool[]>;
  
  /** 获取资源 */
  readResource(uri: string): Promise<string>;
  
  /** 发送通知 */
  sendNotification(method: string, params?: unknown): Promise<void>;
  
  /** 添加事件监听器 */
  on(event: AgentEvent, callback: (data: unknown) => void): void;
  
  /** 移除事件监听器 */
  off(event: AgentEvent, callback: (data: unknown) => void): void;
}

// ==================== MCP 工具定义 ====================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ==================== Agent 事件 ====================

export type AgentEvent = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'tool:called'
  | 'tool:result'
  | 'notification'
  | 'resource:updated'
  | 'graph:changed';

export interface AgentEventPayload {
  connected: { platform: AgentPlatform; timestamp: number };
  disconnected: { platform: AgentPlatform; reason?: string };
  error: { code: string; message: string; details?: unknown };
  'tool:called': { toolName: string; args: Record<string, unknown> };
  'tool:result': { toolName: string; result: ToolCallResult; duration: number };
  notification: { method: string; params: unknown };
  'resource:updated': { uri: string; content: string };
  'graph:changed': { graphId: string; changes: GraphChange[] };
}

// ==================== 图谱变更 ====================

export interface GraphChange {
  type: 'node:added' | 'node:updated' | 'node:deleted' | 'edge:added' | 'edge:deleted';
  nodeId?: string;
  edgeId?: string;
  data: unknown;
}

// ==================== 会话管理 ====================

export interface AgentSession {
  id: string;
  platform: AgentPlatform;
  adapter: string;
  graphId?: string;
  brainstormSessionId?: string;
  createdAt: number;
  lastActivity: number;
  status: 'active' | 'idle' | 'completed' | 'error';
  context: SessionContext;
}

export interface SessionContext {
  /** 当前打开的文件 */
  openFiles: string[];
  /** 最近操作的节点 */
  recentNodes: string[];
  /** 用户偏好 */
  preferences: {
    autoSync: boolean;
    showNotifications: boolean;
    language: string;
  };
}

// ==================== 健康检查 ====================

export interface HealthCheckResult {
  platform: AgentPlatform;
  adapter: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastChecked: number;
  details?: Record<string, unknown>;
}

// ==================== 能力声明 ====================

export interface AgentCapabilities {
  platform: AgentPlatform;
  version: string;
  features: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
    sampling: boolean;
  };
  tools: string[];
  resources: string[];
  prompts: string[];
}
