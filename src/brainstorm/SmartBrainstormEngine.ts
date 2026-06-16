/**
 * Smart Brainstorm Engine - 智能 Brainstorm 引擎
 * 
 * 在原有 BrainstormEngine 基础上增加智能功能：
 * 1. 上下文感知 - 从代码索引结果推断
 * 2. 动态问题生成 - 根据上下文调整问题
 * 3. 智能选项过滤 - 根据已有答案动态调整
 * 4. LLM 增强接口 - 可选的 LLM 集成
 */

import { 
  BrainstormState, 
  BrainstormConfig, 
  DEFAULT_BRAINSTORM_CONFIG,
  ClarificationSession,
  ClarificationQuestion,
  RequirementAnalysis,
  BrainstormEvent,
  BrainstormEventType
} from './types';
import { SmartQuestionGenerator, SmartGeneratorConfig } from './SmartQuestionGenerator';
import { ContextAnalyzer, ProjectContext } from './ContextAnalyzer';
import { graphStore } from '../mcp/GraphStore';
import { CodeIndexResult } from '../indexer/types';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 智能会话扩展 ====================

export interface SmartClarificationSession extends ClarificationSession {
  // 上下文信息
  projectContext?: ProjectContext;
  // 索引结果
  indexResult?: CodeIndexResult;
  // 智能配置
  smartConfig?: SmartGeneratorConfig;
  // 推断的历史
  inferenceHistory: InferenceRecord[];
}

export interface InferenceRecord {
  timestamp: number;
  source: 'user_input' | 'code_index' | 'context_analysis' | 'llm';
  inference: string;
  confidence: number;
  usedForQuestion?: string;
}

// ==================== 智能引擎配置 ====================

export interface SmartEngineConfig extends BrainstormConfig {
  // 上下文分析配置
  contextConfig?: {
    autoIndex: boolean;  // 自动索引代码
    indexPaths?: string[];  // 索引路径
  };
  // 智能生成配置
  smartConfig?: SmartGeneratorConfig;
  // 推断配置
  inferenceConfig?: {
    minConfidence: number;
    maxInferences: number;
  };
}

const DEFAULT_SMART_CONFIG: SmartEngineConfig = {
  ...DEFAULT_BRAINSTORM_CONFIG,
  contextConfig: {
    autoIndex: false,
    indexPaths: []
  },
  smartConfig: {
    enableLLM: false,
    maxQuestionsPerCategory: 3,
    minConfidenceThreshold: 0.5,
    allowCustomOptions: true,
    language: 'zh'
  },
  inferenceConfig: {
    minConfidence: 0.3,
    maxInferences: 20
  }
};

// ==================== 智能 Brainstorm 引擎 ====================

export class SmartBrainstormEngine {
  private config: SmartEngineConfig;
  private sessions: Map<string, SmartClarificationSession> = new Map();
  private eventListeners: Map<BrainstormEventType, ((event: BrainstormEvent) => void)[]> = new Map();
  private contextAnalyzer: ContextAnalyzer;
  
  constructor(config?: Partial<SmartEngineConfig>) {
    this.config = { ...DEFAULT_SMART_CONFIG, ...config };
    this.contextAnalyzer = new ContextAnalyzer({
      minConfidence: this.config.inferenceConfig?.minConfidence || 0.3,
      maxPatterns: 5
    });
  }
  
  // ==================== 会话管理 ====================
  
