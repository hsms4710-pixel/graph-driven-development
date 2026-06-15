/**
 * Graph-Driven Development - Spec Kit 分析演示
 * 
 * 展示如何用 Graph-Driven Development 可视化和分析
 * GitHub 官方的 Spec Kit (规范驱动开发工具包)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

interface SpecKitNode {
  id: string;
  title: string;
  description: string;
  layer: LayerType;
  sourceFile: string;
  properties: Record<string, string>;
}

// ==================== Spec Kit 分析数据 ====================

const SPEC_KIT_DATA = {
  project: 'GitHub Spec Kit',
  description: '规范驱动开发 (Spec-Driven Development) 工具包 - 由 GitHub 官方开发',
  
  nodes: [
    // L1: 项目宪法
    { id: 'L1-001', title: '规范优先原则', description: '规格说明(Spec)是主要产物，代码是规格说明的表达形式', layer: 'L1_Constitution', sourceFile: 'spec-driven.md', properties: { 原则: 'Specifications as the Lingua Franca' } },
    { id: 'L1-002', title: '可执行规格说明', description: '规格说明必须足够精确、完整、无歧义，能够生成可工作的系统', layer: 'L1_Constitution', sourceFile: 'spec-driven.md', properties: { 原则: 'Executable Specifications' } },
    { id: 'L1-003', title: '持续优化', description: '一致性验证是持续进行的，而不是一次性门控', layer: 'L1_Constitution', sourceFile: 'spec-driven.md', properties: { 原则: 'Continuous Refinement' } },
    { id: 'L1-004', title: '研究驱动上下文', description: '研究代理在整个规格说明过程中收集关键上下文', layer: 'L1_Constitution', sourceFile: 'spec-driven.md', properties: { 原则: 'Research-Driven Context' } },

    // L2: 技术栈
    { id: 'L2-001', title: 'Specify CLI', description: '命令行界面，用于初始化项目并设置 Spec Kit 框架', layer: 'L2_TechStack', sourceFile: 'src/specify_cli/', properties: { 语言: 'Python', 功能: '项目初始化、命令管理' } },
    { id: 'L2-002', title: 'AI 编码助手集成', description: '支持多种 AI 编码助手的集成框架', layer: 'L2_TechStack', sourceFile: 'src/specify_cli/integrations/', properties: { 支持: 'Claude, Gemini, Copilot, Cursor' } },
    { id: 'L2-003', title: '工作流引擎', description: 'YAML 定义的工作流执行引擎', layer: 'L2_TechStack', sourceFile: 'src/specify_cli/workflows/', properties: { 步骤类型: '10 种内置步骤' } },
    { id: 'L2-004', title: '模板系统', description: '规格说明、计划、任务的模板定义', layer: 'L2_TechStack', sourceFile: 'templates/', properties: { 模板: 'spec, plan, tasks' } },

    // L3: Epic
    { id: 'L3-001', title: '/speckit.specify', description: '将简单功能描述转换为完整的结构化规格说明', layer: 'L3_Epic', sourceFile: 'templates/spec-template.md', properties: { 自动编号: '是', 分支创建: '是' } },
    { id: 'L3-002', title: '/speckit.plan', description: '从功能规格说明创建全面的实施计划', layer: 'L3_Epic', sourceFile: 'templates/plan-template.md', properties: { 宪法合规: '是', 技术翻译: '是' } },
    { id: 'L3-003', title: '/speckit.tasks', description: '分析计划和相关设计文档，生成可执行的任务列表', layer: 'L3_Epic', sourceFile: 'templates/tasks-template.md', properties: { 并行标记: '[P]', 依赖分析: '是' } },
    { id: 'L3-004', title: '工作流系统', description: '基于 YAML 定义的工作流执行引擎', layer: 'L3_Epic', sourceFile: 'workflows/', properties: { 执行模型: '顺序、状态持久化' } },

    // L4: Story
    { id: 'L4-001', title: '产品管理者流程', description: '产品管理者更新验收标准，实施计划自动标记受影响的技术决策', layer: 'L4_Story', sourceFile: 'spec-driven.md', properties: { 角色: '产品经理', 价值: '规格说明变更自动传播' } },
    { id: 'L4-002', title: '架构师流程', description: '架构师发现更好的模式，PRD 更新以反映新可能性', layer: 'L4_Story', sourceFile: 'spec-driven.md', properties: { 角色: '架构师', 价值: '架构优化自动反映' } },
    { id: 'L4-003', title: '开发者集成', description: '开发者使用偏好的 AI 工具，同时保持一致的项目结构', layer: 'L4_Story', sourceFile: 'AGENTS.md', properties: { 角色: '开发者', 价值: '工具无关的统一开发流程' } },
    { id: 'L4-004', title: '团队协作管理', description: '团队评审的规格说明被表达和版本化，创建在分支中', layer: 'L4_Story', sourceFile: 'spec-driven.md', properties: { 角色: '团队', 价值: '规格说明版本控制' } },

    // L5: Task
    { id: 'L5-001', title: '初始化项目', description: '使用 specify init 创建项目', layer: 'L5_Task', sourceFile: 'src/specify_cli/', properties: { 命令: 'specify init', 输出: '项目目录结构' } },
    { id: 'L5-002', title: '创建规格说明', description: '使用 /speckit.specify 命令从描述生成规格说明', layer: 'L5_Task', sourceFile: 'templates/spec-template.md', properties: { 输入: '用户描述', 输出: 'spec.md' } },
    { id: 'L5-003', title: '生成实施计划', description: '使用 /speckit.plan 命令从规格说明生成计划', layer: 'L5_Task', sourceFile: 'templates/plan-template.md', properties: { 输入: 'spec.md', 输出: 'plan.md' } },
    { id: 'L5-004', title: '分解任务', description: '使用 /speckit.tasks 命令从计划生成任务列表', layer: 'L5_Task', sourceFile: 'templates/tasks-template.md', properties: { 输入: 'plan.md', 输出: 'tasks.md' } },
    { id: 'L5-005', title: '执行生成代码', description: '使用 AI 助手执行任务列表中的每个任务', layer: 'L5_Task', sourceFile: 'AGENTS.md', properties: { 输入: 'tasks.md', 输出: '可工作代码' } },
  ] as SpecKitNode[],

  edges: [
    // L1 → L2
    { source: 'L1-001', target: 'L2-001', type: 'refines' as const, label: 'CLI 实现规范优先原则' },
    { source: 'L1-002', target: 'L2-004', type: 'implements' as const, label: '模板提供可执行规格说明载体' },

    // L2 内部
    { source: 'L2-001', target: 'L2-002', type: 'contains' as const, label: 'CLI 包含 AI 集成模块' },
    { source: 'L2-001', target: 'L2-003', type: 'contains' as const, label: 'CLI 包含工作流引擎' },

    // L3 → L2
    { source: 'L3-001', target: 'L2-004', type: 'uses' as const, label: 'specify 使用 spec-template' },
    { source: 'L3-002', target: 'L2-004', type: 'uses' as const, label: 'plan 使用 plan-template' },
    { source: 'L3-003', target: 'L2-004', type: 'uses' as const, label: 'tasks 使用 tasks-template' },
    { source: 'L3-004', target: 'L2-003', type: 'implements' as const, label: '工作流系统实现引擎' },

    // L4 → L3
    { source: 'L4-001', target: 'L3-001', type: 'uses' as const, label: '产品管理者使用 specify' },
    { source: 'L4-002', target: 'L3-001', type: 'uses' as const, label: '架构师使用 specify' },
    { source: 'L4-003', target: 'L3-001', type: 'uses' as const, label: '开发者使用 specify' },
    { source: 'L4-003', target: 'L3-002', type: 'uses' as const, label: '开发者使用 plan' },
    { source: 'L4-003', target: 'L3-003', type: 'uses' as const, label: '开发者使用 tasks' },
    { source: 'L4-004', target: 'L3-001', type: 'uses' as const, label: '团队使用 specify' },

    // L5 → L3
    { source: 'L5-001', target: 'L3-001', type: 'implements' as const, label: '初始化任务实现 specify' },
    { source: 'L5-002', target: 'L3-001', type: 'implements' as const, label: '创建规格说明任务实现' },
    { source: 'L5-003', target: 'L3-002', type: 'implements' as const, label: '生成计划任务实现' },
    { source: 'L5-004', target: 'L3-003', type: 'implements' as const, label: '分解任务实现' },
    { source: 'L5-005', target: 'L3-003', type: 'implements' as const, label: '执行任务实现' },

    // 依赖链
    { source: 'L5-002', target: 'L5-003', type: 'depends_on' as const, label: '生成计划依赖规格说明' },
    { source: 'L5-003', target: 'L5-004', type: 'depends_on' as const, label: '分解任务依赖计划' },
    { source: 'L5-004', target: 'L5-005', type: 'depends_on' as const, label: '执行任务依赖任务列表' },
  ],
};

// ==================== 层级配置 ====================

const LAYER_CONFIG: Record<LayerType, {
  color: string;
  bgGradient: string;
  borderColor: string;
  icon: string;
  label: string;
}> = {
  L1_Constitution: {
    color: '#7c3aed',
    bgGradient: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
    borderColor: '#7c3aed',
    icon: '📜',
    label: '项目宪法',
  },
  L2_TechStack: {
    color: '#3b82f6',
    bgGradient: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    borderColor: '#3b82f6',
    icon: '🔧',
    label: '技术栈',
  },
  L3_Epic: {
    color: '#22c55e',
    bgGradient: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    borderColor: '#22c55e',
    icon: '📋',
    label: 'Epic',
  },
  L4_Story: {
    color: '#f97316',
    bgGradient: 'linear-gradient(135deg, #ffedd5, #fed7aa)',
    borderColor: '#f97316',
    icon: '📝',
    label: 'Story',
  },
  L5_Task: {
    color: '#ef4444',
    bgGradient: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    borderColor: '#ef4444',
    icon: '⚡',
    label: 'Task',
  },
};

const EDGE_TYPE_CONFIG: Record<string, { color: string; label: string; dash: number[] }> = {
  refines: { color: '#7c3aed', label: '细化', dash: [] },
  implements: { color: '#f97316', label: '实现', dash: [] },
  contains: { color: '#22c55e', label: '包含', dash: [5, 5] },
  uses: { color: '#3b82f6', label: '使用', dash: [3, 3] },
  depends_on: { color: '#ef4444', label: '依赖', dash: [] },
};

// ==================== 自定义节点组件 ====================

interface GraphNodeData {
  label: string;
  layer: LayerType;
  properties?: Record<string, string>;
  status?: string;
}

const GraphNodeComponent: React.FC<{
  data: GraphNodeData;
  selected?: boolean;
}> = ({ data, selected }) => {
  const config = LAYER_CONFIG[data.layer];
  
  return (
    <div
      style={{
        background: config.bgGradient,
        border: `2px solid ${config.borderColor}`,
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '180px',
        boxShadow: selected ? `0 0 0 3px ${config.color}` : '0 4px 12px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.15)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = selected ? `0 0 0 3px ${config.color}` : '0 4px 12px rgba(0,0,0,0.1)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{config.icon}</span>
        <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '13px' }}>
          {data.label.replace(/^.{3}\s/, '')}
        </span>
      </div>
      
      <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>
        {config.label}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: config.color, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: config.color, width: 8, height: 8 }}
      />
    </div>
  );
};

// ==================== Brainstorm 澄清问题 ====================

const CLARIFICATION_QUESTIONS = [
  {
    id: 'q-spec-001',
    question: 'Graph-Driven Development 与 Spec-Driven Development 的核心区别是什么？',
    hint: '理解两种方法论的定位差异',
    options: [
      {
        id: 'opt-1',
        label: 'GDD 更注重可视化，SDD 更注重文档化',
        implications: ['GDD 提供实时图谱视图', 'SDD 依赖 Markdown 文档'],
        cost: 'low',
        complexity: 'simple',
      },
      {
        id: 'opt-2',
        label: 'GDD 的图谱是实时双向同步的，SDD 是单向生成',
        implications: ['GDD 支持 Agent↔Graph 实时同步', 'SDD 是 Spec → Code 单向流程'],
        cost: 'medium',
        complexity: 'moderate',
      },
      {
        id: 'opt-3',
        label: '两者本质上相同，只是表达形式不同',
        implications: ['需要统一方法论', '可能造成团队认知分裂'],
        cost: 'high',
        complexity: 'complex',
      },
    ],
    status: 'pending' as const,
  },
  {
    id: 'q-spec-002',
    question: '如何将 Spec Kit 的模板系统集成到 Graph-Driven Development？',
    hint: '考虑模板与图节点的映射关系',
    options: [
      {
        id: 'opt-2-1',
        label: '每个图节点类型对应一个模板',
        implications: ['标准化节点结构', '降低学习成本'],
        cost: 'low',
        complexity: 'simple',
      },
      {
        id: 'opt-2-2',
        label: '模板作为节点属性存储',
        implications: ['灵活的模板应用', '需要额外的模板引擎'],
        cost: 'medium',
        complexity: 'moderate',
      },
      {
        id: 'opt-2-3',
        label: '模板与图分离，通过 ID 关联',
        implications: ['清晰的关注点分离', '增加数据模型复杂度'],
        cost: 'medium',
        complexity: 'moderate',
      },
    ],
    status: 'pending' as const,
  },
  {
    id: 'q-spec-003',
    question: '工作流引擎的状态机如何与 Brainstorm 状态机协调？',
    hint: '两个状态机的同步策略',
    options: [
      {
        id: 'opt-3-1',
        label: '统一状态机，合并两个状态空间',
        implications: ['单一状态源', '状态转换复杂度增加'],
        cost: 'high',
        complexity: 'complex',
      },
      {
        id: 'opt-3-2',
        label: '事件驱动的松耦合同步',
        implications: ['灵活的状态管理', '需要事件总线基础设施'],
        cost: 'medium',
        complexity: 'moderate',
      },
      {
        id: 'opt-3-3',
        label: '分层状态机，工作流在上层',
        implications: ['清晰的层次关系', 'Brainstorm 可能被过度抽象'],
        cost: 'low',
        complexity: 'moderate',
      },
    ],
    status: 'pending' as const,
  },
];

// ==================== 主组件 ====================

const App: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [activeTab, setActiveTab] = useState<'graph' | 'analysis' | 'brainstorm'>('graph');
  const [selectedNode, setSelectedNode] = useState<SpecKitNode | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, string[]>>({});

  // 初始化节点和边
  useEffect(() => {
    const initialNodes: RFNode[] = SPEC_KIT_DATA.nodes.map((node, index) => ({
      id: node.id,
      type: 'custom',
      position: {
        x: getNodeXPosition(node.layer),
        y: 80 + (index % 4) * 100,
      },
      data: {
        label: `${LAYER_CONFIG[node.layer].icon} ${node.title}`,
        layer: node.layer,
      },
    }));

    const initialEdges: RFEdge[] = SPEC_KIT_DATA.edges.map((edge, index) => ({
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: edge.label,
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      style: {
        stroke: EDGE_TYPE_CONFIG[edge.type].color,
        strokeWidth: 2,
        strokeDasharray: EDGE_TYPE_CONFIG[edge.type].dash.join(' ') || undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_TYPE_CONFIG[edge.type].color,
      },
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]);

  const getNodeXPosition = (layer: LayerType): number => {
    switch (layer) {
      case 'L1_Constitution': return 50;
      case 'L2_TechStack': return 220;
      case 'L3_Epic': return 390;
      case 'L4_Story': return 560;
      case 'L5_Task': return 730;
      default: return 50;
    }
  };

  const getNodeData = useCallback((nodeId: string): SpecKitNode | undefined => {
    return SPEC_KIT_DATA.nodes.find(n => n.id === nodeId);
  }, []);

  const handleNodeClick = (_: any, node: RFNode) => {
    const nodeData = getNodeData(node.id);
    if (nodeData) {
      setSelectedNode(nodeData);
    }
  };

  const handleEdgeClick = (_: any, edge: RFEdge) => {
    const edgeIndex = edge.id.replace('edge-', '');
    const specEdge = SPEC_KIT_DATA.edges[parseInt(edgeIndex, 10)];
    if (specEdge) {
      alert(`边信息:\n类型: ${specEdge.type}\n描述: ${edge.label}`);
    }
  };

  const handleConnection = (params: Connection) => {
    const newEdge = {
      ...params,
      type: 'smoothstep' as const,
      style: { stroke: '#6b7280', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  };

  const handleAnswerQuestion = (questionId: string, optionId: string) => {
    setAnsweredQuestions(prev => ({
      ...prev,
      [questionId]: [optionId],
    }));
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const getCurrentQuestion = () => {
    return CLARIFICATION_QUESTIONS[currentQuestionIndex];
  };

  // 统计信息
  const stats = useMemo(() => {
    const layerCounts = {
      L1: SPEC_KIT_DATA.nodes.filter(n => n.layer === 'L1_Constitution').length,
      L2: SPEC_KIT_DATA.nodes.filter(n => n.layer === 'L2_TechStack').length,
      L3: SPEC_KIT_DATA.nodes.filter(n => n.layer === 'L3_Epic').length,
      L4: SPEC_KIT_DATA.nodes.filter(n => n.layer === 'L4_Story').length,
      L5: SPEC_KIT_DATA.nodes.filter(n => n.layer === 'L5_Task').length,
    };
    return {
      totalNodes: SPEC_KIT_DATA.nodes.length,
      totalEdges: SPEC_KIT_DATA.edges.length,
      layerCounts,
    };
  }, []);

  return (
    <div className="app-container">
      {/* 顶部导航 */}
      <div className="top-nav">
        <div className="nav-brand">
          <span className="logo">📊</span>
          <div>
            <h1>Graph-Driven Development</h1>
            <p>用图驱动的方式分析 GitHub Spec Kit</p>
          </div>
        </div>
        
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            🕸️ 架构图谱
          </button>
          <button
            className={`nav-tab ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            📊 项目分析
          </button>
          <button
            className={`nav-tab ${activeTab === 'brainstorm' ? 'active' : ''}`}
            onClick={() => setActiveTab('brainstorm')}
          >
            💡 Brainstorm
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="main-content">
        {/* 左侧工具栏 */}
        <div className="left-toolbar">
          <div className="toolbar-section">
            <h3>📚 层级图例</h3>
            {Object.entries(LAYER_CONFIG).map(([layer, config]) => (
              <div key={layer} className="layer-legend-item">
                <div
                  className="legend-color"
                  style={{ background: config.bgGradient, border: `2px solid ${config.color}` }}
                />
                <div>
                  <div className="legend-icon">{config.icon}</div>
                  <div className="legend-label">{config.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="toolbar-section">
            <h3>🔗 边类型</h3>
            {Object.entries(EDGE_TYPE_CONFIG).map(([type, config]) => (
              <div key={type} className="edge-legend-item">
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

          <div className="toolbar-section">
            <h3>📈 统计</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.totalNodes}</span>
                <span className="stat-label">节点</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalEdges}</span>
                <span className="stat-label">连接</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">5</span>
                <span className="stat-label">层级</span>
              </div>
            </div>
            <div className="layer-stats">
              {Object.entries(stats.layerCounts).map(([layer, count]) => (
                <div key={layer} className="layer-stat">
                  <span className="layer-stat-icon">{LAYER_CONFIG[layer as LayerType].icon}</span>
                  <span className="layer-stat-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间画布 */}
        <div className="graph-canvas">
          {activeTab === 'graph' && (
            <div className="react-flow-wrapper">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onConnect={handleConnection}
                nodeTypes={{ custom: GraphNodeComponent as any }}
                fitView
                minZoom={0.3}
                maxZoom={1.5}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                <MiniMap pannable zoomable />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="analysis-view">
              <div className="analysis-header">
                <h2>🔍 Spec Kit 项目分析</h2>
                <p>GitHub 官方的规范驱动开发工具包</p>
              </div>

              <div className="analysis-content">
                <div className="analysis-section">
                  <h3>📌 项目概述</h3>
                  <div className="overview-card">
                    <p>Spec Kit 是一个全面的工具包，用于实施规范驱动开发 (SDD) - 一种强调在实施之前创建清晰规格说明的方法论。</p>
                    <ul>
                      <li><strong>核心理念</strong>: 规格说明是主要产物，代码是规格说明的表达形式</li>
                      <li><strong>支持工具</strong>: Claude Code, Gemini CLI, Copilot, Cursor, Windsurf 等</li>
                      <li><strong>主要命令</strong>: /speckit.specify, /speckit.plan, /speckit.tasks</li>
                    </ul>
                  </div>
                </div>

                <div className="analysis-section">
                  <h3>🏗️ 5 层架构映射</h3>
                  <div className="layer-mapping">
                    <div className="mapping-item">
                      <span className="mapping-icon">📜</span>
                      <div>
                        <strong>L1 项目宪法</strong>
                        <p>规范优先原则、可执行规格说明、持续优化、研究驱动上下文</p>
                      </div>
                    </div>
                    <div className="mapping-item">
                      <span className="mapping-icon">🔧</span>
                      <div>
                        <strong>L2 技术栈</strong>
                        <p>Specify CLI、AI 编码助手集成、工作流引擎、模板系统</p>
                      </div>
                    </div>
                    <div className="mapping-item">
                      <span className="mapping-icon">📋</span>
                      <div>
                        <strong>L3 Epic</strong>
                        <p>/speckit.specify、/speckit.plan、/speckit.tasks、工作流系统</p>
                      </div>
                    </div>
                    <div className="mapping-item">
                      <span className="mapping-icon">📝</span>
                      <div>
                        <strong>L4 Story</strong>
                        <p>产品管理者流程、架构师流程、开发者集成、团队协作管理</p>
                      </div>
                    </div>
                    <div className="mapping-item">
                      <span className="mapping-icon">⚡</span>
                      <div>
                        <strong>L5 Task</strong>
                        <p>初始化项目、创建规格说明、生成实施计划、分解任务、执行生成代码</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="analysis-section">
                  <h3>🔄 工作流对比</h3>
                  <div className="workflow-comparison">
                    <div className="workflow-column">
                      <h4>Spec-Driven Development</h4>
                      <div className="workflow-step">1. 编写规格说明 (Spec)</div>
                      <div className="workflow-arrow">↓</div>
                      <div className="workflow-step">2. 生成实施计划 (Plan)</div>
                      <div className="workflow-arrow">↓</div>
                      <div className="workflow-step">3. 分解任务 (Tasks)</div>
                      <div className="workflow-arrow">↓</div>
                      <div className="workflow-step">4. 生成代码 (Code)</div>
                      <div className="workflow-note">单向流程: Spec → Code</div>
                    </div>
                    <div className="workflow-vs">VS</div>
                    <div className="workflow-column">
                      <h4>Graph-Driven Development</h4>
                      <div className="workflow-step">1. 可视化图谱 (Graph)</div>
                      <div className="workflow-arrow">↓↑</div>
                      <div className="workflow-step">2. 实时双向同步</div>
                      <div className="workflow-arrow">↓↑</div>
                      <div className="workflow-step">3. Agent 交互</div>
                      <div className="workflow-arrow">↓↑</div>
                      <div className="workflow-step">4. 代码生成</div>
                      <div className="workflow-note">双向流程: Agent ↔ Graph ↔ Code</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'brainstorm' && (
            <div className="brainstorm-view">
              <div className="brainstorm-header">
                <h2>💡 需求澄清流程</h2>
                <p>分析 Spec Kit 项目，生成关键澄清问题</p>
              </div>

              {currentQuestionIndex < CLARIFICATION_QUESTIONS.length ? (
                <div className="brainstorm-content">
                  <div className="question-card">
                    <div className="question-header">
                      <span className="question-number">问题 {currentQuestionIndex + 1} / {CLARIFICATION_QUESTIONS.length}</span>
                    </div>
                    <div className="question-body">
                      <h3>{getCurrentQuestion()?.question}</h3>
                      <p className="question-hint">{getCurrentQuestion()?.hint}</p>
                    </div>
                    <div className="options-list">
                      {getCurrentQuestion()?.options.map((option) => (
                        <div
                          key={option.id}
                          className="option-card"
                          onClick={() => handleAnswerQuestion(getCurrentQuestion()!.id, option.id)}
                        >
                          <div className="option-header">
                            <span className="option-letter">{option.id.split('-')[1]}</span>
                            <div className="option-tags">
                              {option.cost && <span className={`tag tag-cost tag-${option.cost}`}>{option.cost}</span>}
                              {option.complexity && <span className={`tag tag-complexity tag-${option.complexity}`}>{option.complexity}</span>}
                            </div>
                          </div>
                          <div className="option-content">
                            <p>{option.label}</p>
                            {option.implications && option.implications.length > 0 && (
                              <ul className="option-implications">
                                {option.implications.map((imp, i) => (
                                  <li key={i}>💡 {imp}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="brainstorm-complete">
                  <h2>🎉 分析完成！</h2>
                  <p>已回答 {CLARIFICATION_QUESTIONS.length} 个澄清问题</p>
                  <div className="answers-summary">
                    {CLARIFICATION_QUESTIONS.map((q) => (
                      <div key={q.id} className="answer-item">
                        <div className="answer-question">{q.question}</div>
                        <div className="answer-selection">
                          {q.options.find(o => o.id === answeredQuestions[q.id]?.[0])?.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="right-panel">
          {selectedNode ? (
            <div className="node-detail-panel">
              <div className="panel-header">
                <span className="panel-icon">{LAYER_CONFIG[selectedNode.layer].icon}</span>
                <h3>{selectedNode.title}</h3>
                <span className="panel-layer">{LAYER_CONFIG[selectedNode.layer].label}</span>
              </div>

              <div className="panel-body">
                <div className="detail-section">
                  <h4>描述</h4>
                  <p>{selectedNode.description}</p>
                </div>

                <div className="detail-section">
                  <h4>来源文件</h4>
                  <code>{selectedNode.sourceFile}</code>
                </div>

                <div className="detail-section">
                  <h4>属性</h4>
                  <div className="properties-list">
                    {Object.entries(selectedNode.properties).map(([key, value]) => (
                      <div key={key} className="property-item">
                        <span className="property-key">{key}:</span>
                        <span className="property-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>相关节点</h4>
                  <div className="related-nodes">
                    {SPEC_KIT_DATA.edges
                      .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((edge, i) => {
                        const otherNode = edge.source === selectedNode.id ? edge.target : edge.source;
                        const otherNodeData = getNodeData(otherNode);
                        return otherNodeData ? (
                          <div key={i} className="related-node">
                            <span className="related-icon">{LAYER_CONFIG[otherNodeData.layer].icon}</span>
                            <span className="related-title">{otherNodeData.title}</span>
                            <span className="related-type">{EDGE_TYPE_CONFIG[edge.type].label}</span>
                          </div>
                        ) : null;
                      })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="welcome-panel">
              <div className="welcome-content">
                <span className="welcome-icon">🎯</span>
                <h2>欢迎使用 Graph-Driven Development</h2>
                <p>这个演示展示了如何用图驱动的方式分析 GitHub Spec Kit 项目。</p>

                <div className="welcome-features">
                  <div className="feature-item">
                    <span className="feature-icon">🕸️</span>
                    <div>
                      <h4>架构图谱</h4>
                      <p>点击左侧 Tab 查看 5 层架构的完整图谱</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🔍</span>
                    <div>
                      <h4>项目分析</h4>
                      <p>了解 Spec Kit 的设计原理和工作流程</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">💡</span>
                    <div>
                      <h4>Brainstorm</h4>
                      <p>体验需求澄清流程，回答关键问题</p>
                    </div>
                  </div>
                </div>

                <div className="welcome-tip">
                  <span className="tip-icon">💡</span>
                  <span>点击图谱中的节点查看详细信息</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">项目:</span>
          <span className="status-value">GitHub Spec Kit</span>
        </div>
        <div className="status-item">
          <span className="status-label">节点:</span>
          <span className="status-value">{stats.totalNodes}</span>
        </div>
        <div className="status-item">
          <span className="status-label">连接:</span>
          <span className="status-value">{stats.totalEdges}</span>
        </div>
        <div className="status-item">
          <span className="status-label">状态:</span>
          <span className="status-value status-ok">已连接</span>
        </div>
      </div>
    </div>
  );
};

export default App;
