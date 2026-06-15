import { describe, it, expect } from 'vitest';
import { Graph, Node } from '../../src/core';
import { TopologySorter } from '../../src/generator/TopologySorter';

describe('TopologySorter', () => {
  describe('sortByLayers', () => {
    it('应该能正确分层', () => {
      const graph = new Graph({ name: 'Test' });
      const node1 = new Node({ label: 'A', type: 'feature' });
      const node2 = new Node({ label: 'B', type: 'feature' });
      const node3 = new Node({ label: 'C', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);
      
      // B 依赖 A，C 依赖 B
      graph.addEdge(new Edge({ from: node2.id, to: node1.id, type: 'depends_on' }));
      graph.addEdge(new Edge({ from: node3.id, to: node2.id, type: 'depends_on' }));
      
      const layers = TopologySorter.sortByLayers(graph);
      
      // 应该有 3 层
      expect(layers).toHaveLength(3);
      
      // 第一层：A（无依赖）
      expect(layers[0]).toHaveLength(1);
      expect(layers[0][0].label).toBe('A');
      
      // 第二层：B（依赖 A）
      expect(layers[1]).toHaveLength(1);
      expect(layers[1][0].label).toBe('B');
      
      // 第三层：C（依赖 B）
      expect(layers[2]).toHaveLength(1);
      expect(layers[2][0].label).toBe('C');
    });
    
    it('无依赖的节点应该在同一层', () => {
      const graph = new Graph({ name: 'Test' });
      const node1 = new Node({ label: 'A', type: 'feature' });
      const node2 = new Node({ label: 'B', type: 'feature' });
      const node3 = new Node({ label: 'C', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);
      
      // A、B、C 都没有依赖
      const layers = TopologySorter.sortByLayers(graph);
      
      expect(layers).toHaveLength(1);
      expect(layers[0]).toHaveLength(3);
    });
    
    it('有环时应该抛出错误', () => {
      const graph = new Graph({ name: 'Test' });
      const node1 = new Node({ label: 'A', type: 'feature' });
      const node2 = new Node({ label: 'B', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      
      // 创建环
      graph.addEdge(new Edge({ from: node1.id, to: node2.id, type: 'depends_on' }));
      graph.addEdge(new Edge({ from: node2.id, to: node1.id, type: 'depends_on' }));
      
      expect(() => TopologySorter.sortByLayers(graph)).toThrow('Graph contains a cycle');
    });
  });
  
  describe('calculateSpeedup', () => {
    it('应该能计算加速比', () => {
      const graph = new Graph({ name: 'Test' });
      
      // 添加 6 个无依赖的节点
      for (let i = 0; i < 6; i++) {
        graph.addNode(new Node({ label: `Node ${i}`, type: 'feature' }));
      }
      
      const speedup = TopologySorter.calculateSpeedup(graph);
      
      // 6 个节点，1 层，加速比 = 6
      expect(speedup).toBe(6);
    });
    
    it('空图应该返回 1', () => {
      const graph = new Graph({ name: 'Test' });
      const speedup = TopologySorter.calculateSpeedup(graph);
      expect(speedup).toBe(1);
    });
  });
  
  describe('generateReport', () => {
    it('应该能生成报告', () => {
      const graph = new Graph({ name: 'Test' });
      const node1 = new Node({ label: 'A', type: 'feature' });
      const node2 = new Node({ label: 'B', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      
      graph.addEdge(new Edge({ from: node2.id, to: node1.id, type: 'depends_on' }));
      
      const report = TopologySorter.generateReport(graph);
      
      expect(report.totalNodes).toBe(2);
      expect(report.layers).toBe(2);
      expect(report.layerDetails).toHaveLength(2);
      expect(report.layerDetails[0].nodes).toContain('A');
      expect(report.layerDetails[1].nodes).toContain('B');
    });
  });
});
