/**
 * 节点模板系统 - V5.0
 * 
 * 标准化 L1-L5 节点结构，提高图谱质量
 */

// ============ 模板定义 ============

/**
 * 节点模板
 */
export interface NodeTemplate {
  layer: string;
  type: string;
  name: string;
  description: string;
  requiredProperties: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
  }>;
  optionalProperties: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    default?: unknown;
  }>;
  examples: Array<Record<string, unknown>>;
}

/**
 * L1 Constitution 模板
 */
export const L1_Constitution_Templates: NodeTemplate[] = [
  {
    layer: 'L1_Constitution',
    type: 'principles',
    name: 'Project Principles',
    description: '定义项目的指导原则和开发规范',
    requiredProperties: [
      { name: 'name', type: 'string', description: '原则名称' },
      { name: 'description', type: 'string', description: '原则描述' }
    ],
    optionalProperties: [
      { name: 'category', type: 'string', description: '分类: coding, testing, security, performance', default: 'coding' },
      { name: 'priority', type: 'string', description: '优先级: high, medium, low', default: 'medium' },
      { name: 'examples', type: 'array', description: '示例代码或说明' }
    ],
    examples: [
      {
        name: 'Code Quality',
        description: 'All code must be well-documented and follow consistent naming conventions',
        category: 'coding',
        priority: 'high'
      }
    ]
  },
  {
    layer: 'L1_Constitution',
    type: 'constraints',
    name: 'Project Constraints',
    description: '定义项目的约束条件',
    requiredProperties: [
      { name: 'name', type: 'string', description: '约束名称' },
      { name: 'description', type: 'string', description: '约束描述' }
    ],
    optionalProperties: [
      { name: 'type', type: 'string', description: '约束类型: technical, business, regulatory', default: 'technical' },
      { name: 'enforcement', type: 'string', description: '执行方式: strict, warning, suggestion', default: 'warning' }
    ],
    examples: [
      {
        name: 'No External State',
        description: 'Application must not rely on external state between requests',
        type: 'technical',
        enforcement: 'strict'
      }
    ]
  },
  {
    layer: 'L1_Constitution',
    type: 'standards',
    name: 'Coding Standards',
    description: '定义编码标准和规范',
    requiredProperties: [
      { name: 'name', type: 'string', description: '标准名称' },
      { name: 'rules', type: 'array', description: '具体规则列表' }
    ],
    optionalProperties: [
      { name: 'language', type: 'string', description: '适用语言' },
      { name: 'severity', type: 'string', description: '严重程度: error, warning, info', default: 'warning' }
    ],
    examples: [
      {
        name: 'TypeScript Standards',
        rules: [
          'Use strict typing',
          'Avoid any type',
          'Use interfaces for public APIs'
        ],
        language: 'typescript',
        severity: 'error'
      }
    ]
  }
];

/**
 * L2 TechStack 模板
 */
