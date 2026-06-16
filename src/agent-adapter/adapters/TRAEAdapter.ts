/**
 * TRAE Adapter - TRAE Agent 适配器
 * 
 * 支持 TRAE Agent 的 HTTP/SSE 协议集成
 */

import { AgentAdapterBase } from '../AgentAdapterBase';
import {
  AgentAdapterConfig,
  AgentPlatform,
  TransportType,
  ToolCallParams,
  ToolCallResult,
  MCPTool,
  HealthCheckResult,
  AgentCapabilities
} from '../types';

/**
 * TRAE 适配器
 * 
 * TRAE 使用 HTTP/SSE 传输，通过 REST API 和 SSE 事件流通信
 */
export class TRAEAdapter extends AgentAdapterBase {
  readonly name = 'trae-adapter';
  readonly platform: AgentPlatform = 'trae';
  readonly transport: TransportType = 'http';
  
  private baseUrl: string = '';
  private authToken: string = '';
  private eventSource: any = null;
  
  protected async doInitialize(config: AgentAdapterConfig): Promise<void> {
    if (!config.serverUrl) {
      throw new Error('TRAE adapter requires serverUrl');
    }
    
    this.baseUrl = config.serverUrl.replace(/\/$/, '');
    this.authToken = config.token || '';
    
    this.log('info', `TRAE adapter initialized with server: ${this.baseUrl}`);
  }
  
  protected async doConnect(): Promise<void> {
    // 验证连接
    await this.validateConnection();
    
    // 设置 SSE 事件监听
    this.setupEventStream();
    
    this.log('info', 'Connected to TRAE server');
  }
  
  protected async doDisconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
  
  protected async doCallTool(params: ToolCallParams): Promise<ToolCallResult> {
    this.log('info', `Tool called: ${params.name}`);
    
    const response = await globalThis.fetch(`${this.baseUrl}/api/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        name: params.name,
        arguments: params.arguments
      })
    });
    
    if (!response.ok) {
      throw new Error(`Tool call failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data as ToolCallResult;
  }
  
  protected async doListTools(): Promise<MCPTool[]> {
    const response = await globalThis.fetch(`${this.baseUrl}/api/tools`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list tools: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.tools as MCPTool[];
  }
  
  protected async doReadResource(uri: string): Promise<string> {
    this.log('info', `Reading resource: ${uri}`);
    
    const response = await globalThis.fetch(`${this.baseUrl}/api/resources/${encodeURIComponent(uri)}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to read resource: ${response.statusText}`);
    }
    
    return await response.text();
  }
  
  protected async doSendNotification(method: string, params?: unknown): Promise<void> {
    this.log('info', `Sending notification: ${method}`);
    
    await globalThis.fetch(`${this.baseUrl}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        method,
        params
      })
    });
  }
  
  protected async doHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await globalThis.fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) {
        return {
          platform: this.platform,
          adapter: this.name,
          status: 'unhealthy',
          latency: Date.now() - startTime,
          lastChecked: Date.now(),
          details: { statusCode: response.status }
        };
      }
      
      return {
        platform: this.platform,
        adapter: this.name,
        status: 'healthy',
        latency: Date.now() - startTime,
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        platform: this.platform,
        adapter: this.name,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }
  
  protected doGetCapabilities(): AgentCapabilities {
    return {
      platform: this.platform,
      version: '1.0.0',
      features: {
        tools: true,
        resources: true,
        prompts: true,
        sampling: false
      },
      tools: [
        'gdd_create_graph',
        'gdd_load_graph',
        'gdd_add_node',
        'gdd_update_node',
        'gdd_delete_node',
        'gdd_add_edge',
        'gdd_delete_edge',
        'gdd_get_pending_clarifications',
        'gdd_submit_clarification_answer',
        'gdd_get_dependency_impact',
        'gdd_export_graph',
        'gdd_list_graphs'
      ],
      resources: [
        'gdd://graphs',
        'gdd://graphs/{graphId}/nodes',
        'gdd://graphs/{graphId}/edges'
      ],
      prompts: [
        'clarification',
        'node_suggestion',
        'dependency_analysis'
      ]
    };
  }
  
  /**
   * 验证连接
   */
  private async validateConnection(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/validate`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Connection validation failed: ${response.statusText}`);
    }
  }
  
  /**
   * 设置 SSE 事件流
   */
  private setupEventStream(): void {
    // TODO: 实现 SSE 事件流监听
    // 这里需要使用 EventSource 或 fetch + stream
    this.log('info', 'SSE event stream configured');
  }
}
