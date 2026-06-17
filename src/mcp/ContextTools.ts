/**
 * 上下文查询工具 - V5.0
 * 
 * 提供增强的上下文查询能力，让 Agent 更容易获取项目信息
 */

import { GraphStore, graphStore } from './GraphStore';
import { CodeIndexer } from '../indexer/CodeIndexer';
import { NodeData, EdgeData } from './types';

// ============ 类型定义 ============

/**
 * 图谱查询输入
 */
export interface GraphQueryInput {
  graphId: string;
  query: string;
  layer?: string;
  nodeType?: string;
  includeEdges?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 上下文获取输入
 */
export interface GetContextInput {
  graphId: string;
  nodeId?: string;
  filePath?: string;
  functionName?: string;
  includeRelated?: boolean;
  includeDependencies?: boolean;
  includeDependents?: boolean;
}

/**
 * 影响分析输入
 */
export interface ImpactAnalysisInput {
  graphId: string;
  target: string;
  targetType: 'file' | 'function' | 'class' | 'module' | 'node';
  depth?: number;
  includeRiskAssessment?: boolean;
}

/**
 * 相关项查询输入
 */
export interface GetRelatedInput {
  graphId: string;
  nodeId?: string;
  filePath?: string;
  relationshipType?: 'dependency' | 'call' | 'import' | 'extends' | 'implements' | 'all';
  direction?: 'inbound' | 'outbound' | 'both';
  maxDepth?: number;
  limit?: number;
}

/**
 * 节点上下文信息
 */
export interface NodeContext {
  node: NodeData;
  properties: Record<string, unknown>;
  incomingEdges: EdgeData[];
  outgoingEdges: EdgeData[];
  relatedNodes: NodeData[];
  codeContext?: {
    filePath: string;
    startLine: number;
    endLine: number;
    content?: string;
  };
}

/**
 * 影响分析结果
 */
export interface ImpactAnalysisResult {
  target: string;
  targetType: string;
  directlyAffected: {
    nodes: NodeData[];
    files: string[];
    functions: string[];
  };
  indirectlyAffected: {
    nodes: NodeData[];
    files: string[];
  };
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    recommendations: string[];
  };
}

/**
 * 相关项结果
 */
export interface RelatedItemsResult {
  source: string;
  sourceType: string;
  relatedItems: Array<{
    id: string;
    type: string;
    label: string;
    relationship: string;
    direction: 'inbound' | 'outbound';
    distance: number;
  }>;
  totalCount: number;
}

// ============ 上下文查询工具 ============

export class ContextTools {
  private codeIndexer: CodeIndexer | null = null;
  
  /**
   * 设置代码索引器
   */
  setCodeIndexer(indexer: CodeIndexer): void {
    this.codeIndexer = indexer;
  }
  
  /**
   * 图谱自然语言查询
   */
  async queryGraph(input: GraphQueryInput): Promise<{
    nodes: NodeData[];
    edges: EdgeData[];
    totalNodes: number;
    totalEdges: number;
    hasMore: boolean;
    metadata: {
      query: string;
      layers: string[];
      nodeTypes: string[];
    };
  }> {
    const graph = graphStore.getGraph(input.graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${input.graphId}`);
    }
    
    // 解析查询意图
    const intent = this.parseQueryIntent(input.query);
    
    // 构建查询条件
    let nodes = graph.nodes;
    let edges = graph.edges;
    
    // 按层级过滤
    if (intent.layer || input.layer) {
      const layer = intent.layer || input.layer;
      nodes = nodes.filter(n => n.layer === layer);
    }
    
    // 按类型过滤
    if (intent.nodeType || input.nodeType) {
      const type = intent.nodeType || input.nodeType;
      nodes = nodes.filter(n => n.type === type);
    }
    
    // 按标签搜索（模糊匹配）
    if (intent.searchTerm) {
      const term = intent.searchTerm.toLowerCase();
      nodes = nodes.filter(n => 
        n.label.toLowerCase().includes(term) ||
        JSON.stringify(n.properties).toLowerCase().includes(term)
      );
      
      // 也搜索边
      edges = edges.filter(e =>
        e.label?.toLowerCase().includes(term) ||
        e.type.toLowerCase().includes(term)
      );
    }
    
    // 获取相关边
    if (input.includeEdges !== false) {
      const nodeIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => 
        nodeIds.has(e.from) || nodeIds.has(e.to)
      );
    }
    
    // 分页
    const offset = input.offset || 0;
    const limit = input.limit || 50;
    const pagedNodes = nodes.slice(offset, offset + limit);
    
    // 获取涉及的边
    const nodeIds = new Set(pagedNodes.map(n => n.id));
    const pagedEdges = edges.filter(e => 
      nodeIds.has(e.from) || nodeIds.has(e.to)
    );
    
    // 收集层级和类型信息
    const layers = [...new Set(nodes.map(n => n.layer).filter(Boolean) as string[])];
    const nodeTypes = [...new Set(nodes.map(n => n.type))];
    
    return {
      nodes: pagedNodes,
      edges: pagedEdges,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      hasMore: offset + limit < nodes.length,
      metadata: {
        query: input.query,
        layers,
        nodeTypes
      }
    };
  }
  
  /**
   * 获取完整上下文
   */
  async getContext(input: GetContextInput): Promise<{
    context: NodeContext | null;
    relatedContexts: NodeContext[];
    codeSnippets: Array<{
      filePath: string;
      startLine: number;
      endLine: number;
      content: string;
    }>;
  }> {
    const graph = graphStore.getGraph(input.graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${input.graphId}`);
    }
    