export const L2_TechStack_Templates: NodeTemplate[] = [
  {
    layer: 'L2_TechStack',
    type: 'language',
    name: 'Programming Language',
    description: '定义使用的编程语言',
    requiredProperties: [
      { name: 'name', type: 'string', description: '语言名称' },
      { name: 'version', type: 'string', description: '版本号' }
    ],
    optionalProperties: [
      { name: 'features', type: 'array', description: '使用的特性' },
      { name: 'compilationTarget', type: 'string', description: '编译目标' }
    ],
    examples: [
      {
        name: 'TypeScript',
        version: '5.0',
        features: ['strict mode', 'decorators', 'generics'],
        compilationTarget: 'ES2020'
      }
    ]
  },
  {
    layer: 'L2_TechStack',
    type: 'framework',
    name: 'Framework',
    description: '定义使用的框架',
    requiredProperties: [
      { name: 'name', type: 'string', description: '框架名称' },
      { name: 'version', type: 'string', description: '版本号' }
    ],
    optionalProperties: [
      { name: 'purpose', type: 'string', description: '用途: frontend, backend, fullstack' },
      { name: 'features', type: 'array', description: '使用的特性' },
      { name: 'configuration', type: 'object', description: '配置选项' }
    ],
    examples: [
      {
        name: 'React',
        version: '18.0',
        purpose: 'frontend',
        features: ['hooks', 'concurrent mode', 'server components'],
        configuration: { strictMode: true }
      }
    ]
  },
  {
    layer: 'L2_TechStack',
    type: 'library',
    name: 'Library',
    description: '定义使用的库',
    requiredProperties: [
      { name: 'name', type: 'string', description: '库名称' },
      { name: 'version', type: 'string', description: '版本号' }
    ],
    optionalProperties: [
      { name: 'purpose', type: 'string', description: '用途' },
      { name: 'isDevDependency', type: 'boolean', description: '是否开发依赖', default: false }
    ],
    examples: [
      {
        name: 'Zustand',
        version: '4.0',
        purpose: 'state management',
        isDevDependency: false
      }
    ]
  },
  {
    layer: 'L2_TechStack',
    type: 'tool',
    name: 'Development Tool',
    description: '定义开发工具',
    requiredProperties: [
      { name: 'name', type: 'string', description: '工具名称' },
      { name: 'version', type: 'string', description: '版本号' }
    ],
    optionalProperties: [
      { name: 'type', type: 'string', description: '工具类型: build, test, lint, format' },
      { name: 'configFile', type: 'string', description: '配置文件路径' }
    ],
    examples: [
      {
        name: 'Vite',
        version: '5.0',
        type: 'build',
        configFile: 'vite.config.ts'
      }
    ]
  }
];

/**
 * L3 Epic 模板
 */
export const L3_Epic_Templates: NodeTemplate[] = [
  {
    layer: 'L3_Epic',
    type: 'epic',
    name: 'Epic',
    description: '大型功能模块',
    requiredProperties: [
      { name: 'name', type: 'string', description: 'Epic 名称' },
      { name: 'goal', type: 'string', description: '目标描述' }
    ],
    optionalProperties: [
      { name: 'scope', type: 'string', description: '范围定义' },
      { name: 'priority', type: 'string', description: '优先级: P1, P2, P3', default: 'P2' },
      { name: 'deadline', type: 'string', description: '截止日期' },
      { name: 'acceptanceCriteria', type: 'array', description: '验收标准' },
      { name: 'risks', type: 'array', description: '风险项' }
    ],
    examples: [
      {
        name: 'User Authentication',
        goal: 'Implement secure user authentication system',
        scope: 'Email/password, OAuth, session management',
        priority: 'P1',
        deadline: '2026-07-01',
        acceptanceCriteria: [
          'Users can register with email and password',
          'Users can login with OAuth providers',
          'Sessions expire after inactivity'
        ]
      }
    ]
  }
];

/**
 * L4 Story 模板
 */
export const L4_Story_Templates: NodeTemplate[] = [
  {
    layer: 'L4_Story',
    type: 'user_story',
    name: 'User Story',
    description: '用户故事',
    requiredProperties: [
      { name: 'name', type: 'string', description: '故事名称' },
      { name: 'userStory', type: 'string', description: '用户故事描述 (As a..., I want..., so that...)' }
    ],
    optionalProperties: [
      { name: 'acceptanceCriteria', type: 'array', description: '验收标准' },
      { name: 'priority', type: 'string', description: '优先级: high, medium, low', default: 'medium' },
      { name: 'epicId', type: 'string', description: '所属 Epic ID' },
      { name: 'dependencies', type: 'array', description: '依赖的其他 Story ID' },
      { name: 'estimatedPoints', type: 'number', description: '故事点估算' }
    ],
    examples: [
      {
        name: 'Email Registration',
        userStory: 'As a new user, I want to register with my email so that I can access the application',
        acceptanceCriteria: [
          'User can enter email and password',
          'Email validation is performed',
          'User receives confirmation email'
        ],
        priority: 'high',
        estimatedPoints: 3
      }
    ]
  },
  {
    layer: 'L4_Story',
    type: 'module',
    name: 'Module',
    description: '功能模块',
    requiredProperties: [
      { name: 'name', type: 'string', description: '模块名称' },
      { name: 'description', type: 'string', description: '模块描述' }
    ],
    optionalProperties: [
      { name: 'responsibilities', type: 'array', description: '模块职责' },
      { name: 'interfaces', type: 'array', description: '对外接口' },
      { name: 'dependencies', type: 'array', description: '依赖模块' }
    ],
    examples: [
      {
        name: 'AuthService',
        description: 'Handles user authentication and session management',
        responsibilities: [
          'User registration',
          'Login/logout',
          'Token management'
        ],
        interfaces: ['login', 'logout', 'register', 'refreshToken']
      }
    ]
  }
];

