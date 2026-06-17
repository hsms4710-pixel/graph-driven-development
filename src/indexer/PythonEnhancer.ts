/**
 * Graph-Driven Development - Python Enhancer
 * 
 * 增强 Python 项目分析能力：
 * - 完整的 Python AST 解析
 * - 框架特定分析（Flask/Django/FastAPI/pytest）
 * - 类型注解、装饰器、异步函数支持
 * - 置信度算法优化
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface PythonSymbol {
  name: string;
  kind: 'function' | 'class' | 'method' | 'async_function' | 'decorator' | 'type';
  startLine: number;
  endLine: number;
  decorators?: string[];
  returnType?: string;
  parameters?: ParameterInfo[];
  isAsync: boolean;
  docstring?: string;
  complexity?: number;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  default?: string;
  isOptional: boolean;
}

export interface PythonFileAnalysis {
  path: string;
  symbols: PythonSymbol[];
  imports: ImportInfo[];
  frameworkHints: FrameworkHint[];
  codeMetrics: CodeMetrics;
}

export interface ImportInfo {
  module: string;
  symbols: string[];
  isRelative: boolean;
  alias?: string;
}

export interface FrameworkHint {
  framework: string;
  indicator: string;
  confidence: number;
  line: number;
}

export interface CodeMetrics {
  lines: number;
  commentLines: number;
  codeLines: number;
  complexity: number;
  cyclomaticComplexity: number;
  hasTypeAnnotations: boolean;
  hasDocstrings: boolean;
  asyncFunctions: number;
  decoratedFunctions: number;
}

export interface FrameworkAnalysis {
  framework: string | null;
  confidence: number;
  indicators: FrameworkHint[];
  detectedFeatures: string[];
}

// ==================== Python Enhancer ====================

export class PythonEnhancer {
  private projectPath: string;
  private cache: Map<string, PythonFileAnalysis> = new Map();
  
  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
  }
  
  /**
   * 分析 Python 项目
   */
  async analyzeProject(): Promise<{
    files: PythonFileAnalysis[];
    frameworkAnalysis: FrameworkAnalysis;
    projectMetrics: CodeMetrics;
  }> {
    const files = await this.analyzePythonFiles();
    const frameworkAnalysis = this.analyzeFramework(files);
    const projectMetrics = this.aggregateMetrics(files);
    
    return {
      files,
      frameworkAnalysis,
      projectMetrics
    };
  }
  
  /**
   * 分析所有 Python 文件
   */
  private async analyzePythonFiles(): Promise<PythonFileAnalysis[]> {
    const pythonFiles: string[] = [];
    this.scanForPythonFiles(this.projectPath, this.projectPath, pythonFiles);
    
    const analyses: PythonFileAnalysis[] = [];
    
    for (const filePath of pythonFiles) {
      if (this.shouldSkipFile(filePath)) {
        continue;
      }
      
      const analysis = this.analyzePythonFile(filePath);
      if (analysis) {
        analyses.push(analysis);
        this.cache.set(filePath, analysis);
      }
    }
    
    return analyses;
  }
  
  /**
   * 扫描 Python 文件
   */
  private scanForPythonFiles(basePath: string, currentPath: string, files: string[]): void {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // 跳过隐藏目录和常见排除目录
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === '__pycache__' ||
            entry.name === 'venv' ||
            entry.name === '.venv' ||
            entry.name === 'env' ||
            entry.name === 'dist' ||
            entry.name === 'build') {
          continue;
        }
        
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          this.scanForPythonFiles(basePath, fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.py')) {
          files.push(fullPath);
        }
      }
    } catch {
      // 忽略读取错误
    }
  }
  
  /**
   * 判断是否应该跳过文件
   */
  private shouldSkipFile(filePath: string): boolean {
    const basename = path.basename(filePath);
    const dirname = path.dirname(filePath);
    
    // 跳过测试文件（除非在 tests 目录）
    if (basename === '__init__.py' || basename === '__main__.py') {
      return false;
    }
    
    // 跳过常见的非业务文件
    if (basename.startsWith('test_') || basename.endsWith('_test.py')) {
      return false; // 测试文件仍然分析
    }
    
    return false;
  }
  
  /**
   * 分析单个 Python 文件
   */
  private analyzePythonFile(filePath: string): PythonFileAnalysis | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const symbols: PythonSymbol[] = [];
      const imports: ImportInfo[] = [];
      const frameworkHints: FrameworkHint[] = [];
      
      let commentLines = 0;
      let codeLines = 0;
      let cyclomaticComplexity = 1;
      let hasTypeAnnotations = false;
      let hasDocstrings = false;
      let asyncFunctions = 0;
      let decoratedFunctions = 0;
      
      // 状态跟踪
      let currentClass: { name: string; startLine: number; endLine: number; methods: string[] } | null = null;
      let currentFunc: { name: string; startLine: number; decorators: string[]; isAsync: boolean; hasReturn: boolean; params: string[] } | null = null;
      let currentDecorator: string | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // 计算行类型
        if (trimmed.startsWith('#')) {
          commentLines++;
        } else if (trimmed.match(/^[^#\s]/)) {
          codeLines++;
        }
        
        // 检测类型注解
        if (trimmed.includes(':') && trimmed.includes('->')) {
          hasTypeAnnotations = true;
        }
        
        // 检测 docstring
        if (trimmed.startsWith('"""') || trimmed.startsWith("''")) {
          hasDocstrings = true;
        }
        
        // 解析 import 语句
        const importMatch = this.parseImportStatement(trimmed);
        if (importMatch) {
          imports.push({
            module: importMatch.module,
            symbols: importMatch.symbols,
            isRelative: importMatch.isRelative,
            alias: importMatch.alias
          });
          
          // 检查框架导入
          this.checkFrameworkImport(importMatch.module, frameworkHints, i + 1);
        }
        
        // 解析装饰器
        const decoratorMatch = trimmed.match(/^@([\w\.]+)/);
        if (decoratorMatch) {
          currentDecorator = decoratorMatch[1];
          if (currentFunc) {
            currentFunc.decorators.push(currentDecorator);
          }
          continue;
        }
        
        // 解析 async 函数
        const asyncFuncMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/);
        if (asyncFuncMatch) {
          if (currentFunc) {
            // 保存之前的函数
            symbols.push(this.finalizeFunction(currentFunc, i, frameworkHints));
            if (currentFunc.isAsync) asyncFunctions++;
            if (currentFunc.decorators.length > 0) decoratedFunctions++;
          }
          
          const isAsync = trimmed.startsWith('async ');
          currentFunc = {
            name: asyncFuncMatch[1],
            startLine: i + 1,
            decorators: currentDecorator ? [currentDecorator] : [],
            isAsync,
            hasReturn: false,
            params: []
          };
          currentDecorator = null;
          
          // 检查框架装饰器
          this.checkFrameworkDecorator(currentFunc.decorators, frameworkHints, i + 1);
        }
        
        // 解析类
        const classMatch = trimmed.match(/^class\s+(\w+)/);
        if (classMatch) {
          if (currentClass) {
            symbols.push({
              name: currentClass.name,
              kind: 'class',
              startLine: currentClass.startLine,
              endLine: currentClass.endLine,
              decorators: [],
              isAsync: false
            });
          }
          
          currentClass = {
            name: classMatch[1],
            startLine: i + 1,
            endLine: i + 1,
            methods: []
          };
        }
        
        // 解析类方法
        if (currentClass && trimmed.match(/^\s+def\s+(\w+)/)) {
          const methodMatch = trimmed.match(/^\s+def\s+(\w+)/);
          if (methodMatch) {
            currentClass.methods.push(methodMatch[1]);
            currentClass.endLine = i + 1;
            
            // 检查异步方法
            if (trimmed.match(/^\s+async\s+def/)) {
              asyncFunctions++;
            }
            
            // 检查方法装饰器
            if (trimmed.match(/@/)) {
              decoratedFunctions++;
            }
          }
        }
        
        // 计算圈复杂度
        if (trimmed.includes('if ') || trimmed.includes('elif ') || trimmed.includes('else ')) {
          cyclomaticComplexity++;
        }
        if (trimmed.includes('for ') || trimmed.includes('while ')) {
          cyclomaticComplexity++;
        }
        if (trimmed.includes('try') || trimmed.includes('except')) {
          cyclomaticComplexity++;
        }
        if (trimmed.includes('?') && trimmed.includes(':')) {
          cyclomaticComplexity++; // 三元运算符
        }
        
        // 更新当前类的结束行
        if (currentClass) {
          currentClass.endLine = i + 1;
        }
        if (currentFunc) {
          currentFunc.startLine = Math.min(currentFunc.startLine, i + 1);
        }
      }
      
      // 保存最后一个函数
      if (currentFunc) {
        symbols.push(this.finalizeFunction(currentFunc, lines.length, frameworkHints));
        if (currentFunc.isAsync) asyncFunctions++;
        if (currentFunc.decorators.length > 0) decoratedFunctions++;
      }
      
      // 保存最后一个类
      if (currentClass) {
        symbols.push({
          name: currentClass.name,
          kind: 'class',
          startLine: currentClass.startLine,
          endLine: currentClass.endLine,
          decorators: [],
          isAsync: false,
          parameters: currentClass.methods.map(m => ({
            name: m,
            isOptional: false
          }))
        });
      }
      
      const metrics: CodeMetrics = {
        lines: lines.length,
        commentLines,
        codeLines,
        complexity: this.calculateComplexity(symbols),
        cyclomaticComplexity,
        hasTypeAnnotations,
        hasDocstrings,
        asyncFunctions,
        decoratedFunctions
      };
      
      return {
        path: path.relative(this.projectPath, filePath),
        symbols,
        imports,
        frameworkHints,
        codeMetrics: metrics
      };
    } catch {
      return null;
    }
  }
  
  /**
   * 解析 import 语句
   */
  private parseImportStatement(line: string): { module: string; symbols: string[]; isRelative: boolean; alias?: string } | null {
    // import module
    const simpleImport = line.match(/^import\s+([\w\.]+)(?:\s+as\s+(\w+))?/);
    if (simpleImport) {
      return {
        module: simpleImport[1],
        symbols: [],
        isRelative: simpleImport[1].startsWith('.'),
        alias: simpleImport[2]
      };
    }
    
    // from module import symbol
    const fromImport = line.match(/^from\s+([\w\.]+)\s+import\s+(.+)$/);
    if (fromImport) {
      const symbolsStr = fromImport[2];
      const symbols = symbolsStr.split(',').map(s => {
        const match = s.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        return match ? match[2] || match[1] : s.trim();
      });
      
      return {
        module: fromImport[1],
        symbols,
        isRelative: fromImport[1].startsWith('.'),
        alias: symbols.length === 1 ? undefined : undefined
      };
    }
    
    return null;
  }
  
  /**
   * 检查框架导入
   */
  private checkFrameworkImport(module: string, hints: FrameworkHint[], line: number): void {
    const normalized = module.toLowerCase();
    
    // FastAPI
    if (normalized.includes('fastapi') || normalized.includes('pydantic')) {
      hints.push({
        framework: 'fastapi',
        indicator: `import ${module}`,
        confidence: 0.9,
        line
      });
    }
    
    // Django
    if (normalized.includes('django')) {
      hints.push({
        framework: 'django',
        indicator: `import ${module}`,
        confidence: 0.95,
        line
      });
    }
    
    // Flask
    if (normalized.includes('flask') || normalized.includes('werkzeug')) {
      hints.push({
        framework: 'flask',
        indicator: `import ${module}`,
        confidence: 0.9,
        line
      });
    }
    
    // Celery
    if (normalized.includes('celery')) {
      hints.push({
        framework: 'celery',
        indicator: `import ${module}`,
        confidence: 0.85,
        line
      });
    }
    
    // SQLAlchemy
    if (normalized.includes('sqlalchemy')) {
      hints.push({
        framework: 'sqlalchemy',
        indicator: `import ${module}`,
        confidence: 0.7,
        line
      });
    }
    
    // Pytest
    if (normalized.includes('pytest') || normalized.includes('pytest_asyncio') || normalized.includes('pytest_mock')) {
      hints.push({
        framework: 'pytest',
        indicator: `import ${module}`,
        confidence: 0.9,
        line
      });
    }
    
    // Typer
    if (normalized.includes('typer')) {
      hints.push({
        framework: 'typer',
        indicator: `import ${module}`,
        confidence: 0.9,
        line
      });
    }
    
    // Rich
    if (normalized.includes('rich')) {
      hints.push({
        framework: 'rich',
        indicator: `import ${module}`,
        confidence: 0.8,
        line
      });
    }
  }
  
  /**
   * 检查框架装饰器
   */
  private checkFrameworkDecorator(decorators: string[], hints: FrameworkHint[], line: number): void {
    for (const decorator of decorators) {
      const normalized = decorator.toLowerCase();
      
      // FastAPI
      if (normalized.includes('@app.get') || normalized.includes('@app.post') || 
          normalized.includes('@app.put') || normalized.includes('@app.delete') ||
          normalized.includes('@router') || normalized.includes('@api_route')) {
        hints.push({
          framework: 'fastapi',
          indicator: decorator,
          confidence: 0.95,
          line
        });
      }
      
      // Flask
      if (normalized.includes('@app.route') || normalized.includes('@blueprint')) {
        hints.push({
          framework: 'flask',
          indicator: decorator,
          confidence: 0.95,
          line
        });
      }
      
      // Django
      if (normalized.includes('@api_view') || normalized.includes('@action') ||
          normalized.includes('@permission_classes')) {
        hints.push({
          framework: 'django',
          indicator: decorator,
          confidence: 0.95,
          line
        });
      }
      
      // Celery
      if (normalized.includes('@task') || normalized.includes('@shared_task')) {
        hints.push({
          framework: 'celery',
          indicator: decorator,
          confidence: 0.9,
          line
        });
      }
      
      // Typer
      if (normalized.includes('@app.command') || normalized.includes('@click.command')) {
        hints.push({
          framework: 'typer',
          indicator: decorator,
          confidence: 0.9,
          line
        });
      }
      
      // Pytest
      if (normalized.includes('@pytest.fixture') || normalized.includes('@pytest.mark')) {
        hints.push({
          framework: 'pytest',
          indicator: decorator,
          confidence: 0.9,
          line
        });
      }
    }
  }
  
  /**
   * 完成函数符号
   */
  private finalizeFunction(func: {
    name: string;
    startLine: number;
    decorators: string[];
    isAsync: boolean;
    hasReturn: boolean;
    params: string[];
  }, endLine: number, _hints: FrameworkHint[]): PythonSymbol {
    return {
      name: func.name,
      kind: func.isAsync ? 'async_function' : 'function',
      startLine: func.startLine,
      endLine,
      decorators: func.decorators,
      isAsync: func.isAsync
    };
  }
  
  /**
   * 计算复杂度
   */
  private calculateComplexity(symbols: PythonSymbol[]): number {
    let complexity = 1;
    
    for (const symbol of symbols) {
      if (symbol.kind === 'function' || symbol.kind === 'async_function' || symbol.kind === 'method') {
        complexity++;
        if (symbol.decorators && symbol.decorators.length > 0) {
          complexity += Math.min(symbol.decorators.length, 2);
        }
      }
    }
    
    if (complexity > 10) return 10;
    return complexity;
  }
  
  /**
   * 分析框架
   */
  private analyzeFramework(files: PythonFileAnalysis[]): FrameworkAnalysis {
    const frameworkScores: Map<string, { totalConfidence: number; indicators: FrameworkHint[]; features: string[] }> = new Map();
    
    // 收集所有框架提示
    for (const file of files) {
      for (const hint of file.frameworkHints) {
        if (!frameworkScores.has(hint.framework)) {
          frameworkScores.set(hint.framework, {
            totalConfidence: 0,
            indicators: [],
            features: []
          });
        }
        
        const score = frameworkScores.get(hint.framework)!;
        score.totalConfidence += hint.confidence;
        score.indicators.push(hint);
        
        // 提取特征
        if (hint.indicator.includes('@app.') || hint.indicator.includes('@router')) {
          score.features.push('路由定义');
        }
        if (hint.indicator.includes('@task') || hint.indicator.includes('@shared_task')) {
          score.features.push('异步任务');
        }
        if (hint.indicator.includes('@pytest.fixture')) {
          score.features.push('测试夹具');
        }
        if (hint.indicator.includes('sqlalchemy') || hint.indicator.includes('database')) {
          score.features.push('数据库');
        }
      }
    }
    
    // 计算最终置信度
    let mainFramework: string | null = null;
    let mainConfidence = 0;
    
    for (const [framework, score] of frameworkScores) {
      const avgConfidence = score.indicators.length > 0 
        ? score.totalConfidence / score.indicators.length 
        : 0;
      
      // 加权置信度：指标数量 * 平均置信度
      const weightedConfidence = avgConfidence * Math.min(score.indicators.length, 5) / 5;
      
      if (weightedConfidence > mainConfidence) {
        mainConfidence = weightedConfidence;
        mainFramework = framework;
      }
      
      score.totalConfidence = weightedConfidence;
    }
    
    return {
      framework: mainFramework,
      confidence: Math.min(mainConfidence, 1),
      indicators: mainFramework ? frameworkScores.get(mainFramework)!.indicators : [],
      detectedFeatures: mainFramework ? frameworkScores.get(mainFramework)!.features : []
    };
  }
  
  /**
   * 聚合项目指标
   */
  private aggregateMetrics(files: PythonFileAnalysis[]): CodeMetrics {
    let totalLines = 0;
    let totalCommentLines = 0;
    let totalCodeLines = 0;
    let totalComplexity = 0;
    let totalCyclomaticComplexity = 0;
    let hasTypeAnnotations = false;
    let hasDocstrings = false;
    let totalAsyncFunctions = 0;
    let totalDecoratedFunctions = 0;
    
    for (const file of files) {
      totalLines += file.codeMetrics.lines;
      totalCommentLines += file.codeMetrics.commentLines;
      totalCodeLines += file.codeMetrics.codeLines;
      totalComplexity += file.codeMetrics.complexity;
      totalCyclomaticComplexity += file.codeMetrics.cyclomaticComplexity;
      if (file.codeMetrics.hasTypeAnnotations) hasTypeAnnotations = true;
      if (file.codeMetrics.hasDocstrings) hasDocstrings = true;
      totalAsyncFunctions += file.codeMetrics.asyncFunctions;
      totalDecoratedFunctions += file.codeMetrics.decoratedFunctions;
    }
    
    return {
      lines: totalLines,
      commentLines: totalCommentLines,
      codeLines: totalCodeLines,
      complexity: Math.min(Math.ceil(totalComplexity / files.length), 10),
      cyclomaticComplexity: Math.ceil(totalCyclomaticComplexity / files.length),
      hasTypeAnnotations,
      hasDocstrings,
      asyncFunctions: totalAsyncFunctions,
      decoratedFunctions: totalDecoratedFunctions
    };
  }
}

// ==================== 导出 ====================

export default PythonEnhancer;
