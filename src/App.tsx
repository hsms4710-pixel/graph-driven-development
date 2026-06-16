/**
 * Graph-Driven Development - 主应用
 * 
 * 功能：
 * 1. 代码索引 - 从代码仓库生成图谱
 * 2. 实时同步 - WebSocket 双向同步
 * 3. 图谱编辑 - 5层架构可视化编辑
 * 4. Brainstorm - 需求澄清流程
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Node as RFNode,
  Edge as RFEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

// ==================== 类型定义 ====================

type LayerType = 'L1_Constitution' | 'L2_TechStack' | 'L3_Epic' | 'L4_Story' | 'L5_Task';

interface NodeData {
  label: string;
  layer: LayerType;
  properties?: Record<string, unknown>;
  status?: 'draft' | 'reviewing' | 'approved' | 'implemented';
  filePath?: string;
}

interface Graph {
  id: string;
  name: string;
  description: string;
  nodes: NodeData[];
  edges: EdgeData[];
  createdAt: number;
  updatedAt: number;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: 'depends_on' | 'contains' | 'implements' | 'imports' | 'refines';
  label?: string;
}

// ==================== 层级配置 ====================

const LAYER_CONFIG: Record<LayerType, { color: string; label: string; icon: string }> = {
  L1_Constitution: { color: '#8E44AD', label: '宪法', icon: '📜' },
  L2_TechStack: { color: '#3498DB', label: '技术栈', icon: '🔧' },
  L3_Epic: { color: '#27AE60', label: 'Epic', icon: '📋' },
  L4_Story: { color: '#E67E22', label: 'Story', icon: '📝' },
  L5_Task: { color: '#E74C3C', label: 'Task', icon: '⚡' },
};

const EDGE_TYPE_CONFIG: Record<string, { color: string; dash: number[]; label: string }> = {
  contains: { color: '#27AE60', dash: [], label: '包含' },
  depends_on: { color: '#8E44AD', dash: [], label: '依赖' },
  implements: { color: '#E67E22', dash: [], label: '实现' },
  imports: { color: '#3498DB', dash: [5, 5], label: '导入' },
  refines: { color: '#E74C3C', dash: [3, 3], label: '细化' },
};

// ==================== 自定义节点组件 ====================

interface GraphNodeComponentProps {
  data: NodeData;
  selected?: boolean;
}

const GraphNodeComponent: React.FC<GraphNodeComponentProps> = ({ data, selected }) => {
  const config = LAYER_CONFIG[data.layer];
  
  return (
    <div 
      className="graph-node"
      style={{
        background: `linear-gradient(135deg, ${config.color}20, ${config.color}10)`,
        border: `2px solid ${config.color}${selected ? '80' : '40'}`,
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '140px',
        maxWidth: '200px',
        boxShadow: selected ? `0 0 12px ${config.color}60` : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span>{config.icon}</span>
        <span style={{ 
          fontWeight: 600, 
          color: config.color,
          fontSize: '12px',
          textTransform: 'uppercase'
        }}>
          {config.label}
        </span>
      </div>
      <div style={{ 
        fontSize: '13px', 
        fontWeight: 500,
        color: '#333',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {data.label}
      </div>
      <div style={{ marginTop: '6px' }}>
        <Handle 
          type="target" 
          position={Position.Left} 
          style={{ background: config.color }} 
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          style={{ background: config.color }} 
        />
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: GraphNodeComponent as any,
};

// ==================== 主应用组件 ====================

const App: React.FC = () => {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  
  const [activeTab, setActiveTab] = useState<'graph' | 'index' | 'brainstorm'>('graph');
  const [showNewGraphModal, setShowNewGraphModal] = useState(false);
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');
  const [indexPath, setIndexPath] = useState('');
  
  // WebSocket 状态
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentGraphRef = useRef<Graph | null>(null);

  // 连接 WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      if (!currentGraphId) return;
      
      const ws = new WebSocket(`ws://localhost:3001/ws?graphId=${currentGraphId}`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setWsConnected(true);
        console.log('[WS] Connected');
      };
      
      ws.onclose = () => {
        setWsConnected(false);
        console.log('[WS] Disconnected');
        // 自动重连
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentGraphId]);

  // 处理 WebSocket 消息
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        console.log('[WS] Connection confirmed');
        break;
        
      case 'graph:state':
        // 收到完整图谱状态，更新节点和边
        const newNodes = message.nodes.map((n: any) => ({
          id: n.id,
          type: 'custom',
          position: { x: Math.random() * 600 + 50, y: Math.random() * 400 + 50 },
          data: {
            label: n.label,
            layer: n.layer,
            status: n.status,
            properties: n.properties,
          },
        }));
        
        const newEdges = message.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          label: e.label,
          markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_TYPE_CONFIG[e.type]?.color || '#ccc' },
        }));
        
        setNodes(newNodes as any);
        setEdges(newEdges as any);
        break;
        
      case 'node:added':
        // 添加新节点
        const newNode = {
          id: message.nodeId,
          type: 'custom',
          position: { x: Math.random() * 600 + 50, y: Math.random() * 400 + 50 },
          data: {
            label: message.node.label,
            layer: message.node.layer,
            status: message.node.status,
            properties: message.node.properties,
          },
        };
        setNodes((nds) => [...nds, newNode as any]);
        break;
        
      case 'node:updated':
        // 更新节点
        setNodes((nds) => 
          nds.map((n) => 
            n.id === message.nodeId ? { ...n, data: { ...n.data, ...message.updates } } : n
          )
        );
        break;
        
      case 'node:deleted':
        // 删除节点
        setNodes((nds) => nds.filter((n) => n.id !== message.nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== message.nodeId && e.target !== message.nodeId));
        break;
        
      case 'edge:added':
        // 添加新边
        const newEdge = {
          id: message.edgeId,
          source: message.edge.source,
          target: message.edge.target,
          type: 'smoothstep',
          label: message.edge.label,
          markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_TYPE_CONFIG[message.edge.type]?.color || '#ccc' },
        };
        setEdges((eds) => [...eds, newEdge as any]);
        break;
        
      case 'edge:deleted':
        // 删除边
        setEdges((eds) => eds.filter((e) => e.id !== message.edgeId));
        break;
        
      default:
        console.log('[WS] Unknown message type:', message.type);
    }
  }, [setNodes, setEdges]);

  // 初始化 - 获取图谱列表
  useEffect(() => {
    fetchGraphs();
  }, []);

  const fetchGraphs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/graphs');
      const data = await response.json();
      setGraphs(data);
    } catch (error) {
      console.error('Failed to fetch graphs:', error);
    }
  };

  // 选择图谱
  const handleSelectGraph = async (graphId: string) => {
    setCurrentGraphId(graphId);
    
    try {
      const response = await fetch(`http://localhost:3001/api/graphs/${graphId}`);
      const graph = await response.json();
      currentGraphRef.current = graph;
      
      // 转换为 React Flow 节点
      const newNodes = graph.nodes.map((n: any) => ({
        id: n.id,
        type: 'custom',
        position: { x: Math.random() * 600 + 50, y: Math.random() * 400 + 50 },
        data: {
          label: n.label,
          layer: n.layer,
          status: n.status,
          properties: n.properties,
        },
      }));
      
      // 转换为 React Flow 边
      const newEdges = graph.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        label: e.label,
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_TYPE_CONFIG[e.type]?.color || '#ccc' },
      }));
      
      setNodes(newNodes as any);
      setEdges(newEdges as any);
    } catch (error) {
      console.error('Failed to load graph:', error);
    }
  };

  // 新建图谱
  const handleCreateGraph = async () => {
    if (!newGraphName.trim()) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGraphName, description: '' }),
      });
      
      const graph = await response.json();
      setShowNewGraphModal(false);
      setNewGraphName('');
      
      // 刷新列表并选择新图谱
      await fetchGraphs();
      handleSelectGraph(graph.id);
    } catch (error) {
      console.error('Failed to create graph:', error);
    }
  };

  // 从代码索引
  const handleIndexFromCode = async () => {
    if (!indexPath.trim()) {
      alert('请输入项目路径');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:3001/api/graphs/from-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: indexPath }),
      });
      
      const graph = await response.json();
      setShowIndexModal(false);
      setIndexPath('');
      
      // 刷新列表并选择新图谱
      await fetchGraphs();
      handleSelectGraph(graph.id);
    } catch (error: any) {
      alert(`索引失败: ${error.message}`);
    }
  };

  // 删除图谱（预留）
  // const handleDeleteGraph = async (graphId: string) => {
  //   if (!confirm('确定要删除这个图谱吗？')) return;
  //   
  //   try {
  //     await fetch(`http://localhost:3001/api/graphs/${graphId}`, { method: 'DELETE' });
  //     
  //     if (currentGraphId === graphId) {
  //       setCurrentGraphId(null);
  //       setNodes([]);
  //       setEdges([]);
  //     }
  //     
  //     await fetchGraphs();
  //   } catch (error) {
  //     console.error('Failed to delete graph:', error);
  //   }
  // };

  // 处理边连接
  const onConnect = useCallback(
    (params: Connection) => {
      if (!currentGraphId) return;
      
      // 添加边到后端
      fetch(`http://localhost:3001/api/graphs/${currentGraphId}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: params.source,
          target: params.target,
          type: 'depends_on',
          label: '依赖',
        }),
      }).then(async (response) => {
        if (response.ok) {
          const edge: any = await response.json();
          setEdges((eds: any[]) => addEdge({
            ...params,
            id: edge.id,
            type: 'smoothstep',
            label: '依赖',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8E44AD' },
          } as any, eds));
        }
      });
    },
    [currentGraphId, setEdges]
  );

  // 处理节点点击
  const onNodeClick = (_: React.MouseEvent, node: RFNode) => {
    console.log('Node clicked:', node.id, node.data);
  };

  return (
    <div className="app-container">
      {/* 顶部导航 */}
      <header className="top-nav">
        <div className="nav-left">
          <h1>Graph-Driven Development</h1>
          <span className="version">v0.2.0 - M2</span>
        </div>
        
        <div className="nav-center">
          <div className="graph-selector">
            <select 
              value={currentGraphId || ''}
              onChange={(e) => handleSelectGraph(e.target.value)}
              disabled={!graphs.length}
            >
              <option value="">选择图谱...</option>
              {graphs.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.nodeCount} 节点, {g.edgeCount} 连接)
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="nav-right">
          <button 
            className="btn btn-primary"
            onClick={() => setShowNewGraphModal(true)}
          >
            + 新建图谱
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowIndexModal(true)}
          >
            📂 代码索引
          </button>
          <span className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? '● 已连接' : '● 未连接'}
          </span>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="main-content">
        {currentGraphId ? (
          <>
            {/* 左侧工具栏 */}
            <aside className="left-toolbar">
              <div className="toolbar-section">
                <h3>图谱操作</h3>
                <button className="btn btn-small" onClick={() => setActiveTab('graph')}>
                  📊 架构视图
                </button>
                <button className="btn btn-small" onClick={() => setActiveTab('index')}>
                  📂 代码索引
                </button>
                <button className="btn btn-small" onClick={() => setActiveTab('brainstorm')}>
                  💡 Brainstorm
                </button>
              </div>
              
              <div className="toolbar-section">
                <h3>层级节点</h3>
                {Object.entries(LAYER_CONFIG).map(([layer, config]) => (
                  <div key={layer} className="layer-item">
                    <span className="layer-dot" style={{ background: config.color }} />
                    <span>{config.icon} {config.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="toolbar-section">
                <h3>图例</h3>
                {Object.entries(EDGE_TYPE_CONFIG).map(([type, config]) => (
                  <div key={type} className="legend-item">
                    <div 
                      className="legend-line"
                      style={{ 
                        background: config.color,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      } as any}
                    />
                    <span>{config.label}</span>
                  </div>
                ))}
              </div>
            </aside>

            {/* React Flow 画布 */}
            <main className="graph-editor">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
              >
                <Background variant={BackgroundVariant.Dots} />
                <MiniMap />
                <Controls />
              </ReactFlow>
            </main>

            {/* 右侧面板 */}
            <aside className="right-panel">
              <div className="panel-header">
                <h3>{activeTab === 'graph' ? '架构视图' : activeTab === 'index' ? '代码索引' : 'Brainstorm'}</h3>
              </div>
              <div className="panel-content">
                {activeTab === 'graph' && (
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{nodes.length}</div>
                      <div className="stat-label">节点数</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{edges.length}</div>
                      <div className="stat-label">连接数</div>
                    </div>
                    {Object.entries(LAYER_CONFIG).map(([layer, config]) => {
                      const count = nodes.filter((n: any) => n.data.layer === layer).length;
                      if (count === 0) return null;
                      return (
                        <div key={layer} className="stat-card">
                          <div className="stat-value" style={{ color: config.color }}>{count}</div>
                          <div className="stat-label">{config.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeTab === 'index' && (
                  <div className="index-info">
                    <p>代码索引功能允许从现有代码仓库自动生成图谱结构。</p>
                    <ul>
                      <li>自动识别项目语言和框架</li>
                      <li>提取模块、文件、函数等层级结构</li>
                      <li>分析 import 依赖关系</li>
                      <li>生成 5 层架构图谱</li>
                    </ul>
                    <button className="btn btn-secondary" onClick={() => setShowIndexModal(true)}>
                      打开索引对话框
                    </button>
                  </div>
                )}
                {activeTab === 'brainstorm' && (
                  <div className="brainstorm-info">
                    <p>Brainstorm 功能提供需求澄清和问题分析。</p>
                    <ul>
                      <li>分析图谱完整性</li>
                      <li>生成待澄清问题</li>
                      <li>跟踪问题状态</li>
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h2>开始使用 Graph-Driven Development</h2>
            <p>选择一个现有图谱，或创建新图谱，或从代码索引开始</p>
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={() => setShowNewGraphModal(true)}>
                + 新建图谱
              </button>
              <button className="btn btn-secondary" onClick={() => setShowIndexModal(true)}>
                📂 从代码索引
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 新建图谱弹窗 */}
      {showNewGraphModal && (
        <div className="modal-overlay" onClick={() => setShowNewGraphModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>新建图谱</h3>
            <div className="form-group">
              <label>图谱名称</label>
              <input
                type="text"
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                placeholder="输入图谱名称"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGraph()}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setShowNewGraphModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateGraph}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 代码索引弹窗 */}
      {showIndexModal && (
        <div className="modal-overlay" onClick={() => setShowIndexModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>从代码索引</h3>
            <p className="modal-hint">输入代码仓库的本地路径，系统将自动分析并生成图谱</p>
            <div className="form-group">
              <label>项目路径</label>
              <input
                type="text"
                value={indexPath}
                onChange={(e) => setIndexPath(e.target.value)}
                placeholder="/path/to/your/project"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setShowIndexModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleIndexFromCode}>
                开始索引
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <footer className="status-bar">
        <div className="status-item">
          <span className="status-label">图谱:</span>
          <span className="status-value">{currentGraphId ? '已加载' : '未选择'}</span>
        </div>
        <div className="status-item">
          <span className="status-label">节点:</span>
          <span className="status-value">{nodes.length}</span>
        </div>
        <div className="status-item">
          <span className="status-label">连接:</span>
          <span className="status-value">{edges.length}</span>
        </div>
        <div className="status-item status-right">
          <span className={`status-dot ${wsConnected ? 'green' : 'red'}`} />
          <span className="status-label">WebSocket</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