/**
 * L5 Task 模板
 */
export const L5_Task_Templates: NodeTemplate[] = [
  {
    layer: 'L5_Task',
    type: 'task',
    name: 'Task',
    description: '具体任务',
    requiredProperties: [
      { name: 'name', type: 'string', description: '任务名称' },
      { name: 'description', type: 'string', description: '任务描述' }
    ],
    optionalProperties: [
      { name: 'storyId', type: 'string', description: '所属 Story ID' },
      { name: 'estimatedHours', type: 'number', description: '预估工时(小时)' },
      { name: 'status', type: 'string', description: '状态: todo, in_progress, done' },
      { name: 'filePath', type: 'string', description: '相关文件路径' },
      { name: 'startLine', type: 'number', description: '起始行号' },
      { name: 'endLine', type: 'number', description: '结束行号' },
      { name: 'dependencies', type: 'array', description: '依赖任务 ID' }
    ],
    examples: [
      {
        name: 'Create User Model',
        description: 'Define User schema with email, password, createdAt fields',
        storyId: 'story_001',
        estimatedHours: 2,
        status: 'todo',
        filePath: 'src/models/User.ts'
      }
    ]
  },
  {
    layer: 'L5_Task',
    type: 'file',
    name: 'File',
    description: '代码文件',
    requiredProperties: [
      { name: 'name', type: 'string', description: '文件名' },
      { name: 'path', type: 'string', description: '文件路径' }
    ],
    optionalProperties: [
      { name: 'language', type: 'string', description: '编程语言' },
      { name: 'imports', type: 'array', description: '导入的模块' },
      { name: 'exports', type: 'array', description: '导出的符号' },
      { name: 'lineCount', type: 'number', description: '代码行数' }
    ],
    examples: [
      {
        name: 'User.ts',
        path: 'src/models/User.ts',
        language: 'typescript',
        imports: ['BaseModel'],
        exports: ['User'],
        lineCount: 45
      }
    ]
  },
  {
    layer: 'L5_Task',
    type: 'function',
    name: 'Function',
    description: '函数/方法',
    requiredProperties: [
      { name: 'name', type: 'string', description: '函数名' },
      { name: 'signature', type: 'string', description: '函数签名' }
    ],
    optionalProperties: [
      { name: 'filePath', type: 'string', description: '所在文件' },
      { name: 'startLine', type: 'number', description: '起始行' },
      { name: 'endLine', type: 'number', description: '结束行' },
      { name: 'parameters', type: 'array', description: '参数列表' },
      { name: 'returnType', type: 'string', description: '返回类型' },
      { name: 'isAsync', type: 'boolean', description: '是否异步' },
      { name: 'complexity', type: 'string', description: '复杂度: low, medium, high' }
    ],
    examples: [
      {
        name: 'login',
        signature: 'async login(email: string, password: string): Promise<Token>',
        filePath: 'src/auth/index.ts',
        startLine: 15,
        endLine: 30,
        parameters: ['email', 'password'],
        returnType: 'Promise<Token>',
        isAsync: true,
        complexity: 'low'
      }
    ]
  },
  {
    layer: 'L5_Task',
    type: 'class',
    name: 'Class',
    description: '类定义',
    requiredProperties: [
      { name: 'name', type: 'string', description: '类名' }
    ],
    optionalProperties: [
      { name: 'filePath', type: 'string', description: '所在文件' },
      { name: 'startLine', type: 'number', description: '起始行' },
      { name: 'endLine', type: 'number', description: '结束行' },
      { name: 'extends', type: 'string', description: '继承的类' },
      { name: 'implements', type: 'array', description: '实现的接口' },
      { name: 'methods', type: 'array', description: '方法列表' },
      { name: 'properties', type: 'array', description: '属性列表' }
    ],
    examples: [
      {
        name: 'User',
        filePath: 'src/models/User.ts',
        startLine: 5,
        endLine: 45,
        extends: 'BaseModel',
        methods: ['findById', 'create', 'update'],
        properties: ['id', 'email', 'password']
      }
    ]
  }
];

