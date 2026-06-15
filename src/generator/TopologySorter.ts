/**
 * TopologySorter - 拓扑排序器
 * 
 * 用于确定代码生成的顺序，确保被依赖的模块先生成
 */

import { Graph, Node } from '../core';

export interface SortResult {
  layers: Node[][];  // 分层结果，每层内的节点可以并行生成
  order: Node[];     // 线性顺序
  parallelGroups: Node[][];  // 可并行的组
}

export class TopologySorter {
  
  /**
   * 拓扑排序 - 分层
   * 返回一个二维数组，每个子数组内的节点没有依赖关系，可以并行生成
   */
  static sortByLayers(graph: Graph): Node[][] {
    const inDegree = new Map<string, number>();
    const layers: Node[][] = [];
    const processed = new Set<string>();
    
    // 初始化入度
    graph.getNodes().forEach(node => {
      inDegree.set(node.id, graph.getInEdges(node.id).length);
    });
    
    // Kahn's algorithm with layers
    while (processed.size < graph.getNodes().length) {
      // 找出所有入度为0的节点
      const currentLayer: Node[] = [];
      graph.getNodes().forEach(node => {
        if (!processed.has(node.id) && inDegree.get(node.id) === 0) {
          currentLayer.push(node);
        }
      });
      
      if (currentLayer.length === 0) {
        throw new Error('Graph contains a cycle');
      }
      
      layers.push(currentLayer);
      
      // 更新入度
      currentLayer.forEach(node => {
        processed.add(node.id);
        graph.getOutEdges(node.id).forEach(edge => {
          const newDegree = (inDegree.get(edge.to) || 0) - 1;
          inDegree.set(edge.to, newDegree);
        });
      });
    }
    
    return layers;
  }
  
  /**
   * 拓扑排序 - 线性顺序
   */
  static sortLinear(graph: Graph): Node[] {
    const layers = this.sortByLayers(graph);
    return layers.flat();
  }
  
  /**
   * 获取可并行生成的组
   * 每个组内的节点可以同时生成
   */
  static getParallelGroups(graph: Graph): Node[][] {
    return this.sortByLayers(graph);
  }
  
  /**
   * 计算并行生成的加速比
   * 假设每个节点生成时间相同
   */
  static calculateSpeedup(graph: Graph): number {
    const layers = this.sortByLayers(graph);
    const totalNodes = graph.getNodes().length;
    
    if (totalNodes === 0) return 1;
    
    // 串行时间 = 节点数
    // 并行时间 = 层数
    const serialTime = totalNodes;
    const parallelTime = layers.length;
    
    return serialTime / parallelTime;
  }
  
  /**
   * 生成排序报告
   */
  static generateReport(graph: Graph): {
    totalNodes: number;
    layers: number;
    speedup: number;
    layerDetails: Array<{ layer: number; nodes: string[] }>;
  } {
    const layers = this.sortByLayers(graph);
    
    return {
      totalNodes: graph.getNodes().length,
      layers: layers.length,
      speedup: this.calculateSpeedup(graph),
      layerDetails: layers.map((nodes, index) => ({
        layer: index + 1,
        nodes: nodes.map(n => n.label)
      }))
    };
  }
}
