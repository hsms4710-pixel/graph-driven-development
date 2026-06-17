/**
 * Node - 图中的节点
 * 
 * V2.0 架构：
 * - L1 Module: 大模块，包含技术栈
 * - L2 SubModule: 子模块
 * - L3 Feature: 跨模块的功能需求
 * - L4 Task: Agent 动态生成的任务
 */

import { LayerType, ModuleNode, FeatureNode, TaskNode, GraphNode } from '../mcp/types';

// 重新导出类型
export type { LayerType, ModuleNode, FeatureNode, TaskNode, GraphNode };

// ==================== 基础节点配置 ====================

export interface BaseNodeConfig {
  id?: string;
  label: string;
  layer: LayerType;
  description?: string;
  status?: ModuleStatus | FeatureStatus | TaskStatus;
  position?: { x: number; y: number };
}

// ==================== 模块节点 ====================

export interface ModuleNodeConfig extends BaseNodeConfig {
  layer: 'L1_Module' | 'L2_SubModule';
  responsibilities?: string[];
  techStack?: {
    languages?: { primary: string; secondary?: string[] };
    frameworks?: { name: string; version?: string }[];
    libraries?: { name: string; version?: string }[];
  };
  codeMapping?: {
    directory?: string;
    entryFile?: string;
  };
}

export class ModuleNode {
  public readonly id: string;
  public label: string;
  public layer: 'L1_Module' | 'L2_SubModule';
  public description?: string;
  public responsibilities: string[];
  public techStack?: ModuleNodeConfig['techStack'];
  public codeMapping?: ModuleNodeConfig['codeMapping'];
  public status: ModuleStatus;
  public position: { x: number; y: number };
  public metadata: Record<string, any>;
  public createdAt: number;
  public updatedAt: number;
  
  constructor(config: ModuleNodeConfig) {
    this.id = config.id || this.generateId();
    this.label = config.label;
    this.layer = config.layer;
    this.description = config.description;
    this.responsibilities = config.responsibilities || [];
    this.techStack = config.techStack;
    this.codeMapping = config.codeMapping;
    this.status = config.status || 'planning';
    this.position = config.position || { x: 0, y: 0 };
    this.metadata = {};
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }
  
  /**
   * 更新技术栈
   */
  updateTechStack(techStack: ModuleNodeConfig['techStack']): void {
    this.techStack = techStack;
    this.updatedAt = Date.now();
  }
  
  /**
   * 添加职责
   */
  addResponsibility(responsibility: string): void {
    if (!this.responsibilities.includes(responsibility)) {
      this.responsibilities.push(responsibility);
    }
    this.updatedAt = Date.now();
  }
  
  /**
   * 设置代码映射
   */
  setCodeMapping(mapping: ModuleNodeConfig['codeMapping']): void {
    this.codeMapping = mapping;
    this.updatedAt = Date.now();
  }
  
  /**
   * 更新状态
   */
  setStatus(status: ModuleStatus): void {
    this.status = status;
    this.updatedAt = Date.now();
  }
  
