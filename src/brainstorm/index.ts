/**
 * Brainstorm Engine 模块导出
 */

// 基础引擎
export { BrainstormEngine, brainstormEngine } from './BrainstormEngine';
export { QuestionGenerator } from './QuestionGenerator';

// 智能引擎 (M3)
export { 
  SmartBrainstormEngine, 
  smartBrainstormEngine
} from './SmartBrainstormEngine';
export type { 
  SmartClarificationSession,
  InferenceRecord,
  SmartEngineConfig
} from './SmartBrainstormEngine';
export { 
  SmartQuestionGenerator, 
  smartQuestionGenerator
} from './SmartQuestionGenerator';
export type {
  SmartGeneratorConfig,
  LLMConfig
} from './SmartQuestionGenerator';
export { 
  ContextAnalyzer, 
  contextAnalyzer
} from './ContextAnalyzer';
export type {
  ProjectContext,
  ArchitecturePattern,
  DesignPattern,
  CodeMetrics,
  InferredRequirement,
  AnalysisConfig
} from './ContextAnalyzer';

// 类型导出
export * from './types';
