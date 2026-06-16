/**
 * CodeBuddy Adapter - CodeBuddy 内置集成适配器
 * 
 * 支持 CodeBuddy 的原生集成和 MCP 协议
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
 * CodeBuddy 适配器
 * 
 * CodeBuddy 支持两种集成方式：
 * 1. 内置插件模式（inprocess）
 * 2. MCP Server 模式（stdio/http）
 */
export class CodeBuddyAdapter extends AgentAdapterBase {
  readonly name = 'codebuddy-adapter';
  readonly platform: AgentPlatform = 'codebuddy';
  readonly transport: TransportType = 'inprocess';
  
  private server: any = null;
  private transportInstance: any = null;
  private pluginMode: 'builtin' | 'mcp' = 'builtin';
  
  protected async doInitialize(config: AgentAdapterConfig): Promise<void> {
    // CodeBuddy 支持多种传输方式
    const transport = config.transport || 'inprocess';
    
    if (transport === 'inprocess') {
      this.pluginMode = 'builtin';
      // 内置模式不需要创建服务器
      return;
    }
    
    this.pluginMode = 'mcp';
    
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    
    this.server = new Server(
      {
        name: 'graph-driven-development-codebuddy',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true }
        }
      }
    );
    
    this.transportInstance = new StdioServerTransport();
  }
  
  protected async doConnect(): Promise<void> {
    if (this.pluginMode === 'builtin') {
      // 内置模式直接连接
      this.log('info', 'Connected in builtin plugin mode');
      return;
    }
    
    if (!this.server || !this.transportInstance) {
      throw new Error('Adapter not initialized');
    }
    
    await this.server.connect(this.transportInstance);
    
    this.registerTools();
    this.registerResources();
    this.registerPrompts();
  }
  
  protected async doDisconnect(): Promise<void> {
    if (this.pluginMode === 'builtin') {
      return;
    }
    
    if (this.server) {
      await this.server.close();
    }
  }
  
  protected async doCallTool(_params: ToolCallParams): Promise<ToolCallResult> {
    this.log('info', `Tool called: ${_params.name}`);
    
    // CodeBuddy 内置模式可以直接调用本地函数
    if (this.pluginMode === 'builtin') {
      return this.executeBuiltinTool(_params);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: `Tool ${_params.name} executed` })
        }
      ]
    };
  }
  
  protected async doListTools(): Promise<MCPTool[]> {
    return this.getGDDTools();
  }
  
  protected async doReadResource(uri: string): Promise<string> {
    this.log('info', `Reading resource: ${uri}`);
    return `Resource content for: ${uri}`;
  }
  
  protected async doSendNotification(method: string, _params?: unknown): Promise<void> {
    this.log('info', `Sending notification: ${method}`);
  }
  
  protected async doHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await this.doListTools();
      
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
   * 执行内置工具
   */
  private async executeBuiltinTool(params: ToolCallParams): Promise<ToolCallResult> {
    // TODO: 实现 CodeBuddy 内置工具调用
    // 这里可以直接调用项目中的函数
    
    switch (params.name) {
      case 'gdd_create_graph':
        return this.handleCreateGraph(params.arguments);
      case 'gdd_load_graph':
        return this.handleLoadGraph(params.arguments);
      // ... 其他工具处理
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${params.name}` }],
          isError: true
        };
    }
  }
  
  private async handleCreateGraph(_args: Record<string, unknown>): Promise<ToolCallResult> {
    // TODO: 实现创建图谱逻辑
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: 'Graph created' })
        }
      ]
    };
  }
  
  private async handleLoadGraph(_args: Record<string, unknown>): Promise<ToolCallResult> {
    // TODO: 实现加载图谱逻辑
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: 'Graph loaded' })
        }
      ]
    };
  }
  
  private getGDDTools(): MCPTool[] {
    return [
      {
        name: 'gdd_create_graph',
        description: '创建新的图驱动开发项目',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '项目名称' },
            description: { type: 'string', description: '项目描述（可选）' }
          },
          required: ['name']
        }
      },
      {
        name: 'gdd_load_graph',
        description: '加载已有图谱或从代码库索引生成',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '图谱路径或代码库路径' },
            auto_index: { type: 'boolean', description: '是否自动索引代码', default: true }
          },
          required: ['path']
        }
      },
      {
        name: 'gdd_add_node',
        description: '在图谱中添加新节点',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            layer: { type: 'string', description: '节点层级' },
            label: { type: 'string', description: '节点标签' },
            properties: { type: 'object', description: '节点属性（可选）' }
          },
          required: ['graph_id', 'layer', 'label']
        }
      },
      {
        name: 'gdd_update_node',
        description: '更新图谱中的节点',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            node_id: { type: 'string', description: '节点ID' },
            label: { type: 'string', description: '新标签（可选）' },
            properties: { type: 'object', description: '新属性（可选）' }
          },
          required: ['graph_id', 'node_id']
        }
      },
      {
        name: 'gdd_delete_node',
        description: '从图谱中删除节点及其相关边',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            node_id: { type: 'string', description: '节点ID' }
          },
          required: ['graph_id', 'node_id']
        }
      },
      {
        name: 'gdd_add_edge',
        description: '在两个节点间创建连接',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            source: { type: 'string', description: '源节点ID' },
            target: { type: 'string', description: '目标节点ID' },
            type: { type: 'string', description: '边类型' }
          },
          required: ['graph_id', 'source', 'target', 'type']
        }
      },
      {
        name: 'gdd_delete_edge',
        description: '删除图谱中的边',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            edge_id: { type: 'string', description: '边ID' }
          },
          required: ['graph_id', 'edge_id']
        }
      },
      {
        name: 'gdd_get_pending_clarifications',
        description: '获取当前图谱中需要用户澄清的问题',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' }
          },
          required: ['graph_id']
        }
      },
      {
        name: 'gdd_submit_clarification_answer',
        description: '提交用户对澄清问题的答案',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            session_id: { type: 'string', description: 'Brainstorm会话ID' },
            question_id: { type: 'string', description: '问题ID' },
            answer: { type: 'string', description: '用户答案' }
          },
          required: ['graph_id', 'session_id', 'question_id', 'answer']
        }
      },
      {
        name: 'gdd_get_dependency_impact',
        description: '分析修改某个节点对其他节点的影响',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            node_id: { type: 'string', description: '节点ID' }
          },
          required: ['graph_id', 'node_id']
        }
      },
      {
        name: 'gdd_export_graph',
        description: '导出图谱为 JSON、Markdown 或其他格式',
        inputSchema: {
          type: 'object',
          properties: {
            graph_id: { type: 'string', description: '图谱ID' },
            format: { type: 'string', enum: ['json', 'markdown', 'mermaid'], default: 'json' }
          },
          required: ['graph_id']
        }
      },
      {
        name: 'gdd_list_graphs',
        description: '列出所有图谱项目',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }
  
  private registerTools(): void {
    if (!this.server) return;
    this.log('info', 'Tools registered');
  }
  
  private registerResources(): void {
    if (!this.server) return;
    this.log('info', 'Resources registered');
  }
  
  private registerPrompts(): void {
    if (!this.server) return;
    this.log('info', 'Prompts registered');
  }
}
