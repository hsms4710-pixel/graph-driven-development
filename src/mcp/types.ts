/**
 * MCP Server 类型定义 V2.0
 * 
 * 重新设计的图谱架构：
 * - Context (背景设定) - 不是节点，是全局上下文
 * - L1 Module (大模块) - 包含技术栈信息
 * - L2 SubModule (子模块) - 细分功能
 * - L3 Feature (功能需求) - 跨模块的用户故事
 * - L4 Task (任务) - Agent 动态生成，挂载在模块上
 */

// ==================== 核心概念 ====================

/**
 * 项目上下文 - 不是节点，是全局背景设定
 * 包含项目的目标、约束、原则、业务领域等
 */
export interface ProjectContext {
  id: string;
  name: string;
  description?: string;
  
  // 项目目标和原则
  goals: string[];
  principles: string[];
  constraints: string[];
  
  // 业务领域
  domain: {
    industry?: string;
    targetUsers?: string[];
    useCases?: string[];
  };
  
  // 全局配置
  globalConfig?: {
    defaultLanguage?: string;
    defaultFramework?: string;
    codingStandards?: string[];
  };
  
  createdAt: number;
  updatedAt: number;
}

// ==================== 节点层级类型 ====================

export type LayerType = 
  | 'L1_Module'       // 大模块
  | 'L2_SubModule'    // 子模块
  | 'L3_Feature'      // 功能需求
  | 'L4_Task';        // 任务

// ==================== 技术栈信息 ====================

/**
 * 技术栈配置 - 作为模块的属性，而非独立层级
 */
export interface TechStack {
  // 语言
  languages: {
    primary: string;
    secondary?: string[];
  };
  
  // 框架
  frameworks: {
    name: string;
    version?: string;
    purpose?: string;
  }[];
  
  // 库
  libraries: {
    name: string;
    version?: string;
    purpose?: string;
  }[];
  
  // 构建工具
  buildTools?: {
    name: string;
    config?: string;
  }[];
  
  // 运行时
  runtime?: {
    name: string;
    version?: string;
  };
}

// ==================== 模块节点 ====================

/**
 * 模块节点 - L1 和 L2 层级共用
 */
export interface ModuleNode {
  id: string;
  label: string;
  layer: 'L1_Module' | 'L2_SubModule';
  
  // 模块描述
  description?: string;
  responsibilities: string[];  // 职责列表
  
  // 技术栈 - 模块的核心属性
  techStack?: TechStack;
  
  // 代码映射
  codeMapping?: {
    directory?: string;
    entryFile?: string;
    files?: string[];
  };
  
  // 状态
  status: ModuleStatus;
  
  // 元数据
  metadata?: Record<string, unknown>;
  
  createdAt: number;
  updatedAt: number;
}

export type ModuleStatus = 
  | 'planning'     // 规划中
  | 'clarifying'   // 澄清中
  | 'ready'        // 就绪
  | 'in_progress'  // 开发中
  | 'done'         // 完成
  | 'blocked';     // 阻塞

// ==================== 功能需求节点 ====================

/**
 * 功能需求 - L3 层级
 * 跨模块的用户故事，关联到多个模块
 */
export interface FeatureNode {
  id: string;
  label: string;
  layer: 'L3_Feature';
  
  // 用户故事
  userStory: {
    asA: string;      // 作为...
    iWant: string;    // 我想要...
    soThat: string;   // 以便...
  };
  
  // 描述
  description?: string;
  acceptanceCriteria: string[];  // 验收标准
  
  // 关联模块 - 多对多关系
  relatedModules: string[];  // 模块 ID 列表
  
  // 优先级
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // 状态
  status: FeatureStatus;
  
  // 预估
  estimate?: {
    points?: number;
    hours?: number;
  };
  
  metadata?: Record<string, unknown>;
  
  createdAt: number;
  updatedAt: number;
}

export type FeatureStatus = 
  | 'backlog'       // 待规划
  | 'analyzing'     // 分析中
  | 'ready'         // 就绪
  | 'in_progress'   // 开发中
  | 'testing'       // 测试中
  | 'done'          // 完成
  | 'cancelled';    // 取消

// ==================== 任务节点 ====================

/**
 * 任务节点 - L4 层级
 * Agent 动态生成，挂载在模块上
 */
export interface TaskNode {
  id: string;
  label: string;
  layer: 'L4_Task';
  
  // 任务描述
  description?: string;
  
  // 所属模块 - 挂载关系
  moduleId: string;  // 挂载的模块 ID
  
  // 关联功能（可选）
  featureId?: string;
  
  // 任务类型
  type: TaskType;
  
  // 优先级
  priority: 'low' | 'medium' | 'high';
  
  // 状态
  status: TaskStatus;
  
  // Agent 信息
  agent?: {
    name: string;
    sessionId?: string;
  };
  
  // 代码映射
  codeMapping?: {
    file?: string;
    function?: string;
    lineStart?: number;
    lineEnd?: number;
  };
  
  // 执行信息
  execution?: {
    startedAt?: number;
    completedAt?: number;
    duration?: number;
    retryCount?: number;
    error?: string;
  };
  
  metadata?: Record<string, unknown>;
  
  createdAt: number;
  updatedAt: number;
}

