/**
 * Question Generator - 澄清问题生成器
 * 
 * 根据需求分析结果，生成结构化的澄清问题
 */

import { 
  RequirementAnalysis, 
  ClarificationQuestion, 
  ClarificationOption,
  QuestionType
} from './types';

// 预定义的问题模板库
const QUESTION_TEMPLATES: Record<QuestionType, {
  baseQuestion: string;
  context: string;
  options: ClarificationOption[];
}> = {
  tech_stack: {
    baseQuestion: '请选择主要技术栈',
    context: '技术栈选择将决定项目的架构模式和开发流程',
    options: [
      {
        id: 'react-next',
        label: 'React + Next.js',
        description: '现代化的 React 全栈框架',
        implications: ['使用 Server Components', '支持 SSR', '使用 App Router'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'vue-nuxt',
        label: 'Vue + Nuxt.js',
        description: '渐进式 Vue 框架',
        implications: ['使用 Vue 3 Composition API', '支持 SSR', '使用 Pinia 状态管理'],
        cost: 'medium',
        complexity: 'moderate'
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
    ]
  },
  
  architecture: {
    baseQuestion: '请选择应用架构模式',
    context: '架构模式决定了组件组织方式和数据流',
    options: [
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
        complexity: 'complex'
      }
    ]
  },
  
  feature_scope: {
    baseQuestion: '请确认功能范围',
    context: '明确 MVP 范围有助于控制项目复杂度',
    options: [
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
    ]
  },
  
  data_model: {
    baseQuestion: '请选择数据存储方案',
    context: '数据模型决定了数据的存储和查询方式',
    options: [
      {
        id: 'sql',
        label: '关系型数据库 (SQL)',
        description: '结构化数据存储',
        implications: ['强一致性', '复杂查询支持', '事务支持'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'nosql-document',
        label: '文档数据库 (NoSQL)',
        description: '灵活的文档存储',
        implications: ['灵活的 Schema', '水平扩展', '适合非结构化数据'],
        cost: 'medium',
        complexity: 'moderate'
      },
      {
        id: 'graph-db',
        label: '图数据库',
        description: '关系密集的数据存储',
        implications: ['高效的图查询', '适合关系数据', '学习曲线陡峭'],
        cost: 'high',
        complexity: 'complex'
      }
    ]
  },
  
  integration: {
    baseQuestion: '请选择第三方服务集成方式',
    context: '集成方式决定了与外部系统的交互模式',
    options: [
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
        complexity: 'complex'
      }
    ]
  },
  
  performance: {
    baseQuestion: '请选择性能优化策略',
    context: '性能策略决定了用户体验和系统容量',
    options: [
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
    ]
  },
  
  security: {
    baseQuestion: '请选择安全策略级别',
    context: '安全策略决定了系统的防护等级',
    options: [
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
    ]
  },
  
  testing: {
    baseQuestion: '请选择测试策略',
    context: '测试策略决定了代码质量和维护成本',
    options: [
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
    ]
  }
};

export class QuestionGenerator {
  
  /**
   * 根据需求分析生成澄清问题
   */
  static generateQuestions(
    analysis: RequirementAnalysis,
    existingAnswers: Record<string, string[]> = {}
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];
    
    // 1. 始终询问技术栈
    questions.push(this.createQuestion('tech_stack', existingAnswers));
    
    // 2. 根据复杂度决定是否询问架构
    if (analysis.complexity !== 'simple') {
      questions.push(this.createQuestion('architecture', existingAnswers));
    }
    
    // 3. 始终询问功能范围
    questions.push(this.createQuestion('feature_scope', existingAnswers));
    
    // 4. 根据需求推断数据模型需求
    const needsDataModel = analysis.gaps.some(gap => 
      gap.includes('数据') || gap.includes('存储') || gap.includes('持久化')
    );
    if (needsDataModel || analysis.complexity === 'complex') {
      questions.push(this.createQuestion('data_model', existingAnswers));
    }
    
    // 5. 根据功能推断集成需求
    const needsIntegration = analysis.extractedFeatures.some(f =>
      f.includes('API') || f.includes('第三方') || f.includes('服务')
    );
    if (needsIntegration) {
      questions.push(this.createQuestion('integration', existingAnswers));
    }
    
    // 6. 企业级项目询问性能和安全
    if (analysis.complexity === 'complex' || analysis.estimatedNodes > 10) {
      questions.push(this.createQuestion('performance', existingAnswers));
      questions.push(this.createQuestion('security', existingAnswers));
    }
    
    // 7. 始终询问测试策略
    questions.push(this.createQuestion('testing', existingAnswers));
    
    return questions;
  }
  
  /**
   * 创建单个问题
   */
  private static createQuestion(
    type: QuestionType,
    _existingAnswers: Record<string, string[]>
  ): ClarificationQuestion {
    const template = QUESTION_TEMPLATES[type];
    const questionId = `q_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // 检查是否有依赖问题需要先回答
    const dependsOn = this.getDependencies(type);
    
    return {
      id: questionId,
      nodeId: `node_${questionId}`,
      type,
      question: template.baseQuestion,
      context: template.context,
      options: template.options.map(opt => ({ ...opt })),
      multiSelect: type === 'tech_stack' || type === 'feature_scope',
      required: type === 'tech_stack' || type === 'feature_scope',
      priority: this.getPriority(type),
      dependsOn,
      status: 'pending'
    };
  }
  
  /**
   * 获取问题的依赖关系
   */
  private static getDependencies(type: QuestionType): string[] {
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
  
  /**
   * 获取问题优先级
   */
  private static getPriority(type: QuestionType): 'high' | 'medium' | 'low' {
    const priorities: Partial<Record<QuestionType, 'high' | 'medium' | 'low'>> = {
      tech_stack: 'high',
      architecture: 'high',
      feature_scope: 'high',
      data_model: 'medium',
      integration: 'medium',
      performance: 'low',
      security: 'medium',
      testing: 'low'
    };
    return priorities[type] || 'medium';
  }
  
  /**
   * 根据已回答的问题过滤选项
   */
  static filterOptions(
    question: ClarificationQuestion,
    existingAnswers: Record<string, string[]>
  ): ClarificationOption[] {
    let options = [...question.options];
    
    // 根据技术栈选择过滤其他选项
    if (question.type !== 'tech_stack' && existingAnswers['tech_stack']) {
      const techStack = existingAnswers['tech_stack'];
      options = options.map(opt => {
        // 如果选项与已选技术栈不兼容，禁用它
        const isCompatible = this.checkCompatibility(question.type, opt.id, techStack);
        return {
          ...opt,
          disabled: !isCompatible
        };
      });
    }
    
    return options;
  }
  
  /**
   * 检查选项与已选技术栈的兼容性
   */
  private static checkCompatibility(
    questionType: QuestionType,
    optionId: string,
    techStack: string[]
  ): boolean {
    // 简单的兼容性规则
    const compatibilityRules: Record<string, Record<string, string[]>> = {
      data_model: {
        'graph-db': ['react-next']  // 图数据库更适合某些技术栈
      }
    };
    
    const rules = compatibilityRules[questionType];
    if (!rules || !rules[optionId]) {
      return true;  // 没有特殊规则，默认兼容
    }
    
    return techStack.some(ts => rules[optionId].includes(ts));
  }
}