  /**
   * 序列化
   */
  toJSON(): ModuleNode {
    return {
      id: this.id,
      label: this.label,
      layer: this.layer,
      description: this.description,
      responsibilities: this.responsibilities,
      techStack: this.techStack,
      codeMapping: this.codeMapping,
      status: this.status,
      position: this.position,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * 反序列化
   */
  static fromJSON(data: any): ModuleNode {
    const node = new ModuleNode({
      id: data.id,
      label: data.label,
      layer: data.layer,
      description: data.description,
      responsibilities: data.responsibilities,
      techStack: data.techStack,
      codeMapping: data.codeMapping,
      position: data.position
    });
    node.status = data.status || 'planning';
    node.metadata = data.metadata || {};
    node.createdAt = data.createdAt || Date.now();
    node.updatedAt = data.updatedAt || Date.now();
    return node;
  }
  
  private generateId(): string {
    return `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 功能节点 ====================

export interface FeatureNodeConfig extends BaseNodeConfig {
  layer: 'L3_Feature';
  userStory?: {
    asA: string;
    iWant: string;
    soThat: string;
  };
  acceptanceCriteria?: string[];
  relatedModules?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export class FeatureNode {
  public readonly id: string;
  public label: string;
  public layer = 'L3_Feature' as const;
  public description?: string;
  public userStory?: FeatureNodeConfig['userStory'];
  public acceptanceCriteria: string[];
  public relatedModules: string[];
  public priority: 'low' | 'medium' | 'high' | 'critical';
  public status: FeatureStatus;
  public estimate?: { points?: number; hours?: number };
  public position: { x: number; y: number };
  public metadata: Record<string, any>;
  public createdAt: number;
  public updatedAt: number;
  
  constructor(config: FeatureNodeConfig) {
    this.id = config.id || this.generateId();
    this.label = config.label;
    this.description = config.description;
    this.userStory = config.userStory;
    this.acceptanceCriteria = config.acceptanceCriteria || [];
    this.relatedModules = config.relatedModules || [];
    this.priority = config.priority || 'medium';
    this.status = config.status || 'backlog';
    this.estimate = config.estimate;
    this.position = config.position || { x: 0, y: 0 };
    this.metadata = {};
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }
  
  /**
   * 添加关联模块
   */
  addRelatedModule(moduleId: string): void {
    if (!this.relatedModules.includes(moduleId)) {
      this.relatedModules.push(moduleId);
    }
    this.updatedAt = Date.now();
  }
  
  /**
   * 添加验收标准
   */
  addAcceptanceCriterion(criterion: string): void {
    if (!this.acceptanceCriteria.includes(criterion)) {
      this.acceptanceCriteria.push(criterion);
    }
    this.updatedAt = Date.now();
  }
  
  /**
   * 更新状态
   */
  setStatus(status: FeatureStatus): void {
    this.status = status;
    this.updatedAt = Date.now();
  }
  
  /**
   * 序列化
   */
  toJSON(): FeatureNode {
    return {
      id: this.id,
      label: this.label,
      layer: this.layer,
      description: this.description,
      userStory: this.userStory,
      acceptanceCriteria: this.acceptanceCriteria,
      relatedModules: this.relatedModules,
      priority: this.priority,
      status: this.status,
      estimate: this.estimate,
      position: this.position,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * 反序列化
   */
  static fromJSON(data: any): FeatureNode {
    const node = new FeatureNode({
      id: data.id,
      label: data.label,
      description: data.description,
      userStory: data.userStory,
      acceptanceCriteria: data.acceptanceCriteria,
      relatedModules: data.relatedModules,
      priority: data.priority,
      position: data.position
    });
    node.status = data.status || 'backlog';
    node.estimate = data.estimate;
    node.metadata = data.metadata || {};
    node.createdAt = data.createdAt || Date.now();
    node.updatedAt = data.updatedAt || Date.now();
    return node;
  }
  
  private generateId(): string {
    return `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 任务节点 ====================

export interface TaskNodeConfig extends BaseNodeConfig {
  layer: 'L4_Task';
  moduleId: string;
  featureId?: string;
  type: TaskType;
  priority?: 'low' | 'medium' | 'high';
  agent?: { name: string; sessionId?: string };
}

export class TaskNode {
  public readonly id: string;
  public label: string;
  public layer = 'L4_Task' as const;
  public description?: string;
  public moduleId: string;
  public featureId?: string;
  public type: TaskType;
  public priority: 'low' | 'medium' | 'high';
  public status: TaskStatus;
  public agent?: { name: string; sessionId?: string };
  public codeMapping?: {
    file?: string;
    function?: string;
    lineStart?: number;
    lineEnd?: number;
  };
  public execution?: {
    startedAt?: number;
    completedAt?: number;
    duration?: number;
    retryCount?: number;
    error?: string;
  };
  public position: { x: number; y: number };
  public metadata: Record<string, any>;
  public createdAt: number;
  public updatedAt: number;
  
  constructor(config: TaskNodeConfig) {
    this.id = config.id || this.generateId();
    this.label = config.label;
    this.description = config.description;
    this.moduleId = config.moduleId;
    this.featureId = config.featureId;
    this.type = config.type;
    this.priority = config.priority || 'medium';
    this.status = config.status || 'pending';
    this.agent = config.agent;
    this.codeMapping = config.codeMapping;
    this.execution = config.execution;
    this.position = config.position || { x: 0, y: 0 };
    this.metadata = {};
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }
  
  /**
   * 开始执行
   */
  start(): void {
    this.status = 'in_progress';
    this.execution = {
      ...this.execution,
      startedAt: Date.now()
    };
    this.updatedAt = Date.now();
  }
  
  /**
   * 完成执行
   */
  complete(): void {
    this.status = 'done';
    const now = Date.now();
    this.execution = {
      ...this.execution,
      completedAt: now,
      duration: this.execution?.startedAt ? now - this.execution.startedAt : undefined
    };
    this.updatedAt = now;
  }
  
  /**
   * 标记失败
   */
  fail(error: string): void {
    this.status = 'failed';
    this.execution = {
      ...this.execution,
      error,
      retryCount: (this.execution?.retryCount || 0) + 1
    };
    this.updatedAt = Date.now();
  }
  
  /**
   * 更新状态
   */
  setStatus(status: TaskStatus): void {
    this.status = status;
    this.updatedAt = Date.now();
  }
  
  /**
   * 设置代码映射
   */
  setCodeMapping(mapping: TaskNode['codeMapping']): void {
    this.codeMapping = mapping;
    this.updatedAt = Date.now();
  }
  
  /**
   * 序列化
   */
  toJSON(): TaskNode {
    return {
      id: this.id,
      label: this.label,
      layer: this.layer,
      description: this.description,
      moduleId: this.moduleId,
      featureId: this.featureId,
      type: this.type,
      priority: this.priority,
      status: this.status,
      agent: this.agent,
      codeMapping: this.codeMapping,
      execution: this.execution,
      position: this.position,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * 反序列化
   */
  static fromJSON(data: any): TaskNode {
    const node = new TaskNode({
      id: data.id,
      label: data.label,
      description: data.description,
      moduleId: data.moduleId,
      featureId: data.featureId,
      type: data.type,
      priority: data.priority,
      agent: data.agent,
      position: data.position
    });
    node.status = data.status || 'pending';
    node.codeMapping = data.codeMapping;
    node.execution = data.execution;
    node.metadata = data.metadata || {};
    node.createdAt = data.createdAt || Date.now();
    node.updatedAt = data.updatedAt || Date.now();
    return node;
  }
  
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 导出 ====================

export { ModuleStatus, FeatureStatus, TaskStatus, TaskType } from '../mcp/types';
