/**
 * 命令别名系统 - V5.0
 * 
 * 提供简化的命令别名，方便 Agent 调用
 */

import { mcpServer } from './MCPServer';
import { contextTools } from './ContextTools';
import { graphStore } from './GraphStore';
import { SmartBrainstormEngine } from '../brainstorm/SmartBrainstormEngine';
import { TemplateManager } from '../templates/TemplateManager';

// ============ 类型定义 ============

/**
 * 命令类型
 */
export type GDDCommand = 
  | 'analyze'
  | 'brainstorm'
  | 'plan'
  | 'tasks'
  | 'status'
  | 'help'
  | 'query'
  | 'context'
  | 'impact'
  | 'related';

/**
 * 命令输入
 */
export interface GDDCommandInput {
  command: GDDCommand;
  graphId: string;
  args?: string;
  options?: Record<string, unknown>;
}

/**
 * 命令执行结果
 */
export interface GDDCommandResult {
  success: boolean;
  command: GDDCommand;
  output: string;
  data?: unknown;
  error?: string;
}

/**
 * 命令定义
 */
export interface GDDCommandDefinition {
  name: string;
  alias: string;
  description: string;
  usage: string;
  options?: Record<string, {
    description: string;
    type: 'string' | 'number' | 'boolean';
    default?: unknown;
  }>;
}

// ============ 命令管理器 ============

export class GDDCommandManager {
  private commands: Map<GDDCommand, GDDCommandDefinition> = new Map();
  
  constructor() {
    this.registerCommands();
  }
  
  /**
   * 注册所有命令
   */
  private registerCommands(): void {
    this.commands.set('analyze', {
      name: 'analyze',
      alias: '/gdd.analyze',
      description: '分析项目代码，构建项目图谱',
      usage: '/gdd.analyze [project_path]',
      options: {
        'path': { description: '项目路径', type: 'string' },
        'force': { description: '强制重新分析', type: 'boolean', default: false }
      }
    });
    
    this.commands.set('brainstorm', {
      name: 'brainstorm',
      alias: '/gdd.brainstorm',
      description: '启动交互式需求澄清会话',
      usage: '/gdd.brainstorm [description]',
      options: {
        'description': { description: '需求描述', type: 'string' },
        'node': { description: '目标节点 ID', type: 'string' },
        'mode': { description: '模式: full, quick', type: 'string', default: 'full' }
      }
    });
    
    this.commands.set('plan', {
      name: 'plan',
      alias: '/gdd.plan',
      description: '从图谱生成实施计划',
      usage: '/gdd.plan [scope]',
      options: {
        'scope': { description: '范围: all, epic, story, task', type: 'string', default: 'all' },
        'epic': { description: '特定 Epic ID', type: 'string' },
        'story': { description: '特定 Story ID', type: 'string' }
      }
    });
    
    this.commands.set('tasks', {
      name: 'tasks',
      alias: '/gdd.tasks',
      description: '从图谱分解任务',
      usage: '/gdd.tasks [filter]',
      options: {
        'status': { description: '任务状态过滤', type: 'string' },
        'layer': { description: '层级过滤', type: 'string' },
        'includeDependencies': { description: '包含依赖信息', type: 'boolean', default: true }
      }
    });
    
    this.commands.set('status', {
      name: 'status',
      alias: '/gdd.status',
      description: '获取项目状态',
      usage: '/gdd.status',
      options: {}
    });
    
    this.commands.set('help', {
      name: 'help',
      alias: '/gdd.help',
      description: '显示可用命令',
      usage: '/gdd.help [command]',
      options: {
        'command': { description: '特定命令名称', type: 'string' }
      }
    });
    
    this.commands.set('query', {
      name: 'query',
      alias: '/gdd.query',
      description: '查询图谱',
      usage: '/gdd.query "search term"',
      options: {
        'query': { description: '查询内容', type: 'string' },
        'layer': { description: '层级过滤', type: 'string' },
        'limit': { description: '结果数量限制', type: 'number', default: 50 }
      }
    });
    
    this.commands.set('context', {
      name: 'context',
      alias: '/gdd.context',
      description: '获取上下文信息',
      usage: '/gdd.context [node_id|file_path]',
      options: {
        'node': { description: '节点 ID', type: 'string' },
        'file': { description: '文件路径', type: 'string' },
        'includeRelated': { description: '包含相关项', type: 'boolean', default: true },
        'includeCode': { description: '包含代码片段', type: 'boolean', default: false }
      }
    });
    
    this.commands.set('impact', {
      name: 'impact',
      alias: '/gdd.impact',
      description: '分析修改影响',
      usage: '/gdd.impact [target]',
      options: {
        'target': { description: '目标（文件/函数/节点）', type: 'string' },
        'type': { description: '目标类型: file, function, node', type: 'string', default: 'file' },
        'depth': { description: '分析深度', type: 'number', default: 2 },
        'assessRisk': { description: '评估风险', type: 'boolean', default: true }
      }
    });
    
    this.commands.set('related', {
      name: 'related',
      alias: '/gdd.related',
      description: '查找相关项',
      usage: '/gdd.related [node_id|file_path]',
      options: {
        'node': { description: '节点 ID', type: 'string' },
        'file': { description: '文件路径', type: 'string' },
        'type': { description: '关系类型: dependency, call, import', type: 'string', default: 'all' },
        'direction': { description: '方向: inbound, outbound, both', type: 'string', default: 'both' },
        'limit': { description: '结果数量限制', type: 'number', default: 50 }
      }
    });
  }
  
