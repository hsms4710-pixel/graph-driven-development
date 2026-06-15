/**
 * Brainstorm Engine - Brainstorm 状态机核心
 * 
 * 管理从需求分析到代码生成的完整流程
 */

import { 
  BrainstormState, 
  BrainstormConfig, 
  DEFAULT_BRAINSTORM_CONFIG,
  ClarificationSession,
  ClarificationQuestion,
  RequirementAnalysis,
  BrainstormEvent,
  BrainstormEventType,
} from './types';
import { NodeData } from '../mcp/types';
import { QuestionGenerator } from './QuestionGenerator';
import { graphStore } from '../mcp/GraphStore';

export class BrainstormEngine {
  private config: BrainstormConfig;
  private sessions: Map<string, ClarificationSession> = new Map();
  private eventListeners: Map<BrainstormEventType, ((event: BrainstormEvent) => void)[]> = new Map();
  
  constructor(config?: Partial<BrainstormConfig>) {
    this.config = { ...DEFAULT_BRAINSTORM_CONFIG, ...config };
  }
  
  // ==================== 会话管理 ====================
  
  /**
   * 开始新的 Brainstorm 会话
   */
  startSession(userInput: string, graphId?: string): ClarificationSession {
    const sessionId = `bs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const existingGraphId = graphId || this.createGraphForSession(sessionId, userInput);
    
    // 分析用户需求
    const analysis = this.analyzeRequirements(userInput);
    
    // 生成澄清问题
    const questions = QuestionGenerator.generateQuestions(analysis);
    
    const session: ClarificationSession = {
      sessionId,
      graphId: existingGraphId,
      state: 'INIT' as BrainstormState,
      questions,
      answers: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentQuestionIndex: 0,
      history: [
        {
          timestamp: Date.now(),
          action: 'state_changed' as any,
          data: { userInput, analysis }
        }
      ]
    };
    
    this.sessions.set(sessionId, session);
    
    // 发送事件
    this.emit({
      type: 'session:start' as any,
      sessionId,
      payload: { session },
      timestamp: Date.now()
    });
    
    // 进入分析状态
    this.transitionState(sessionId, 'ANALYZE' as BrainstormState);
    
    return session;
  }
  
  /**
   * 获取会话
   */
  getSession(sessionId: string): ClarificationSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * 结束会话
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    // 如果配置了自动生成，触发代码生成
    if (this.config.autoGenerateOnComplete) {
      this.generateCode(sessionId);
    }
    
    this.sessions.delete(sessionId);
    return true;
  }
  
  // ==================== 状态转换 ====================
  
  /**
   * 状态转换
   */
  private transitionState(sessionId: string, newState: BrainstormState): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const oldState = session.state;
    session.state = newState;
    session.updatedAt = Date.now();
    
    // 发送状态变更事件
    this.emit({
      type: 'state:change',
      sessionId,
      payload: { from: oldState, to: newState },
      timestamp: Date.now()
    });
  }
  
  /**
   * 获取当前状态
   */
  getState(sessionId: string): BrainstormState | undefined {
    return this.sessions.get(sessionId)?.state;
  }
  
  // ==================== 澄清流程 ====================
  
  /**
   * 获取下一个待回答的问题
   */
  getNextQuestion(sessionId: string): ClarificationQuestion | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    // 找到下一个未回答且依赖已满足的问题
    for (let i = session.currentQuestionIndex; i < session.questions.length; i++) {
      const question = session.questions[i];
      
      if (question.status !== 'pending') continue;
      
      // 检查依赖是否已满足
      if (this.areDependenciesMet(question, session.answers)) {
        return question;
      }
    }
    
    return undefined;
  }
  
  /**
   * 回答问题
   */
  answerQuestion(sessionId: string, questionId: string, selectedOptionIds: string[]): {
    success: boolean;
    question?: ClarificationQuestion;
    nextAction?: 'continue' | 'build_graph' | 'complete';
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      return { success: false, error: 'Question not found' };
    }
    
    if (question.status !== 'pending') {
      return { success: false, error: 'Question already answered' };
    }
    
    // 验证选择
    if (!this.validateSelection(question, selectedOptionIds)) {
      return { 
        success: false, 
        error: 'Invalid selection. Please select at least one valid option.' 
      };
    }
    
    // 更新问题状态
    question.status = 'answered';
    question.selectedOptions = selectedOptionIds;
    question.answeredAt = Date.now();
    
    // 保存答案
    session.answers[questionId] = selectedOptionIds;
    session.updatedAt = Date.now();
    
    // 记录历史
    session.history.push({
      timestamp: Date.now(),
      action: 'question_answered',
      data: { questionId, selectedOptionIds }
    });
    
    // 发送事件
    this.emit({
      type: 'question:answer',
      sessionId,
      payload: { question, selectedOptionIds },
      timestamp: Date.now()
    });
    
    // 检查是否所有问题都已回答
    const allAnswered = session.questions.every(
      q => q.status === 'answered' || q.status === 'skipped'
    );
    
    let nextAction: 'continue' | 'build_graph' | 'complete' = 'continue';
    
    if (allAnswered) {
      nextAction = 'build_graph';
      
      // 进入构建状态
      this.transitionState(sessionId, 'BUILD' as BrainstormState);
      
      // 构建图
      this.buildGraphFromAnswers(sessionId);
      
      nextAction = 'complete';
      this.transitionState(sessionId, 'GENERATE' as BrainstormState);
    } else {
      // 移动到下一个问题
      session.currentQuestionIndex++;
    }
    
    return {
      success: true,
      question,
      nextAction
    };
  }
  
  /**
   * 跳过问题
   */
  skipQuestion(sessionId: string, questionId: string): {
    success: boolean;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      return { success: false, error: 'Question not found' };
    }
    
    if (question.required) {
      return { success: false, error: 'Cannot skip required question' };
    }
    
    if (question.status !== 'pending') {
      return { success: false, error: 'Question already answered' };
    }
    
    // 更新状态
    question.status = 'skipped';
    session.updatedAt = Date.now();
    
    // 记录历史
    session.history.push({
      timestamp: Date.now(),
      action: 'state_changed' as any,
      data: { questionId }
    });
    
    // 发送事件
    this.emit({
      type: 'question:skip',
      sessionId,
      payload: { question },
      timestamp: Date.now()
    });
    
    // 移动到下一个问题
    session.currentQuestionIndex++;
    
    return { success: true };
  }
  
  /**
   * 获取所有待回答的问题
   */
  getPendingQuestions(sessionId: string): ClarificationQuestion[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    return session.questions
      .filter(q => q.status === 'pending')
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority!] || 1) - (priorityOrder[b.priority!] || 1);
      });
  }
  
  /**
   * 获取澄清进度
   */
  getProgress(sessionId: string): {
    total: number;
    answered: number;
    skipped: number;
    pending: number;
    percentage: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { total: 0, answered: 0, skipped: 0, pending: 0, percentage: 0 };
    }
    
    const total = session.questions.length;
    const answered = session.questions.filter(q => q.status === 'answered').length;
    const skipped = session.questions.filter(q => q.status === 'skipped').length;
    const pending = total - answered - skipped;
    
    return {
      total,
      answered,
      skipped,
      pending,
      percentage: total > 0 ? Math.round((answered / total) * 100) : 0
    };
  }
  
  // ==================== 图构建 ====================
  
  /**
   * 根据答案构建图
   */
  private buildGraphFromAnswers(sessionId: string): any | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const graphId = session.graphId;
    const graph = graphStore.getGraph(graphId);
    
    if (!graph) return undefined;
    
    // 清空现有节点和边
    graph.nodes = [];
    graph.edges = [];
    
    // 根据答案创建节点
    const nodes = this.createNodesFromAnswers(session);
    const edges = this.createEdgesFromNodes(nodes);
    
    // 更新图
    graph.nodes = nodes;
    graph.edges = edges;
    
    // 发送图更新事件
    this.emit({
      type: 'graph:update',
      sessionId,
      payload: { graphId, nodes, edges },
      timestamp: Date.now()
    });
    
    return {
      id: graphId,
      name: graph.name,
      nodes,
      edges
    };
  }
  
  /**
   * 根据答案创建节点
   */
  private createNodesFromAnswers(session: ClarificationSession): NodeData[] {
    const nodes: NodeData[] = [];
    
    // L1: Constitution - 从测试和安全答案推断
    const constitutionNode: NodeData = {
      id: `node_constitution_${Date.now()}`,
      label: '项目宪法',
      type: 'constitution',
      layer: 'L1_Constitution',
      properties: {
        principles: this.extractPrinciples(session.answers),
        testingStrategy: session.answers.testing?.[0],
        securityLevel: session.answers.security?.[0]
      }
    };
    nodes.push(constitutionNode);
    
    // L2: Tech Stack
    const techStackAnswer = session.answers.tech_stack;
    if (techStackAnswer && techStackAnswer.length > 0) {
      const techStackNode: NodeData = {
        id: `node_techstack_${Date.now()}`,
        label: '技术栈',
        type: 'tech_stack',
        layer: 'L2_TechStack' as any,
        properties: {
          framework: techStackAnswer[0],
          details: this.getTechStackDetails(techStackAnswer[0])
        }
      };
      nodes.push(techStackNode);
    }
    
    // L3: Architecture
    const architectureAnswer = session.answers.architecture;
    if (architectureAnswer && architectureAnswer.length > 0) {
      const architectureNode: NodeData = {
        id: `node_arch_${Date.now()}`,
        label: '架构模式',
        type: 'architecture',
        layer: 'L3_Epic' as any,
        properties: {
          pattern: architectureAnswer[0],
          description: this.getArchitectureDescription(architectureAnswer[0])
        }
      };
      nodes.push(architectureNode);
    }
    
    // L4: Feature Scope
    const featureScopeAnswer = session.answers.feature_scope;
    if (featureScopeAnswer && featureScopeAnswer.length > 0) {
      const scopeNode: NodeData = {
        id: `node_scope_${Date.now()}`,
        label: '功能范围',
        type: 'feature_scope',
        layer: 'L3_Epic' as any,
        properties: {
          scope: featureScopeAnswer[0],
          mvp: featureScopeAnswer[0] === 'minimal'
        }
      };
      nodes.push(scopeNode);
    }
    
    // L5: Data Model
    const dataModelAnswer = session.answers.data_model;
    if (dataModelAnswer && dataModelAnswer.length > 0) {
      const dataModelNode: NodeData = {
        id: `node_data_${Date.now()}`,
        label: '数据存储',
        type: 'data_model',
        layer: 'L4_Story' as any,
        properties: {
          storageType: dataModelAnswer[0],
          details: this.getDataModelDetails(dataModelAnswer[0])
        }
      };
      nodes.push(dataModelNode);
    }
    
    // L5: Integration
    const integrationAnswer = session.answers.integration;
    if (integrationAnswer && integrationAnswer.length > 0) {
      const integrationNode: NodeData = {
        id: `node_integration_${Date.now()}`,
        label: '集成方式',
        type: 'integration',
        layer: 'L4_Story' as any,
        properties: {
          pattern: integrationAnswer[0],
          details: this.getIntegrationDetails(integrationAnswer[0])
        }
      };
      nodes.push(integrationNode);
    }
    
    return nodes;
  }
  
  /**
   * 根据节点创建边
   */
  private createEdgesFromNodes(nodes: Array<{
    id: string;
    label: string;
    type: string;
    layer: string;
    properties: Record<string, unknown>;
  }>): Array<{
    id: string;
    from: string;
    to: string;
    type: string;
  }> {
    const edges: Array<{
      id: string;
      from: string;
      to: string;
      type: string;
    }> = [];
    
    // 定义层级依赖关系
    const layerDependencies: Record<string, string[]> = {
      'L2_TechStack': ['L1_Constitution'],
      'L3_Epic': ['L2_TechStack'],
      'L4_Story': ['L3_Epic'],
      'L5_Task': ['L4_Story']
    };
    
    // 按层级分组节点
    const nodesByLayer = new Map<string, typeof nodes>();
    nodes.forEach(node => {
      if (!nodesByLayer.has(node.layer)) {
        nodesByLayer.set(node.layer, []);
      }
      nodesByLayer.get(node.layer)!.push(node);
    });
    
    // 创建依赖边
    nodes.forEach(node => {
      const dependencies = layerDependencies[node.layer] || [];
      
      dependencies.forEach(depLayer => {
        const depNodes = nodesByLayer.get(depLayer) || [];
        
        if (depNodes.length > 0) {
          // 连接到同层级的第一个节点
          const depNode = depNodes[0];
          edges.push({
            id: `edge_${node.id}_${depNode.id}`,
            from: depNode.id,
            to: node.id,
            type: 'depends_on'
          });
        }
      });
    });
    
    return edges;
  }
  
  // ==================== 代码生成 ====================
  
  /**
   * 生成代码
   */
  generateCode(sessionId: string): {
    success: boolean;
    graph?: any;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    const graph = this.buildGraphFromAnswers(sessionId);
    
    if (!graph) {
      return { success: false, error: 'Failed to build graph' };
    }
    
    // 发送完成事件
    this.emit({
      type: 'clarification:complete',
      sessionId,
      payload: { session, graph },
      timestamp: Date.now()
    });
    
    return { success: true, graph };
  }
  
  // ==================== 事件系统 ====================
  
  /**
   * 添加事件监听器
   */
  on(event: BrainstormEventType, callback: (event: BrainstormEvent) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    
    // 返回取消订阅函数
    return () => {
      const callbacks = this.eventListeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * 发送事件
   */
  private emit(event: BrainstormEvent): void {
    const callbacks = this.eventListeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }
  
  // ==================== 辅助方法 ====================
  
  /**
   * 创建图会话
   */
  private createGraphForSession(sessionId: string, userInput: string): string {
    const graphId = `graph_${sessionId}`;
    
    graphStore.createGraph({
      id: graphId,
      name: this.extractProjectName(userInput),
      description: userInput,
      nodes: [],
      edges: []
    });
    
    return graphId;
  }
  
  /**
   * 分析用户需求
   */
  private analyzeRequirements(userInput: string): RequirementAnalysis {
    // 简单的关键词提取
    const features = this.extractFeatures(userInput);
    const impliedRequirements = this.inferRequirements(features);
    const complexity = this.assessComplexity(features);
    const estimatedNodes = this.estimateNodes(complexity, features.length);
    const confidence = this.calculateConfidence(features);
    const gaps = this.identifyGaps(features, impliedRequirements);
    
    return {
      rawInput: userInput,
      extractedFeatures: features,
      impliedRequirements,
      complexity,
      estimatedNodes,
      confidence,
      gaps
    };
  }
  
  /**
   * 提取功能特性
   */
  private extractFeatures(input: string): string[] {
    // 简单的关键词匹配
    const featureKeywords = [
      '用户', '登录', '注册', '认证', '授权',
      '列表', '搜索', '筛选', '排序', '分页',
      '创建', '编辑', '删除', 'CRUD',
      '上传', '下载', '文件', '图片',
      '支付', '订单', '购物车', '交易',
      '消息', '通知', '推送',
      'API', '接口', '集成',
      '数据库', '存储', '缓存'
    ];
    
    const features: string[] = [];
    const inputLower = input.toLowerCase();
    
    featureKeywords.forEach(keyword => {
      if (inputLower.includes(keyword.toLowerCase())) {
        features.push(keyword);
      }
    });
    
    return [...new Set(features)];
  }
  
  /**
   * 推断隐含需求
   */
  private inferRequirements(features: string[]): string[] {
    const requirements: string[] = [];
    
    if (features.includes('登录') || features.includes('注册')) {
      requirements.push('用户认证系统');
      requirements.push('会话管理');
    }
    
    if (features.includes('列表') || features.includes('搜索')) {
      requirements.push('数据查询优化');
    }
    
    if (features.includes('上传') || features.includes('文件')) {
      requirements.push('文件存储服务');
      requirements.push('文件类型验证');
    }
    
    if (features.includes('支付') || features.includes('订单')) {
      requirements.push('支付网关集成');
      requirements.push('订单状态机');
      requirements.push('对账系统');
    }
    
    return requirements;
  }
  
  /**
   * 评估复杂度
   */
  private assessComplexity(features: string[]): 'simple' | 'moderate' | 'complex' {
    const complexIndicators = ['支付', '订单', '集成', 'API', '消息'];
    const complexCount = features.filter(f => complexIndicators.includes(f)).length;
    
    if (complexCount >= 3 || features.length >= 8) {
      return 'complex';
    }
    
    if (complexCount >= 1 || features.length >= 4) {
      return 'moderate';
    }
    
    return 'simple';
  }
  
  /**
   * 估算节点数
   */
  private estimateNodes(complexity: 'simple' | 'moderate' | 'complex', featureCount: number): number {
    const baseNodes = { simple: 3, moderate: 6, complex: 10 };
    return baseNodes[complexity] + Math.floor(featureCount / 2);
  }
  
  /**
   * 计算置信度
   */
  private calculateConfidence(features: string[]): number {
    // 基础置信度
    let confidence = 0.5;
    
    // 每个明确的特性提高置信度
    features.forEach(() => {
      confidence += 0.05;
    });
    
    return Math.min(confidence, 0.95);
  }
  
  /**
   * 识别缺口
   */
  private identifyGaps(features: string[], requirements: string[]): string[] {
    const gaps: string[] = [];
    
    if (features.some(f => ['支付', '订单'].includes(f)) && !requirements.includes('支付网关集成')) {
      gaps.push('支付方式未指定');
    }
    
    if (features.includes('API') && !requirements.includes('API 设计规范')) {
      gaps.push('API 协议未指定');
    }
    
    if (features.some(f => ['上传', '文件'].includes(f))) {
      gaps.push('文件存储方案未指定');
    }
    
    return gaps;
  }
  
  /**
   * 提取项目名称
   */
  private extractProjectName(input: string): string {
    // 简单的项目名称提取
    const cleaned = input
      .replace(/做(一个|个)?/g, '')
      .replace(/[，。！？]/g, '')
      .trim();
    
    return cleaned.slice(0, 20) || '新项目';
  }
  
  /**
   * 检查依赖是否满足
   */
  private areDependenciesMet(
    question: ClarificationQuestion, 
    answers: Record<string, string[]>
  ): boolean {
    if (!question.dependsOn || question.dependsOn.length === 0) {
      return true;
    }
    
    return question.dependsOn!.every(depId => {
      return answers[depId] !== undefined;
    });
  }
  
  /**
   * 验证选择
   */
  private validateSelection(
    question: ClarificationQuestion,
    selectedIds: string[]
  ): boolean {
    if (selectedIds.length === 0 && question.required) {
      return false;
    }
    
    if (!question.multiSelect && selectedIds.length > 1) {
      return false;
    }
    
    // 检查选择的选项是否有效
    return selectedIds.every(id => 
      question.options.some(opt => opt.id === id && !opt.disabled)
    );
  }
  
  /**
   * 提取原则
   */
  private extractPrinciples(answers: Record<string, string[]>): string[] {
    const principles: string[] = [];
    
    if (answers.testing?.includes('comprehensive')) {
      principles.push('测试驱动开发');
    }
    
    if (answers.security?.includes('enterprise')) {
      principles.push('安全第一');
    }
    
    if (answers.performance?.includes('enterprise')) {
      principles.push('性能优化');
    }
    
    return principles;
  }
  
  /**
   * 获取技术栈详情
   */
  private getTechStackDetails(techStack: string): Record<string, unknown> {
    const details: Record<string, Record<string, unknown>> = {
      'react-next': {
        framework: 'Next.js',
        ui: 'React',
        state: 'Zustand',
        styling: 'Tailwind CSS'
      },
      'vue-nuxt': {
        framework: 'Nuxt.js',
        ui: 'Vue 3',
        state: 'Pinia',
        styling: 'Tailwind CSS'
      }
    };
    
    return details[techStack] || {};
  }
  
  /**
   * 获取架构描述
   */
  private getArchitectureDescription(pattern: string): string {
    const descriptions: Record<string, string> = {
      'component-based': '基于组件的模块化架构',
      'ddd': '领域驱动设计',
      'hexagonal': '六边形架构，端口-适配器模式',
      'event-driven': '事件驱动的异步架构'
    };
    
    return descriptions[pattern] || '';
  }
  
  /**
   * 获取数据模型详情
   */
  private getDataModelDetails(type: string): Record<string, unknown> {
    const details: Record<string, Record<string, unknown>> = {
      'sql': {
        type: 'relational',
        consistency: 'strong'
      },
      'nosql-document': {
        type: 'document',
        consistency: 'eventual'
      },
      'graph-db': {
        type: 'graph',
        consistency: 'strong'
      }
    };
    
    return details[type] || {};
  }
  
  /**
   * 获取集成详情
   */
  private getIntegrationDetails(pattern: string): Record<string, unknown> {
    const details: Record<string, Record<string, unknown>> = {
      'rest': {
        protocol: 'REST',
        transport: 'HTTP'
      },
      'graphql': {
        protocol: 'GraphQL',
        transport: 'HTTP'
      },
      'message-queue': {
        pattern: 'MQ',
        transport: 'Message'
      }
    };
    
    return details[pattern] || {};
  }
}

// 单例
export const brainstormEngine = new BrainstormEngine();
