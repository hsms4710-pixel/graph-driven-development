/**
 * Context Analyzer - 上下文分析器
 * 
 * 从代码索引、项目配置、用户输入中提取上下文信息
 * 为 Brainstorm 引擎提供智能决策依据
 */

import { CodeIndexResult, DependencyInfo } from '../indexer/types';

// ==================== 上下文类型定义 ====================

export interface ProjectContext {
  // 项目基本信息
  name?: string;
  description?: string;
  version?: string;
  
  // 技术栈检测
  languages: string[];
  frameworks: string[];
  runtimes: string[];
  packageManagers: string[];
  dependencies?: DependencyInfo[];  // 添加可选的依赖
  
  // 架构特征
  architecturePatterns: ArchitecturePattern[];
  designPatterns: DesignPattern[];
  
  // 代码特征
  codeMetrics: CodeMetrics;
  existingFeatures: string[];
  integrationPoints: string[];
  
  // 配置信息
  configFiles: string[];
  ciCdConfigured: boolean;
  testingFramework?: string;
  
  // 推断的需求
  inferredRequirements: InferredRequirement[];
  
  // 置信度
  confidence: number;
  gaps: string[];
  
  // 索引结果引用
  indexResult?: CodeIndexResult;
}

export interface ArchitecturePattern {
  name: string;
  confidence: number;
  indicators: string[];
}

export interface DesignPattern {
  name: string;
  usageCount: number;
  locations: string[];
}

export interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  commentDensity: number;  // 0-1
  testCoverage: number;    // 0-1
  complexity: 'low' | 'medium' | 'high';
  moduleCount: number;
}

export interface InferredRequirement {
  category: 'feature' | 'architecture' | 'integration' | 'security' | 'performance';
  name: string;
  confidence: number;
  source: string;  // 推断来源
  evidence: string[];  // 支持证据
}

export interface AnalysisConfig {
  minConfidence: number;  // 最小置信度阈值
  maxPatterns: number;    // 最大模式数
  includeExperimental: boolean;  // 是否包含实验性推断
}

const DEFAULT_CONFIG: AnalysisConfig = {
  minConfidence: 0.3,
  maxPatterns: 5,
  includeExperimental: false
};

// ==================== 分析器实现 ====================

export class ContextAnalyzer {
  private config: AnalysisConfig;
  
