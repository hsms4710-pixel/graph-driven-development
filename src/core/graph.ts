/**
 * Graph - 代码架构图的核心数据结构
 * 
 * 图由节点(Node)和边(Edge)组成：
 * - 节点：代表功能模块、类、函数等代码元素
 * - 边：代表依赖关系、调用关系等
 */

import { Node } from './node';
import { Edge, EdgeType } from './edge';
import { GraphSerializer } from './serializer';

export interface GraphConfig {
  id?: string;
  name: string;
  description?: string;
}

export class Graph {
  public readonly id: string;
  public name: string;
  public description: string;
  
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, Edge> = new Map();
  
  constructor(config: GraphConfig) {
    this.id = config.id || this.generateId();
    this.name = config.name;
    this.description = config.description || '';
  }
  
  /**
   * 添加节点
   */
  addNode(node: Node): void {
    this.nodes.set(node.id, node);
  }
  
  /**
   * 删除节点
   */
  removeNode(nodeId: string): boolean {
    // 删除与该节点相关的所有边
    const edgesToDelete: string[] = [];
    for (const [id, edge] of this.edges) {
      if (edge.from === nodeId || edge.to === nodeId) {
        edgesToDelete.push(id);
      }
    }
    edgesToDelete.forEach(id => this.edges.delete(id));
    
    return this.nodes.delete(nodeId);
  }
  
  /**
   * 获取节点
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }
  
  /**
   * 获取所有节点
   */
  getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }
  
  /**
   * 添加边
   */
  addEdge(edge: Edge): void {
    this.edges.set(edge.id, edge);
  }
  
  /**
   * 删除边
   */
  removeEdge(edgeId: string): boolean {
    return this.edges.delete(edgeId);
  }
  
  /**
   * 获取边
   */
  getEdge(edgeId: string): Edge | undefined {
    return this.edges.get(edgeId);
  }
  
  /**
   * 获取所有边
   */
  getEdges(): Edge[] {
    return Array.from(this.edges.values());
  }
  
  /**
   * 获取节点的入边（指向该节点的边）
   */
  getInEdges(nodeId: string): Edge[] {
    return Array.from(this.edges.values()).filter(e => e.to === nodeId);
  }
  
  /**
   * 获取节点的出边（从该节点出发的边）
   */
  getOutEdges(nodeId: string): Edge[] {
    return Array.from(this.edges.values()).filter(e => e.from === nodeId);
  }
  
  /**
   * 获取节点的前置依赖（入边的起点）
   */
  getDependencies(nodeId: string): Node[] {
    const inEdges = this.getInEdges(nodeId);
    return inEdges
      .map(e => this.nodes.get(e.from))
      .filter((n): n is Node => n !== undefined);
  }
  
  /**
   * 获取节点的后继（出边的终点）
   */
  getDependents(nodeId: string): Node[] {
    const outEdges = this.getOutEdges(nodeId);
    return outEdges
      .map(e => this.nodes.get(e.to))
      .filter((n): n is Node => n !== undefined);
  }
  
  /**
   * 拓扑排序 - 返回按依赖顺序排列的节点
   * 用于代码生成时确定生成顺序
   */
  topologicalSort(): Node[] {
    const visited = new Set<string>();
    const result: Node[] = [];
    const inDegree = new Map<string, number>();
    
    // 初始化入度
    this.nodes.forEach((node, id) => {
      inDegree.set(id, this.getInEdges(id).length);
    });
    
    // Kahn's algorithm
    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        queue.push(id);
      }
    });
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = this.nodes.get(nodeId)!;
      result.push(node);
      visited.add(nodeId);
      
      // 更新后继节点的入度
      this.getOutEdges(nodeId).forEach(edge => {
        const newDegree = (inDegree.get(edge.to) || 0) - 1;
        inDegree.set(edge.to, newDegree);
        if (newDegree === 0) {
          queue.push(edge.to);
        }
      });
    }
    
    // 检查是否有环
    if (visited.size !== this.nodes.size) {
      throw new Error('Graph contains a cycle');
    }
    
    return result;
  }
  
  /**
   * 获取图的统计信息
   */
  getStats(): { nodeCount: number; edgeCount: number; edgeTypeDistribution: Record<EdgeType, number> } {
    const edgeTypeDistribution: Record<EdgeType, number> = {} as Record<EdgeType, number>;
    
    for (const edge of this.edges.values()) {
      edgeTypeDistribution[edge.type] = (edgeTypeDistribution[edge.type] || 0) + 1;
    }
    
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      edgeTypeDistribution
    };
  }
  
  /**
   * 序列化为 JSON
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
      edges: Array.from(this.edges.values()).map(e => e.toJSON())
    };
  }
  
  /**
   * 从 JSON 反序列化
   */
  static fromJSON(data: any): Graph {
    const graph = new Graph({
      id: data.id,
      name: data.name,
      description: data.description
    });
    
    // 添加节点
    data.nodes?.forEach((nodeData: any) => {
      const node = Node.fromJSON(nodeData);
      graph.addNode(node);
    });
    
    // 添加边
    data.edges?.forEach((edgeData: any) => {
      const edge = Edge.fromJSON(edgeData);
      graph.addEdge(edge);
    });
    
    return graph;
  }
  
  private generateId(): string {
    return `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
