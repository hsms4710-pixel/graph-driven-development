/**
 * AI 模块类型定义
 * V5.0 AI Enhancement
 */

// ============ LLM Provider Types ============

/**
 * LLM Provider 类型
 */
export type LLMProviderType = 'openai' | 'anthropic' | 'google' | 'ollama' | 'azure';

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
}

/**
 * 模型配置
 */
export interface ModelConfig {
  provider: LLMProviderType;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  requestId?: string;
}

/**
 * 流式响应块
 */
export interface StreamChunk {
  content: string;
  finishReason?: 'stop' | 'length' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Provider 接口
 */
export interface ILLMProvider {
  /** Provider 类型 */
  readonly type: LLMProviderType;
  
  /** Provider 名称 */
  readonly name: string;
  
  /** 初始化 Provider */
  initialize(config: ProviderConfig): Promise<void>;
  
  /** 检查健康状态 */
  healthCheck(): Promise<boolean>;
  
  /** 发送聊天请求 */
  chat(
    messages: ChatMessage[],
    config?: Partial<ModelConfig>
  ): Promise<LLMResponse>;
  
  /** 流式聊天请求 */
  chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    config?: Partial<ModelConfig>
  ): Promise<LLMResponse>;
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  extraHeaders?: Record<string, string>;
}

// ============ Embedding Types ============

/**
 * Embedding 模型配置
 */
export interface EmbeddingModelConfig {
  provider: LLMProviderType;
  model: string;
  dimension: number;
}

/**
 * Embedding Provider 接口
 */
export interface IEmbeddingProvider {
  /** Provider 类型 */
  readonly type: LLMProviderType;
  
  /** 初始化 */
  initialize(config: ProviderConfig): Promise<void>;
  
  /** 健康检查 */
  healthCheck(): Promise<boolean>;
  
  /** 生成单个文本的 Embedding */
  embed(text: string): Promise<number[]>;
  
  /** 批量生成 Embedding */
  embedBatch(texts: string[]): Promise<number[][]>;
  
  /** 获取模型维度 */
  getDimension(): number;
}

/**
 * Embedding 请求
 */
export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  encodingFormat?: 'float' | 'base64';
  dimensions?: number;
}

/**
 * Embedding 响应
 */
export interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

// ============ RAG Types ============

/**
 * 文档块
 */
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

/**
 * 块元数据
 */
export interface ChunkMetadata {
  source: string;
  startLine?: number;
  endLine?: number;
  filePath?: string;
  language?: string;
  chunkIndex?: number;
  [key: string]: unknown;
}

/**
 * 分块策略
 */
export type ChunkingStrategy = 'fixed' | 'recursive' | 'semantic';

/**
 * 分块配置
 */
export interface ChunkingConfig {
  strategy: ChunkingStrategy;
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

/**
 * 检索器接口
 */
export interface IRetriever {
  /** 检索相关文档 */
  retrieve(
    query: string,
    topK?: number,
    filter?: Record<string, unknown>
  ): Promise<DocumentChunk[]>;
  
  /** 添加文档 */
  addDocuments(documents: DocumentChunk[]): Promise<void>;
  
  /** 删除文档 */
  deleteDocuments(ids: string[]): Promise<void>;
  
  /** 清空索引 */
  clear(): Promise<void>;
}

/**
 * RAG 服务接口
 */
export interface IRAGService {
  /** 检索增强生成 */
  generate(
    query: string,
    systemPrompt?: string,
    topK?: number
  ): Promise<string>;
  
  /** 仅检索 */
  retrieve(
    query: string,
    topK?: number,
    filter?: Record<string, unknown>
  ): Promise<DocumentChunk[]>;
  
  /** 添加文档到知识库 */
  addDocuments(documents: DocumentChunk[]): Promise<void>;
  
  /** 更新文档 */
  updateDocuments(documents: DocumentChunk[]): Promise<void>;
  
  /** 删除文档 */
  deleteDocuments(ids: string[]): Promise<void>;
  