    // 查找目标节点
    let targetNode: NodeData | null = null;
    
    if (input.nodeId) {
      targetNode = graph.nodes.find(n => n.id === input.nodeId) || null;
    } else if (input.filePath) {
      targetNode = graph.nodes.find(n => 
        n.properties?.filePath === input.filePath
      ) || null;
    } else if (input.functionName) {
      targetNode = graph.nodes.find(n => 
        n.label === input.functionName ||
        n.properties?.name === input.functionName
      ) || null;
    }
    
    const context: NodeContext | null = targetNode ? {
      node: targetNode,
      properties: targetNode.properties,
      incomingEdges: graph.edges.filter(e => e.to === targetNode.id),
      outgoingEdges: graph.edges.filter(e => e.from === targetNode.id),
      relatedNodes: this.getRelatedNodes(graph, targetNode.id)
    } : null;
    
    // 获取相关上下文
    const relatedContexts: NodeContext[] = [];
    if (input.includeRelated && context) {
      const relatedIds = new Set([
        ...context.incomingEdges.map(e => e.from),
        ...context.outgoingEdges.map(e => e.to)
      ]);
      
      for (const id of relatedIds) {
        if (id === targetNode!.id) continue;
        const relatedNode = graph.nodes.find(n => n.id === id);
        if (relatedNode) {
          relatedContexts.push({
            node: relatedNode,
            properties: relatedNode.properties,
            incomingEdges: graph.edges.filter(e => e.to === id),
            outgoingEdges: graph.edges.filter(e => e.from === id),
            relatedNodes: this.getRelatedNodes(graph, id)
          });
        }
      }
    }
    
    // 获取依赖项
    if (input.includeDependencies && context) {
      const dependencyIds = new Set(context.incomingEdges.map(e => e.from));
      for (const id of dependencyIds) {
        const depNode = graph.nodes.find(n => n.id === id);
        if (depNode && !relatedContexts.some(c => c.node.id === id)) {
          relatedContexts.push({
            node: depNode,
            properties: depNode.properties,
            incomingEdges: graph.edges.filter(e => e.to === id),
            outgoingEdges: graph.edges.filter(e => e.from === id),
            relatedNodes: this.getRelatedNodes(graph, id)
          });
        }
      }
    }
    
    // 获取被依赖项
    if (input.includeDependents && context) {
      const dependentIds = new Set(context.outgoingEdges.map(e => e.to));
      for (const id of dependentIds) {
        const depNode = graph.nodes.find(n => n.id === id);
        if (depNode && !relatedContexts.some(c => c.node.id === id)) {
          relatedContexts.push({
            node: depNode,
            properties: depNode.properties,
            incomingEdges: graph.edges.filter(e => e.to === id),
            outgoingEdges: graph.edges.filter(e => e.from === id),
            relatedNodes: this.getRelatedNodes(graph, id)
          });
        }
      }
    }
    
    // 获取代码片段
    const codeSnippets: Array<{
      filePath: string;
      startLine: number;
      endLine: number;
      content: string;
    }> = [];
    
    // 代码片段获取暂时禁用，因为 CodeIndexer 没有 getFileContent 方法
    // 可以在后续版本中添加
    