  /**
   * 执行命令
   */
  async execute(input: GDDCommandInput): Promise<GDDCommandResult> {
    const command = input.command;
    const graphId = input.graphId;
    
    try {
      switch (command) {
        case 'analyze':
          return await this.executeAnalyze(graphId, input.options);
          
        case 'brainstorm':
          return await this.executeBrainstorm(graphId, input.options);
          
        case 'plan':
          return await this.executePlan(graphId, input.options);
          
        case 'tasks':
          return await this.executeTasks(graphId, input.options);
          
        case 'status':
          return await this.executeStatus(graphId);
          
        case 'help':
          return this.executeHelp(input.options);
          
        case 'query':
          return await this.executeQuery(graphId, input.options);
          
        case 'context':
          return await this.executeContext(graphId, input.options);
          
        case 'impact':
          return await this.executeImpact(graphId, input.options);
          
        case 'related':
          return await this.executeRelated(graphId, input.options);
          
        default:
          return {
            success: false,
            command,
            output: `Unknown command: ${command}`,
            error: `Command not found: ${command}`
          };
      }
    } catch (e: any) {
      return {
        success: false,
        command,
        output: `Error: ${e.message}`,
        error: e.message
      };
    }
  }
  
  /**
   * 分析项目
   */
  private async executeAnalyze(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const graph = graphStore.getGraph(graphId);
    if (!graph) {
      return {
        success: false,
        command: 'analyze',
        output: `Graph not found: ${graphId}`,
        error: 'Graph not found'
      };
    }
    
    const stats = {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      layers: new Map<string, number>()
    };
    
    // 统计各层级节点数
    for (const node of graph.nodes) {
      const count = stats.layers.get(node.layer) || 0;
      stats.layers.set(node.layer, count + 1);
    }
    
    const layerStats = Array.from(stats.layers.entries())
      .map(([layer, count]) => `${layer}: ${count}`)
      .join(', ');
    
    return {
      success: true,
      command: 'analyze',
      output: `📊 Project Analysis\n\n` +
              `Nodes: ${stats.nodes}\n` +
              `Edges: ${stats.edges}\n` +
              `\nLayer Distribution:\n${layerStats}`,
      data: {
        graphId,
        nodes: stats.nodes,
        edges: stats.edges,
        layers: Object.fromEntries(stats.layers)
      }
    };
  }
  
  /**
   * Brainstorm 会话
   */
  private async executeBrainstorm(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const graph = graphStore.getGraph(graphId);
    if (!graph) {
      return {
        success: false,
        command: 'brainstorm',
        output: `Graph not found: ${graphId}`,
        error: 'Graph not found'
      };
    }
    
    const description = options?.description as string || '';
    const mode = (options?.mode as string) || 'full';
    
    // 获取或创建会话
    let session = graphStore.getLatestSession(graphId);
    if (!session) {
      session = graphStore.createSession(graphId);
    }
    
    // 获取待处理问题数
    const pendingQuestions = session.questions.filter(q => q.status === 'pending');
    
    if (description) {
      // 开始新的 Brainstorm
      return {
        success: true,
        command: 'brainstorm',
        output: `🚀 Starting Brainstorm Session\n\n` +
                `Mode: ${mode}\n` +
                `Description: ${description}\n` +
                `\nPlease answer the following questions to clarify your requirements.`,
        data: {
          sessionId: session.sessionId,
          mode,
          description
        }
      };
    }
    
    // 显示状态
    return {
      success: true,
      command: 'brainstorm',
      output: `🧠 Brainstorm Session\n\n` +
              `Pending Questions: ${pendingQuestions.length}\n` +
              `Mode: ${mode}\n` +
              `\nUse /gdd.brainstorm "your description" to start.`,
      data: {
        sessionId: session.sessionId,
        pendingQuestions: pendingQuestions.length,
        mode
      }
    };
  }
  