  /** 清空知识库 */
  clear(): Promise<void>;
}

// ============ AI Generator Types ============

/**
 * 代码生成请求
 */
export interface CodeGenerationRequest {
  prompt: string;
  language: string;
  context?: CodeContext;
  style?: 'functional' | 'object-oriented' | 'procedural' | 'react' | 'vue';
  includeComments?: boolean;
  maxLines?: number;
}

/**
 * 代码上下文
 */
export interface CodeContext {
  projectType?: string;
  framework?: string;
  existingFiles?: string[];
  relatedCode?: string;
  dependencies?: string[];
}

/**
 * 代码生成响应
 */
export interface CodeGenerationResponse {
  code: string;
  language: string;
  explanation?: string;
  dependencies?: string[];
  tests?: string;
  confidence: number;
}

/**
 * AI 代码生成器接口
 */
export interface IAICodeGenerator {
  /** 生成代码 */
  generate(request: CodeGenerationRequest): Promise<CodeGenerationResponse>;
  
  /** 代码补全 */
  complete(
    prefix: string,
    language: string,
    context?: CodeContext
  ): Promise<string[]>;
  
  /** 生成测试 */
  generateTest(
    code: string,
    language: string,
    framework?: string
  ): Promise<string>;
  
  /** 生成文档 */
  generateDocs(code: string, language: string): Promise<string>;
  
  /** 重构代码 */
  refactor(
    code: string,
    language: string,
    goal: string
  ): Promise<string>;
}

// ============ AI Reviewer Types ============

/**
 * 代码审查请求
 */
export interface CodeReviewRequest {
  code: string;
  language: string;
  filePath?: string;
  diff?: string;
  context?: string;
  reviewTypes?: ReviewType[];
}

/**
 * 审查类型
 */
export type ReviewType = 'security' | 'performance' | 'style' | 'bug' | 'improvement';

/**
 * 审查问题
 */
export interface ReviewIssue {
  type: ReviewType;
  severity: 'error' | 'warning' | 'info' | 'suggestion';
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  code?: string;
  fixedCode?: string;
}

/**
 * 审查结果
 */
export interface CodeReviewResult {
  score: number;
  issues: ReviewIssue[];
  summary: string;
  recommendations: string[];
  model: string;
  reviewTime: number;
}

/**
 * AI 代码审查器接口
 */
export interface IAICodeReviewer {
  /** 审查代码 */
  review(request: CodeReviewRequest): Promise<CodeReviewResult>;
  
  /** 快速审查 */
  quickReview(code: string, language: string): Promise<CodeReviewResult>;
  
  /** 审查 PR/变更 */
  reviewChanges(
    baseCode: string,
    newCode: string,
    language: string
  ): Promise<CodeReviewResult>;
  
  /** 获取修复建议 */
  getSuggestions(issues: ReviewIssue[]): Promise<string[]>;
}

// ============ AI Test Generator Types ============

/**
 * 测试生成请求
 */
export interface TestGenerationRequest {
  code: string;
  language: string;
  testFramework?: string;
  coverageTargets?: string[];
  includeEdgeCases?: boolean;
}

/**
 * 测试用例
 */
export interface TestCase {
  name: string;
  description?: string;
  code: string;
  type: 'unit' | 'integration' | 'e2e';
  priority: 'high' | 'medium' | 'low';
}

/**
 * 测试生成响应
 */
export interface TestGenerationResponse {
  tests: TestCase[];
  coverageAnalysis: CoverageAnalysis;
  mockObjects?: string[];
  setupCode?: string;
  teardownCode?: string;
}

/**
 * 覆盖率分析
 */
export interface CoverageAnalysis {
  estimatedCoverage: number;
  coveredPaths: string[];
  uncoveredPaths: string[];
  edgeCases: string[];
}

/**
 * AI 测试生成器接口
 */
export interface IAITestGenerator {
  /** 生成测试 */
  generate(request: TestGenerationRequest): Promise<TestGenerationResponse>;
  
  /** 生成单个测试 */
  generateSingle(
    functionName: string,
    functionCode: string,
    language: string
  ): Promise<TestCase>;
  
  /** 分析测试覆盖 */
  analyzeCoverage(code: string, existingTests?: string): Promise<CoverageAnalysis>;
  