  /**
   * 开始智能 Brainstorm 会话
   */
  startSmartSession(
    userInput: string, 
    graphId?: string,
    options?: {
      indexCode?: boolean;
      codePaths?: string[];
      existingContext?: ProjectContext;
    }
  ): SmartClarificationSession {
    const sessionId = `smart_bs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 1. 构建项目上下文
    let projectContext: ProjectContext;
    
    if (options?.existingContext) {
      projectContext = options.existingContext;
    } else {
      // 从用户输入分析
      const userInputContext = this.contextAnalyzer.analyzeFromUserInput(userInput);
      
      // 如果需要，索引代码
      let indexContext: Partial<ProjectContext> = {};
      
      if (options?.indexCode && options.codePaths?.length) {
        const indexResult = this.indexCode(options.codePaths);
        indexContext = this.contextAnalyzer.analyzeFromIndexResult(indexResult);
        projectContext = this.contextAnalyzer.mergeContexts(
          indexContext,
          userInputContext as ProjectContext
        ) as ProjectContext;
        (projectContext as ProjectContext & { indexResult?: CodeIndexResult }).indexResult = indexResult;
      } else {
        projectContext = this.contextAnalyzer.mergeContexts(
          {} as ProjectContext,
          userInputContext as ProjectContext
        ) as ProjectContext;
      }
    }
    
    // 2. 分析需求
    const analysis = this.analyzeRequirementsWithContext(userInput, projectContext);
    
    // 3. 生成智能问题
    const smartConfig = this.config.smartConfig || DEFAULT_SMART_CONFIG.smartConfig!;
    const questions = SmartQuestionGenerator.generateSmartQuestions(
      analysis,
      projectContext,
      {},
      smartConfig
    );
    
    // 4. 记录推断历史
    const inferenceHistory = this.recordInitialInferences(analysis, projectContext);
    
    // 5. 创建会话
    const existingGraphId = graphId || this.createGraphForSession(sessionId, userInput, projectContext);
    
    const session: SmartClarificationSession = {
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
          action: 'state_changed',
          data: { userInput, analysis, projectContext }
        }
      ],
      projectContext,
      inferenceHistory,
      smartConfig
    };
    
    this.sessions.set(sessionId, session);
    
    // 发送事件
    this.emit({
      type: 'session:start',
      sessionId,
      payload: { session },
      timestamp: Date.now()
    });
    
    // 进入分析状态
    this.transitionState(sessionId, 'ANALYZE');
    
    return session;
  }
  
  /**
   * 从代码索引结果开始会话
   */
  startFromIndexResult(
    indexResult: CodeIndexResult,
    userInput?: string
  ): SmartClarificationSession {
    const input = userInput || '基于现有代码库';
    
    // 分析代码索引
    let projectContext = this.contextAnalyzer.analyzeFromIndexResult(indexResult);
    
    // 如果有用户输入，合并上下文
    if (userInput) {
      const userInputContext = this.contextAnalyzer.analyzeFromUserInput(userInput);
      projectContext = this.contextAnalyzer.mergeContexts(
        projectContext,
        userInputContext as ProjectContext
      ) as ProjectContext;
    }
    
    return this.startSmartSession(input, undefined, {
      existingContext: projectContext,
      indexCode: false
    });
  }
  
  /**
   * 获取会话
   */
  getSession(sessionId: string): SmartClarificationSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * 结束会话
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    if (this.config.autoGenerateOnComplete) {
      this.generateCode(sessionId);
    }
    
    this.sessions.delete(sessionId);
    return true;
  }
  
  // ==================== 状态管理 ====================
  
  private transitionState(sessionId: string, newState: BrainstormState): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const oldState = session.state;
    session.state = newState;
    session.updatedAt = Date.now();
    
    this.emit({
      type: 'state:change',
      sessionId,
      payload: { from: oldState, to: newState },
      timestamp: Date.now()
    });
  }
  
  getState(sessionId: string): BrainstormState | undefined {
    return this.sessions.get(sessionId)?.state;
  }
  
  // ==================== 澄清流程 ====================
  
  getNextQuestion(sessionId: string): ClarificationQuestion | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    for (let i = session.currentQuestionIndex; i < session.questions.length; i++) {
      const question = session.questions[i];
      
      if (question.status !== 'pending') continue;
      
      // 更新选项（根据最新上下文）
      if (session.projectContext) {
        question.options = this.filterOptionsByContext(
          question,
          session.projectContext,
          session.answers
        );
      }
      
      if (this.areDependenciesMet(question, session.answers)) {
        return question;
      }
    }
    
    return undefined;
  }
  
  private filterOptionsByContext(
    question: ClarificationQuestion,
    _context: ProjectContext,
    existingAnswers: Record<string, string[]>
  ): any[] {
    // 简单的选项过滤实现
    return question.options.map(opt => {
      // 检查与已有答案的兼容性
      const isCompatible = this.checkOptionCompatibility(
        question.type,
        opt.id,
        existingAnswers
      );
      return {
        ...opt,
        disabled: opt.disabled || !isCompatible
      };
    });
  }
  
  private checkOptionCompatibility(
    questionType: string,
    optionId: string,
    existingAnswers: Record<string, string[]>
  ): boolean {
    // 简单的兼容性规则
    const compatibilityRules: Record<string, Record<string, string[]>> = {
      'data_model': {
        'graph-db': ['react-next']
      }
    };
    
    const rules = compatibilityRules[questionType];
    if (!rules || !rules[optionId]) {
      return true;
    }
    
    const techStack = existingAnswers['tech_stack'];
    if (!techStack) {
      return true;
    }
    
    return techStack.some(ts => rules[optionId].includes(ts));
  }
  
  answerQuestion(
    sessionId: string, 
    questionId: string, 
    selectedOptionIds: string[]
  ): {
    success: boolean;
    question?: ClarificationQuestion;
    nextAction?: 'continue' | 'build_graph' | 'complete';
    inference?: InferenceRecord;
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
      return { success: false, error: 'Invalid selection' };
    }
    
    // 记录推断
    const inference = this.recordAnswerInference(session, question, selectedOptionIds);
    
    // 更新问题状态
    question.status = 'answered';
    question.selectedOptions = selectedOptionIds;
    question.answeredAt = Date.now();
    
    session.answers[questionId] = selectedOptionIds;
    session.updatedAt = Date.now();
    
    session.history.push({
      timestamp: Date.now(),
      action: 'question_answered',
      data: { questionId, selectedOptionIds, inference }
    });
    
    if (inference) {
      session.inferenceHistory.push(inference);
    }
    
    // 发送事件
    this.emit({
      type: 'question:answer',
      sessionId,
      payload: { question, selectedOptionIds, inference },
      timestamp: Date.now()
    });
    
    // 检查是否完成
    const allAnswered = session.questions.every(
      q => q.status === 'answered' || q.status === 'skipped'
    );
    
    let nextAction: 'continue' | 'build_graph' | 'complete' = 'continue';
    
    if (allAnswered) {
      nextAction = 'build_graph';
      this.transitionState(sessionId, 'BUILD');
      this.buildGraphFromAnswers(sessionId);
      nextAction = 'complete';
      this.transitionState(sessionId, 'GENERATE');
    } else {
      // 更新上下文（基于答案推断）
      this.updateContextFromAnswer(session, question, selectedOptionIds);
      session.currentQuestionIndex++;
    }
    
    return {
      success: true,
      question,
      nextAction,
      inference
    };
  }
  
  skipQuestion(sessionId: string, questionId: string): { success: boolean; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    
    const question = session.questions.find(q => q.id === questionId);
    if (!question) return { success: false, error: 'Question not found' };
    
    if (question.required) {
      return { success: false, error: 'Cannot skip required question' };
    }
    
    if (question.status !== 'pending') {
      return { success: false, error: 'Question already answered' };
    }
    
    question.status = 'skipped';
    session.updatedAt = Date.now();
    session.currentQuestionIndex++;
    
    this.emit({
      type: 'question:skip',
      sessionId,
      payload: { question },
      timestamp: Date.now()
    });
    
    return { success: true };
  }
  
  getPendingQuestions(sessionId: string): ClarificationQuestion[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    return session.questions
      .filter(q => q.status === 'pending')
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (order[a.priority!] || 1) - (order[b.priority!] || 1);
      });
  }
  
  getProgress(sessionId: string): {
    total: number;
    answered: number;
    skipped: number;
    pending: number;
    percentage: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { total: 0, answered: 0, skipped: 0, pending: 0, percentage: 0 };
    
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
  
  // ==================== 上下文更新 ====================
  
  /**
   * 更新会话的项目上下文
   */
  updateContext(
    sessionId: string, 
    contextUpdate: Partial<ProjectContext>
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const currentContext = session.projectContext;
    if (!currentContext) return false;
    
    session.projectContext = {
      ...currentContext,
      ...contextUpdate
    };
    session.updatedAt = Date.now();
    
    // 重新生成问题选项
    session.questions.forEach(q => {
      if (q.status === 'pending') {
        q.options = this.filterOptionsByContext(
          q,
          session.projectContext!,
          session.answers
        );
      }
    });
    
    return true;
  }
  
  /**
   * 从代码路径更新上下文
   */
  updateContextFromCode(sessionId: string, codePaths: string[]): {
    success: boolean;
    context?: ProjectContext;
    error?: string;
  } {
    try {
      const indexResult = this.indexCode(codePaths);
      const context = this.contextAnalyzer.analyzeFromIndexResult(indexResult);
      
      if (this.updateContext(sessionId, context)) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.indexResult = indexResult;
        }
        
        return { success: true, context };
      }
      
      return { success: false, error: 'Session not found' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  
  // ==================== 图构建 ====================
  
  private buildGraphFromAnswers(sessionId: string): any | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const graphId = session.graphId;
    const graph = graphStore.getGraph(graphId);
    
    if (!graph) return undefined;
    
    // 清空现有节点和边
    graph.nodes = [];
    graph.edges = [];
    
    // 根据答案和上下文创建节点
    const nodes = this.createNodesFromAnswers(session);
    const edges = this.createEdgesFromNodes(nodes);
    
    graph.nodes = nodes;
    graph.edges = edges;
    
    this.emit({
      type: 'graph:update',
      sessionId,
      payload: { graphId, nodes, edges },
      timestamp: Date.now()
    });
    
    return { id: graphId, name: graph.name, nodes, edges };
  }
  
  private createNodesFromAnswers(session: SmartClarificationSession): any[] {
    const nodes: any[] = [];
    const context = session.projectContext;
    
    // L1: Constitution
    const constitutionNode = {
      id: `node_constitution_${Date.now()}`,
      label: '项目宪法',
      type: 'constitution',
      layer: 'L1_Constitution',
      properties: {
        principles: this.extractPrinciples(session.answers),
        testingStrategy: session.answers.testing?.[0],
        securityLevel: session.answers.security?.[0],
        detectedPatterns: context?.architecturePatterns.map(p => p.name)
      }
    };
    nodes.push(constitutionNode);
    
    // L2: Tech Stack
    const techStackAnswer = session.answers.tech_stack;
    if (techStackAnswer && techStackAnswer.length > 0) {
      const techStackNode = {
        id: `node_techstack_${Date.now()}`,
        label: '技术栈',
        type: 'tech_stack',
        layer: 'L2_TechStack',
        properties: {
          framework: techStackAnswer[0],
          languages: context?.languages,
          runtimes: context?.runtimes,
          packageManagers: context?.packageManagers
        }
      };
      nodes.push(techStackNode);
    }
    
    // L3: Architecture
    const architectureAnswer = session.answers.architecture;
    if (architectureAnswer && architectureAnswer.length > 0) {
      const architectureNode = {
        id: `node_arch_${Date.now()}`,
        label: '架构模式',
        type: 'architecture',
        layer: 'L3_Epic',
        properties: {
          pattern: architectureAnswer[0],
          detectedPatterns: context?.architecturePatterns.map(p => ({
            name: p.name,
            confidence: p.confidence
          })),
          designPatterns: context?.designPatterns.map(p => p.name)
        }
      };
      nodes.push(architectureNode);
    }
    
    // L3: Feature Scope
    const featureScopeAnswer = session.answers.feature_scope;
    if (featureScopeAnswer && featureScopeAnswer.length > 0) {
      const scopeNode = {
        id: `node_scope_${Date.now()}`,
        label: '功能范围',
        type: 'feature_scope',
        layer: 'L3_Epic',
        properties: {
          scope: featureScopeAnswer[0],
          mvp: featureScopeAnswer[0] === 'minimal',
          existingFeatures: context?.existingFeatures
        }
      };
      nodes.push(scopeNode);
    }
    
    // L4: Data Model
    const dataModelAnswer = session.answers.data_model;
    if (dataModelAnswer && dataModelAnswer.length > 0) {
      const dataModelNode = {
        id: `node_data_${Date.now()}`,
        label: '数据存储',
        type: 'data_model',
        layer: 'L4_Story',
        properties: {
          storageType: dataModelAnswer[0],
          detectedDatabases: context?.dependencies
            ?.filter(d => ['mongodb', 'mysql', 'postgresql', 'redis'].some(
              db => d.name.toLowerCase().includes(db)
            ))
            .map(d => d.name)
        }
      };
      nodes.push(dataModelNode);
    }
    
    // L4: Integration
    const integrationAnswer = session.answers.integration;
    if (integrationAnswer && integrationAnswer.length > 0) {
      const integrationNode = {
        id: `node_integration_${Date.now()}`,
        label: '集成方式',
        type: 'integration',
        layer: 'L4_Story',
        properties: {
          pattern: integrationAnswer[0],
          integrationPoints: context?.integrationPoints
        }
      };
      nodes.push(integrationNode);
    }
    
    // L5: Testing
    const testingAnswer = session.answers.testing;
    if (testingAnswer && testingAnswer.length > 0) {
      const testingNode = {
        id: `node_testing_${Date.now()}`,
        label: '测试策略',
        type: 'testing',
        layer: 'L5_Task',
        properties: {
          strategy: testingAnswer[0],
          framework: context?.testingFramework
        }
      };
      nodes.push(testingNode);
    }
    
    // L5: Security
    const securityAnswer = session.answers.security;
    if (securityAnswer && securityAnswer.length > 0) {
      const securityNode = {
        id: `node_security_${Date.now()}`,
        label: '安全策略',
        type: 'security',
        layer: 'L5_Task',
        properties: {
          level: securityAnswer[0],
          securityRequirements: context?.inferredRequirements
            ?.filter(r => r.category === 'security')
            .map(r => r.name)
        }
      };
      nodes.push(securityNode);
    }
    
    return nodes;
  }
  
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
    
    const layerDependencies: Record<string, string[]> = {
      'L2_TechStack': ['L1_Constitution'],
      'L3_Epic': ['L2_TechStack'],
      'L4_Story': ['L3_Epic'],
      'L5_Task': ['L4_Story']
    };
    
    const nodesByLayer = new Map<string, typeof nodes>();
    nodes.forEach(node => {
      if (!nodesByLayer.has(node.layer)) {
        nodesByLayer.set(node.layer, []);
      }
      nodesByLayer.get(node.layer)!.push(node);
    });
    
    nodes.forEach(node => {
      const dependencies = layerDependencies[node.layer] || [];
      
      dependencies.forEach(depLayer => {
        const depNodes = nodesByLayer.get(depLayer) || [];
        
        if (depNodes.length > 0) {
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
    
    this.emit({
      type: 'clarification:complete',
      sessionId,
      payload: { session, graph },
      timestamp: Date.now()
    });
    
    return { success: true, graph };
  }
  
  // ==================== 事件系统 ====================
  
  on(
    event: BrainstormEventType, 
    callback: (event: BrainstormEvent) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    
    return () => {
      const callbacks = this.eventListeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }
  
  private emit(event: BrainstormEvent): void {
    const callbacks = this.eventListeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }
  
  // ==================== 辅助方法 ====================
  
  private indexCode(codePaths: string[]): CodeIndexResult {
    // 创建简单的索引结果
    const files: any[] = [];
    const dependencies: any[] = [];
    
    for (const filePath of codePaths) {
      if (fs.existsSync(filePath)) {
        files.push({
          path: filePath,
          language: this.detectLanguage(filePath)
        });
      }
    }
    
    // 检查 package.json 依赖
    for (const filePath of codePaths) {
      if (filePath.endsWith('package.json')) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const pkg = JSON.parse(content);
          
          if (pkg.dependencies) {
            for (const [name, version] of Object.entries(pkg.dependencies)) {
              dependencies.push({ name, version: String(version) });
            }
          }
          if (pkg.devDependencies) {
            for (const [name, version] of Object.entries(pkg.devDependencies)) {
              dependencies.push({ name, version: String(version) });
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    return {
      files,
      dependencies,
      summary: {
        totalFiles: files.length,
        totalLines: 0,
        commentDensity: 0,
        testCoverage: 0,
        complexity: 'low',
        moduleCount: 0
      }
    };
  }
  
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust'
    };
    return langMap[ext] || 'unknown';
  }
  
  private analyzeRequirementsWithContext(
    userInput: string, 
    context: ProjectContext
  ): RequirementAnalysis {
    // 基础分析
    const features = this.extractFeatures(userInput);
    const impliedRequirements = this.inferRequirements(features, context);
    const complexity = this.assessComplexity(features, context);
    const estimatedNodes = this.estimateNodes(complexity, features.length, context);
    const confidence = this.calculateConfidence(features, context);
    const gaps = this.identifyGaps(features, impliedRequirements, context);
    
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
  
  private extractFeatures(input: string): string[] {
    const keywords = [
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
    
    keywords.forEach(k => {
      if (inputLower.includes(k.toLowerCase())) {
        features.push(k);
      }
    });
    
    return [...new Set(features)];
  }
  
  private inferRequirements(features: string[], context: ProjectContext): string[] {
    const requirements: string[] = [];
    
    if (features.includes('登录') || features.includes('注册')) {
      requirements.push('用户认证系统');
      requirements.push('会话管理');
    }
    
    if (features.includes('支付') || features.includes('订单')) {
      requirements.push('支付网关集成');
      requirements.push('订单状态机');
    }
    
    // 从上下文推断
    if (context.inferredRequirements) {
      context.inferredRequirements
        .filter(r => r.confidence > 0.5)
        .forEach(r => requirements.push(r.name));
    }
    
    return [...new Set(requirements)];
  }
  
  private assessComplexity(features: string[], context: ProjectContext): 'simple' | 'moderate' | 'complex' {
    const complexIndicators = ['支付', '订单', '集成', 'API', '消息'];
    const complexCount = features.filter(f => complexIndicators.includes(f)).length;
    
    // 考虑上下文复杂度
    let contextComplexityScore = 0;
    if (context.architecturePatterns.some(p => p.name === 'Microservices')) {
      contextComplexityScore += 2;
    }
    if (context.codeMetrics.complexity === 'high') {
      contextComplexityScore += 1;
    }
    
    if (complexCount >= 3 || features.length >= 8 || contextComplexityScore >= 2) {
      return 'complex';
    }
    
    if (complexCount >= 1 || features.length >= 4 || contextComplexityScore >= 1) {
      return 'moderate';
    }
    
    return 'simple';
  }
  
  private estimateNodes(complexity: 'simple' | 'moderate' | 'complex', featureCount: number, context: ProjectContext): number {
    const baseNodes = { simple: 3, moderate: 6, complex: 10 };
    const contextAdjustment = context.codeMetrics.moduleCount > 0 
      ? Math.floor(context.codeMetrics.moduleCount / 3)
      : 0;
    
    return baseNodes[complexity] + Math.floor(featureCount / 2) + contextAdjustment;
  }
  
  private calculateConfidence(features: string[], context: ProjectContext): number {
    let confidence = 0.5;
    
    features.forEach(() => confidence += 0.05);
    
    if (context.frameworks.length > 0) confidence += 0.1;
    if (context.architecturePatterns.length > 0) confidence += 0.1;
    if (context.testingFramework) confidence += 0.05;
    if (context.ciCdConfigured) confidence += 0.05;
    
    return Math.min(confidence, 0.95);
  }
  
  private identifyGaps(
    features: string[], 
    requirements: string[], 
    context: ProjectContext
  ): string[] {
    const gaps: string[] = [];
    
    if (features.some(f => ['支付', '订单'].includes(f)) && !requirements.includes('支付网关集成')) {
      gaps.push('支付方式未指定');
    }
    
    if (features.includes('API') && !context.testingFramework) {
      gaps.push('API 测试策略未指定');
    }
    
    // 从上下文缺口
    if (context.gaps) {
      gaps.push(...context.gaps);
    }
    
    return gaps;
  }
  
  private recordInitialInferences(
    analysis: RequirementAnalysis, 
    context: ProjectContext
  ): InferenceRecord[] {
    const records: InferenceRecord[] = [];
    
    // 记录从用户输入的推断
    analysis.extractedFeatures.forEach(feature => {
      records.push({
        timestamp: Date.now(),
        source: 'user_input',
        inference: `检测到功能需求: ${feature}`,
        confidence: 0.8
      });
    });
    
    // 记录从上下文的推断
    if (context.inferredRequirements) {
      context.inferredRequirements
        .filter(r => r.confidence > 0.5)
        .forEach(r => {
          records.push({
            timestamp: Date.now(),
            source: 'context_analysis',
            inference: `${r.category}: ${r.name} (置信度 ${Math.round(r.confidence * 100)}%)`,
            confidence: r.confidence
          });
        });
    }
    
    // 记录架构模式
    context.architecturePatterns.forEach(pattern => {
      records.push({
        timestamp: Date.now(),
        source: 'context_analysis',
        inference: `检测到架构模式: ${pattern.name} (${Math.round(pattern.confidence * 100)}%)`,
        confidence: pattern.confidence
      });
    });
    
    return records;
  }
  
  private recordAnswerInference(
    _session: SmartClarificationSession,
    question: ClarificationQuestion,
    selectedOptionIds: string[]
  ): InferenceRecord | undefined {
    const selectedOptions = question.options.filter(opt => selectedOptionIds.includes(opt.id));
    const inference = `${question.question}: ${selectedOptions.map(o => o.label).join(', ')}`;
    
    return {
      timestamp: Date.now(),
      source: 'user_input',
      inference,
      confidence: 0.9,
      usedForQuestion: question.id
    };
  }
  
  private updateContextFromAnswer(
    session: SmartClarificationSession,
    question: ClarificationQuestion,
    selectedOptionIds: string[]
  ): void {
    if (!session.projectContext) return;
    
    const selectedOptions = question.options.filter(opt => selectedOptionIds.includes(opt.id));
    
    // 根据答案更新上下文
    switch (question.type) {
      case 'tech_stack':
        (session.projectContext as ProjectContext).frameworks = [
          ...new Set([
            ...(session.projectContext as ProjectContext).frameworks,
            ...selectedOptions.map(o => o.label)
          ])
        ];
        break;
        
      case 'architecture':
        (session.projectContext as ProjectContext).architecturePatterns = [
          ...(session.projectContext as ProjectContext).architecturePatterns,
          ...selectedOptions.map(o => ({
            name: o.label,
            confidence: 0.8,
            indicators: o.implications || []
          }))
        ];
        break;
        
      case 'testing':
        if (selectedOptions.some(o => o.id === 'comprehensive')) {
          (session.projectContext as ProjectContext).gaps = (session.projectContext as ProjectContext).gaps.filter(
            g => !g.includes('测试')
          );
        }
        break;
    }
  }
  
  private createGraphForSession(
    sessionId: string, 
    userInput: string, 
    context: ProjectContext
  ): string {
    const graphId = `graph_${sessionId}`;
    
    const projectName = this.extractProjectName(userInput, context);
    
    graphStore.createGraph({
      id: graphId,
      name: projectName,
      description: userInput,
      nodes: [],
      edges: []
    });
    
    return graphId;
  }
  
  private extractProjectName(input: string, context: ProjectContext): string {
    // 如果上下文有名称，使用它
    if (context.name) {
      return context.name;
    }
    
    // 否则从输入提取
    const cleaned = input
      .replace(/做(一个|个)?/g, '')
      .replace(/[，。！？]/g, '')
      .trim();
    
    return cleaned.slice(0, 20) || '新项目';
  }
  
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
    
    return selectedIds.every(id => 
      question.options.some(opt => opt.id === id && !opt.disabled)
    );
  }
  
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
}

// 单例
export const smartBrainstormEngine = new SmartBrainstormEngine();
