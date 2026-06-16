/**
 * Error Handler - 错误处理和恢复系统
 * 
 * 提供统一的错误处理、恢复和报告功能
 */

import { Logger, initLogger } from './logger';

// 错误类型
export type ErrorCategory = 
  | 'validation'
  | 'business'
  | 'database'
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'internal'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// 错误上下文
export interface ErrorContext {
  operation: string;
  module: string;
  userId?: string;
  sessionId?: string;
  graphId?: string;
  nodeId?: string;
  extra?: Record<string, unknown>;
}

// 结构化错误
export class GDDError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly httpStatus: number;
  readonly context: ErrorContext;
  readonly timestamp: Date;
  
  constructor(
    message: string,
    code: string,
    category: ErrorCategory = 'internal',
    severity: ErrorSeverity = 'medium',
    httpStatus: number = 500,
    context: ErrorContext = { operation: 'unknown', module: 'unknown' }
  ) {
    super(message);
    this.name = 'GDDError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.httpStatus = httpStatus;
    this.context = context;
    this.timestamp = new Date();
    
    // 保持原型链
    Object.setPrototypeOf(this, new.target.prototype);
  }
  
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      httpStatus: this.httpStatus,
      context: this.context,
      timestamp: this.timestamp.toISOString()
    };
  }
}

// 预定义错误工厂
export const Errors = {
  // 验证错误
  validation: (message: string, field?: string) => {
    return new GDDError(
      field ? `${message} (${field})` : message,
      'VALIDATION_ERROR',
      'validation',
      'low',
      400,
      { operation: 'validation', module: 'validation' }
    );
  },
  
  // 业务错误
  notFound: (resource: string, id: string) => {
    return new GDDError(
      `${resource} not found: ${id}`,
      'NOT_FOUND',
      'not_found',
      'low',
      404,
      { operation: 'retrieve', module: 'graph' }
    );
  },
  
  alreadyExists: (resource: string, id: string) => {
    return new GDDError(
      `${resource} already exists: ${id}`,
      'ALREADY_EXISTS',
      'business',
      'low',
      409,
      { operation: 'create', module: 'graph' }
    );
  },
  
  invalidState: (resource: string, currentState: string, expectedState: string) => {
    return new GDDError(
      `Invalid state for ${resource}: expected ${expectedState}, got ${currentState}`,
      'INVALID_STATE',
      'business',
      'medium',
      400,
      { operation: 'state_transition', module: 'graph' }
    );
  },
  
  // 数据库错误
  database: (message: string, operation?: string) => {
    return new GDDError(
      `Database error: ${message}`,
      'DATABASE_ERROR',
      'database',
      'high',
      500,
      { operation: operation || 'unknown', module: 'database' }
    );
  },
  
  // 网络错误
  network: (message: string, url?: string) => {
    return new GDDError(
      `Network error: ${message}`,
      'NETWORK_ERROR',
      'network',
      'high',
      502,
      { operation: 'request', module: 'network', extra: { url } }
    );
  },
  
  // 认证错误
  unauthorized: (message: string = 'Unauthorized') => {
    return new GDDError(
      message,
      'UNAUTHORIZED',
      'authentication',
      'medium',
      401,
      { operation: 'authenticate', module: 'auth' }
    );
  },
  
  // 授权错误
  forbidden: (message: string = 'Forbidden') => {
    return new GDDError(
      message,
      'FORBIDDEN',
      'authorization',
      'medium',
      403,
      { operation: 'authorize', module: 'auth' }
    );
  },
  
  // 内部错误
  internal: (message: string, details?: Record<string, unknown>) => {
    return new GDDError(
      `Internal error: ${message}`,
      'INTERNAL_ERROR',
      'internal',
      'critical',
      500,
      { operation: 'internal', module: 'system', extra: details }
    );
  }
};

// 错误处理器配置
interface ErrorHandlerConfig {
  logger?: Logger;
  reportUrl?: string;
  enableStacktrace?: boolean;
  enableRecovery?: boolean;
}

// 默认配置
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableStacktrace: process.env.NODE_ENV === 'development',
  enableRecovery: true
};

// 全局错误处理器
let globalHandler: ErrorHandler | null = null;

/**
 * 错误处理器
 */