  /**
   * 生成计划
   */
  private async executePlan(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const graph = graphStore.getGraph(graphId);
    if (!graph) {
      return {
        success: false,
        command: 'plan',
        output: `Graph not found: ${graphId}`,
        error: 'Graph not found'
      };
    }
    
    const scope = (options?.scope as string) || 'all';
    const epicId = options?.epic as string | undefined;
    const storyId = options?.story as string | undefined;
    
    // 按层级分组
    const nodesByLayer = new Map<string, any[]>();
    for (const node of graph.nodes) {
      const layer = node.layer;
      if (!nodesByLayer.has(layer)) {
        nodesByLayer.set(layer, []);
      }
      nodesByLayer.get(layer)!.push(node);
    }
    
    // 生成计划
    let planItems: Array<{ id: string; title: string; description: string; priority: string; dependencies: string[] }> = [];
    
    // 根据范围生成
    if (scope === 'all' || scope === 'epic') {
      const epics = nodesByLayer.get('L3_Epic') || [];
      for (const epic of epics) {
        planItems.push({
          id: epic.id,
          title: epic.label,
          description: (epic.properties?.goal as string) || '',
          priority: (epic.properties?.priority as string) || 'medium',
          dependencies: []
        });
      }
    }
    
    if (scope === 'all' || scope === 'story') {
      const stories = nodesByLayer.get('L4_Story') || [];
      for (const story of stories) {
        if (epicId && story.properties?.epicId !== epicId) continue;
        planItems.push({
          id: story.id,
          title: story.label,
          description: (story.properties?.userStory as string) || '',
          priority: (story.properties?.priority as string) || 'medium',
          dependencies: []
        });
      }
    }
    
    if (scope === 'all' || scope === 'task') {
      const tasks = nodesByLayer.get('L5_Task') || [];
      for (const task of tasks) {
        if (storyId && task.properties?.storyId !== storyId) continue;
        planItems.push({
          id: task.id,
          title: task.label,
          description: (task.properties?.description as string) || '',
          priority: (task.properties?.priority as string) || 'medium',
          dependencies: []
        });
      }
    }
    
    // 格式化输出
    let output = `📋 Implementation Plan\n\n`;
    output += `Scope: ${scope}\n`;
    if (epicId) output += `Epic: ${epicId}\n`;
    if (storyId) output += `Story: ${storyId}\n`;
    output += `\nTotal Items: ${planItems.length}\n\n`;
    
    // 按优先级分组
    const byPriority = new Map<string, typeof planItems>();
    for (const item of planItems) {
      if (!byPriority.has(item.priority)) {
        byPriority.set(item.priority, []);
      }
      byPriority.get(item.priority)!.push(item);
    }
    
    const priorityOrder = ['high', 'medium', 'low'];
    for (const priority of priorityOrder) {
      const items = byPriority.get(priority);
      if (items && items.length > 0) {
        output += `### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;
        for (const item of items) {
          output += `- **${item.title}**\n`;
          if (item.description) {
            output += `  ${item.description}\n`;
          }
        }
        output += '\n';
      }
    }
    
    return {
      success: true,
      command: 'plan',
      output,
      data: {
        graphId,
        scope,
        epicId,
        storyId,
        items: planItems,
        total: planItems.length
      }
    };
  }
  
  /**
   * 分解任务
   */
  private async executeTasks(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const graph = graphStore.getGraph(graphId);
    if (!graph) {
      return {
        success: false,
        command: 'tasks',
        output: `Graph not found: ${graphId}`,
        error: 'Graph not found'
      };
    }
    
    const statusFilter = options?.status as string | undefined;
    const layerFilter = options?.layer as string | undefined;
    const includeDeps = options?.includeDependencies !== false;
    
    // 获取任务节点
    let tasks = graph.nodes.filter(n => n.layer === 'L5_Task');
    
    if (layerFilter) {
      tasks = tasks.filter(t => t.layer === layerFilter);
    }
    
    // 按状态分组
    const byStatus = new Map<string, any[]>();
    for (const task of tasks) {
      const status = task.status || 'pending';
      if (!byStatus.has(status)) {
        byStatus.set(status, []);
      }
      byStatus.get(status)!.push(task);
    }
    
    // 统计
    const statusCounts = new Map<string, number>();
    for (const [status, items] of byStatus) {
      statusCounts.set(status, items.length);
    }
    
    let output = `✅ Task List\n\n`;
    output += `Total Tasks: ${tasks.length}\n\n`;
    output += `**Status:** `;
    output += Array.from(statusCounts.entries())
      .map(([status, count]) => `${status}: ${count}`)
      .join(' | ');
    output += '\n\n';
    
    // 显示任务
    const statusOrder = ['pending', 'clarifying', 'ready', 'generating', 'done', 'error'];
    const displayStatus = statusFilter 
      ? [statusFilter]
      : statusOrder.filter(s => byStatus.has(s));
    
    for (const status of displayStatus) {
      const items = byStatus.get(status);
      if (items && items.length > 0) {
        output += `### ${status.charAt(0).toUpperCase() + status.slice(1)}\n\n`;
        for (const task of items) {
          output += `- ${task.label}\n`;
          if (includeDeps && task.properties?.dependencies) {
            output += `  Dependencies: ${(task.properties.dependencies as string[]).join(', ')}\n`;
          }
        }
        output += '\n';
      }
    }
    
    return {
      success: true,
      command: 'tasks',
      output,
      data: {
        graphId,
        total: tasks.length,
        byStatus: Object.fromEntries(statusCounts),
        tasks: tasks.map(t => ({
          id: t.id,
          label: t.label,
          status: t.status,
          properties: t.properties
        }))
      }
    };
  }
  