  constructor(config?: Partial<AnalysisConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 从代码索引结果构建项目上下文
   */
  analyzeFromIndexResult(indexResult: CodeIndexResult): ProjectContext {
    const context: ProjectContext = {
      languages: [],
      frameworks: [],
      runtimes: [],
      packageManagers: [],
      dependencies: indexResult.dependencies,
      architecturePatterns: [],
      designPatterns: [],
      codeMetrics: this.analyzeCodeMetrics(indexResult),
      existingFeatures: [],
      integrationPoints: [],
      configFiles: [],
      ciCdConfigured: false,
      testingFramework: undefined,
      inferredRequirements: [],
      confidence: 0,
      gaps: [],
      indexResult
    };
    
    // 分析语言和框架
    this.analyzeLanguages(indexResult, context);
    this.analyzeFrameworks(indexResult, context);
    this.analyzeDependencies(indexResult, context);
    
    // 分析架构模式
    context.architecturePatterns = this.detectArchitecturePatterns(indexResult);
    
    // 分析设计模式
    context.designPatterns = this.detectDesignPatterns(indexResult);
    
    // 分析配置文件
    context.configFiles = this.identifyConfigFiles(indexResult);
    context.ciCdConfigured = this.checkCiCdConfig(context.configFiles);
    context.testingFramework = this.detectTestingFramework(indexResult, context);
    
    // 推断需求
    context.inferredRequirements = this.inferRequirements(context);
    
    // 计算置信度和缺口
    context.confidence = this.calculateConfidence(context);
    context.gaps = this.identifyGaps(context);
    
    return context;
  }
  
  /**
   * 从用户输入推断上下文
   */
  analyzeFromUserInput(input: string): Partial<ProjectContext> {
    const context: Partial<ProjectContext> = {
      inferredRequirements: [],
      existingFeatures: [],
      gaps: []
    };
    
    // 关键词提取
    const keywords = this.extractKeywords(input);
    context.existingFeatures = keywords.features;
    
    // 推断需求
    context.inferredRequirements = this.inferFromKeywords(keywords);
    
    // 识别缺口
    context.gaps = this.identifyInputGaps(keywords);
    
    return context;
  }
  
  /**
   * 合并多个上下文源
   */
  mergeContexts(...contexts: (Partial<ProjectContext> | ProjectContext)[]): ProjectContext {
    const merged: ProjectContext = {
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
    
    for (const ctx of contexts) {
      if (!ctx) continue;
      
      // 合并数组（去重）
      merged.languages = [...new Set([...merged.languages, ...(ctx.languages || [])])];
      merged.frameworks = [...new Set([...merged.frameworks, ...(ctx.frameworks || [])])];
      merged.runtimes = [...new Set([...merged.runtimes, ...(ctx.runtimes || [])])];
      merged.packageManagers = [...new Set([...merged.packageManagers, ...(ctx.packageManagers || [])])];
      merged.existingFeatures = [...new Set([...merged.existingFeatures, ...(ctx.existingFeatures || [])])];
      merged.configFiles = [...new Set([...merged.configFiles, ...(ctx.configFiles || [])])];
      
      // 合并依赖
      if (ctx.dependencies) {
        merged.dependencies = [...new Set([...(merged.dependencies || []), ...ctx.dependencies].map(d => d.name))]
          .map(name => ctx.dependencies!.find(d => d.name === name)!);
      }
      
      // 合并需求（按置信度排序，取最高）
      if (ctx.inferredRequirements) {
        for (const req of ctx.inferredRequirements) {
          const existing = merged.inferredRequirements.find(
            r => r.name === req.name && r.category === req.category
          );
          if (!existing || req.confidence > existing.confidence) {
            merged.inferredRequirements.push(req);
          }
        }
      }
      
      // 覆盖标量值
      if (ctx.testingFramework) merged.testingFramework = ctx.testingFramework;
      if (ctx.ciCdConfigured) merged.ciCdConfigured = true;
      if (ctx.name) merged.name = ctx.name;
      if (ctx.description) merged.description = ctx.description;
      if (ctx.version) merged.version = ctx.version;
      
      // 合并缺口
      if (ctx.gaps) {
        merged.gaps = [...new Set([...merged.gaps, ...ctx.gaps])];
      }
      
      // 合并代码指标
      if (ctx.codeMetrics) {
        merged.codeMetrics = {
          totalFiles: merged.codeMetrics.totalFiles + ctx.codeMetrics.totalFiles,
          totalLines: merged.codeMetrics.totalLines + ctx.codeMetrics.totalLines,
          commentDensity: Math.max(merged.codeMetrics.commentDensity, ctx.codeMetrics.commentDensity),
          testCoverage: Math.max(merged.codeMetrics.testCoverage, ctx.codeMetrics.testCoverage),
          complexity: this.maxComplexity(merged.codeMetrics.complexity, ctx.codeMetrics.complexity),
          moduleCount: merged.codeMetrics.moduleCount + ctx.codeMetrics.moduleCount
        };
      }
    }
    
    // 去重需求
    merged.inferredRequirements = merged.inferredRequirements
      .filter((req, index, self) => 
        index === self.findIndex(r => r.name === req.name && r.category === req.category)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20);
    
    // 重新计算置信度
    merged.confidence = this.calculateConfidence(merged);
    
    return merged;
  }
  
  private maxComplexity(a: 'low' | 'medium' | 'high', b: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
    const order = { low: 0, medium: 1, high: 2 };
    return order[a] >= order[b] ? a : b;
  }
  
  // ==================== 语言和框架分析 ====================
  
  private analyzeLanguages(indexResult: CodeIndexResult, context: ProjectContext): void {
    const languageMap: Record<string, string> = {
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'python': 'Python',
      'go': 'Go',
      'rust': 'Rust',
      'java': 'Java',
      'csharp': 'C#'
    };
    
    for (const file of indexResult.files) {
      const lang = languageMap[file.language?.toLowerCase() || ''];
      if (lang && !context.languages.includes(lang)) {
        context.languages.push(lang);
      }
    }
  }
  
  private analyzeFrameworks(_indexResult: CodeIndexResult, context: ProjectContext): void {
    const frameworkIndicators: Record<string, string[]> = {
      'React': ['react', 'next', 'react-dom', 'react-router'],
      'Vue': ['vue', 'nuxt', 'vue-router'],
      'Angular': ['@angular', '@angular/core'],
      'Svelte': ['svelte'],
      'Express': ['express'],
      'FastAPI': ['fastapi'],
      'NestJS': ['@nestjs'],
      'Spring': ['spring', 'spring-boot'],
      'Django': ['django'],
      'Flask': ['flask'],
      'Typer': ['typer'],
      'Rich': ['rich'],
      'Pydantic': ['pydantic'],
      'Celery': ['celery'],
      'SQLAlchemy': ['sqlalchemy'],
      'Alembic': ['alembic'],
      'pytest': ['pytest', 'py.test'],
      'pytest-playwright': ['pytest-playwright'],
      'httpx': ['httpx'],
      'aiohttp': ['aiohttp'],
      'uvicorn': ['uvicorn'],
      'gunicorn': ['gunicorn'],
      'redis-py': ['redis'],
      'pymongo': ['pymongo'],
      'psycopg': ['psycopg', 'psycopg2'],
      'mysql-connector': ['mysql-connector', 'mysqlclient'],
      'Click': ['click'],
      'Hug': ['hug'],
      'Falcon': ['falcon'],
      'Bottle': ['bottle'],
      'Tornado': ['tornado'],
      'Sanic': ['sanic'],
      'Quart': ['quart']
    };
    
    if (!context.dependencies) return;
    
    for (const [framework, indicators] of Object.entries(frameworkIndicators)) {
      for (const dep of context.dependencies) {
        if (indicators.some(ind => dep.name.toLowerCase().includes(ind))) {
          if (!context.frameworks.includes(framework)) {
            context.frameworks.push(framework);
          }
        }
      }
    }
  }
  
  private analyzeDependencies(indexResult: CodeIndexResult, context: ProjectContext): void {
    const runtimeMap: Record<string, string> = {
      'node': 'Node.js',
      'python': 'Python',
      'go': 'Go',
      'java': 'Java'
    };
    
    const packageManagerMap: Record<string, string> = {
      'package.json': 'npm/yarn/pnpm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'poetry.lock': 'Poetry',
      'Pipfile': 'Pipenv',
      'go.mod': 'Go Modules',
      'pom.xml': 'Maven',
      'build.gradle': 'Gradle'
    };
    
    if (!context.dependencies) return;
    
    for (const dep of context.dependencies) {
      const runtime = runtimeMap[dep.name.toLowerCase()];
      if (runtime && !context.runtimes.includes(runtime)) {
        context.runtimes.push(runtime);
      }
    }
    
    for (const file of indexResult.files) {
      const pm = packageManagerMap[file.path.split('/').pop() || ''];
      if (pm && !context.packageManagers.includes(pm)) {
        context.packageManagers.push(pm);
      }
    }
  }
  
  // ==================== 架构模式检测 ====================
  
  private detectArchitecturePatterns(indexResult: CodeIndexResult): ArchitecturePattern[] {
    const patterns: ArchitecturePattern[] = [];
    
    const patternIndicators: Record<string, {
      indicators: string[];
      filePatterns: RegExp[];
    }> = {
      'Monolith': {
        indicators: ['single', 'app', 'server', 'main'],
        filePatterns: [/^app\./, /^server\./, /^main\./]
      },
      'MVC': {
        indicators: ['controller', 'model', 'view', 'routes'],
        filePatterns: [/controllers?\//, /models?\//, /views?\//]
      },
      'Layered': {
        indicators: ['layer', 'service', 'repository', 'dto'],
        filePatterns: [/services?\//, /repositories?\//, /entities?\//]
      },
      'Clean Architecture': {
        indicators: ['usecase', 'domain', 'interface', 'adapter'],
        filePatterns: [/domain\//, /application\//, /interfaces?\//]
      },
      'Microservices': {
        indicators: ['service', 'api', 'gateway', 'k8s', 'docker'],
        filePatterns: [/services?\//, /dockerfile/i, /kubernetes/]
      },
      'Event-Driven': {
        indicators: ['event', 'handler', 'listener', 'queue'],
        filePatterns: [/events?\//, /handlers?\//, /listeners?\//]
      },
      'CQRS': {
        indicators: ['command', 'query', 'handler', 'projection'],
        filePatterns: [/commands?\//, /queries?\//, /projections?\//]
      },
      'DDD': {
        indicators: ['aggregate', 'entity', 'valueobject', 'domain', 'bounded-context'],
        filePatterns: [/aggregates?\//, /entities?\//, /domain\//]
      }
    };
    
    if (!indexResult.dependencies) return patterns;
    
    for (const [patternName, { indicators, filePatterns }] of Object.entries(patternIndicators)) {
      let score = 0;
      const indicatorsFound: string[] = [];
      
      // 检查依赖
      for (const dep of indexResult.dependencies) {
        if (indicators.some(ind => dep.name.toLowerCase().includes(ind))) {
          score += 0.2;
          indicatorsFound.push(dep.name);
        }
      }
      
      // 检查文件结构
      for (const file of indexResult.files) {
        for (const pattern of filePatterns) {
          if (pattern.test(file.path)) {
            score += 0.3;
            indicatorsFound.push(file.path);
          }
        }
      }
      
      if (score >= this.config.minConfidence) {
        patterns.push({
          name: patternName,
          confidence: Math.min(score, 1),
          indicators: indicatorsFound.slice(0, 5)
        });
      }
    }
    
    // 按置信度排序
    return patterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxPatterns);
  }
  
  // ==================== 设计模式检测 ====================
  
  private detectDesignPatterns(indexResult: CodeIndexResult): DesignPattern[] {
    const patterns: DesignPattern[] = [];
    
    // 简单的设计模式检测（基于类名和文件名）
    const patternPatterns: Record<string, RegExp> = {
      'Singleton': /singleton/i,
      'Factory': /factory|creator/i,
      'Builder': /builder/i,
      'Prototype': /prototype/i,
      'Adapter': /adapter|wrapper/i,
      'Bridge': /bridge/i,
      'Composite': /composite/i,
      'Decorator': /decorator|wrapper/i,
      'Facade': /facade/i,
      'Flyweight': /flyweight/i,
      'Proxy': /proxy/i,
      'ChainOfResponsibility': /chain|handler/i,
      'Command': /command|invoker/i,
      'Iterator': /iterator/i,
      'Mediator': /mediator/i,
      'Memento': /memento/i,
      'Observer': /observer|subscriber|listener/i,
      'State': /state|context/i,
      'Strategy': /strategy|algorithm/i,
      'TemplateMethod': /template|hook/i
    };
    
    for (const file of indexResult.files) {
      for (const [patternName, regex] of Object.entries(patternPatterns)) {
        if (regex.test(file.path) || regex.test(file.className || '')) {
          const existing = patterns.find(p => p.name === patternName);
          if (existing) {
            existing.usageCount++;
            if (!existing.locations.includes(file.path)) {
              existing.locations.push(file.path);
            }
          } else {
            patterns.push({
              name: patternName,
              usageCount: 1,
              locations: [file.path]
            });
          }
        }
      }
    }
    
    return patterns
      .filter(p => p.usageCount >= 1)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }
  
  // ==================== 配置文件分析 ====================
  
  private identifyConfigFiles(indexResult: CodeIndexResult): string[] {
    const configPatterns = [
      /^\.?env/,
      /^config\./,
      /\.env\.local$/,
      /\.env\.production$/,
      /docker-compose/,
      /\.dockerfile$/i,
      /^Dockerfile$/,
      /kubernetes/,
      /\.k8s/,
      /\.gitlab-ci/,
      /\.github\/workflows/,
      /jenkinsfile/i,
      /\.eslintrc/,
      /\.prettierrc/,
      /tsconfig/,
      /pyproject/,
      /setup\.cfg$/
    ];
    
    const configFiles: string[] = [];
    
    for (const file of indexResult.files) {
      if (configPatterns.some(pattern => pattern.test(file.path))) {
        configFiles.push(file.path);
      }
    }
    
    return configFiles;
  }
  
  private checkCiCdConfig(configFiles: string[]): boolean {
    const ciCdPatterns = [
      /\.gitlab-ci\.yml$/,
      /\.github\/workflows/,
      /jenkinsfile/i,
      /\.circleci/,
      /\.travis\.yml$/
    ];
    
    return configFiles.some(file => 
      ciCdPatterns.some(pattern => pattern.test(file))
    );
  }
  
  private detectTestingFramework(_indexResult: CodeIndexResult, context: ProjectContext): string | undefined {
    const testFrameworks: Record<string, string[]> = {
      'Jest': ['jest', '@jest'],
      'Vitest': ['vitest'],
      'Mocha': ['mocha', 'chai'],
      'PyTest': ['pytest', 'py.test', 'pytest-playwright'],
      'Jasmine': ['jasmine'],
      'Playwright': ['playwright'],
      'Cypress': ['cypress'],
      'Supertest': ['supertest'],
      'unittest': ['unittest'],
      'nose': ['nose', 'nose2'],
      'pytest-asyncio': ['pytest-asyncio'],
      'pytest-cov': ['pytest-cov'],
      'pytest-html': ['pytest-html'],
      'pytest-xdist': ['pytest-xdist'],
      'hypothesis': ['hypothesis'],
      'factory_boy': ['factory-boy'],
      'faker': ['faker', 'fake-factory'],
      'mock': ['mock', 'unittest.mock']
    };
    
    if (!context.dependencies) return undefined;
    
    for (const [framework, indicators] of Object.entries(testFrameworks)) {
      for (const dep of context.dependencies) {
        if (indicators.some(ind => dep.name.toLowerCase().includes(ind))) {
          return framework;
        }
      }
    }
    
    // 从配置文件推断
    if (context.configFiles?.some(f => f.includes('jest.config'))) {
      return 'Jest';
    }
    if (context.configFiles?.some(f => f.includes('vitest.config'))) {
      return 'Vitest';
    }
    if (context.configFiles?.some(f => f.includes('pytest'))) {
      return 'PyTest';
    }
    if (context.configFiles?.some(f => f.includes('setup.cfg') || f.includes('tox.ini'))) {
      return 'PyTest';
    }
    
    return undefined;
  }
  
  // ==================== 代码指标分析 ====================
  
  private analyzeCodeMetrics(indexResult: CodeIndexResult): CodeMetrics {
    let totalLines = 0;
    let commentLines = 0;
    let testLines = 0;
    let complexityScore = 0;
    let moduleCount = 0;
    
    for (const file of indexResult.files) {
      totalLines += file.lineCount || 0;
      commentLines += file.commentCount || 0;
      testLines += file.isTest ? file.lineCount || 0 : 0;
      complexityScore += file.complexity || 0;
      if (file.isModule) moduleCount++;
    }
    
    const commentDensity = totalLines > 0 ? commentLines / totalLines : 0;
    const testCoverage = totalLines > 0 ? testLines / totalLines : 0;
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (complexityScore > 100) complexity = 'high';
    else if (complexityScore > 50) complexity = 'medium';
    
    return {
      totalFiles: indexResult.files.length,
      totalLines,
      commentDensity: Math.min(commentDensity, 1),
      testCoverage: Math.min(testCoverage, 1),
      complexity,
      moduleCount
    };
  }
  
  // ==================== 需求推断 ====================
  
  private inferRequirements(context: ProjectContext): InferredRequirement[] {
    const requirements: InferredRequirement[] = [];
    
    // 从框架推断
    if (context.frameworks.includes('React')) {
      requirements.push({
        category: 'feature',
        name: '前端路由',
        confidence: 0.8,
        source: 'framework',
        evidence: ['React 项目通常需要路由管理']
      });
      requirements.push({
        category: 'feature',
        name: '状态管理',
        confidence: 0.7,
        source: 'framework',
        evidence: ['React 项目需要管理组件状态']
      });
    }
    
    if (context.frameworks.includes('Next.js')) {
      requirements.push({
        category: 'architecture',
        name: 'SSR/SSG',
        confidence: 0.9,
        source: 'framework',
        evidence: ['Next.js 默认支持服务端渲染']
      });
    }
    
    // 从架构模式推断
    if (context.architecturePatterns.some(p => p.name === 'Microservices' && p.confidence > 0.5)) {
      requirements.push({
        category: 'integration',
        name: '服务发现',
        confidence: 0.7,
        source: 'architecture',
        evidence: ['微服务架构需要服务发现机制']
      });
      requirements.push({
        category: 'integration',
        name: 'API Gateway',
        confidence: 0.7,
        source: 'architecture',
        evidence: ['微服务通常需要 API 网关']
      });
    }
    
    // 从代码指标推断
    if (context.codeMetrics.testCoverage < 0.2 && context.codeMetrics.totalLines > 500) {
      requirements.push({
        category: 'feature',
        name: '单元测试',
        confidence: 0.6,
        source: 'code_metrics',
        evidence: ['测试覆盖率较低，建议补充单元测试']
      });
    }
    
    if (context.codeMetrics.complexity === 'high') {
      requirements.push({
        category: 'architecture',
        name: '代码重构',
        confidence: 0.5,
        source: 'code_metrics',
        evidence: ['代码复杂度较高，可能需要重构']
      });
    }
    
    // 从配置推断
    if (!context.ciCdConfigured) {
      requirements.push({
        category: 'feature',
        name: 'CI/CD 配置',
        confidence: 0.4,
        source: 'configuration',
        evidence: ['未检测到 CI/CD 配置文件']
      });
    }
    
    if (!context.testingFramework && context.codeMetrics.totalLines > 200) {
      requirements.push({
        category: 'feature',
        name: '测试框架',
        confidence: 0.5,
        source: 'configuration',
        evidence: ['未检测到测试框架依赖']
      });
    }
    
    return requirements;
  }
  
  // ==================== 用户输入分析 ====================
  
  private extractKeywords(input: string): {
    features: string[];
    tech: string[];
    requirements: string[];
  } {
    const featureKeywords = [
      '用户', '登录', '注册', '认证', '授权', '权限',
      '列表', '搜索', '筛选', '排序', '分页', 'CRUD',
      '上传', '下载', '文件', '图片', '视频',
      '支付', '订单', '购物车', '交易',
      '消息', '通知', '推送', '邮件',
      'API', '接口', '集成', '第三方',
      '数据库', '存储', '缓存', '队列',
      '日志', '监控', '告警',
      '国际化', '多语言', 'i18n',
      '响应式', '移动端', 'PWA'
    ];
    
    const techKeywords = [
      'React', 'Vue', 'Angular', 'Svelte', 'Next', 'Nuxt',
      'TypeScript', 'JavaScript', 'Python', 'Go', 'Java',
      'Node', 'Express', 'FastAPI', 'Spring', 'Django',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch',
      'REST', 'GraphQL', 'gRPC', 'WebSocket',
      'Docker', 'Kubernetes', 'AWS', 'Vercel'
    ];
    
    const requirementKeywords = [
      '高性能', '高可用', '可扩展', '安全', '稳定',
      '简单', '快速', 'MVP', '最小可行',
      '企业级', '生产环境', '生产就绪',
      '开源', '免费', '商用'
    ];
    
    const inputLower = input.toLowerCase();
    
    return {
      features: featureKeywords.filter(k => inputLower.includes(k.toLowerCase())),
      tech: techKeywords.filter(k => inputLower.includes(k.toLowerCase())),
      requirements: requirementKeywords.filter(k => inputLower.includes(k.toLowerCase()))
    };
  }
  
  private inferFromKeywords(keywords: { features: string[]; tech: string[]; requirements: string[] }): InferredRequirement[] {
    const requirements: InferredRequirement[] = [];
    
    // 从功能关键词推断
    if (keywords.features.includes('登录') || keywords.features.includes('注册')) {
      requirements.push({
        category: 'feature',
        name: '用户认证系统',
        confidence: 0.9,
        source: 'user_input',
        evidence: ['用户提到了认证相关功能']
      });
    }
    
    if (keywords.features.includes('支付') || keywords.features.includes('订单')) {
      requirements.push({
        category: 'integration',
        name: '支付网关集成',
        confidence: 0.8,
        source: 'user_input',
        evidence: ['用户提到了支付相关功能']
      });
      requirements.push({
        category: 'security',
        name: '支付安全',
        confidence: 0.7,
        source: 'user_input',
        evidence: ['支付功能需要安全措施']
      });
    }
    
    if (keywords.features.includes('API') || keywords.features.includes('接口')) {
      requirements.push({
        category: 'architecture',
        name: 'API 设计规范',
        confidence: 0.7,
        source: 'user_input',
        evidence: ['用户提到了 API 功能']
      });
    }
    
    // 从技术关键词推断
    if (keywords.tech.includes('TypeScript')) {
      requirements.push({
        category: 'architecture',
        name: '类型安全',
        confidence: 0.9,
        source: 'user_input',
        evidence: ['用户选择了 TypeScript']
      });
    }
    
    // 从需求关键词推断
    if (keywords.requirements.includes('高性能') || keywords.requirements.includes('高可用')) {
      requirements.push({
        category: 'performance',
        name: '性能优化',
        confidence: 0.8,
        source: 'user_input',
        evidence: ['用户强调了性能要求']
      });
      requirements.push({
        category: 'architecture',
        name: '缓存策略',
        confidence: 0.6,
        source: 'user_input',
        evidence: ['高性能需求通常需要缓存']
      });
    }
    
    if (keywords.requirements.includes('安全')) {
      requirements.push({
        category: 'security',
        name: '安全审计',
        confidence: 0.7,
        source: 'user_input',
        evidence: ['用户强调了安全要求']
      });
    }
    
    return requirements;
  }
  
  private identifyInputGaps(keywords: { features: string[]; tech: string[]; requirements: string[] }): string[] {
    const gaps: string[] = [];
    
    // 检查是否缺少技术栈
    if (keywords.features.length > 0 && keywords.tech.length === 0) {
      gaps.push('未指定技术栈');
    }
    
    // 检查功能与技术是否匹配
    if (keywords.features.includes('支付') && !keywords.tech.some(t => 
      ['Node', 'Java', 'Go', 'Python', 'Spring', 'Express', 'FastAPI'].includes(t)
    )) {
      gaps.push('支付功能需要后端服务，但未指定后端技术');
    }
    
    if (keywords.features.includes('API') && !keywords.tech.some(t =>
      ['REST', 'GraphQL', 'gRPC', 'Express', 'FastAPI', 'Spring'].includes(t)
    )) {
      gaps.push('API 功能需要协议定义，但未指定协议');
    }
    
    return gaps;
  }
  
  // ==================== 置信度和缺口分析 ====================
  
  private calculateConfidence(context: ProjectContext): number {
    let confidence = 0.5;  // 基础置信度
    
    // 语言检测加分
    if (context.languages.length > 0) confidence += 0.1;
    if (context.languages.length > 1) confidence += 0.05;
    
    // 框架检测加分
    if (context.frameworks.length > 0) confidence += 0.1;
    if (context.frameworks.length > 1) confidence += 0.05;
    
    // 架构模式加分
    const highConfidencePatterns = context.architecturePatterns.filter(p => p.confidence > 0.6);
    if (highConfidencePatterns.length > 0) confidence += 0.1;
    
    // 需求推断加分
    if (context.inferredRequirements.length > 3) confidence += 0.1;
    
    // CI/CD 配置加分
    if (context.ciCdConfigured) confidence += 0.05;
    
    // 测试框架加分
    if (context.testingFramework) confidence += 0.05;
    
    return Math.min(confidence, 0.95);
  }
  
  private identifyGaps(context: ProjectContext): string[] {
    const gaps: string[] = [];
    
    // 检查技术栈完整性
    if (context.languages.length === 0) {
      gaps.push('未检测到编程语言');
    }
    
    if (context.frameworks.length === 0 && context.languages.length > 0) {
      gaps.push('未检测到框架');
    }
    
    // 检查架构完整性
    if (context.architecturePatterns.length === 0) {
      gaps.push('未识别出明确的架构模式');
    }
    
    // 检查配置完整性
    if (!context.testingFramework && context.codeMetrics.totalLines > 500) {
      gaps.push('缺少测试框架配置');
    }
    
    if (!context.ciCdConfigured && context.codeMetrics.totalLines > 1000) {
      gaps.push('缺少 CI/CD 配置');
    }
    
    // 检查需求完整性
    const securityRelated = context.inferredRequirements.filter(
      r => r.category === 'security' && r.confidence > 0.5
    );
    if (securityRelated.length > 0 && !context.inferredRequirements.some(r => 
      r.name.includes('认证') || r.name.includes('授权')
    )) {
      gaps.push('可能存在安全需求但未明确');
    }
    
    return gaps;
  }
}

// 单例
export const contextAnalyzer = new ContextAnalyzer();