// ============ 模板管理器 ============

export class NodeTemplateManager {
  private templates: Map<string, NodeTemplate> = new Map();
  
  constructor() {
    this.registerDefaultTemplates();
  }
  
  /**
   * 注册默认模板
   */
  private registerDefaultTemplates(): void {
    const allTemplates: NodeTemplate[] = [
      ...L1_Constitution_Templates,
      ...L2_TechStack_Templates,
      ...L3_Epic_Templates,
      ...L4_Story_Templates,
      ...L5_Task_Templates
    ];
    
    for (const template of allTemplates) {
      const key = `${template.layer}:${template.type}`;
      this.templates.set(key, template);
    }
  }
  
  /**
   * 获取模板
   */
  getTemplate(layer: string, type: string): NodeTemplate | undefined {
    return this.templates.get(`${layer}:${type}`);
  }
  
  /**
   * 获取层级的所有模板
   */
  getTemplatesByLayer(layer: string): NodeTemplate[] {
    const result: NodeTemplate[] = [];
    for (const [key, template] of this.templates) {
      if (template.layer === layer) {
        result.push(template);
      }
    }
    return result;
  }
  
  /**
   * 获取所有模板
   */
  getAllTemplates(): NodeTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * 验证节点是否符合模板
   */
  validateNode(layer: string, type: string, properties: Record<string, unknown>): {
    valid: boolean;
    missingRequired: string[];
    invalidTypes: Array<{ property: string; expected: string; actual: string }>;
  } {
    const template = this.getTemplate(layer, type);
    if (!template) {
      // 没有模板，视为有效
      return { valid: true, missingRequired: [], invalidTypes: [] };
    }
    
    const missingRequired: string[] = [];
    const invalidTypes: Array<{ property: string; expected: string; actual: string }> = [];
    
    // 检查必需属性
    for (const required of template.requiredProperties) {
      if (!(required.name in properties)) {
        missingRequired.push(required.name);
      }
    }
    
    // 检查类型
    for (const required of template.requiredProperties) {
      if (required.name in properties) {
        const actualType = this.getTypeName(properties[required.name]);
        if (actualType !== required.type) {
          invalidTypes.push({
            property: required.name,
            expected: required.type,
            actual: actualType
          });
        }
      }
    }
    
    for (const optional of template.optionalProperties) {
      if (optional.name in properties) {
        const actualType = this.getTypeName(properties[optional.name]);
        if (actualType !== optional.type) {
          invalidTypes.push({
            property: optional.name,
            expected: optional.type,
            actual: actualType
          });
        }
      }
    }
    
    return {
      valid: missingRequired.length === 0 && invalidTypes.length === 0,
      missingRequired,
      invalidTypes
    };
  }
  
  /**
   * 获取模板推荐
   */
  getTemplateSuggestions(layer: string, partialProperties: Record<string, unknown>): NodeTemplate[] {
    const layerTemplates = this.getTemplatesByLayer(layer);
    const suggestions: NodeTemplate[] = [];
    
    for (const template of layerTemplates) {
      // 简单匹配：检查必需属性是否部分满足
      const matchedRequired = template.requiredProperties.filter(
        r => r.name in partialProperties
      ).length;
      
      if (matchedRequired > 0) {
        suggestions.push(template);
      }
    }
    
    return suggestions;
  }
  
  /**
   * 创建节点的默认属性
   */
  createDefaultProperties(layer: string, type: string): Record<string, unknown> {
    const template = this.getTemplate(layer, type);
    if (!template) {
      return {};
    }
    
    const defaults: Record<string, unknown> = {};
    
    for (const optional of template.optionalProperties) {
      if (optional.default !== undefined) {
        defaults[optional.name] = optional.default;
      }
    }
    
    return defaults;
  }
  
  /**
   * 获取类型名称
   */
  private getTypeName(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }
}

// 单例
export const nodeTemplateManager = new NodeTemplateManager();