  /**
   * 获取状态
   */
  private async executeStatus(graphId: string): Promise<GDDCommandResult> {
    const graph = graphStore.getGraph(graphId);
    if (!graph) {
      return {
        success: false,
        command: 'status',
        output: `Graph not found: ${graphId}`,
        error: 'Graph not found'
      };
    }
    
    // 统计信息
    const nodeCount = graph.nodes.length;
    const edgeCount = graph.edges.length;
    
    // 层级分布
    const layerDistribution = new Map<string, number>();
    for (const node of graph.nodes) {
      const count = layerDistribution.get(node.layer) || 0;
      layerDistribution.set(node.layer, count + 1);
    }
    
    // 状态分布
    const statusDistribution = new Map<string, number>();
    for (const node of graph.nodes) {
      const status = node.status || 'pending';
      const count = statusDistribution.get(status) || 0;
      statusDistribution.set(status, count + 1);
    }
    
    let output = `📊 Project Status\n\n`;
    output += `**Graph:** ${graphId}\n`;
    output += `**Name:** ${graph.name}\n\n`;
    output += `## Summary\n\n`;
    output += `- Nodes: ${nodeCount}\n`;
    output += `- Edges: ${edgeCount}\n\n`;
    output += `## Layer Distribution\n\n`;
    output += Array.from(layerDistribution.entries())
      .map(([layer, count]) => `- ${layer}: ${count}`)
      .join('\n') + '\n\n';
    output += `## Status Distribution\n\n`;
    output += Array.from(statusDistribution.entries())
      .map(([status, count]) => `- ${status}: ${count}`)
      .join('\n');
    
    return {
      success: true,
      command: 'status',
      output,
      data: {
        graphId,
        name: graph.name,
        nodes: nodeCount,
        edges: edgeCount,
        layers: Object.fromEntries(layerDistribution),
        statuses: Object.fromEntries(statusDistribution)
      }
    };
  }
  
