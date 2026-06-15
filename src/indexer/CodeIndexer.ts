/**
 * CodeIndexer - 代码库索引器
 * 
 * 扫描代码库，构建图谱：
 * 1. 遍历所有代码文件
 * 2. 解析每个文件的 AST
 * 3. 提取类、函数、导入关系
 * 4. 构建节点和边
 * 5. 存储到 SQLite
 */

import * as fs from 'fs';
import * as path from 'path';
import { Graph, Node, Edge } from '../core';
import { ASTParser } from './ASTParser';

export interface IndexOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
  verbose?: boolean;
}

export interface IndexResult {
  graph: Graph;
  filesIndexed: number;
  nodesCreated: number;
  edgesCreated: number;
  duration: number;
}

export class CodeIndexer {
  private graph: Graph;
  private nodeMap: Map<string, Node> = new Map();
  private fileCounter: number = 0;
  
  constructor() {
    this.graph = new Graph({ name: 'Indexed Codebase' });
  }
  
  /**
   * 索引整个代码库
   */
  async indexDirectory(
    dirPath: string,
    options: IndexOptions = {}
  ): Promise<IndexResult> {
    const startTime = Date.now();
    const {
      includePatterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      excludePatterns = ['node_modules', 'dist', 'build', '.git', 'test', 'tests'],
      maxFileSize = 1024 * 1024, // 1MB
      verbose = false
    } = options;
    
    // 递归遍历目录
    await this.traverseDirectory(dirPath, excludePatterns, verbose);
    
    // 构建边（依赖关系）
    this.buildEdges();
    
    const duration = Date.now() - startTime;
    
    return {
      graph: this.graph,
      filesIndexed: this.fileCounter,
      nodesCreated: this.graph.getNodes().length,
      edgesCreated: this.graph.getEdges().length,
      duration
    };
  }
  
  /**
   * 递归遍历目录
   */
  private async traverseDirectory(
    dirPath: string,
    excludePatterns: string[],
    verbose: boolean
  ): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // 跳过排除的目录
      if (entry.isDirectory()) {
        if (excludePatterns.includes(entry.name)) {
          continue;
        }
        await this.traverseDirectory(fullPath, excludePatterns, verbose);
      } else if (entry.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(entry.name).toLowerCase();
        const validExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go'];
        
        if (validExtensions.includes(ext)) {
          await this.processFile(fullPath, verbose);
        }
      }
    }
  }
  
  /**
   * 处理单个文件
   */
  private async processFile(filePath: string, verbose: boolean): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const stat = fs.statSync(filePath);
      
      // 跳过过大的文件
      if (stat.size > 1024 * 1024) {
        return;
      }
      
      // 解析文件
      const parseResult = await ASTParser.parseFile(filePath, content);
      
      // 创建节点
      for (const nodeData of parseResult.nodes) {
        const nodeId = this.generateNodeId(filePath, nodeData.name);
        
        if (!this.nodeMap.has(nodeId)) {
          const node = new Node({
            id: nodeId,
            label: nodeData.name,
            type: nodeData.type as any,
            properties: {
              ...nodeData.properties,
              filePath,
              startLine: nodeData.startLine,
              endLine: nodeData.endLine,
              language: parseResult.language
            },
            position: this.calculatePosition()
          });
          
          this.graph.addNode(node);
          this.nodeMap.set(nodeId, node);
        }
      }
      
      this.fileCounter++;
      
      if (verbose && this.fileCounter % 100 === 0) {
        console.log(`已索引 ${this.fileCounter} 个文件...`);
      }
    } catch (error) {
      // 忽略解析错误
      console.warn(`解析文件失败: ${filePath}`, error);
    }
  }
  
  /**
   * 构建边（依赖关系）
   */
  private buildEdges(): void {
    // 根据导入关系创建边
    for (const node of this.graph.getNodes()) {
      const filePath = node.getProperty('filePath');
      if (!filePath) continue;
      
      // 这里简化处理，实际应该重新解析文件获取导入信息
      // TODO: 重新解析并创建边
    }
  }
  
  /**
   * 生成节点 ID
   */
  private generateNodeId(filePath: string, name: string): string {
    const relativePath = path.relative(process.cwd(), filePath);
    return `${relativePath}:${name}`;
  }
  
  /**
   * 计算节点位置（简单的网格布局）
   */
  private calculatePosition(): { x: number; y: number } {
    // 简单的随机位置，实际应该使用力导向布局
    return {
      x: Math.random() * 800,
      y: Math.random() * 600
    };
  }
  
  /**
   * 获取构建的图
   */
  getGraph(): Graph {
    return this.graph;
  }
}
