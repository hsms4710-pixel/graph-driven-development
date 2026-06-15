import { describe, it, expect } from 'vitest';
import { Graph, Node, Edge } from '../src/core';

describe('Graph', () => {
  describe('基本操作', () => {
    it('应该能创建图', () => {
      const graph = new Graph({ name: 'Test Graph' });
      expect(graph.name).toBe('Test Graph');
      expect(graph.getNodes()).toHaveLength(0);
      expect(graph.getEdges()).toHaveLength(0);
    });
    
    it('应该能添加节点', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node = new Node({ label: 'Test Node', type: 'feature' });
      graph.addNode(node);
      
      expect(graph.getNodes()).toHaveLength(1);
      expect(graph.getNode(node.id)).toBeDefined();
    });
    
    it('应该能删除节点', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node = new Node({ label: 'Test Node', type: 'feature' });
      graph.addNode(node);
      
      const deleted = graph.removeNode(node.id);
      expect(deleted).toBe(true);
      expect(graph.getNodes()).toHaveLength(0);
    });
    
    it('删除节点时应该同时删除相关边', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node1 = new Node({ label: 'Node 1', type: 'feature' });
      const node2 = new Node({ label: 'Node 2', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      
      const edge = new Edge({ from: node1.id, to: node2.id, type: 'depends_on' });
      graph.addEdge(edge);
      
      expect(graph.getEdges()).toHaveLength(1);
      
      graph.removeNode(node1.id);
      expect(graph.getEdges()).toHaveLength(0);
    });
  });
  
  describe('边操作', () => {
    it('应该能添加边', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node1 = new Node({ label: 'Node 1', type: 'feature' });
      const node2 = new Node({ label: 'Node 2', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      
      const edge = new Edge({ from: node1.id, to: node2.id, type: 'depends_on' });
      graph.addEdge(edge);
      
      expect(graph.getEdges()).toHaveLength(1);
      expect(graph.getEdge(edge.id)).toBeDefined();
    });
    
    it('应该能获取节点的依赖', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node1 = new Node({ label: 'Node 1', type: 'feature' });
      const node2 = new Node({ label: 'Node 2', type: 'feature' });
      const node3 = new Node({ label: 'Node 3', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);
      
      graph.addEdge(new Edge({ from: node2.id, to: node1.id, type: 'depends_on' }));
      graph.addEdge(new Edge({ from: node3.id, to: node1.id, type: 'depends_on' }));
      
      const dependencies = graph.getDependencies(node1.id);
      expect(dependencies).toHaveLength(2);
      expect(dependencies.map(n => n.label)).toContain('Node 2');
      expect(dependencies.map(n => n.label)).toContain('Node 3');
    });
    
    it('应该能获取节点的后继', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node1 = new Node({ label: 'Node 1', type: 'feature' });
      const node2 = new Node({ label: 'Node 2', type: 'feature' });
      const node3 = new Node({ label: 'Node 3', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);
      
      graph.addEdge(new Edge({ from: node1.id, to: node2.id, type: 'depends_on' }));
      graph.addEdge(new Edge({ from: node1.id, to: node3.id, type: 'depends_on' }));
      
      const dependents = graph.getDependents(node1.id);
      expect(dependent).toHaveLength(2);
      expect(dependents.map(n => n.label)).toContain('Node 2');
      expect(dependents.map(n => n.label)).toContain('Node 3');
    });
  });
  
  describe('拓扑排序', () => {
    it('应该能正确进行拓扑排序', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node1 = new Node({ label: 'Node 1', type: 'feature' });
      const node2 = new Node({ label: 'Node 2', type: 'feature' });
      const node3 = new Node({ label: 'Node 3', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);
      
      // Node 2 依赖 Node 1
      // Node 3 依赖 Node 2
      graph.addEdge(new Edge({ from: node2.id, to: node1.id, type: 'depends_on' }));
      graph.addEdge(new Edge({ from: node3.id, to: node2.id, type: 'depends_on' }));
      
      const sorted = graph.topologicalSort();
      
      // Node 1 应该在最前面（没有依赖）
      expect(sorted[0].label).toBe('Node 1');
      // Node 3 应该在最后面（依赖最多）
      expect(sorted[sorted.length - 1].label).toBe('Node 3');
    });
    
    it('有环时应该抛出错误', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node1 = new Node({ label: 'Node 1', type: 'feature' });
      const node2 = new Node({ label: 'Node 2', type: 'feature' });
      graph.addNode(node1);
      graph.addNode(node2);
      
      // 创建环：Node 1 -> Node 2 -> Node 1
      graph.addEdge(new Edge({ from: node1.id, to: node2.id, type: 'depends_on' }));
      graph.addEdge(new Edge({ from: node2.id, to: node1.id, type: 'depends_on' }));
      
      expect(() => graph.topologicalSort()).toThrow('Graph contains a cycle');
    });
  });
  
  describe('统计信息', () => {
    it('应该能返回正确的统计信息', () => {
      const graph = new Graph({ name: 'Test Graph' });
      const node1 = new Node({ label: 'Node 1', type: 'feature' });
      const node2 = new Node({ label: 'Node 2', type: 'module' });
      graph.addNode(node1);
      graph.addNode(node2);
      
      graph.addEdge(new Edge({ from: node2.id, to: node1.id, type: 'depends_on' }));
      
      const stats = graph.getStats();
      
      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
      expect(stats.edgeTypeDistribution.depends_on).toBe(1);
    });
  });
  
  describe('序列化', () => {
    it('应该能序列化为 JSON', () => {
      const graph = new Graph({ name: 'Test Graph', description: 'A test graph' });
      const node = new Node({ label: 'Test Node', type: 'feature' });
      graph.addNode(node);
      
      const json = JSON.stringify(graph.toJSON());
      expect(json).toContain('Test Graph');
      expect(json).toContain('Test Node');
    });
    
    it('应该能从 JSON 反序列化', () => {
      const originalGraph = new Graph({ name: 'Test Graph' });
      const node = new Node({ label: 'Test Node', type: 'feature' });
      originalGraph.addNode(node);
      
      const json = JSON.stringify(originalGraph.toJSON());
      const restoredGraph = Graph.fromJSON(JSON.parse(json));
      
      expect(restoredGraph.name).toBe('Test Graph');
      expect(restoredGraph.getNodes()).toHaveLength(1);
      expect(restoredGraph.getNodes()[0].label).toBe('Test Node');
    });
  });
});
