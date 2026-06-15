/**
 * Brainstorm Engine 类型定义
 * 
 * 定义 Brainstorm 状态机和澄清流程的核心类型
 */

// ==================== 状态类型 ====================

export type BrainstormState = 
  | 'INIT'           // 初始化
  | 'ANALYZE'        // 分析需求
  | 'CLARIFY'        // 澄清问题
  | 'BUILD'          // 构建图
  | 'GENERATE';      // 生成代码

export type QuestionType = 
  | 'tech_stack'     // 技术栈选择
  | 'architecture'   // 架构决策
  | 'feature_scope'  // 功能范围
  | 'data_model'     // 数据模型
  | 'integration'    // 集成方式
  | 'performance'    // 性能要求
  | 'security'       // 安全要求
  | 'testing'        // 测试策略;

// ==================== 需求分析 ====================

export interface RequirementAnalysis {
  rawInput: string;
  extractedFeatures: string[];
  impliedRequirements: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedNodes: number;
  confidence: number;  // 0-1，需要澄清的程度
  gaps: string[];      // 需要澄清的缺口
}

// ==================== 澄清问题 ====================

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  implications?: string[];  // 选择此选项的影响
  selected?: boolean;
  disabled?: boolean;
  cost?: 'low' | 'medium' | 'high';  // 实现成本
  complexity?: 'simple' | 'moderate' | 'complex';  // 复杂度
  time?: 'short' | 'medium' | 'long';  // 时间
}

export interface ClarificationQuestion {
  id: string;
  nodeId: string;
  type: QuestionType;
  question: string;
  context?: string;           // 为什么需要问这个问题
  options: ClarificationOption[];
  multiSelect?: boolean;
  required?: boolean;
  priority?: 'high' | 'medium' | 'low';
  dependsOn?: string[];      // 依赖其他问题的答案
  status: 'pending' | 'answered' | 'skipped';
  selectedOptions?: string[];
  answeredAt?: number;
}

export interface ClarificationSession {
  sessionId: string;
  graphId: string;
  state: BrainstormState;
  questions: ClarificationQuestion[];
  answers: Record<string, string[]>;  // questionId -> selected option ids
  createdAt: number;
  updatedAt: number;
  currentQuestionIndex: number;
  history: SessionHistoryEntry[];
}

export interface SessionHistoryEntry {
  timestamp: number;
  action: 'question_asked' | 'question_answered' | 'state_changed' | 'node_created' | 'edge_created';
  data: Record<string, unknown>;
}

// ==================== 决策树 ====================

export interface DecisionNode {
  id: string;
  questionType: QuestionType;
  children: string[];  // 子节点 ID
  parent?: string;
  condition?: string;  // 触发条件
}

export interface DecisionTree {
  root: string;
  nodes: Map<string, DecisionNode>;
}

// ==================== Brainstorm 配置 ====================

export interface BrainstormConfig {
  maxQuestionsPerSession: number;
  clarificationThreshold: number;  // 触发澄清的置信度阈值
  autoGenerateOnComplete: boolean;
  parallelClarification: boolean;
  language: 'zh' | 'en';
}

export const DEFAULT_BRAINSTORM_CONFIG: BrainstormConfig = {
  maxQuestionsPerSession: 20,
  clarificationThreshold: 0.7,
  autoGenerateOnComplete: false,
  parallelClarification: false,
  language: 'zh'
};

// ==================== 事件类型 ====================

export type BrainstormEventType =
  | 'session:start'
  | 'state:change'
  | 'question:ask'
  | 'question:answer'
  | 'question:skip'
  | 'clarification:complete'
  | 'graph:update'
  | 'error';

export interface BrainstormEvent {
  type: BrainstormEventType;
  sessionId: string;
  payload: unknown;
  timestamp: number;
}

// ==================== 结果类型 ====================

export interface BrainstormResult {
  success: boolean;
  graph?: GraphData;
  clarifications?: {
    total: number;
    answered: number;
    skipped: number;
  };
  duration: number;
  error?: string;
}

export interface GraphData {
  id: string;
  name: string;
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    layer: string;
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    type: string;
  }>;
}