  /** 生成 Mock */
  generateMocks(
    dependencies: string[],
    language: string
  ): Promise<string[]>;
}

// ============ AI Suggester Types ============

/**
 * 建议类型
 */
export type SuggestionType = 
  | 'refactor' 
  | 'performance' 
  | 'security' 
  | 'best-practice' 
  | 'bug-fix' 
  | 'optimization';

/**
 * 代码建议
 */
export interface CodeSuggestion {
  type: SuggestionType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location?: {
    filePath?: string;
    startLine?: number;
    endLine?: number;
  };
  currentCode?: string;
  suggestedCode?: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  category: string;
}

/**
 * AI 代码建议器接口
 */
export interface IAICodeSuggester {
  /** 获取建议 */
  getSuggestions(
    code: string,
    language: string,
    context?: string
  ): Promise<CodeSuggestion[]>;
  
  /** 分析代码质量 */
  analyzeQuality(code: string, language: string): Promise<CodeQualityReport>;
  
  /** 获取特定类型建议 */
  getSuggestionsByType(
    code: string,
    language: string,
    types: SuggestionType[]
  ): Promise<CodeSuggestion[]>;
  
  /** 应用建议 */
  applySuggestion(
    code: string,
    suggestion: CodeSuggestion
  ): Promise<string>;
}

/**
 * 代码质量报告
 */
export interface CodeQualityReport {
  overallScore: number;
  metrics: {
    complexity: number;
    readability: number;
    maintainability: number;
    security: number;
    performance: number;
  };
  suggestions: CodeSuggestion[];
  summary: string;
}

// ============ Gateway Types ============

/**
 * LLM Gateway 配置
 */
export interface LLMGatewayConfig {
  defaultProvider: LLMProviderType;
  defaultModel: string;
  fallbackProviders?: LLMProviderType[];
  loadBalancing?: 'round-robin' | 'least-connections' | 'cost-based';
  cacheEnabled?: boolean;
  cacheTTL?: number;
  costTracking?: boolean;
  rateLimiting?: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

/**
 * LLM Gateway 接口
 */
export interface ILLMGateway {
  /** 初始化 */
  initialize(config: LLMGatewayConfig): Promise<void>;
  
  /** 注册 Provider */
  registerProvider(provider: ILLMProvider): void;
  
  /** 获取可用 Providers */
  getAvailableProviders(): LLMProviderType[];
  
  /** 发送聊天请求 */
  chat(
    messages: ChatMessage[],
    config?: Partial<ModelConfig>
  ): Promise<LLMResponse>;
  
  /** 流式聊天请求 */
  chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    config?: Partial<ModelConfig>
  ): Promise<LLMResponse>;
  
  /** 获取使用统计 */
  getUsageStats(): Promise<UsageStats>;
  
  /** 获取成本统计 */
  getCostStats(): Promise<CostStats>;
}

/**
 * 使用统计
 */
export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  byProvider: Record<LLMProviderType, number>;
  byModel: Record<string, number>;
}

/**
 * 成本统计
 */
export interface CostStats {
  totalCost: number;
  byProvider: Record<LLMProviderType, number>;
  byModel: Record<string, number>;
  totalTokens: {
    input: number;
    output: number;
  };
}

// ============ Prompt Templates ============

/**
 * Prompt 模板
 */
export interface PromptTemplate {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
}

/**
 * Prompt Builder 接口
 */
export interface IPromptBuilder {
  /** 构建 Prompt */
  build(template: PromptTemplate, variables: Record<string, string>): string;
  
  /** 获取模板 */
  getTemplate(name: string): PromptTemplate | undefined;
  
  /** 注册模板 */
  registerTemplate(template: PromptTemplate): void;
  
  /** 列出所有模板 */
  listTemplates(): string[];
}

// ============ Error Types ============

/**
 * AI 模块错误
 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Provider 错误
 */
export class ProviderError extends AIError {
  constructor(
    provider: LLMProviderType,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'PROVIDER_ERROR', { provider, ...details });
    this.name = 'ProviderError';
  }
}

/**
 * Rate Limit 错误
 */
export class RateLimitError extends AIError {
  constructor(
    provider: LLMProviderType,
    retryAfter?: number
  ) {
    super(
      `Rate limit exceeded for ${provider}`,
      'RATE_LIMITED',
      { provider, retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Embedding 错误
 */
export class EmbeddingError extends AIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EMBEDDING_ERROR', details);
    this.name = 'EmbeddingError';
  }
}

/**
 * RAG 错误
 */
export class RAGError extends AIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'RAG_ERROR', details);
    this.name = 'RAGError';
  }
}
