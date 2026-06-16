/**
 * Smart Question Generator - 智能问题生成器
 * 
 * 基于项目上下文和用户输入，智能生成个性化澄清问题
 * 支持 LLM 增强（可选）
 */

import { 
  ClarificationQuestion, 
  ClarificationOption,
  QuestionType,
  RequirementAnalysis
} from './types';
import { ProjectContext } from './ContextAnalyzer';

// ==================== 智能问题配置 ====================

export interface SmartGeneratorConfig {
  enableLLM: boolean;
  llmConfig?: LLMConfig;
  maxQuestionsPerCategory: number;
  minConfidenceThreshold: number;
  allowCustomOptions: boolean;
  language: 'zh' | 'en';
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'local';
  apiKey?: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_CONFIG: SmartGeneratorConfig = {
  enableLLM: false,
  maxQuestionsPerCategory: 3,
  minConfidenceThreshold: 0.5,
  allowCustomOptions: true,
  language: 'zh'
};

// ==================== 动态问题模板 ====================

interface DynamicQuestionTemplate {
  type: QuestionType;
  baseQuestion: string;
  contextGenerator: (ctx: ProjectContext, analysis: RequirementAnalysis) => string;
  optionGenerator: (ctx: ProjectContext) => ClarificationOption[];
  priorityCalculator: (ctx: ProjectContext, analysis: RequirementAnalysis) => 'high' | 'medium' | 'low';
  shouldAsk: (ctx: ProjectContext, analysis: RequirementAnalysis) => boolean;
}

// ==================== 安全访问辅助函数 ====================

function safeLength<T>(arr: T[] | undefined): number {
  return arr ? arr.length : 0;
}

function safeAccess<T>(arr: T[] | undefined, index: number): T | undefined {
  return arr && arr.length > index ? arr[index] : undefined;
}

// ==================== 智能问题生成器 ====================

export class SmartQuestionGenerator {
  private config: SmartGeneratorConfig;
  