  /**
   * 显示帮助
   */
  private executeHelp(options?: Record<string, unknown>): GDDCommandResult {
    const commandName = options?.command as string;
    
    if (commandName) {
      const cmd = this.commands.get(commandName as GDDCommand);
      if (cmd) {
        let output = `📖 ${cmd.alias}\n\n`;
        output += `${cmd.description}\n\n`;
        output += `**Usage:** ${cmd.usage}\n`;
        if (cmd.options) {
          output += '\n**Options:**\n\n';
          for (const [name, opt] of Object.entries(cmd.options)) {
            const defaultVal = opt.default !== undefined ? ` (default: ${opt.default})` : '';
            output += `- --${name}: ${opt.description}${defaultVal}\n`;
          }
        }
        return {
          success: true,
          command: 'help',
          output
        };
      }
      return {
        success: false,
        command: 'help',
        output: `Command not found: ${commandName}`,
        error: 'Command not found'
      };
    }
    
    // 显示所有命令
    let output = `📖 GDD Commands\n\n`;
    output += `Available commands:\n\n`;
    
    for (const cmd of this.commands.values()) {
      output += `- **${cmd.alias}**: ${cmd.description}\n`;
    }
    
    output += '\n';
    output += 'Use `/gdd.help <command>` for more information.';
    
    return {
      success: true,
      command: 'help',
      output
    };
  }
  
  /**
   * 查询图谱
   */
  private async executeQuery(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const query = options?.query as string;
    if (!query) {
      return {
        success: false,
        command: 'query',
        output: 'Query is required. Usage: /gdd.query "search term"',
        error: 'Query required'
      };
    }
    
    const result = await contextTools.queryGraph({
      graphId,
      query,
      layer: options?.layer as string,
      limit: (options?.limit as number) || 50
    });
    
    let output = `🔍 Query Results\n\n`;
    output += `**Query:** "${query}"\n`;
    output += `**Total Nodes:** ${result.totalNodes}\n`;
    output += `**Total Edges:** ${result.totalEdges}\n\n`;
    
    if (result.nodes.length === 0) {
      output += 'No results found.\n';
      return {
        success: true,
        command: 'query',
        output
      };
    }
    
    output += `## Nodes\n\n`;
    for (const node of result.nodes) {
      output += `- **${node.label}** (${node.id})\n`;
      output += `  - Layer: ${node.layer}\n`;
      output += `  - Type: ${node.type}\n`;
      if (node.status) {
        output += `  - Status: ${node.status}\n`;
      }
      output += '\n';
    }
    
    if (result.hasMore) {
      output += `*Showing ${result.nodes.length} of ${result.totalNodes} results. Use --limit to show more.\n`;
    }
    
    return {
      success: true,
      command: 'query',
      output,
      data: result
    };
  }
  
  /**
   * 获取上下文
   */
  private async executeContext(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const nodeId = options?.node as string | undefined;
    const filePath = options?.file as string | undefined;
    if (!nodeId && !filePath) {
      return {
        success: false,
        command: 'context',
        output: 'Node ID or file path is required. Usage: /gdd.context --node <id> or /gdd.context --file <path>',
        error: 'Node or file required'
      };
    }
    
    const result = await contextTools.getContext({
      graphId,
      nodeId,
      filePath,
      includeRelated: options?.includeRelated !== false,
      includeDependencies: true,
      includeDependents: true
    });
    
    let output = `🌍 Context\n\n`;
    
    if (result.context) {
      const ctx = result.context;
      output += `## Target: ${ctx.node.label}\n\n`;
      output += `- **ID:** ${ctx.node.id}\n`;
      output += `- **Layer:** ${ctx.node.layer}\n`;
      output += `- **Type:** ${ctx.node.type}\n`;
      if (ctx.node.status) {
        output += `- **Status:** ${ctx.node.status}\n`;
      }
      output += '\n';
      
      if (ctx.codeContext) {
        output += `## Code Location\n\n`;
        output += `- **File:** ${ctx.codeContext.filePath}\n`;
        output += `- **Lines:** ${ctx.codeContext.startLine}-${ctx.codeContext.endLine}\n\n`;
      }
      
      output += `## Relationships\n\n`;
      output += `**Incoming Edges:** ${ctx.incomingEdges.length}\n`;
      output += `**Outgoing Edges:** ${ctx.outgoingEdges.length}\n`;
      output += `**Related Nodes:** ${ctx.relatedNodes.length}\n\n`;
      
      if (result.relatedContexts.length > 0) {
        output += `## Related Items\n\n`;
        for (const related of result.relatedContexts.slice(0, 10)) {
          output += `- ${related.node.label} (${related.node.layer})\n`;
        }
      }
    } else {
      output += 'Context not found.\n';
    }
    
    return {
      success: true,
      command: 'context',
      output,
      data: result
    };
  }
  
