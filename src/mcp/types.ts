/**
 * MCP Server 类型定义
 * 
 * 定义 Agent 与 Graph 交互的标准接口
 */

// ==================== 基础类型 ====================

export type LayerType = 
  | 'L1_Constitution'    // 项目宪法/原则
  | 'L2_TechStack'       // 技术栈
  | 'L3_Epic'            // 史诗/大型功能
  | 'L4_Story'           // 故事/模块
  | 'L5_Task';           // 任务/文件

export interface NodeData {
  id: string;
  label: string;
  layer: LayerType;
  type: string;
  properties: Record<string, unknown>;
  position?: { x: number; y: number };
  status?: 'pending' | 'clarifying' | 'ready' | 'generating' | 'done' | 'error';
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  type: string;
  label?: string;
  weight?: number;
}

export interface GraphData {
  id: string;
  name: string;
  description?: string;
  nodes: NodeData[];
  edges: EdgeData[];
  metadata?: Record<string, unknown>;
}

// ==================== MCP 工具输入类型 ====================

export interface CreateGraphInput {
  name: string;
  description?: string;
  initialNodes?: NodeData[];
  initialEdges?: EdgeData[];
}

export interface LoadGraphInput {
  graphId: string;
  includeDeleted?: boolean;
}

export interface ExportGraphInput {
  graphId: string;
  format?: 'json' | 'graphml' | 'markdown';
}

export interface AddNodeInput {
  graphId: string;
  node: NodeData;
  parentId?: string;
  afterNodeId?: string;
}

export interface UpdateNodeInput {
  graphId: string;
  nodeId: string;
  updates: Partial<NodeData>;
}

export interface DeleteNodeInput {
  graphId: string;
  nodeId: string;
  cascade?: boolean;  // 是否级联删除子节点
}

export interface AddEdgeInput {
  graphId: string;
  edge: EdgeData;
}

export interface AddOptionsInput {
  graphId: string;
  nodeId: string;
  options: ClarificationOption[];
}

export interface GetPendingClarificationsInput {
  graphId: string;
  nodeIds?: string[];
}

export interface TopologicalSortInput {
  graphId: string;
  layer?: LayerType;
  includeDependencies?: boolean;
}

// ==================== 澄清系统类型 ====================

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  implications?: string[];  // 选择此选项的影响
  selected?: boolean;
  disabled?: boolean;
  cost?: 'low' | 'medium' | 'high';  // 成本
  complexity?: 'simple' | 'moderate' | 'complex';  // 复杂度
  time?: 'short' | 'medium' | 'long';  // 时间
}

export interface ClarificationQuestion {
  id: string;
  nodeId: string;
  question: string;
  options: ClarificationOption[];
  multiSelect?: boolean;
  context?: string;  // 为什么需要问这个问题
  status: 'pending' | 'answered' | 'skipped';
}

export interface ClarificationSession {
  graphId: string;
  sessionId: string;
  questions: ClarificationQuestion[];
  createdAt: number;
  updatedAt: number;
}

// ==================== MCP 工具输出类型 ====================

export interface MCPToolOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    duration?: number;
    cached?: boolean;
  };
}

export interface CreateGraphOutput {
  graph: GraphData;
}

export interface LoadGraphOutput {
  graph: GraphData;
  version: string;
}

export interface ExportGraphOutput {
  content: string;
  format: string;
}

export interface AddNodeOutput {
  node: NodeData;
  edges: EdgeData[];  // 自动创建的边
}

export interface UpdateNodeOutput {
  node: NodeData;
  changes: string[];  // 变更的字段
}

export interface DeleteNodeOutput {
  deletedNodeId: string;
  deletedEdges: string[];  // 删除的边 ID
  cascadeDeleted?: string[];  // 级联删除的节点 ID
}

export interface AddEdgeOutput {
  edge: EdgeData;
}

export interface AddOptionsOutput {
  nodeId: string;
  options: ClarificationOption[];
  requiresClarification: boolean;
}

export interface GetPendingClarificationsOutput {
  questions: ClarificationQuestion[];
  total: number;
  answered: number;
  remaining: number;
}

export interface TopologicalSortOutput {
  layers: NodeData[][];  // 按层分组
  flatOrder: string[];   // 节点 ID 的拓扑顺序
  parallelizableLayers: number;  // 可并行的层数
  totalNodes: number;
}

// ==================== 事件类型 ====================

export type GraphEventType =
  | 'node:add'
  | 'node:update'
  | 'node:delete'
  | 'edge:add'
  | 'edge:delete'
  | 'graph:update'
  | 'clarification:request'
  | 'clarification:answer'
  | 'generation:start'
  | 'generation:progress'
  | 'generation:complete';

export interface GraphEvent {
  type: GraphEventType;
  graphId: string;
  payload: unknown;
  timestamp: number;
}

// ==================== MCP Server 配置 ====================

export interface MCPServerConfig {
  name: string;
  version: string;
  port?: number;
  host?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      items?: { type: string };
    }>;
    required: string[];
  };
}
