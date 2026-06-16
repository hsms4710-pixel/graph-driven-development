/**
 * Logger - 日志系统
 * 
 * 提供统一的日志记录和管理功能
 */

import fs from 'fs';
import path from 'path';

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

// 日志配置
export interface LoggerConfig {
  level: LogLevel;
  file?: string;
  maxFileSize?: number;  // 字节
  maxFiles?: number;
  timestamp: boolean;
  colors: boolean;
  includeCaller: boolean;
}

// 默认配置
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  file: undefined,
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  maxFiles: 5,
  timestamp: true,
  colors: true,
  includeCaller: true
};

// ANSI 颜色码
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m'   // red
};

// 日志级别优先级
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

// 日志文件句柄缓存
let logStream: fs.WriteStream | null = null;

/**
 * Logger 类
 */
export class Logger {
  private config: LoggerConfig;
  private prefix: string;
  
  constructor(config: Partial<LoggerConfig> = {}, prefix: string = '') {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.prefix = prefix;
    
    // 初始化日志文件
    if (this.config.file) {
      this.initLogFile();
    }
  }
  
  /**
   * 初始化日志文件
   */
  private initLogFile(): void {
    const logDir = path.dirname(this.config.file!);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 检查文件大小，需要时轮转
    if (fs.existsSync(this.config.file!)) {
      const stats = fs.statSync(this.config.file!);
      if (stats.size > (this.config.maxFileSize || DEFAULT_CONFIG.maxFileSize!)) {
        this.rotateLogFile();
      }
    }
    
    logStream = fs.createWriteStream(this.config.file!, { flags: 'a' });
  }
  
  /**
   * 轮转日志文件
   */
  private rotateLogFile(): void {
    if (!this.config.file) return;
    
    const logPath = this.config.file;
    const maxFiles = this.config.maxFiles || DEFAULT_CONFIG.maxFiles!;
    
    // 删除最旧的日志文件
    if (fs.existsSync(`${logPath}.${maxFiles}`)) {
      fs.unlinkSync(`${logPath}.${maxFiles}`);
    }
    
    // 重命名所有日志文件
    for (let i = maxFiles - 1; i >= 1; i--) {
      const src = i === 1 ? logPath : `${logPath}.${i - 1}`;
      const dest = `${logPath}.${i}`;
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
      }
    }
    
    // 创建新日志文件
    fs.writeFileSync(logPath, '');
  }
  
  /**
   * 获取调用者信息
   */
  private getCallerInfo(): string {
    if (!this.config.includeCaller) return '';
    
    const stack = new Error().stack?.split('\n');
    if (!stack || stack.length < 4) return '';
    
    const caller = stack[3].trim();
    const match = caller.match(/at\s+(?:.+\s+)?\((.+):\d+:\d+\)/);
    const fileName = match ? path.basename(match[1]) : 'unknown';
    
    return ` [${fileName}]`;
  }
  
  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = this.config.timestamp 
      ? new Date().toISOString() 
      : '';
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const caller = this.getCallerInfo();
    
    let formatted = '';
    if (timestamp) formatted += `[${timestamp}]`;
    if (prefix) formatted += prefix;
    formatted += ` [${level.toUpperCase()}]${caller}: ${message}`;
    
    if (args.length > 0) {
      formatted += ' ' + args.map(a => 
        typeof a === 'object' ? JSON.stringify(a) : String(a)
      ).join(' ');
    }
    
    return formatted;
  }
  
  /**
   * 输出日志
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level]) {
      return;
    }
    
    if (level === 'silent') return;
    
    const formatted = this.formatMessage(level, message, ...args);
    const colored = this.config.colors 
      ? `${COLORS[level]}${formatted}${COLORS.reset}`
      : formatted;
    
    // 控制台输出
    switch (level) {
      case 'debug':
        console.debug(colored);
        break;
      case 'info':
        console.info(colored);
        break;
      case 'warn':
        console.warn(colored);
        break;
      case 'error':
        console.error(colored);
        break;
    }
    
    // 文件输出
    if (logStream && this.config.file) {
      logStream.write(formatted + '\n');
    }
  }
  
  /**
   * Debug 级别日志
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }
  
  /**
   * Info 级别日志
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }
  
  /**
   * Warn 级别日志
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }
  
  /**
   * Error 级别日志
   */
  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }
  
  /**
   * 创建带前缀的子 Logger
   */
  child(prefix: string): Logger {
    return new Logger(this.config, prefix);
  }
  
  /**
   * 更新配置
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  /**
   * 关闭日志文件
   */
  close(): void {
    if (logStream) {
      logStream.end();
      logStream = null;
    }
  }
}

// 全局 Logger 实例
let globalLogger: Logger | null = null;

/**
 * 获取全局 Logger
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * 初始化全局 Logger
 */
export function initLogger(config?: Partial<LoggerConfig>): Logger {
  globalLogger = new Logger(config);
  return globalLogger;
}

// 便捷方法
export const log = {
  debug: (msg: string, ...args: unknown[]) => getLogger().debug(msg, ...args),
  info: (msg: string, ...args: unknown[]) => getLogger().info(msg, ...args),
  warn: (msg: string, ...args: unknown[]) => getLogger().warn(msg, ...args),
  error: (msg: string, ...args: unknown[]) => getLogger().error(msg, ...args)
};