  /**
   * 分析影响
   */
  private async executeImpact(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const target = options?.target as string;
    if (!target) {
      return {
        success: false,
        command: 'impact',
        output: 'Target is required. Usage: /gdd.impact --target <name> --type <file|function|node>',
        error: 'Target required'
      };
    }
    
    const targetType = (options?.type as 'file' | 'function' | 'class' | 'module' | 'node') || 'file';
    const includeRisk = options?.assessRisk !== false;
    
    const result = await contextTools.analyzeImpact({
      graphId,
      target,
      targetType,
      depth: (options?.depth as number) || 2,
      includeRiskAssessment: includeRisk
    });
    
    let output = `⚠️ Impact Analysis\n\n`;
    output += `**Target:** ${target}\n`;
    output += `**Type:** ${targetType}\n\n`;
    
    output += `## Directly Affected\n\n`;
    output += `- **Nodes:** ${result.directlyAffected.nodes.length}\n`;
    output += `- **Files:** ${result.directlyAffected.files.length}\n`;
    if (result.directlyAffected.functions.length > 0) {
      output += `- **Functions:** ${result.directlyAffected.functions.length}\n`;
    }
    output += '\n';
    
    output += `## Indirectly Affected\n\n`;
    output += `- **Nodes:** ${result.indirectlyAffected.nodes.length}\n`;
    output += `- **Files:** ${result.indirectlyAffected.files.length}\n\n`;
    
    if (result.riskAssessment) {
      const risk = result.riskAssessment;
      output += `## Risk Assessment\n\n`;
      output += `- **Level:** ${risk.level}\n\n`;
      if (risk.factors.length > 0) {
        output += `**Factors:**\n\n`;
        for (const factor of risk.factors) {
          output += `- ${factor}\n`;
        }
        output += '\n';
      }
      if (risk.recommendations.length > 0) {
        output += `**Recommendations:**\n\n`;
        for (const rec of risk.recommendations) {
          output += `- ${rec}\n`;
        }
      }
    }
    
    return {
      success: true,
      command: 'impact',
      output,
      data: result
    };
  }
  
  /**
   * 获取相关项
   */
  private async executeRelated(graphId: string, options?: Record<string, unknown>): Promise<GDDCommandResult> {
    const nodeId = options?.node as string | undefined;
    const filePath = options?.file as string | undefined;
    if (!nodeId && !filePath) {
      return {
        success: false,
        command: 'related',
        output: 'Node ID or file path is required. Usage: /gdd.related --node <id> or /gdd.related --file <path>',
        error: 'Node or file required'
      };
    }
    
    const result = await contextTools.getRelated({
      graphId,
      nodeId,
      filePath,
      relationshipType: options?.type as 'dependency' | 'call' | 'import' | 'extends' | 'implements' | 'all',
      direction: options?.direction as 'inbound' | 'outbound' | 'both',
      maxDepth: options?.maxDepth as number,
      limit: (options?.limit as number) || 50
    });
    
    let output = `🔗 Related Items\n\n`;
    output += `**Source:** ${result.source}\n`;
    output += `**Total:** ${result.totalCount}\n\n`;
    
    if (result.relatedItems.length === 0) {
      output += 'No related items found.\n';
      return {
        success: true,
        command: 'related',
        output
      };
    }
    
    // 按距离分组
    const byDistance = new Map<number, typeof result.relatedItems>();
    for (const item of result.relatedItems) {
      if (!byDistance.has(item.distance)) {
        byDistance.set(item.distance, []);
      }
      byDistance.get(item.distance)!.push(item);
    }
    
    output += `## Results\n\n`;
    for (const [distance, items] of byDistance) {
      output += `### Distance ${distance}\n\n`;
      for (const item of items) {
        const directionIcon = item.direction === 'outbound' ? '→' : '←';
        output += `- ${item.label} ${directionIcon} ${item.relationship}\n`;
      }
      output += '\n';
    }
    
    return {
      success: true,
      command: 'related',
      output,
      data: result
    };
  }
  
  /**
   * 获取命令定义
   */
  getCommand(command: GDDCommand): GDDCommandDefinition | undefined {
    return this.commands.get(command);
  }
  
  /**
   * 获取所有命令
   */
  getAllCommands(): GDDCommandDefinition[] {
    return Array.from(this.commands.values());
  }
}

// 单例
export const gddCommandManager = new GDDCommandManager();
