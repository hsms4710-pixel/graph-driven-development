/**
 * ASTParser - AST 解析器
 * 
 * 使用 Tree-sitter 解析代码文件，提取：
 * - 类定义
 * - 函数定义
 * - 导入/导出关系
 * - 调用关系
 */

export interface ParseResult {
  filePath: string;
  language: string;
  nodes: Array<{
    type: string;
    name: string;
    startLine: number;
    endLine: number;
    properties: Record<string, any>;
  }>;
  imports: Array<{
    source: string;
    imports: string[];
  }>;
  exports: string[];
  calls: Array<{
    caller: string;
    callee: string;
  }>;
}

export class ASTParser {
  
  /**
   * 根据文件扩展名判断语言
   */
  static detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
    };
    
    return languageMap[ext || ''] || 'unknown';
  }
  
  /**
   * 解析单个文件
   */
  static async parseFile(filePath: string, content: string): Promise<ParseResult> {
    const language = this.detectLanguage(filePath);
    
    // 这里简化处理，实际应该使用 Tree-sitter 解析
    // TODO: 集成 Tree-sitter
    
    return {
      filePath,
      language,
      nodes: this.extractNodes(content, language),
      imports: this.extractImports(content, language),
      exports: this.extractExports(content, language),
      calls: this.extractCalls(content, language)
    };
  }
  
  /**
   * 提取节点（类、函数等）
   */
  private static extractNodes(content: string, language: string) {
    const nodes: ParseResult['nodes'] = [];
    
    if (language === 'typescript' || language === 'javascript') {
      // 简单的正则匹配，实际应该使用 AST 解析
      
      // 匹配 class
      const classRegex = /class\s+(\w+)/g;
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        nodes.push({
          type: 'class',
          name: match[1],
          startLine: content.substring(0, match.index).split('\n').length,
          endLine: 0,
          properties: { kind: 'class' }
        });
      }
      
      // 匹配 function
      const funcRegex = /(?:async\s+)?function\s+(\w+)/g;
      while ((match = funcRegex.exec(content)) !== null) {
        nodes.push({
          type: 'function',
          name: match[1],
          startLine: content.substring(0, match.index).split('\n').length,
          endLine: 0,
          properties: { kind: 'function' }
        });
      }
      
      // 匹配 const/let/var 函数式定义
      const arrowFuncRegex = /(\w+)\s*[:(]\s*\([^)]*\)\s*=>/g;
      while ((match = arrowFuncRegex.exec(content)) !== null) {
        const name = match[1];
        if (!['const', 'let', 'var', 'function', 'async', 'if', 'while', 'for'].includes(name)) {
          nodes.push({
            type: 'function',
            name,
            startLine: content.substring(0, match.index).split('\n').length,
            endLine: 0,
            properties: { kind: 'arrow-function' }
          });
        }
      }
    }
    
    return nodes;
  }
  
  /**
   * 提取导入语句
   */
  private static extractImports(content: string, language: string) {
    const imports: ParseResult['imports'] = [];
    
    if (language === 'typescript' || language === 'javascript') {
      // 匹配 import 语句
      const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s*(?:as\s+(\w+))?\s*from\s*['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const namedImports = match[1];
        const defaultImport = match[2];
        const alias = match[3];
        const source = match[4];
        
        const importsList = namedImports
          ?.split(',')
          .map(s => s.trim().split(/\s+as\s+/)[0]) || [];
        
        if (defaultImport) {
          importsList.push(alias || defaultImport);
        }
        
        imports.push({
          source,
          imports: importsList
        });
      }
    }
    
    return imports;
  }
  
  /**
   * 提取导出语句
   */
  private static extractExports(content: string, language: string) {
    const exports: string[] = [];
    
    if (language === 'typescript' || language === 'javascript') {
      // 匹配 export 语句
      const exportRegex = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g;
      let match;
      
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }
      
      // 匹配具名导出
      const namedExportRegex = /export\s+\{\s*([^}]+)\s*\}/g;
      while ((match = namedExportRegex.exec(content)) !== null) {
        const namedExports = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
        exports.push(...namedExports);
      }
    }
    
    return exports;
  }
  
  /**
   * 提取函数调用关系
   */
  private static extractCalls(content: string, language: string) {
    const calls: ParseResult['calls'] = [];
    
    if (language === 'typescript' || language === 'javascript') {
      // 简单的函数调用匹配
      const callRegex = /(\w+)\s*\(\s*([^)]*)\s*\)/g;
      let match;
      
      while ((match = callRegex.exec(content)) !== null) {
        const funcName = match[1];
        // 排除关键字和常见操作符
        if (!['if', 'while', 'for', 'switch', 'catch', 'new', 'typeof', 'instanceof', 
              'delete', 'void', 'await', 'yield', 'return', 'throw', 'console', 
              'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
              'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
              'Promise', 'Error', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet',
              'Proxy', 'Reflect', 'Symbol', 'Function', 'undefined', 'null', 'true', 'false']
              .includes(funcName)) {
          calls.push({
            caller: 'unknown',
            callee: funcName
          });
        }
      }
    }
    
    return calls;
  }
}
