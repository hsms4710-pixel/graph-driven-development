/**
 * Serializer - 图的序列化和反序列化
 * 
 * 支持多种格式：
 * - JSON: 标准 JSON 格式
 * - GraphML: 图数据交换格式
 */

import { Graph } from './graph';
import { Node, NodeType } from './node';
import { Edge, EdgeType } from './edge';

export class GraphSerializer {
  
  /**
   * 序列化为 JSON
   */
  static toJSON(graph: Graph): string {
    const data = {
      version: '1.0',
      type: 'code-graph',
      graph: graph.toJSON()
    };
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * 从 JSON 反序列化
   */
  static fromJSON(json: string): Graph {
    const data = JSON.parse(json);
    return Graph.fromJSON(data.graph);
  }
  
  /**
   * 序列化为 GraphML 格式（用于导入其他工具）
   */
  static toGraphML(graph: Graph): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    xml += '  <graph id="' + graph.id + '" edgedefault="directed">\n';
    
    // 节点
    for (const node of graph.getNodes()) {
      xml += '    <node id="' + this.escapeXml(node.id) + '">\n';
      xml += '      <data key="label">' + this.escapeXml(node.label) + '</data>\n';
      xml += '      <data key="type">' + this.escapeXml(node.type) + '</data>\n';
      // 序列化属性
      for (const [key, value] of Object.entries(node.properties)) {
        xml += '      <data key="' + this.escapeXml(key) + '">' + 
               this.escapeXml(JSON.stringify(value)) + '</data>\n';
      }
      xml += '    </node>\n';
    }
    
    // 边
    for (const edge of graph.getEdges()) {
      xml += '    <edge id="' + this.escapeXml(edge.id) + '"';
      xml += ' source="' + this.escapeXml(edge.from) + '"';
      xml += ' target="' + this.escapeXml(edge.to) + '">\n';
      xml += '      <data key="type">' + this.escapeXml(edge.type) + '</data>\n';
      xml += '      <data key="label">' + this.escapeXml(edge.label) + '</data>\n';
      xml += '      <data key="weight">' + edge.weight + '</data>\n';
      xml += '    </edge>\n';
    }
    
    xml += '  </graph>\n';
    xml += '</graphml>';
    
    return xml;
  }
  
  /**
   * 从 GraphML 反序列化
   */
  static fromGraphML(graphml: string): Graph {
    const parser = new DOMParser();
    const doc = parser.parseFromString(graphml, 'application/xml');
    const graphElement = doc.getElementsByTagName('graph')[0];
    
    const graph = new Graph({
      id: graphElement.getAttribute('id') || '',
      name: 'Imported Graph'
    });
    
    // 解析节点
    const nodeElements = doc.getElementsByTagName('node');
    for (let i = 0; i < nodeElements.length; i++) {
      const nodeEl = nodeElements[i];
      const id = nodeEl.getAttribute('id')!;
      
      let label = id;
      let type: NodeType = 'feature';
      const properties: Record<string, any> = {};
      
      const dataElements = nodeEl.getElementsByTagName('data');
      for (let j = 0; j < dataElements.length; j++) {
        const key = dataElements[j].getAttribute('key');
        const value = dataElements[j].textContent?.trim();
        
        if (key === 'label') {
          label = value || id;
        } else if (key === 'type') {
          type = value as NodeType;
        } else if (value) {
          try {
            properties[key] = JSON.parse(value);
          } catch {
            properties[key] = value;
          }
        }
      }
      
      const node = new Node({ id, label, type, properties });
      graph.addNode(node);
    }
    
    // 解析边
    const edgeElements = doc.getElementsByTagName('edge');
    for (let i = 0; i < edgeElements.length; i++) {
      const edgeEl = edgeElements[i];
      const from = edgeEl.getAttribute('source')!;
      const to = edgeEl.getAttribute('target')!;
      
      let type: EdgeType = 'depends_on';
      let label = '';
      let weight = 1;
      
      const dataElements = edgeEl.getElementsByTagName('data');
      for (let j = 0; j < dataElements.length; j++) {
        const key = dataElements[j].getAttribute('key');
        const value = dataElements[j].textContent?.trim();
        
        if (key === 'type') type = value as EdgeType;
        else if (key === 'label') label = value || '';
        else if (key === 'weight') weight = parseInt(value) || 1;
      }
      
      const edge = new Edge({ from, to, type, label, weight });
      graph.addEdge(edge);
    }
    
    return graph;
  }
  
  /**
   * 转换为 React Flow 格式（用于可视化）
   */
  static toReactFlow(graph: Graph): {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
      label?: string;
    }>;
  } {
    const nodes = graph.getNodes().map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.label,
        properties: node.properties
      }
    }));
    
    const edges = graph.getEdges().map(edge => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: edge.type,
      label: edge.label
    }));
    
    return { nodes, edges };
  }
  
  /**
   * 从 React Flow 格式转换
   */
  static fromReactFlow(
    reactFlowNodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, any> }>,
    reactFlowEdges: Array<{ id: string; source: string; target: string; type: string; label?: string }>
  ): Graph {
    const graph = new Graph({ name: 'From React Flow' });
    
    // 转换节点
    for (const rfNode of reactFlowNodes) {
      const node = new Node({
        id: rfNode.id,
        label: rfNode.data.label,
        type: rfNode.type as NodeType,
        properties: rfNode.data.properties || {},
        position: rfNode.position
      });
      graph.addNode(node);
    }
    
    // 转换边
    for (const rfEdge of reactFlowEdges) {
      const edge = new Edge({
        id: rfEdge.id,
        from: rfEdge.source,
        to: rfEdge.target,
        type: rfEdge.type as EdgeType,
        label: rfEdge.label
      });
      graph.addEdge(edge);
    }
    
    return graph;
  }
  
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
