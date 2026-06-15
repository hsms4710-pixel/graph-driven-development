import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node as RFNode,
  Edge as RFEdge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Graph, Node, Edge } from '../core';
import { GraphSerializer } from '../core/serializer';
import FeatureNode from './components/FeatureNode';
import ModuleNode from './components/ModuleNode';
import CustomEdge from './components/CustomEdge';
import './GraphEditor.css';

const nodeTypes: NodeTypes = {
  feature: FeatureNode,
  module: ModuleNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

const defaultEdgeOptions = {
  type: 'custom',
  animated: false,
};

interface GraphEditorProps {
  graph?: Graph;
  onGraphChange?: (graph: Graph) => void;
}

export default function GraphEditor({ graph: initialGraph, onGraphChange }: GraphEditorProps) {
  const [graph, setGraph] = useState<Graph>(
    initialGraph || new Graph({ name: 'New Project' })
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // 同步图数据到 React Flow
  const syncGraphToFlow = useCallback((g: Graph) => {
    const { nodes: rfNodes, edges: rfEdges } = GraphSerializer.toReactFlow(g);
    
    // 转换为 React Flow 节点格式
    const formattedNodes: RFNode[] = rfNodes.map((n: any) => ({
      ...n,
      sourcePosition: 'right',
      targetPosition: 'left',
    }));
    
    // 转换为 React Flow 边格式
    const formattedEdges: RFEdge[] = rfEdges.map((e: any) => ({
      ...e,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#667eea',
      },
    }));
    
    setNodes(formattedNodes);
    setEdges(formattedEdges);
  }, [setNodes, setEdges]);
  
  // 初始化时同步
  useMemo(() => {
    if (initialGraph) {
      syncGraphToFlow(initialGraph);
    }
  }, [initialGraph, syncGraphToFlow]);
  
  // 处理节点变化
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);
      
      // 同步变化到图
      setGraph(prevGraph => {
        const newGraph = GraphSerializer.fromReactFlow(nodes, edges);
        if (onGraphChange) {
          onGraphChange(newGraph);
        }
        return newGraph;
      });
    },
    [nodes, edges, onNodesChange, onGraphChange]
  );
  
  // 处理边变化
  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      onEdgesChange(changes);
      
      // 同步变化到图
      setGraph(prevGraph => {
        const newGraph = GraphSerializer.fromReactFlow(nodes, edges);
        if (onGraphChange) {
          onGraphChange(newGraph);
        }
        return newGraph;
      });
    },
    [nodes, edges, onEdgesChange, onGraphChange]
  );
  
  // 处理连接
  const handleConnect = useCallback(
    (params: Connection) => {
      setEdges(prevEdges => addEdge({
        ...params,
        type: 'custom',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#667eea',
        },
      }, prevEdges));
      
      // 更新图
      setGraph(prevGraph => {
        const newEdge = new Edge({
          from: params.source!,
          to: params.target!,
          type: 'depends_on',
        });
        prevGraph.addEdge(newEdge);
        if (onGraphChange) {
          onGraphChange(prevGraph);
        }
        return prevGraph;
      });
    },
    [setEdges, onGraphChange]
  );
  
  // 添加新节点
  const handleAddNode = useCallback((nodeType: string, label: string) => {
    const newNode = new Node({
      label,
      type: nodeType as any,
      position: { x: 200, y: 200 },
    });
    
    graph.addNode(newNode);
    syncGraphToFlow(graph);
    
    if (onGraphChange) {
      onGraphChange(graph);
    }
  }, [graph, syncGraphToFlow, onGraphChange]);
  
  // 生成代码
  const handleGenerate = useCallback(() => {
    // TODO: 实现代码生成
    console.log('Generate code from graph:', graph);
  }, [graph]);
  
  // 删除选中
  const handleDelete = useCallback(() => {
    // TODO: 实现删除选中节点/边
  }, []);
  
  return (
    <div className="graph-editor">
      <div className="graph-editor-toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => handleAddNode('feature', '新功能')}>
            + 功能
          </button>
          <button className="toolbar-btn" onClick={() => handleAddNode('module', '新模块')}>
            + 模块
          </button>
        </div>
        
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleDelete}>
            删除
          </button>
          <button className="toolbar-btn primary" onClick={handleGenerate}>
            生成代码
          </button>
        </div>
        
        <div className="toolbar-info">
          <span>{graph.getNodes().length} 节点</span>
          <span>{graph.getEdges().length} 连接</span>
        </div>
      </div>
      
      <div className="graph-editor-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          minZoom={0.2}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} />
          <Controls />
        </ReactFlow>
      </div>
      
      <div className="graph-editor-sidebar">
        <h3>项目信息</h3>
        <p>名称: {graph.name}</p>
        <p>描述: {graph.description || '未设置'}</p>
        <hr />
        <h3>图统计</h3>
        <p>节点数: {graph.getStats().nodeCount}</p>
        <p>边数: {graph.getStats().edgeCount}</p>
      </div>
    </div>
  );
}
