/**
 * CodeGenerator - 代码生成器
 * 
 * 根据图结构生成代码，支持：
 * - 拓扑排序确定生成顺序
 * - 并行生成无依赖的模块
 * - 模板引擎生成代码
 */

import { Graph, Node } from '../core';
import { TopologySorter } from './TopologySorter';

export interface GenerationOptions {
  outputDir: string;
  templateEngine?: 'handlebars' | 'ejs' | 'pug';
  parallel?: boolean;
  verbose?: boolean;
}

export interface GenerationResult {
  success: boolean;
  files: Array<{
    path: string;
    content: string;
    nodeId: string;
  }>;
  errors: Array<{
    nodeId: string;
    message: string;
  }>;
  duration: number;
}

export interface CodeTemplate {
  name: string;
  content: string;
  language: string;
  description?: string;
}

export class CodeGenerator {
  private templates: Map<string, CodeTemplate> = new Map();
  
  constructor() {
    this.registerDefaultTemplates();
  }
  
  /**
   * 注册默认模板
   */
  private registerDefaultTemplates(): void {
    // React 组件模板
    this.registerTemplate({
      name: 'react-component',
      content: `import React from 'react';

interface Props {
  // TODO: Define props
}

const {{label}}: React.FC<Props> = (props) => {
  return (
    <div className="{{kebabCase label}}">
      {/* TODO: Implement component */}
    </div>
  );
};

export default {{label}};`,
      language: 'typescript'
    });
    
    // API 路由模板
    this.registerTemplate({
      name: 'api-route',
      content: `import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      // TODO: Implement GET
      res.status(200).json({});
      break;
      
    case 'POST':
      // TODO: Implement POST
      res.status(201).json({});
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};`,
      language: 'typescript'
    });
    
    // 数据库模型模板
    this.registerTemplate({
      name: 'database-model',
      content: `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('{{label}}')
export class {{label}} {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // TODO: Add fields
}
`,
      language: 'typescript'
    });
    
    // 认证模块模板
    this.registerTemplate({
      name: 'auth-module',
      content: `import { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: Implement authentication logic
        const user = { id: 1, email: credentials?.email };
        if (user) {
          return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
`,
      language: 'typescript'
    });
  }
  
  /**
   * 注册模板
   */
  registerTemplate(template: CodeTemplate): void {
    this.templates.set(template.name, template);
  }
  
  /**
   * 获取模板
   */
  getTemplate(name: string): CodeTemplate | undefined {
    return this.templates.get(name);
  }
  
  /**
   * 根据图生成代码
   */
  async generate(graph: Graph, options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const files: GenerationResult['files'] = [];
    const errors: GenerationResult['errors'] = [];
    
    // 拓扑排序
    const layers = TopologySorter.sortByLayers(graph);
    
    if (options.verbose) {
      console.log(`拓扑排序完成，共 ${layers.length} 层`);
    }
    
    // 按层生成（每层可以并行）
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layer = layers[layerIndex];
      
      if (options.verbose) {
        console.log(`生成第 ${layerIndex + 1} 层，包含 ${layer.length} 个节点`);
      }
      
      if (options.parallel && layer.length > 1) {
        // 并行生成
        const results = await Promise.all(
          layer.map(node => this.generateNode(node, options.outputDir).catch(err => ({
            error: err.message,
            nodeId: node.id
          })))
        );
        
        results.forEach(result => {
          if (result.error) {
            errors.push({
              nodeId: result.nodeId,
              message: result.error
            });
          } else {
            files.push(result);
          }
        });
      } else {
        // 串行生成
        for (const node of layer) {
          try {
            const file = await this.generateNode(node, options.outputDir);
            files.push(file);
          } catch (err: any) {
            errors.push({
              nodeId: node.id,
              message: err.message
            });
          }
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      success: errors.length === 0,
      files,
      errors,
      duration
    };
  }
  
  /**
   * 为单个节点生成代码
   */
  private async generateNode(node: Node, outputDir: string): Promise<{
    path: string;
    content: string;
    nodeId: string;
  }> {
    const templateName = this.getTemplateName(node);
    const template = this.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`No template found for node type: ${node.type}`);
    }
    
    // 简单的模板替换
    let content = template.content
      .replace(/\{\{label\}\}/g, node.label)
      .replace(/\{\{kebabCase label\}\}/g, this.toKebabCase(node.label));
    
    // 生成文件路径
    const filePath = this.generateFilePath(node, outputDir);
    
    return {
      path: filePath,
      content,
      nodeId: node.id
    };
  }
  
  /**
   * 获取模板名称
   */
  private getTemplateName(node: Node): string {
    const label = node.label.toLowerCase();
    
    // 根据标签匹配模板
    if (label.includes('auth') || label.includes('认证') || label.includes('登录')) {
      return 'auth-module';
    }
    if (label.includes('api') || label.includes('route') || label.includes('接口')) {
      return 'api-route';
    }
    if (label.includes('model') || label.includes('entity') || label.includes('数据')) {
      return 'database-model';
    }
    if (label.includes('component') || label.includes('组件')) {
      return 'react-component';
    }
    
    // 默认使用 React 组件模板
    return 'react-component';
  }
  
  /**
   * 生成文件路径
   */
  private generateFilePath(node: Node, outputDir: string): string {
    const kebabLabel = this.toKebabCase(node.label);
    const dir = node.properties.directory || 'src';
    const ext = node.properties.extension || '.tsx';
    
    return `${outputDir}/${dir}/${kebabLabel}${ext}`;
  }
  
  /**
   * 转换为 kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
}
