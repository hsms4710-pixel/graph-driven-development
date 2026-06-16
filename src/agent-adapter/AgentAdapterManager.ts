/**
 * Agent Adapter Manager - 适配器管理器
 * 
 * 管理所有 Agent 平台适配器的生命周期和通信
 */

import { AgentAdapterBase } from './AgentAdapterBase';
import { AgentAdapterConfig, AgentPlatform, AgentSession, HealthCheckResult, AgentCapabilities } from './types';
import { ClaudeCodeAdapter } from './adapters/ClaudeCodeAdapter';
import { CodexCLIAdapter } from './adapters/CodexCLIAdapter';
import { CodeBuddyAdapter } from './adapters/CodeBuddyAdapter';
import { TRAEAdapter } from './adapters/TRAEAdapter';

/**
 * 适配器工厂
 */
export class AgentAdapterManager {
  private adapters: Map<AgentPlatform, AgentAdapterBase> = new Map();
  private activeSessions: Map<string, AgentSession> = new Map();
  
  constructor() {
    // 注册所有可用的适配器
    this.registerAdapter(new ClaudeCodeAdapter());
    this.registerAdapter(new CodexCLIAdapter());
    this.registerAdapter(new CodeBuddyAdapter());
    this.registerAdapter(new TRAEAdapter());
  }
  
  /**
   * 注册适配器
   */
  private registerAdapter(adapter: AgentAdapterBase): void {
    this.adapters.set(adapter.platform, adapter);
    console.log(`[AdapterManager] Registered adapter: ${adapter.name} for platform: ${adapter.platform}`);
  }
  
  /**
   * 获取适配器
   */
  getAdapter(platform: AgentPlatform): AgentAdapterBase | undefined {
    return this.adapters.get(platform);
  }
  
  /**
   * 获取所有已注册的平台
   */
  getRegisteredPlatforms(): AgentPlatform[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * 创建并初始化适配器
   */
  async createAdapter(platform: AgentPlatform, config: AgentAdapterConfig): Promise<AgentAdapterBase> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${platform}`);
    }
    
    await adapter.initialize(config);
    return adapter;
  }
  
  /**
   * 连接到指定平台
   */
  async connectToPlatform(platform: AgentPlatform, config: AgentAdapterConfig): Promise<AgentAdapterBase> {
    const adapter = await this.createAdapter(platform, config);
    await adapter.connect();
    return adapter;
  }
  
  /**
   * 创建新会话
   */
  createSession(adapter: AgentAdapterBase, graphId?: string): AgentSession {
    const session = adapter.createSession(graphId);
    this.activeSessions.set(session.id, session);
    return session;
  }
  
  /**
   * 获取会话
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.activeSessions.get(sessionId);
  }
  
  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.activeSessions.values());
  }
  
  /**
   * 关闭会话
   */
  closeSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    session.status = 'completed';
    this.activeSessions.delete(sessionId);
    return true;
  }
  
  /**
   * 健康检查所有适配器
   */
  async healthCheckAll(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const [platform, adapter] of this.adapters) {
      try {
        const result = await adapter.healthCheck();
        results.push(result);
      } catch (error) {
        results.push({
          platform,
          adapter: adapter.name,
          status: 'unhealthy',
          latency: 0,
          lastChecked: Date.now(),
          details: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    }
    
    return results;
  }
  
  /**
   * 获取所有适配器的能力
   */
  getCapabilities(): Map<AgentPlatform, AgentCapabilities> {
    const capabilities = new Map<AgentPlatform, AgentCapabilities>();
    
    for (const [platform, adapter] of this.adapters) {
      capabilities.set(platform, adapter.getCapabilities());
    }
    
    return capabilities;
  }
  
  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    for (const [platform, adapter] of this.adapters) {
      try {
        if (adapter.isConnected()) {
          await adapter.disconnect();
        }
      } catch (error) {
        console.error(`[AdapterManager] Error disconnecting ${platform}:`, error);
      }
    }
    
    // 关闭所有会话
    for (const sessionId of this.activeSessions.keys()) {
      this.closeSession(sessionId);
    }
  }
}

// 全局单例
export const agentAdapterManager = new AgentAdapterManager();