export type TaskType = 
  | 'create_file'       // 创建文件
  | 'modify_file'       // 修改文件
  | 'delete_file'       // 删除文件
  | 'refactor'          // 重构
  | 'test'              // 测试
  | 'doc'               // 文档
  | 'config'            // 配置
  | 'deploy'            // 部署
  | 'review'            // 代码审查
  | 'analyze';          // 分析

export type TaskStatus = 
  | 'pending'           // 待处理
  | 'queued'            // 已排队
  | 'in_progress'       // 进行中
  | 'blocked'           // 阻塞
  | 'done'              // 完成
  | 'failed'            // 失败
  | 'cancelled';        // 取消

// ==================== 通用节点类型 ====================

/**
 * 图谱节点 - 统一接口
 */
export type GraphNode = ModuleNode | FeatureNode | TaskNode;

/**
 * 获取节点类型
 */
export type NodeKind = 
  | 'Module'
  | 'SubModule'
  | 'Feature'
  | 'Task';

/**
 * 从节点获取种类
 */
export function getNodeKind(node: GraphNode): NodeKind {
  if (isModuleNode(node)) return node.layer === 'L1_Module' ? 'Module' : 'SubModule';
  if (isFeatureNode(node)) return 'Feature';
  return 'Task';
}

/**
 * 类型守卫
 */
export function isModuleNode(node: GraphNode): node is ModuleNode {
  return node.layer === 'L1_Module' || node.layer === 'L2_SubModule';
}

export function isFeatureNode(node: GraphNode): node is FeatureNode {
  return node.layer === 'L3_Feature';
}

export function isTaskNode(node: GraphNode): node is TaskNode {
  return node.layer === 'L4_Task';
}

// ==================== 边定义 ====================

export type EdgeType = 
  | 'contains'          // 包含关系 (Module -> SubModule)
  | 'implements'        // 实现关系 (Task -> Feature)
  | 'requires'          // 依赖关系 (Module -> Module)
  | 'related_to'        // 关联关系 (Feature -> Module)
  | 'blocks'            // 阻塞关系 (Task -> Task)
  | 'derived_from'      // 派生关系 (Task -> Task)
  | 'references';       // 引用关系

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

// ==================== 图谱数据 ====================

export interface GraphData {
  id: string;
  name: string;
  description?: string;
  
  // 全局上下文 - 不是节点
  context: ProjectContext;
  
  // 节点
  nodes: GraphNode[];
  
  // 边
  edges: EdgeData[];
  
  // 元数据
  metadata?: Record<string, unknown>;
  
  // 版本
  version: string;
  
  createdAt: number;
  updatedAt: number;
}

// ==================== MCP 工具输入类型 ====================

export interface CreateGraphInput {
  name: string;
  description?: string;
  context: Partial<ProjectContext>;
  initialModules?: Partial<ModuleNode>[];
  initialFeatures?: Partial<FeatureNode>[];
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
  node: Partial<GraphNode>;
  parentId?: string;
  afterNodeId?: string;
}

export interface UpdateNodeInput {
  graphId: string;
  nodeId: string;
  updates: Partial<GraphNode>;
}

export interface DeleteNodeInput {
  graphId: string;
  nodeId: string;
  cascade?: boolean;
}

export interface AddEdgeInput {
  graphId: string;
  edge: Partial<EdgeData>;
}

export interface UpdateContextInput {
  graphId: string;
  updates: Partial<ProjectContext>;
}

// ==================== 澄清系统类型 ====================

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  implications?: string[];
  selected?: boolean;
  disabled?: boolean;
  cost?: 'low' | 'medium' | 'high';
  complexity?: 'simple' | 'moderate' | 'complex';
  time?: 'short' | 'medium' | 'long';
}

export interface ClarificationQuestion {
  id: string;
  nodeId: string;
  question: string;
  options: ClarificationOption[];
  multiSelect?: boolean;
  context?: string;
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
  node: GraphNode;
  edges: EdgeData[];
}

export interface UpdateNodeOutput {
  node: GraphNode;
  changes: string[];
}

export interface DeleteNodeOutput {
  deletedNodeId: string;
  deletedEdges: string[];
  cascadeDeleted?: string[];
}

export interface AddEdgeOutput {
  edge: EdgeData;
}

export interface UpdateContextOutput {
  context: ProjectContext;
  changes: string[];
}

// ==================== 任务生成接口 ====================

/**
 * Agent 任务生成请求
 */
export interface TaskGenerationRequest {
  graphId: string;
  featureIds?: string[];  // 基于哪些功能生成任务
  moduleId?: string;      // 指定模块
  strategy?: 'top_down' | 'bottom_up' | 'dependency_first';
}

/**
 * Agent 任务生成结果
 */
export interface TaskGenerationResult {
  tasks: TaskNode[];
  dependencies: EdgeData[];
  summary: {
    total: number;
    byType: Record<TaskType, number>;
    byStatus: Record<TaskStatus, number>;
    criticalPath?: string[];  // 关键路径
  };
}

// ==================== 事件类型 ====================

export type GraphEventType =
  | 'context:update'
  | 'node:add'
  | 'node:update'
  | 'node:delete'
  | 'edge:add'
  | 'edge:delete'
  | 'graph:update'
  | 'clarification:request'
  | 'clarification:answer'
  | 'task:generated'
  | 'task:started'
  | 'task:progress'
  | 'task:completed'
  | 'task:failed';

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
