/**
 * MCP Server - Model Context Protocol 服务器
 * 
 * 提供 Agent 与 Graph 交互的标准接口
 */

import { 
  GraphData, 
  NodeData, 
  EdgeData,
  MCPToolOutput,
  MCPToolDefinition,
  CreateGraphInput,
  LoadGraphInput,
  ExportGraphInput,
  AddNodeInput,
  UpdateNodeInput,
  DeleteNodeInput,
  AddEdgeInput,
  AddOptionsInput,
  GetPendingClarificationsInput,
  TopologicalSortInput,
  ClarificationOption,
  ClarificationQuestion,
  TopologicalSortOutput
} from './types';
import { graphStore } from './GraphStore';

export class MCPServer {
  
  constructor(_config: { name?: string; version?: string; logLevel?: string } = {}) {
    // 配置存储在类实例中
  }
  
  // ==================== 工具定义 ====================
  
  /**
   * 获取所有可用工具的定义
   */
  getTools(): MCPToolDefinition[] {
    return [
      {
        name: 'create_graph',
        description: '创建一个新的架构图。可以指定初始节点和边。',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '图的名称'
            },
            description: {
              type: 'string',
              description: '图的描述（可选）'
            },
            initialNodes: {
              type: 'array',
              description: '初始节点列表（可选）',
              items: { type: 'object' }
            },
            initialEdges: {
              type: 'array',
              description: '初始边列表（可选）',
              items: { type: 'object' }
            }
          },
          required: ['name']
        }
      },
      {
        name: 'load_graph',
        description: '加载已有的架构图。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            includeDeleted: {
              type: 'boolean',
              description: '是否包含已删除的节点（可选，默认 false）'
            }
          },
          required: ['graphId']
        }
      },
      {
        name: 'export_graph',
        description: '导出架构图。支持 JSON、GraphML 和 Markdown 格式。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            format: {
              type: 'string',
              description: '导出格式：json, graphml, markdown（默认 json）'
            }
          },
          required: ['graphId']
        }
      },
      {
        name: 'add_node',
        description: '向图中添加新节点。可以指定父节点和插入位置。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            node: {
              type: 'object',
              description: '节点数据'
            },
            parentId: {
              type: 'string',
              description: '父节点 ID（可选）'
            },
            afterNodeId: {
              type: 'string',
              description: '插入到该节点之后（可选）'
            }
          },
          required: ['graphId', 'node']
        }
      },
      {
        name: 'update_node',
        description: '更新图中的节点。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            nodeId: {
              type: 'string',
              description: '节点 ID'
            },
            updates: {
              type: 'object',
              description: '要更新的字段'
            }
          },
          required: ['graphId', 'nodeId', 'updates']
        }
      },
      {
        name: 'delete_node',
        description: '从图中删除节点。可以选择是否级联删除子节点。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            nodeId: {
              type: 'string',
              description: '节点 ID'
            },
            cascade: {
              type: 'boolean',
              description: '是否级联删除子节点（默认 false）'
            }
          },
          required: ['graphId', 'nodeId']
        }
      },
      {
        name: 'add_edge',
        description: '向图中添加边（依赖关系）。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            edge: {
              type: 'object',
              description: '边数据，包含 from, to, type'
            }
          },
          required: ['graphId', 'edge']
        }
      },
      {
        name: 'add_options_to_node',
        description: '为节点添加澄清选项。当需要用户选择时使用。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            nodeId: {
              type: 'string',
              description: '节点 ID'
            },
            options: {
              type: 'array',
              description: '选项列表',
              items: { type: 'object' }
            }
          },
          required: ['graphId', 'nodeId', 'options']
        }
      },
      {
        name: 'get_pending_clarifications',
        description: '获取所有待回答的澄清问题。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            nodeIds: {
              type: 'array',
              description: '指定节点 ID 列表（可选，不指定则返回所有）',
              items: { type: 'string' }
            }
          },
          required: ['graphId']
        }
      },
      {
        name: 'topological_sort',
        description: '对图进行拓扑排序，返回按依赖顺序排列的节点。用于确定代码生成顺序。',
        inputSchema: {
          type: 'object',
          properties: {
            graphId: {
              type: 'string',
              description: '图的 ID'
            },
            layer: {
              type: 'string',
              description: '指定层级筛选（可选）'
            },
            includeDependencies: {
              type: 'boolean',
              description: '是否包含依赖信息（默认 true）'
            }
          },
          required: ['graphId']
        }
      }
    ];
  }
  
  // ==================== 工具实现 ====================
  
  /**
   * 创建图
   */
  async createGraph(input: CreateGraphInput): Promise<MCPToolOutput<GraphData>> {
    try {
      const graph = graphStore.createGraph({
        id: `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: input.name,
        description: input.description,
        nodes: input.initialNodes || [],
        edges: input.initialEdges || []
      });
      
      // 自动创建依赖边
      if (input.initialNodes) {
        for (let i = 1; i < input.initialNodes.length; i++) {
          const prevNode = input.initialNodes[i - 1];
          const currNode = input.initialNodes[i];
          
          // 如果是同一层级且没有指定边，则自动创建依赖关系
          if (prevNode.layer === currNode.layer) {
            graphStore.addEdge(graph.id, {
              id: `edge_${prevNode.id}_${currNode.id}`,
              from: prevNode.id,
              to: currNode.id,
              type: 'depends_on',
              label: 'depends on'
            });
          }
        }
      }
      
      return {
        success: true,
        data: graphStore.getGraph(graph.id)!
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message
      };
    }
  }
  
  /**
   * 加载图
   */
  async loadGraph(input: LoadGraphInput): Promise<MCPToolOutput<GraphData>> {
    const graph = graphStore.getGraph(input.graphId);
    
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${input.graphId}`
      };
    }
    
    return {
      success: true,
      data: graph,
      metadata: {
        duration: 0,
        cached: false
      }
    };
  }
  
  /**
   * 导出图
   */
  async exportGraph(input: ExportGraphInput): Promise<MCPToolOutput<{ content: string; format: string }>> {
    const graph = graphStore.getGraph(input.graphId);
    
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${input.graphId}`
      };
    }
    
    const format = input.format || 'json';
    let content: string;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(graph, null, 2);
        break;
        
      case 'graphml':
        content = this.toGraphML(graph);
        break;
        
      case 'markdown':
        content = this.toMarkdown(graph);
        break;
        
      default:
        return {
          success: false,
          error: `Unsupported format: ${format}`
        };
    }
    
    return {
      success: true,
      data: { content, format }
    };
  }
  
  /**
   * 添加节点
   */
  async addNode(input: AddNodeInput): Promise<MCPToolOutput<{ node: NodeData; edges: EdgeData[] }>> {
    const node = graphStore.addNode(input.graphId, input.node);
    
    if (!node) {
      return {
        success: false,
        error: `Graph not found: ${input.graphId}`
      };
    }
    
    const edges: EdgeData[] = [];
    
    // 如果指定了父节点，创建依赖边
    if (input.parentId) {
      const edge = graphStore.addEdge(input.graphId, {
        id: `edge_${input.parentId}_${node.id}`,
        from: input.parentId,
        to: node.id,
        type: 'contains',
        label: 'contains'
      });
      if (edge) edges.push(edge);
    }
    
    // 如果指定了插入位置，在该节点之后创建依赖
    if (input.afterNodeId && input.afterNodeId !== input.parentId) {
      const edge = graphStore.addEdge(input.graphId, {
        id: `edge_${input.afterNodeId}_${node.id}`,
        from: input.afterNodeId,
        to: node.id,
        type: 'depends_on',
        label: 'depends on'
      });
      if (edge) edges.push(edge);
    }
    
    return {
      success: true,
      data: { node, edges }
    };
  }
  
  /**
   * 更新节点
   */
  async updateNode(input: UpdateNodeInput): Promise<MCPToolOutput<NodeData>> {
    const node = graphStore.updateNode(input.graphId, input.nodeId, input.updates);
    
    if (!node) {
      return {
        success: false,
        error: `Node not found: ${input.nodeId}`
      };
    }
    
    return {
      success: true,
      data: node
    };
  }
  
  /**
   * 删除节点
   */
  async deleteNode(input: DeleteNodeInput): Promise<MCPToolOutput<{ deletedNodeId: string; deletedEdges: string[]; cascadeDeleted: string[] }>> {
    const result = graphStore.deleteNode(input.graphId, input.nodeId, input.cascade);
    
    if (!result.deleted) {
      return {
        success: false,
        error: `Node not found: ${input.nodeId}`
      };
    }
    
    return {
      success: true,
      data: {
        deletedNodeId: input.nodeId,
        deletedEdges: result.deletedEdges,
        cascadeDeleted: result.cascadeDeleted || []
      }
    };
  }
  
  /**
   * 添加边
   */
  async addEdge(input: AddEdgeInput): Promise<MCPToolOutput<EdgeData>> {
    const edge = graphStore.addEdge(input.graphId, input.edge);
    
    if (!edge) {
      return {
        success: false,
        error: `Edge validation failed: nodes ${input.edge.from} or ${input.edge.to} not found`
      };
    }
    
    return {
      success: true,
      data: edge
    };
  }
  
  /**
   * 添加选项
   */
  async addOptionsToNode(input: AddOptionsInput): Promise<MCPToolOutput<{ nodeId: string; options: ClarificationOption[]; requiresClarification: boolean }>> {
    const graph = graphStore.getGraph(input.graphId);
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${input.graphId}`
      };
    }
    
    // 创建会话（如果不存在）
    let session = graphStore.getSession(input.nodeId);
    if (!session) {
      session = graphStore.createSession(input.graphId);
    }
    
    // 添加澄清问题
    const question = graphStore.addClarificationQuestion(input.graphId, {
      nodeId: input.nodeId,
      question: '请选择实现方式',
      options: input.options,
      multiSelect: false
    });
    
    if (!question) {
      return {
        success: false,
        error: `Failed to add options to node: ${input.nodeId}`
      };
    }
    
    return {
      success: true,
      data: {
        nodeId: input.nodeId,
        options: question.options,
        requiresClarification: true
      }
    };
  }
  
  /**
   * 获取待处理的澄清问题
   */
  async getPendingClarifications(input: GetPendingClarificationsInput): Promise<MCPToolOutput<{
    questions: ClarificationQuestion[];
    total: number;
    answered: number;
    remaining: number;
  }>> {
    const graph = graphStore.getGraph(input.graphId);
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${input.graphId}`
      };
    }
    
    // 获取所有会话 - 通过图的 metadata 获取
    const allSessions: Array<{ questions: ClarificationQuestion[] }> = [];
    if (graph.metadata?.sessions) {
      const sessions = graph.metadata.sessions as Array<{ questions: ClarificationQuestion[] }>;
      allSessions.push(...sessions);
    }
    
    let questions: ClarificationQuestion[] = [];
    
    for (const session of allSessions) {
      for (const q of session.questions) {
        // 过滤已回答的
        if (q.status === 'answered' || q.status === 'skipped') continue;
        
        // 如果指定了节点 ID，只返回这些节点的问题
        if (input.nodeIds && input.nodeIds.length > 0) {
          if (!input.nodeIds.includes(q.nodeId)) continue;
        }
        
        questions.push(q);
      }
    }
    
    // 计算统计
    const total = allSessions.reduce(
      (sum, s) => sum + s.questions.length, 
      0
    );
    const answered = allSessions.reduce(
      (sum, s) => sum + s.questions.filter((q: ClarificationQuestion) => q.status === 'answered').length,
      0
    );
    
    return {
      success: true,
      data: {
        questions,
        total,
        answered,
        remaining: questions.length
      }
    };
  }
  
  /**
   * 拓扑排序
   */
  async topologicalSort(input: TopologicalSortInput): Promise<MCPToolOutput<TopologicalSortOutput>> {
    const graph = graphStore.getGraph(input.graphId);
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${input.graphId}`
      };
    }
    
    const layerFilter = input.layer;
    const nodes = layerFilter 
      ? graph.nodes.filter(n => n.layer === layerFilter)
      : graph.nodes;
    
    // 构建邻接表
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();
    
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      dependents.set(node.id, []);
    });
    
    // 计算入度
    graph.edges.forEach(edge => {
      if (nodeMap.has(edge.from) && nodeMap.has(edge.to)) {
        inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        dependents.get(edge.from)!.push(edge.to);
      }
    });
    
    // Kahn's Algorithm
    const layers: NodeData[][] = [];
    let queue: string[] = [];
    
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        queue.push(id);
      }
    });
    
    while (queue.length > 0) {
      const currentLayer: NodeData[] = [];
      const nextQueue: string[] = [];
      
      queue.forEach(id => {
        const node = nodeMap.get(id)!;
        currentLayer.push(node);
        
        dependents.get(id)!.forEach(dependentId => {
          const newDegree = (inDegree.get(dependentId) || 0) - 1;
          inDegree.set(dependentId, newDegree);
          if (newDegree === 0) {
            nextQueue.push(dependentId);
          }
        });
      });
      
      layers.push(currentLayer);
      queue = nextQueue;
    }
    
    // 检查环
    const allNodes = layers.reduce((acc, layer) => acc.concat(layer), []);
    if (allNodes.length !== nodes.length) {
      return {
        success: false,
        error: 'Graph contains a cycle'
      };
    }
    
    const flatOrder = allNodes.map(n => n.id);
    
    return {
      success: true,
      data: {
        layers,
        flatOrder,
        parallelizableLayers: layers.length,
        totalNodes: nodes.length
      }
    };
  }
  
  // ==================== 格式转换 ====================
  
  private toGraphML(graph: GraphData): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    xml += `  <graph id="${graph.id}" edgedefault="directed">\n`;
    
    for (const node of graph.nodes) {
      xml += `    <node id="${node.id}">\n`;
      xml += `      <data key="label">${this.escapeXml(node.label)}</data>\n`;
      xml += `      <data key="layer">${this.escapeXml(node.layer || '')}</data>\n`;
      xml += `      <data key="type">${this.escapeXml(node.type)}</data>\n`;
      xml += `    </node>\n`;
    }
    
    for (const edge of graph.edges) {
      xml += `    <edge id="${edge.id}" source="${edge.from}" target="${edge.to}">\n`;
      xml += `      <data key="type">${this.escapeXml(edge.type)}</data>\n`;
      xml += `      <data key="label">${this.escapeXml(edge.label || '')}</data>\n`;
      xml += `    </edge>\n`;
    }
    
    xml += '  </graph>\n';
    xml += '</graphml>';
    
    return xml;
  }
  
  private toMarkdown(graph: GraphData): string {
    let md = `# ${graph.name}\n\n`;
    
    if (graph.description) {
      md += `${graph.description}\n\n`;
    }
    
    md += `## 统计\n\n`;
    md += `- 节点数: ${graph.nodes.length}\n`;
    md += `- 边数: ${graph.edges.length}\n\n`;
    
    md += `## 节点\n\n`;
    
    // 按层级分组
    const layers = new Map<string, NodeData[]>();
    graph.nodes.forEach(node => {
      const layer = node.layer || 'unknown';
      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer)!.push(node);
    });
    
    layers.forEach((nodes, layer) => {
      md += `### ${layer}\n\n`;
      md += `| ID | 标签 | 类型 |\n`;
      md += `| --- | --- | --- |\n`;
      nodes.forEach(node => {
        md += `| ${node.id} | ${node.label} | ${node.type} |\n`;
      });
      md += '\n';
    });
    
    md += `## 依赖关系\n\n`;
    md += `| 从 | 到 | 类型 |\n`;
    md += `| --- | --- | --- |\n`;
    graph.edges.forEach(edge => {
      md += `| ${edge.from} | ${edge.to} | ${edge.type} |\n`;
    });
    
    return md;
  }
  
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// 单例
export const mcpServer = new MCPServer();