    return {
      context,
      relatedContexts,
      codeSnippets
    };
  }
  
  /**
   * 影响分析
   */
  async analyzeImpact(input: ImpactAnalysisInput): Promise<ImpactAnalysisResult> {
    const graph = graphStore.getGraph(input.graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${input.graphId}`);
    }
    
    const depth = input.depth || 2;
    const maxDepth = Math.min(depth, 5); // 限制最大深度
    
    // 查找目标
    let startNodeIds: string[] = [];
    
    switch (input.targetType) {
      case 'node':
        startNodeIds = [input.target];
        break;
        
      case 'file':
        startNodeIds = graph.nodes
          .filter(n => n.properties?.filePath === input.target)
          .map(n => n.id);
        break;
        
      case 'function':
      case 'class':
        startNodeIds = graph.nodes
          .filter(n => n.label === input.target || n.properties?.name === input.target)
          .map(n => n.id);
        break;
        
      case 'module':
        startNodeIds = graph.nodes
          .filter(n => n.properties?.module === input.target)
          .map(n => n.id);
        break;
    }
    
    // 收集影响
    const directlyAffectedNodeIds = new Set(startNodeIds);
    const indirectlyAffectedNodeIds = new Set<string>();
    const visited = new Set<string>();
    
    // BFS 遍历
    const queue: Array<{ nodeId: string; currentDepth: number }> = [];
    
    for (const id of startNodeIds) {
      queue.push({ nodeId: id, currentDepth: 0 });
    }
    
    while (queue.length > 0) {
      const { nodeId, currentDepth } = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      // 获取依赖此节点的节点
      const dependents = graph.edges
        .filter(e => e.from === nodeId)
        .map(e => e.to);
      
      for (const depId of dependents) {
        if (currentDepth < maxDepth) {
          if (!directlyAffectedNodeIds.has(depId) && currentDepth === 0) {
            directlyAffectedNodeIds.add(depId);
          } else {
            indirectlyAffectedNodeIds.add(depId);
          }
          
          queue.push({ nodeId: depId, currentDepth: currentDepth + 1 });
        }
      }
    }
    
    // 构建结果
    const directlyAffectedNodes = graph.nodes.filter(n => 
      directlyAffectedNodeIds.has(n.id)
    );
    
    const indirectlyAffectedNodes = graph.nodes.filter(n => 
      indirectlyAffectedNodeIds.has(n.id)
    );
    
    // 提取文件和函数
    const directlyAffectedFiles = [...new Set(
      directlyAffectedNodes
        .map(n => n.properties?.filePath as string)
        .filter(Boolean)
    )];
    
    const indirectlyAffectedFiles = [...new Set(
      indirectlyAffectedNodes
        .map(n => n.properties?.filePath as string)
        .filter(Boolean)
    )];
    
    const directlyAffectedFunctions = [...new Set(
      directlyAffectedNodes
        .filter(n => n.layer === 'L5_Task')
        .map(n => n.label)
    )];
    
    // 风险评估
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    
    if (input.includeRiskAssessment) {
      const totalAffected = directlyAffectedNodes.length + indirectlyAffectedNodes.length;
      
      if (totalAffected > 50) {
        riskLevel = 'critical';
        riskFactors.push(`影响范围过大：${totalAffected} 个节点`);
        recommendations.push('建议分批次修改，避免一次性变更');
      } else if (totalAffected > 20) {
        riskLevel = 'high';
        riskFactors.push(`影响范围较大：${totalAffected} 个节点`);
        recommendations.push('建议在测试环境先验证修改');
      } else if (totalAffected > 10) {
        riskLevel = 'medium';
        riskFactors.push(`中等影响范围：${totalAffected} 个节点`);
        recommendations.push('建议更新相关测试用例');
      }
      
      // 检查是否影响关键路径
      const criticalNodes = directlyAffectedNodes.filter(n => 
        n.properties?.isCritical === true ||
        n.layer === 'L1_Constitution'
      );
      
      if (criticalNodes.length > 0) {
        riskLevel = Math.max(
          riskLevel === 'low' ? 1 : 
          riskLevel === 'medium' ? 2 : 
          riskLevel === 'high' ? 3 : 4,
          3
        ) as any;
        riskFactors.push('影响关键节点');
        recommendations.push('需要仔细审查修改内容');
      }
      
      // 检查跨模块影响
      const modules = new Set(
        [...directlyAffectedNodeIds, ...indirectlyAffectedNodeIds]
          .map(id => {
            const node = graph.nodes.find(n => n.id === id);
            return node?.properties?.module;
          })
          .filter(Boolean)
      );
      
      if (modules.size > 3) {
        riskFactors.push(`跨 ${modules.size} 个模块`);
        recommendations.push('建议与各模块负责人沟通');
      }
    }
    
    return {
      target: input.target,
      targetType: input.targetType,
      directlyAffected: {
        nodes: directlyAffectedNodes,
        files: directlyAffectedFiles,
        functions: directlyAffectedFunctions
      },
      indirectlyAffected: {
        nodes: indirectlyAffectedNodes,
        files: indirectlyAffectedFiles
      },
      riskAssessment: input.includeRiskAssessment ? {
        level: riskLevel,
        factors: riskFactors,
        recommendations
      } : undefined
    };
  }
  
  /**
   * 获取相关项
   */
  async getRelated(input: GetRelatedInput): Promise<RelatedItemsResult> {
    const graph = graphStore.getGraph(input.graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${input.graphId}`);
    }
    
    // 查找源节点
    let sourceId: string | null = null;
    let sourceType = '';
    
    if (input.nodeId) {
      sourceId = input.nodeId;
      sourceType = 'node';
    } else if (input.filePath) {
      const node = graph.nodes.find(n => n.properties?.filePath === input.filePath);
      if (node) {
        sourceId = node.id;
        sourceType = 'file';
      }
    }
    
    if (!sourceId) {
      return {
        source: input.nodeId || input.filePath || '',
        sourceType,
        relatedItems: [],
        totalCount: 0
      };
    }
    
    // 获取相关边
    const relevantEdges = graph.edges.filter(e =>
      e.from === sourceId || e.to === sourceId
    );
    
    // 构建结果
    const items: Array<{
      id: string;
      type: string;
      label: string;
      relationship: string;
      direction: 'inbound' | 'outbound';
      distance: number;
    }> = [];
    
    const maxDepth = input.maxDepth || 3;
    const processed = new Set<string>();
    
    // BFS 遍历
    const queue: Array<{ nodeId: string; direction: 'inbound' | 'outbound'; distance: number }> = [];
    
    for (const edge of relevantEdges) {
      const targetId = edge.from === sourceId ? edge.from : edge.to;
      const otherId = edge.from === sourceId ? edge.to : edge.from;
      const direction = edge.from === sourceId ? 'outbound' : 'inbound';
      
      queue.push({ nodeId: otherId, direction, distance: 1 });
      
      items.push({
        id: otherId,
        type: 'node',
        label: graph.nodes.find(n => n.id === otherId)?.label || otherId,
        relationship: edge.type,
        direction,
        distance: 1
      });
    }
    
    // 按关系类型过滤
    if (input.relationshipType && input.relationshipType !== 'all') {
      items.filter(item => item.relationship === input.relationshipType);
    }
    
    // 按方向过滤
    if (input.direction && input.direction !== 'both') {
      items.filter(item => item.direction === input.direction);
    }
    
    // 限制数量
    const limit = input.limit || 50;
    const resultItems = items.slice(0, limit);
    
    return {
      source: sourceId,
      sourceType,
      relatedItems: resultItems,
      totalCount: items.length
    };
  }
  
  /**
   * 解析查询意图
   */
  private parseQueryIntent(query: string): {
    layer?: string;
    nodeType?: string;
    searchTerm?: string;
  } {
    const lowerQuery = query.toLowerCase();
    
    // 层级关键词
    const layerMap: Record<string, string> = {
      'constitution': 'L1_Constitution',
      'principle': 'L1_Constitution',
      'techstack': 'L2_TechStack',
      'technology': 'L2_TechStack',
      'framework': 'L2_TechStack',
      'epic': 'L3_Epic',
      'feature': 'L3_Epic',
      'story': 'L4_Story',
      'module': 'L4_Story',
      'task': 'L5_Task',
      'file': 'L5_Task',
      'function': 'L5_Task',
      'class': 'L5_Task'
    };
    
    for (const [keyword, layer] of Object.entries(layerMap)) {
      if (lowerQuery.includes(keyword)) {
        return { layer };
      }
    }
    
    // 类型关键词
    const typeMap: Record<string, string> = {
      'api': 'api_endpoint',
      'endpoint': 'api_endpoint',
      'route': 'api_endpoint',
      'component': 'component',
      'hook': 'custom_hook',
      'service': 'service',
      'controller': 'controller',
      'model': 'model',
      'interface': 'interface',
      'type': 'type',
      'test': 'test',
      'spec': 'spec',
      'config': 'config',
      'utility': 'utility',
      'helper': 'helper'
    };
    
    for (const [keyword, type] of Object.entries(typeMap)) {
      if (lowerQuery.includes(keyword)) {
        return { nodeType: type };
      }
    }
    
    // 默认作为搜索词
    return { searchTerm: query };
  }
  
  /**
   * 获取相关节点
   */
  private getRelatedNodes(graph: any, nodeId: string): NodeData[] {
    const relatedIds = new Set<string>();
    
    // 通过边找到相关节点
    for (const edge of graph.edges) {
      if (edge.from === nodeId) {
        relatedIds.add(edge.to);
      } else if (edge.to === nodeId) {
        relatedIds.add(edge.from);
      }
    }
    
    return graph.nodes.filter((n: NodeData) => relatedIds.has(n.id));
  }
}

// 单例
export const contextTools = new ContextTools();
