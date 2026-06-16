/**
 * Agent Adapter Base - 适配器基类
 * 
 * 提供所有 Agent 适配器的公共实现
 */

import {
  IAgentAdapter,
  AgentAdapterConfig,
  AgentPlatform,
  TransportType,
  ToolCallParams,
  ToolCallResult,
  MCPTool,
  AgentEvent,
  AgentSession,
  HealthCheckResult,
  AgentCapabilities,
  GraphChange
} from './types';

// 重新导出 IAgentAdapter 以便其他模块使用
export type { IAgentAdapter } from './types';

// 事件监听器类型
type EventListener = (data: unknown) => void;

/**
 * Agent 适配器基类
 * 提供公共方法和事件管理
 */
export abstract class AgentAdapterBase implements IAgentAdapter {
  abstract readonly name: string;
  abstract readonly platform: AgentPlatform;
  abstract readonly transport: TransportType;
  
  protected config: AgentAdapterConfig | null = null;
  protected connected: boolean = false;
  protected eventListeners: Map<AgentEvent, Set<EventListener>> = new Map();
  protected sessions: Map<string, AgentSession> = new Map();
  
  // 子类需要实现的方法
  protected abstract doInitialize(config: AgentAdapterConfig): Promise<void>;
  protected abstract doConnect(): Promise<void>;
  protected abstract doDisconnect(): Promise<void>;
  protected abstract doCallTool(params: ToolCallParams): Promise<ToolCallResult>;
  protected abstract doListTools(): Promise<MCPTool[]>;
  protected abstract doReadResource(uri: string): Promise<string>;
  protected abstract doSendNotification(method: string, params?: unknown): Promise<void>;
  protected abstract doHealthCheck(): Promise<HealthCheckResult>;
  protected abstract doGetCapabilities(): AgentCapabilities;
  
  /**
   * 初始化适配器
   */
  async initialize(config: AgentAdapterConfig): Promise<void> {
    this.config = config;
    this.log('info', `Initializing adapter for platform: ${this.platform}`);
    await this.doInitialize(config);
  }
  
  /**
   * 连接到 Agent
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.log('warn', 'Already connected');
      return;
    }
    
    this.log('info', `Connecting to ${this.platform}...`);
    await this.doConnect();
    this.connected = true;
    this.emit('connected', {
      platform: this.platform,
      timestamp: Date.now()
    });
    
    this.log('info', `Connected to ${this.platform}`);
  }
  
  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    this.log('info', `Disconnecting from ${this.platform}...`);
    await this.doDisconnect();
    this.connected = false;
    
    // 清理所有会话
    for (const sessionId of this.sessions.keys()) {
      this.sessions.delete(sessionId);
    }
    
    this.emit('disconnected', {
      platform: this.platform,
      reason: 'manual'
    });
    
    this.log('info', `Disconnected from ${this.platform}`);
  }
  
  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * 调用 MCP 工具
   */
  async callTool(params: ToolCallParams): Promise<ToolCallResult> {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.platform}`);
    }
    
    const startTime = Date.now();
    
    this.emit('tool:called', {
      toolName: params.name,
      args: params.arguments
    });
    
    try {
      const result = await this.doCallTool(params);
      
      this.emit('tool:result', {
        toolName: params.name,
        result,
        duration: Date.now() - startTime
      });
      
      return result;
    } catch (error) {
      this.emit('error', {
        code: 'TOOL_CALL_FAILED',
        message: error instanceof Error ? error.message : String(error),
        details: params
      });
      throw error;
    }
  }
  
  /**
   * 列出可用工具
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.platform}`);
    }
    return this.doListTools();
  }
  
  /**
   * 获取资源
   */
  async readResource(uri: string): Promise<string> {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.platform}`);
    }
    return this.doReadResource(uri);
  }
  
  /**
   * 发送通知
   */
  async sendNotification(method: string, params?: unknown): Promise<void> {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.platform}`);
    }
    await this.doSendNotification(method, params);
  }
  
  /**
   * 添加事件监听器
   */
  on(event: AgentEvent, callback: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }
  
  /**
   * 移除事件监听器
   */
  off(event: AgentEvent, callback: EventListener): void {
    this.eventListeners.get(event)?.delete(callback);
  }
  
  /**
   * 触发事件
   */
  protected emit(event: AgentEvent, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (e) {
          this.log('error', `Error in event listener for '${event}': ${e}`);
        }
      });
    }
  }
  
  /**
   * 创建新会话
   */
  createSession(graphId?: string): AgentSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: AgentSession = {
      id: sessionId,
      platform: this.platform,
      adapter: this.name,
      graphId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
      context: {
        openFiles: [],
        recentNodes: [],
        preferences: {
          autoSync: true,
          showNotifications: true,
          language: 'zh-CN'
        }
      }
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  /**
   * 获取会话
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * 更新会话
   */
  updateSession(sessionId: string, updates: Partial<AgentSession>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    Object.assign(session, updates, {
      lastActivity: Date.now()
    });
    return true;
  }
  
  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    return this.doHealthCheck();
  }
  
  /**
   * 获取能力声明
   */
  getCapabilities(): AgentCapabilities {
    return this.doGetCapabilities();
  }
  
  /**
   * 通知图谱变更
   */
  notifyGraphChanged(graphId: string, changes: GraphChange[]): void {
    this.emit('graph:changed', {
      graphId,
      changes
    });
  }
  
  /**
   * 日志输出
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.platform}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        if (this.config?.logLevel === 'debug') {
          console.debug(prefix, message);
        }
        break;
      case 'info':
        if (this.config?.logLevel !== 'error') {
          console.info(prefix, message);
        }
        break;
      case 'warn':
        if (this.config?.logLevel !== 'error') {
          console.warn(prefix, message);
        }
        break;
      case 'error':
        console.error(prefix, message);
        break;
    }
  }
  
  /**
   * 重试执行
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config?.maxRetries ?? 3
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // 指数退避
          this.log('warn', `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}