export class ErrorHandler {
  private logger: Logger;
  private config: ErrorHandlerConfig;
  private errorCount: number = 0;
  private criticalErrors: GDDError[] = [];
  
  constructor(config: ErrorHandlerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = config.logger || initLogger();
  }
  
  /**
   * 处理错误
   */
  handle(error: GDDError | Error, context?: Partial<ErrorContext>): void {
    // 转换为 GDDError
    const gddError = error instanceof GDDError 
      ? error 
      : new GDDError(
          error.message || 'Unknown error',
          'UNKNOWN_ERROR',
          'unknown',
          'medium',
          500,
          { operation: 'unknown', module: 'unknown', ...context }
        );
    
    // 记录错误
    this.logError(gddError);
    
    // 增加错误计数
    this.errorCount++;
    
    // 收集关键错误
    if (gddError.severity === 'critical') {
      this.criticalErrors.push(gddError);
    }
    
    // 尝试恢复
    if (this.config.enableRecovery) {
      this.tryRecover(gddError);
    }
    
    // 上报错误
    this.report(gddError);
  }
  
  /**
   * 记录错误日志
   */
  private logError(error: GDDError): void {
    const logMethod = error.severity === 'critical' 
      ? this.logger.error 
      : error.severity === 'high' 
        ? this.logger.warn 
        : this.logger.info;
    
    const message = this.config.enableStacktrace && error.stack
      ? `${error.message}\n${error.stack}`
      : error.message;
    
    logMethod.call(this.logger, `[${error.code}] ${message}`, error.context);
  }
  
  /**
   * 尝试恢复
   */
  private tryRecover(error: GDDError): boolean {
    // 根据错误类型尝试不同的恢复策略
    switch (error.category) {
      case 'database':
        // 数据库错误：尝试重连
        this.logger.info('Attempting database reconnection...');
        // TODO: 实现数据库重连逻辑
        return false;
        
      case 'network':
        // 网络错误：稍后重试
        this.logger.info('Scheduling network retry...');
        // TODO: 实现网络重试逻辑
        return false;
        
      default:
        return false;
    }
  }
  
  /**
   * 上报错误
   */
  private report(_error: GDDError): void {
    if (!this.config.reportUrl) return;
    
    // TODO: 实现错误上报逻辑
    // 可以使用 Sentry、Bugsnag 等服务
  }
  
  /**
   * 创建错误响应
   */
  toResponse(error: GDDError): {
    statusCode: number;
    body: Record<string, unknown>;
  } {
    return {
      statusCode: error.httpStatus,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          category: error.category,
          ...(this.config.enableStacktrace && {
            stack: error.stack
          })
        }
      }
    };
  }
  
  /**
   * 获取错误统计
   */
  getStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    criticalCount: number;
  } {
    const stats = {
      total: this.errorCount,
      byCategory: {} as Record<ErrorCategory, number>,
      criticalCount: this.criticalErrors.length
    };
    
    for (const error of this.criticalErrors) {
      stats.byCategory[error.category] = 
        (stats.byCategory[error.category] || 0) + 1;
    }
    
    return stats;
  }
  
  /**
   * 重置统计
   */
  reset(): void {
    this.errorCount = 0;
    this.criticalErrors = [];
  }
}

/**
 * 获取全局错误处理器
 */
export function getErrorHandler(): ErrorHandler {
  if (!globalHandler) {
    globalHandler = new ErrorHandler();
  }
  return globalHandler;
}

/**
 * 初始化全局错误处理器
 */
export function initErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  globalHandler = new ErrorHandler(config);
  return globalHandler;
}

// 便捷方法
export const handleError = (error: GDDError | Error, context?: Partial<ErrorContext>) => {
  getErrorHandler().handle(error, context);
};

// Express 错误处理中间件
export function expressErrorHandler(): (err: Error, req: any, res: any, next: any) => void {
  return (err: Error, req: any, res: any, _next: any) => {
    const gddError = err instanceof GDDError ? err : Errors.internal(err.message);
    
    handleError(gddError, {
      operation: req.method + ' ' + req.path,
      module: 'express',
      userId: (req.user as any)?.id,
      extra: { userAgent: req.get('User-Agent') }
    });
    
    const { statusCode, body } = getErrorHandler().toResponse(gddError);
    res.status(statusCode).json(body);
  };
}