  constructor(config?: Partial<SmartGeneratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  static generateSmartQuestions(
    analysis: RequirementAnalysis,
    projectContext?: ProjectContext,
    existingAnswers: Record<string, string[]> = {},
    config?: Partial<SmartGeneratorConfig>
  ): ClarificationQuestion[] {
    const generator = new SmartQuestionGenerator(config);
    return generator.generate(analysis, projectContext, existingAnswers);
  }
  
  generate(
    analysis: RequirementAnalysis,
    projectContext?: ProjectContext,
    existingAnswers: Record<string, string[]> = {}
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];
    const context = projectContext || this.createEmptyContext();
    
    const templates = this.getDynamicTemplates();
    const sortedTemplates = this.sortTemplatesByPriority(templates, context, analysis);
    
    for (const template of sortedTemplates) {
      if (!template.shouldAsk(context, analysis)) {
        continue;
      }
      
      const hasAnswer = Object.keys(existingAnswers).some(
        key => key === template.type || key.startsWith(`${template.type}_`)
      );
      if (hasAnswer) {
        continue;
      }
      
      const question = this.createQuestionFromTemplate(template, context, analysis);
      if (question) {
        questions.push(question);
        
        const categoryCount = questions.filter(q => q.type === template.type).length;
        if (categoryCount >= this.config.maxQuestionsPerCategory) {
          continue;
        }
      }
    }
    
    questions.forEach(q => {
      q.options = this.filterOptionsByContextInternal(q, context, existingAnswers);
    });
    
    if (this.config.enableLLM && this.config.llmConfig) {
      questions.push(...this.generateLLMEnhancedQuestions(analysis, context));
    }
    
    questions.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority!] - priorityOrder[b.priority!];
    });
    
    return questions;
  }
  
  private getDynamicTemplates(): DynamicQuestionTemplate[] {
    return [
      {
        type: 'tech_stack',
        baseQuestion: '请选择主要技术栈',
        contextGenerator: (_ctx, _analysis) => {
          return '技术栈选择将决定项目的架构模式和开发流程';
        },
        optionGenerator: (ctx) => this.generateTechStackOptions(ctx),
        priorityCalculator: (ctx) => safeLength(ctx.frameworks) > 0 ? 'medium' : 'high',
        shouldAsk: (_ctx, _analysis) => true
      },
      {
        type: 'architecture',
        baseQuestion: '请选择应用架构模式',
        contextGenerator: (ctx, _analysis) => {
          if (safeLength(ctx.architecturePatterns) > 0) {
            const pattern = safeAccess(ctx.architecturePatterns, 0);
            if (pattern) {
              return `检测到当前项目可能使用 ${pattern.name} 架构（置信度 ${Math.round(pattern.confidence * 100)}%），请确认或选择其他模式`;
            }
          }
          return '架构模式决定了组件组织方式和数据流';
        },
        optionGenerator: (ctx) => this.generateArchitectureOptions(ctx),
        priorityCalculator: (ctx) => safeLength(ctx.architecturePatterns) > 0 ? 'medium' : 'high',
        shouldAsk: (_ctx, analysis) => analysis.complexity !== 'simple'
      },
      {
        type: 'feature_scope',
        baseQuestion: '请确认功能范围',
        contextGenerator: (_ctx, analysis) => {
          const featureCount = safeLength(analysis.extractedFeatures);
          if (featureCount > 5) {
            return `检测到 ${featureCount} 个功能点，建议先实现 MVP 核心功能`;
          }
          return '明确 MVP 范围有助于控制项目复杂度';
        },
        optionGenerator: (_ctx) => this.generateFeatureScopeOptions(_ctx),
        priorityCalculator: (_ctx, _analysis) => 'high',
        shouldAsk: (_ctx, _analysis) => true
      },
      {
        type: 'data_model',
        baseQuestion: '请选择数据存储方案',
        contextGenerator: (ctx, _analysis) => {
          const hasDatabase = ctx.dependencies && ctx.dependencies.some(
            d => ['mongodb', 'mysql', 'postgresql', 'redis', 'sqlite'].some(
              db => d.name.toLowerCase().includes(db)
            )
          );
          if (hasDatabase) {
            return '检测到项目已配置数据库依赖，请选择主要存储方案';
          }
          return '数据模型决定了数据的存储和查询方式';
        },
        optionGenerator: (ctx) => this.generateDataModelOptions(ctx),
        priorityCalculator: (ctx, _analysis) => {
          const hasDb = ctx.dependencies && ctx.dependencies.some(
            d => ['mongodb', 'mysql', 'postgresql', 'redis'].some(
              db => d.name.toLowerCase().includes(db)
            )
          );
          return hasDb ? 'medium' : 'high';
        },
        shouldAsk: (_ctx, analysis) => 
          analysis.gaps.some(g => g.includes('数据') || g.includes('存储')) ||
          analysis.complexity !== 'simple'
      },
      {
        type: 'integration',
        baseQuestion: '请选择第三方服务集成方式',
        contextGenerator: (ctx, _analysis) => {
          const apiDeps = ctx.dependencies && ctx.dependencies.filter(
            d => d.name.toLowerCase().includes('api') || d.name.toLowerCase().includes('client')
          );
          if (apiDeps && apiDeps.length > 0) {
            return `检测到项目已集成 ${apiDeps.map(d => d.name).join('、')}，请选择主要集成方式`;
          }
          return '集成方式决定了与外部系统的交互模式';
        },
        optionGenerator: (_ctx) => this.generateIntegrationOptions(_ctx),
        priorityCalculator: (_ctx, _analysis) => 'medium',
        shouldAsk: (_ctx, analysis) => 
          analysis.extractedFeatures.some(f => f.includes('API') || f.includes('第三方'))
      },
      {
        type: 'security',
        baseQuestion: '请选择安全策略级别',
        contextGenerator: (ctx, _analysis) => {
          const securityReqs = ctx.inferredRequirements && ctx.inferredRequirements.filter(r => r.category === 'security');
          if (securityReqs && securityReqs.length > 0) {
            return `根据项目分析，推断出 ${securityReqs.length} 个安全相关需求，请选择安全级别`;
          }
          return '安全策略决定了系统的防护等级';
        },
        optionGenerator: (ctx) => this.generateSecurityOptions(ctx),
        priorityCalculator: (ctx, _analysis) => {
          const hasAuth = ctx.dependencies && ctx.dependencies.some(
            d => d.name.toLowerCase().includes('auth') || d.name.toLowerCase().includes('passport')
          );
          return hasAuth ? 'medium' : 'low';
        },
        shouldAsk: (_ctx, analysis) => 
          analysis.extractedFeatures.some(f => f.includes('登录') || f.includes('支付')) ||
          analysis.complexity === 'complex'
      },
      {
        type: 'performance',
        baseQuestion: '请选择性能优化策略',
        contextGenerator: (ctx, _analysis) => {
          if (ctx.codeMetrics && ctx.codeMetrics.complexity === 'high') {
            return '检测到代码复杂度较高，建议选择适当的优化策略';
          }
          return '性能策略决定了用户体验和系统容量';
        },
        optionGenerator: (ctx) => this.generatePerformanceOptions(ctx),
        priorityCalculator: (ctx, analysis) => 
          analysis.complexity === 'complex' || (ctx.codeMetrics && ctx.codeMetrics.complexity === 'high') ? 'medium' : 'low',
        shouldAsk: (_ctx, analysis) => 
          analysis.complexity === 'complex' ||
          analysis.extractedFeatures.some(f => f.includes('高性能'))
      },
      {
        type: 'testing',
        baseQuestion: '请选择测试策略',
        contextGenerator: (ctx, _analysis) => {
          if (ctx.testingFramework) {
            return `检测到已配置 ${ctx.testingFramework} 测试框架，请选择测试策略`;
          }
          if (ctx.codeMetrics && ctx.codeMetrics.testCoverage < 0.2 && ctx.codeMetrics.totalLines > 100) {
            return `当前测试覆盖率为 ${Math.round(ctx.codeMetrics.testCoverage * 100)}%，建议加强测试`;
          }
          return '测试策略决定了代码质量和维护成本';
        },
        optionGenerator: (ctx) => this.generateTestingOptions(ctx),
        priorityCalculator: (ctx) => {
          if (!ctx.testingFramework && ctx.codeMetrics && ctx.codeMetrics.totalLines > 200) {
            return 'medium';
          }
          return 'low';
        },
        shouldAsk: (_ctx, _analysis) => true
      }
    ];
  }
  
  private sortTemplatesByPriority(
    templates: DynamicQuestionTemplate[],
    context: ProjectContext,
    analysis: RequirementAnalysis
  ): DynamicQuestionTemplate[] {
    return templates.sort((a, b) => {
      const aPriority = a.priorityCalculator(context, analysis);
      const bPriority = b.priorityCalculator(context, analysis);
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return order[aPriority] - order[bPriority];
    });
  }
  
  private createQuestionFromTemplate(
    template: DynamicQuestionTemplate,
    context: ProjectContext,
    analysis: RequirementAnalysis
  ): ClarificationQuestion | null {
    const options = template.optionGenerator(context);
    
    if (options.length === 0) {
      return null;
    }
    
    return {
      id: `q_${template.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      nodeId: `node_${template.type}_${Date.now()}`,
      type: template.type,
      question: template.baseQuestion,
      context: template.contextGenerator(context, analysis),
      options,
      multiSelect: this.shouldAllowMultiSelect(template.type),
      required: this.isRequired(template.type),
      priority: template.priorityCalculator(context, analysis),
      dependsOn: this.getDependencies(template.type),
      status: 'pending'
    };
  }
  
  private generateTechStackOptions(ctx: ProjectContext): ClarificationOption[] {
    return [
      {
        id: 'react-next',
        label: 'React + Next.js',
        description: '现代化的 React 全栈框架',
        implications: ['使用 Server Components', '支持 SSR', '使用 App Router'],
        cost: 'medium',
        complexity: 'moderate',
        disabled: ctx.frameworks.includes('Next.js')
      },
      {
        id: 'vue-nuxt',
        label: 'Vue + Nuxt.js',
        description: '渐进式 Vue 框架',
        implications: ['使用 Vue 3 Composition API', '支持 SSR', '使用 Pinia 状态管理'],
        cost: 'medium',
        complexity: 'moderate',
        disabled: ctx.frameworks.includes('Nuxt.js')
      },
      {
        id: 'angular',
        label: 'Angular',
        description: '企业级 TypeScript 框架',
        implications: ['使用 Dependency Injection', '完整的 CLI 工具', '强类型支持'],
        cost: 'high',
        complexity: 'complex'
      },
      {
        id: 'svelte',
        label: 'Svelte',
        description: '编译时框架，运行时极小',
        implications: ['无虚拟 DOM', '直接编译为 JS', '性能极致'],
        cost: 'low',
        complexity: 'simple'
      }
    ];
  }
  
  private generateArchitectureOptions(ctx: ProjectContext): ClarificationOption[] {
    return [
      {
        id: 'component-based',
        label: '组件化架构',
        description: '基于组件的模块化设计',
        implications: ['组件可复用', '关注点分离', '独立测试'],
        cost: 'low',
        complexity: 'simple'
      },
      {
        id: 'ddd',
        label: '领域驱动设计 (DDD)',
        description: '基于业务领域的分层架构',
        implications: ['领域模型清晰', '业务逻辑内聚', '需要更多抽象层'],
        cost: 'high',
        complexity: 'complex'
      },
      {
        id: 'hexagonal',
        label: '六边形架构',
        description: '端口-适配器模式，核心与外部解耦',
        implications: ['易于测试', '技术栈可替换', '需要定义接口'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'event-driven',
        label: '事件驱动架构',
        description: '基于事件的消息传递模式',
        implications: ['松耦合', '支持异步处理', '需要事件存储'],
        cost: 'high',
        complexity: 'complex',
        disabled: !ctx.dependencies || !ctx.dependencies.some(d => 
          d.name.toLowerCase().includes('redis') || d.name.toLowerCase().includes('kafka')
        )
      }
    ];
  }
  
  private generateFeatureScopeOptions(_ctx: ProjectContext): ClarificationOption[] {
    return [
      {
        id: 'minimal',
        label: '最小可行产品 (MVP)',
        description: '只实现核心功能',
        implications: ['快速上线', '后续迭代', '功能有限'],
        cost: 'low',
        complexity: 'simple'
      },
      {
        id: 'standard',
        label: '标准功能集',
        description: '包含常用功能和基础体验',
        implications: ['平衡开发速度和功能完整性', '需要更多时间'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'enterprise',
        label: '企业级功能',
        description: '包含权限、审计、多租户等',
        implications: ['完整的权限系统', '审计日志', '多租户支持'],
        cost: 'high',
        complexity: 'complex'
      }
    ];
  }
  
  private generateDataModelOptions(ctx: ProjectContext): ClarificationOption[] {
    const options: ClarificationOption[] = [
      {
        id: 'sql',
        label: '关系型数据库 (SQL)',
        description: '结构化数据存储',
        implications: ['强一致性', '复杂查询支持', '事务支持'],
        cost: 'medium',
        complexity: 'moderate',
        disabled: ctx.dependencies && ctx.dependencies.some(d => 
          d.name.toLowerCase().includes('mysql') || d.name.toLowerCase().includes('postgresql')
        )
      },
      {
        id: 'nosql-document',
        label: '文档数据库 (NoSQL)',
        description: '灵活的文档存储',
        implications: ['灵活的 Schema', '水平扩展', '适合非结构化数据'],
        cost: 'medium',
        complexity: 'moderate',
        disabled: ctx.dependencies && ctx.dependencies.some(d => 
          d.name.toLowerCase().includes('mongodb')
        )
      },
      {
        id: 'graph-db',
        label: '图数据库',
        description: '关系密集的数据存储',
        implications: ['高效的图查询', '适合关系数据', '学习曲线陡峭'],
        cost: 'high',
        complexity: 'complex'
      }
    ];
    
    if (ctx.dependencies) {
      ctx.dependencies.forEach(dep => {
        const depName = dep.name.toLowerCase();
        if (depName.includes('mysql') || depName.includes('postgresql') || depName.includes('sqlite')) {
          const sqlOpt = options[0] as ClarificationOption & { disabled?: boolean; description?: string };
          sqlOpt.disabled = true;
          sqlOpt.description = `已配置 ${dep.name}`;
        }
        if (depName.includes('mongodb')) {
          const nosqlOpt = options[1] as ClarificationOption & { disabled?: boolean; description?: string };
          nosqlOpt.disabled = true;
          nosqlOpt.description = `已配置 ${dep.name}`;
        }
      });
    }
    
    return options.filter(opt => !(opt as { disabled?: boolean }).disabled);
  }
  
  private generateIntegrationOptions(_ctx: ProjectContext): ClarificationOption[] {
    return [
      {
        id: 'rest',
        label: 'REST API',
        description: '基于 HTTP 的资源接口',
        implications: ['无状态', '易于缓存', '标准 HTTP 方法'],
        cost: 'low',
        complexity: 'simple'
      },
      {
        id: 'graphql',
        label: 'GraphQL',
        description: '灵活的数据查询语言',
        implications: ['客户端控制查询', '减少 over-fetching', '学习曲线'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'message-queue',
        label: '消息队列',
        description: '异步消息传递',
        implications: ['解耦服务', '支持重试', '需要处理顺序'],
        cost: 'high',
        complexity: 'complex',
        disabled: !_ctx.dependencies || !_ctx.dependencies.some(dep => 
          dep.name.toLowerCase().includes('kafka') || dep.name.toLowerCase().includes('rabbit')
        )
      }
    ];
  }
  
  private generateSecurityOptions(_ctx: ProjectContext): ClarificationOption[] {
    return [
      {
        id: 'basic',
        label: '基础安全',
        description: '标准认证和输入验证',
        implications: ['JWT 认证', '密码加密', '基础 XSS 防护'],
        cost: 'low',
        complexity: 'simple'
      },
      {
        id: 'standard',
        label: '标准安全',
        description: '包含授权和审计日志',
        implications: ['RBAC 权限', '操作审计', '敏感数据加密'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'enterprise',
        label: '企业级安全',
        description: '多层防护和高级审计',
        implications: ['多因素认证', '完整的审计链', '数据分类分级'],
        cost: 'high',
        complexity: 'complex'
      }
    ];
  }
  
  private generatePerformanceOptions(_ctx: ProjectContext): ClarificationOption[] {
    return [
      {
        id: 'basic',
        label: '基础优化',
        description: '代码分割、缓存基础策略',
        implications: ['首屏加载优化', '基础缓存', 'CDN 部署'],
        cost: 'low',
        complexity: 'simple'
      },
      {
        id: 'advanced',
        label: '高级优化',
        description: '虚拟化、预加载、服务端缓存',
        implications: ['复杂的数据预取', '组件预加载', 'SWR 策略'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'enterprise',
        label: '企业级优化',
        description: '微服务、边缘计算、分布式缓存',
        implications: ['微服务拆分', '边缘部署', '分布式缓存'],
        cost: 'high',
        complexity: 'complex'
      }
    ];
  }
  
  private generateTestingOptions(_ctx: ProjectContext): ClarificationOption[] {
    return [
      {
        id: 'minimal',
        label: '最小测试',
        description: '只测试核心功能',
        implications: ['关键路径测试', '手动回归测试'],
        cost: 'low',
        complexity: 'simple'
      },
      {
        id: 'unit-focused',
        label: '单元测试为主',
        description: '强调单元测试覆盖',
        implications: ['高覆盖率', '快速反馈', 'CI 集成'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'e2e-focused',
        label: '端到端测试为主',
        description: '强调用户流程测试',
        implications: ['完整流程覆盖', '接近真实场景'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'comprehensive',
        label: '全面测试',
        description: '单元、集成、E2E 全覆盖',
        implications: ['完整的测试金字塔', '持续集成', '自动化部署'],
        cost: 'high',
        complexity: 'complex'
      }
    ];
  }
  
  private createEmptyContext(): ProjectContext {
    return {
      languages: [],
      frameworks: [],
      runtimes: [],
      packageManagers: [],
      architecturePatterns: [],
      designPatterns: [],
      codeMetrics: {
        totalFiles: 0,
        totalLines: 0,
        commentDensity: 0,
        testCoverage: 0,
        complexity: 'low',
        moduleCount: 0
      },
      existingFeatures: [],
      integrationPoints: [],
      configFiles: [],
      ciCdConfigured: false,
      testingFramework: undefined,
      inferredRequirements: [],
      confidence: 0,
      gaps: []
    };
  }
  
  private shouldAllowMultiSelect(type: QuestionType): boolean {
    const multiSelectTypes: QuestionType[] = ['tech_stack', 'feature_scope', 'integration'];
    return multiSelectTypes.includes(type);
  }
  
  private isRequired(type: QuestionType): boolean {
    const requiredTypes: QuestionType[] = ['tech_stack', 'feature_scope', 'testing'];
    return requiredTypes.includes(type);
  }
  
  private getDependencies(type: QuestionType): string[] {
    const dependencies: Partial<Record<QuestionType, string[]>> = {
      architecture: [],
      feature_scope: ['tech_stack'],
      data_model: ['tech_stack', 'feature_scope'],
      integration: ['tech_stack', 'architecture'],
      performance: ['data_model'],
      security: ['data_model'],
      testing: []
    };
    return dependencies[type] || [];
  }
  
  private filterOptionsByContextInternal(
    question: ClarificationQuestion,
    _context: ProjectContext,
    existingAnswers: Record<string, string[]>
  ): ClarificationOption[] {
    let options = [...question.options];
    
    for (const [_qId, _answerIds] of Object.entries(existingAnswers)) {
      options = options.map(opt => {
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
    
    return options;
  }
  
  private checkOptionCompatibility(
    questionType: QuestionType,
    optionId: string,
    existingAnswers: Record<string, string[]>
  ): boolean {
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
  
  private generateLLMEnhancedQuestions(
    _analysis: RequirementAnalysis,
    _context: ProjectContext
  ): ClarificationQuestion[] {
    return [];
  }
}

export const smartQuestionGenerator = new SmartQuestionGenerator();
