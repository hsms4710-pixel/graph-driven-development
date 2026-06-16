/**
 * Graph-Driven Development - Code Indexer
 * 
 * 从代码仓库生成图谱结构
 * 支持：TypeScript, JavaScript, Python
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface IndexResult {
  graphId: string;
  name: string;
  nodes: IndexedNode[];
  edges: IndexedEdge[];
  summary: IndexSummary;
}

export interface IndexedNode {
  id: string;
  layer: string;
  label: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  type: string;
  properties: Record<string, unknown>;
}

export interface IndexedEdge {
  id: string;
  source: string;
  target: string;
  type: 'depends_on' | 'contains' | 'implements' | 'imports' | 'refines';
  label?: string;
}

export interface IndexSummary {
  filesScanned: number;
  nodesGenerated: number;
  edgesGenerated: number;
  layers: Record<string, number>;
  errors: string[];
}

// ==================== 语言配置 ====================

const LANGUAGE_CONFIG: Record<string, { extensions: string[] }> = {
  typescript: { extensions: ['.ts', '.tsx'] },
  javascript: { extensions: ['.js', '.jsx', '.mjs'] },
  python: { extensions: ['.py'] },
  go: { extensions: ['.go'] },
  rust: { extensions: ['.rs'] },
};

// ==================== 代码索引器 ====================

export class CodeIndexer {
  private graphId: string;
  private projectPath: string;
  private nodes: IndexedNode[] = [];
  private edges: IndexedEdge[] = [];
  private errors: string[] = [];
  private filesScanned = 0;
  
  constructor(graphId: string, projectPath: string) {
    this.graphId = graphId;
    this.projectPath = path.resolve(projectPath);
  }
  
  /**
   * 执行索引
   */
  async index(): Promise<IndexResult> {
    console.log('[Indexer] Starting index for:', this.projectPath);
    
    // 1. 扫描项目结构
    const projectInfo = this.analyzeProjectStructure();
    
    // 2. 生成 L1-L5 层级节点
    this.generateLayerNodes(projectInfo);
    
    // 3. 分析依赖关系
    this.analyzeImportDependencies(projectInfo.files);
    
    // 4. 生成摘要
    const summary = this.generateSummary(projectInfo.files.length);
    
    console.log('[Indexer] Index complete:', summary.nodesGenerated, 'nodes,', summary.edgesGenerated, 'edges');
    
    return {
      graphId: this.graphId,
      name: path.basename(this.projectPath),
      nodes: this.nodes,
      edges: this.edges,
      summary
    };
  }
  
  /**
   * 分析项目结构
   */
  private analyzeProjectStructure(): ProjectInfo {
    const files: FileInfo[] = [];
    const directories: string[] = [];
    const packageJson = this.findPackageJson();
    
    // 递归扫描文件
    this.scanDirectory(this.projectPath, this.projectPath, files, directories);
    
    return {
      rootPath: this.projectPath,
      files,
      directories,
      packageJson,
      language: this.detectLanguage(files),
      framework: this.detectFramework(files, packageJson)
    };
  }
  
  private scanDirectory(basePath: string, currentPath: string, files: FileInfo[], directories: string[]): void {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // 跳过隐藏目录和 node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
          continue;
        }
        
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          directories.push(relativePath);
          this.scanDirectory(basePath, fullPath, files, directories);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const language = this.getLanguageFromExtension(ext);
          
          if (language) {
            files.push({
              path: relativePath,
              name: entry.name,
              language,
              size: fs.statSync(fullPath).size
            });
            this.filesScanned++;
          }
        }
      }
    } catch (error) {
      this.errors.push(`Failed to scan ${currentPath}`);
    }
  }
  
  private findPackageJson(): PackageJsonInfo | null {
    const pkgPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return {
          name: content.name,
          version: content.version,
          description: content.description,
          dependencies: Object.keys(content.dependencies || {}),
          devDependencies: Object.keys(content.devDependencies || {}),
        };
      } catch {
        return null;
      }
    }
    return null;
  }
  
  private getLanguageFromExtension(ext: string): string | null {
    for (const [lang, config] of Object.entries(LANGUAGE_CONFIG)) {
      if (config.extensions.includes(ext)) {
        return lang;
      }
    }
    return null;
  }
  
  private detectLanguage(files: FileInfo[]): string {
    const counts: Record<string, number> = {};
    
    for (const file of files) {
      counts[file.language] = (counts[file.language] || 0) + 1;
    }
    
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
  }
  
  private detectFramework(_files: FileInfo[], packageJson: PackageJsonInfo | null): string | null {
    if (packageJson) {
      if (packageJson.dependencies.includes('express') || packageJson.devDependencies.includes('express')) {
        return 'express';
      }
      if (packageJson.dependencies.includes('react') || packageJson.devDependencies.includes('react')) {
        return 'react';
      }
      if (packageJson.dependencies.includes('vue') || packageJson.devDependencies.includes('vue')) {
        return 'vue';
      }
      if (packageJson.dependencies.includes('next') || packageJson.devDependencies.includes('next')) {
        return 'nextjs';
      }
    }
    return null;
  }
  
  /**
   * 生成层级节点
   */
  private generateLayerNodes(projectInfo: ProjectInfo): void {
    const { language, framework, files, packageJson } = projectInfo;
    const now = Date.now();
    
    // L1: Constitution
    const l1Id = `node_l1_${now}`;
    this.nodes.push({
      id: l1Id,
      layer: 'L1_Constitution',
      label: '项目宪法',
      type: 'constitution',
      properties: {
        language,
        framework,
        description: packageJson?.description || path.basename(this.projectPath),
        source: 'auto-detected'
      }
    });
    
    // L2: TechStack
    const l2Id = `node_l2_${now}`;
    const techStack = this.extractTechStack(packageJson, language);
    this.nodes.push({
      id: l2Id,
      layer: 'L2_TechStack',
      label: '技术栈',
      type: 'techstack',
      properties: {
        language,
        framework,
        mainDependencies: techStack.slice(0, 10),
        source: 'auto-detected'
      }
    });
    
    // L1 -> L2 edge
    this.edges.push({
      id: `edge_${l1Id}_to_${l2Id}`,
      source: l1Id,
      target: l2Id,
      type: 'refines' as any,
      label: '技术选型'
    });
    
    // L3: Epic - modules
    const modules = this.identifyModules(files, projectInfo.directories);
    for (const module of modules) {
      const moduleId = `node_l3_${module.name}_${now}`;
      this.nodes.push({
        id: moduleId,
        layer: 'L3_Epic',
        label: module.name,
        filePath: module.path,
        type: 'module',
        properties: {
          fileCount: module.fileCount,
          language,
          source: 'auto-detected'
        }
      });
      
      // L2 -> L3 edge
      this.edges.push({
        id: `edge_${l2Id}_to_${moduleId}`,
        source: l2Id,
        target: moduleId,
        type: 'contains',
        label: module.name
      });
    }
    
    // L4: Story - files
    for (const file of files) {
      const fileId = `node_l4_${file.path.replace(/\//g, '_').replace(/\./g, '_')}_${now}`;
      const moduleName = this.getModuleName(file.path, modules);
      
      this.nodes.push({
        id: fileId,
        layer: 'L4_Story',
        label: path.basename(file.name, path.extname(file.name)),
        filePath: file.path,
        type: 'file',
        properties: {
          language: file.language,
          size: file.size,
          source: 'auto-detected'
        }
      });
      
      // L3 -> L4 edge
      const moduleNode = this.nodes.find(n => n.layer === 'L3_Epic' && n.label === moduleName);
      if (moduleNode) {
        this.edges.push({
          id: `edge_${moduleNode.id}_to_${fileId}`,
          source: moduleNode.id,
          target: fileId,
          type: 'contains',
          label: path.basename(file.name, path.extname(file.name))
        });
      }
    }
    
    // L5: Task - functions/classes
    for (const file of files) {
      const fileContent = this.readFileContent(path.join(this.projectPath, file.path));
      const symbols = this.extractSymbols(file.language, fileContent);
      
      for (const symbol of symbols) {
        const symbolId = `node_l5_${symbol.name}_${now}`;
        this.nodes.push({
          id: symbolId,
          layer: 'L5_Task',
          label: symbol.name,
          filePath: file.path,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
          type: symbol.kind || 'function',
          properties: {
            kind: symbol.kind || 'function',
            language: file.language,
            source: 'auto-detected'
          }
        });
        
        // L4 -> L5 edge
        const fileNode = this.nodes.find(n => n.layer === 'L4_Story' && n.filePath === file.path);
        if (fileNode) {
          this.edges.push({
            id: `edge_${fileNode.id}_to_${symbolId}`,
            source: fileNode.id,
            target: symbolId,
            type: 'contains',
            label: symbol.name
          });
        }
      }
    }
  }
  
  private extractTechStack(packageJson: PackageJsonInfo | null, language: string): string[] {
    if (!packageJson) {
      return [language];
    }
    
    const allDeps = [...packageJson.dependencies, ...packageJson.devDependencies];
    return allDeps.slice(0, 20);
  }
  
  private identifyModules(files: FileInfo[], _directories: string[]): ModuleInfo[] {
    const modules: ModuleInfo[] = [];
    const moduleFiles: Record<string, FileInfo[]> = {};
    
    for (const file of files) {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        const dir = parts[0];
        if (!moduleFiles[dir]) {
          moduleFiles[dir] = [];
        }
        moduleFiles[dir].push(file);
      }
    }
    
    for (const [dir, dirFiles] of Object.entries(moduleFiles)) {
      if (dirFiles.length >= 2) {
        modules.push({
          name: dir,
          path: dir,
          fileCount: dirFiles.length
        });
      }
    }
    
    // Handle src subdirectories
    const srcModules: ModuleInfo[] = [];
    for (const module of modules) {
      if (module.path.startsWith('src/')) {
        srcModules.push(module);
      }
    }
    
    if (srcModules.length > 0 && !modules.some(m => m.name === 'src')) {
      modules.push({
        name: 'src',
        path: 'src',
        fileCount: srcModules.reduce((sum: number, m) => sum + m.fileCount, 0)
      });
    }
    
    return modules;
  }
  
  private getModuleName(filePath: string, _modules: ModuleInfo[]): string {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      return parts[0];
    }
    return 'root';
  }
  
  private readFileContent(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }
  
  private extractSymbols(language: string, content: string): { name: string; kind: string; startLine: number; endLine: number }[] {
    const symbols: { name: string; kind: string; startLine: number; endLine: number }[] = [];
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        symbols.push(...this.extractJsSymbols(content));
        break;
      case 'python':
        symbols.push(...this.extractPythonSymbols(content));
        break;
      case 'go':
        symbols.push(...this.extractGoSymbols(content));
        break;
      case 'rust':
        symbols.push(...this.extractRustSymbols(content));
        break;
    }
    
    return symbols;
  }
  
  private extractJsSymbols(content: string): { name: string; kind: string; startLine: number; endLine: number }[] {
    const symbols: { name: string; kind: string; startLine: number; endLine: number }[] = [];
    const lines = content.split('\n');
    
    // Function declarations
    const funcRegex = /^(export\s+)?(async\s+)?function\s+(\w+)/;
    // Class declarations
    const classRegex = /^(export\s+)?class\s+(\w+)/;
    // Interface declarations
    const interfaceRegex = /^interface\s+(\w+)/;
    // Type aliases
    const typeRegex = /^type\s+(\w+)/;
    
    let currentFuncName: string | null = null;
    let braceCount = 0;
    let funcStartLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (currentFuncName) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          symbols.push({
            name: currentFuncName,
            kind: 'function',
            startLine: funcStartLine + 1,
            endLine: i + 1
          });
          currentFuncName = null;
        }
      }
      
      const funcMatch = line.match(funcRegex);
      if (funcMatch && !currentFuncName) {
        currentFuncName = funcMatch[3];
        funcStartLine = i;
        braceCount = 0;
      }
      
      const classMatch = line.match(classRegex);
      if (classMatch) {
        symbols.push({
          name: classMatch[2],
          kind: 'class',
          startLine: i + 1,
          endLine: i + 1
        });
      }
      
      const interfaceMatch = line.match(interfaceRegex);
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          kind: 'interface',
          startLine: i + 1,
          endLine: i + 1
        });
      }
      
      const typeMatch = line.match(typeRegex);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          kind: 'type',
          startLine: i + 1,
          endLine: i + 1
        });
      }
    }
    
    return symbols;
  }
  
  private extractPythonSymbols(content: string): { name: string; kind: string; startLine: number; endLine: number }[] {
    const symbols: { name: string; kind: string; startLine: number; endLine: number }[] = [];
    const lines = content.split('\n');
    
    const funcRegex = /^def\s+(\w+)/;
    const classRegex = /^class\s+(\w+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const funcMatch = line.match(funcRegex);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          startLine: i + 1,
          endLine: i + 1
        });
      }
      
      const classMatch = line.match(classRegex);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          startLine: i + 1,
          endLine: i + 1
        });
      }
    }
    
    return symbols;
  }
  
  private extractGoSymbols(content: string): { name: string; kind: string; startLine: number; endLine: number }[] {
    const symbols: { name: string; kind: string; startLine: number; endLine: number }[] = [];
    const lines = content.split('\n');
    
    const funcRegex = /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/;
    const typeRegex = /^type\s+(\w+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const funcMatch = line.match(funcRegex);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          startLine: i + 1,
          endLine: i + 1
        });
      }
      
      const typeMatch = line.match(typeRegex);
      if (typeMatch && !line.includes('interface')) {
        symbols.push({
          name: typeMatch[1],
          kind: 'type',
          startLine: i + 1,
          endLine: i + 1
        });
      }
    }
    
    return symbols;
  }
  
  private extractRustSymbols(content: string): { name: string; kind: string; startLine: number; endLine: number }[] {
    const symbols: { name: string; kind: string; startLine: number; endLine: number }[] = [];
    const lines = content.split('\n');
    
    const funcRegex = /^pub\s+(?:async\s+)?fn\s+(\w+)/;
    const structRegex = /^pub\s+struct\s+(\w+)/;
    const implRegex = /^impl\s+(?:<[^>]+>\s+)?(\w+)/;
    const traitRegex = /^pub\s+trait\s+(\w+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const funcMatch = line.match(funcRegex);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          startLine: i + 1,
          endLine: i + 1
        });
      }
      
      const structMatch = line.match(structRegex);
      if (structMatch) {
        symbols.push({
          name: structMatch[1],
          kind: 'struct',
          startLine: i + 1,
          endLine: i + 1
        });
      }
      
      const implMatch = line.match(implRegex);
      if (implMatch) {
        symbols.push({
          name: implMatch[1],
          kind: 'impl',
          startLine: i + 1,
          endLine: i + 1
        });
      }
      
      const traitMatch = line.match(traitRegex);
      if (traitMatch) {
        symbols.push({
          name: traitMatch[1],
          kind: 'trait',
          startLine: i + 1,
          endLine: i + 1
        });
      }
    }
    
    return symbols;
  }
  
  /**
   * 分析 import 依赖
   */
  private analyzeImportDependencies(files: FileInfo[]): void {
    for (const file of files) {
      const content = this.readFileContent(path.join(this.projectPath, file.path));
      const imports = this.extractImports(file.language, content);
      
      const fileNode = this.nodes.find(n => n.layer === 'L4_Story' && n.filePath === file.path);
      if (!fileNode) continue;
      
      for (const imp of imports) {
        const targetFile = files.find(f => 
          f.path === imp.path || 
          f.path.endsWith(`/${imp.path}`) ||
          f.name === imp.path
        );
        
        if (targetFile) {
          const targetNode = this.nodes.find(n => n.layer === 'L4_Story' && n.filePath === targetFile.path);
          if (targetNode) {
            this.edges.push({
              id: `edge_import_${fileNode.id}_to_${targetNode.id}`,
              source: fileNode.id,
              target: targetNode.id,
              type: 'imports',
              label: imp.symbol || path.basename(imp.path, path.extname(imp.path))
            });
          }
        }
      }
    }
  }
  
  private extractImports(language: string, content: string): { path: string; symbol?: string }[] {
    const imports: { path: string; symbol?: string }[] = [];
    const lines = content.split('\n');
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        const jsImportRegex = /^import\s+(?:\{[^}]*\}|\w+|\*\s+as\s+\w+)\s+(?:type\s+)?from\s+['"]([^'"]+)['"]/;
        for (const line of lines) {
          const match = line.trim().match(jsImportRegex);
          if (match) {
            imports.push({ path: match[1] });
          }
        }
        break;
        
      case 'python':
        const pyImportRegex = /^(?:from\s+([^\s]+)\s+import|import\s+([^\s]+))/;
        for (const line of lines) {
          const match = line.trim().match(pyImportRegex);
          if (match) {
            const modulePath = match[1] || match[2];
            if (modulePath && !modulePath.startsWith('.')) {
              imports.push({ path: modulePath.replace('.', '/') + '.py' });
            }
          }
        }
        break;
    }
    
    return imports;
  }
  
  private generateSummary(filesScanned: number): IndexSummary {
    const layers: Record<string, number> = {};
    
    for (const node of this.nodes) {
      layers[node.layer] = (layers[node.layer] || 0) + 1;
    }
    
    return {
      filesScanned,
      nodesGenerated: this.nodes.length,
      edgesGenerated: this.edges.length,
      layers,
      errors: this.errors
    };
  }
}

// ==================== 辅助类型 ====================

interface ProjectInfo {
  rootPath: string;
  files: FileInfo[];
  directories: string[];
  packageJson: PackageJsonInfo | null;
  language: string;
  framework: string | null;
}

interface FileInfo {
  path: string;
  name: string;
  language: string;
  size: number;
}

interface PackageJsonInfo {
  name?: string;
  version?: string;
  description?: string;
  dependencies: string[];
  devDependencies: string[];
}

interface ModuleInfo {
  name: string;
  path: string;
  fileCount: number;
}
