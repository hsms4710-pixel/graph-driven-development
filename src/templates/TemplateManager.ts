/**
 * Graph-Driven Development - Project Templates
 * 
 * 项目模板系统：
 * - 预定义的项目模板
 * - 脚手架生成
 * - 模板推荐
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'cli' | 'library' | 'api' | 'mobile';
  language: string;
  framework: string;
  version: string;
  tags: string[];
  files: TemplateFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  configFiles: Record<string, string>;
  bestPractices: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface TemplateFile {
  path: string;
  content: string;
  isBinary?: boolean;
}

export interface TemplateContext {
  projectName: string;
  projectDescription?: string;
  author?: string;
  version?: string;
}

export interface GeneratedProject {
  path: string;
  templateId: string;
  files: string[];
  installCommands: string[];
}

// ==================== 内置模板 ====================

export const BUILTIN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'react-ts',
    name: 'React + TypeScript',
    description: '现代化的 React 应用，使用 TypeScript 和 Vite',
    category: 'web',
    language: 'typescript',
    framework: 'react',
    version: '1.0.0',
    tags: ['react', 'typescript', 'vite', 'frontend'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: '{{projectName}}',
          version: '0.0.1',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            '@vitejs/plugin-react': '^4.0.0',
            typescript: '^5.0.0',
            vite: '^4.4.0'
          }
        }, null, 2)
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
            strict: true
          },
          include: ['src']
        }, null, 2)
      },
      {
        path: 'vite.config.ts',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{projectName}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
      },
      {
        path: 'src/App.tsx',
        content: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>{{projectName}}</h1>
      <p>Counter: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}

export default App`
      },
      {
        path: 'src/index.css',
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.app { max-width: 1200px; margin: 0 auto; padding: 20px; }`
      },
      {
        path: 'src/App.css',
        content: `.app { text-align: center; }
h1 { color: #333; margin-bottom: 20px; }
button { padding: 10px 20px; font-size: 16px; cursor: pointer; }`
      }
    ],
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      '@vitejs/plugin-react': '^4.0.0',
      typescript: '^5.0.0',
      vite: '^4.4.0'
    },
    scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
    configFiles: {},
    bestPractices: [
      '使用 TypeScript 进行类型检查',
      '组件使用函数式组件和 Hooks',
      '使用 Vite 进行快速开发',
      '分离关注点，组件保持单一职责'
    ],
    complexity: 'beginner'
  },
  {
    id: 'fastapi-py',
    name: 'FastAPI + Python',
    description: '现代化的 Python Web API，使用 FastAPI 和 Pydantic',
    category: 'api',
    language: 'python',
    framework: 'fastapi',
    version: '1.0.0',
    tags: ['fastapi', 'python', 'api', 'rest', 'async'],
    files: [
      {
        path: 'pyproject.toml',
        content: `[project]
name = "{{projectName}}"
version = "0.0.1"
description = "{{projectDescription}}"
requires-python = ">=3.10"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn[standard]>=0.23.0",
    "pydantic>=2.0.0",
    "python-multipart>=0.0.6",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "httpx>=0.24.0",
]

[tool.uv]
dev-dependencies = [["project.optional-dependencies.dev"]]`
      },
      {
        path: 'main.py',
        content: `from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="{{projectName}}",
    version="0.0.1",
    description="{{projectDescription}}"
)


class Item(BaseModel):
    """Item model for creating new items"""
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Hello, World! Welcome to {{projectName}}"}


@app.get("/items")
async def read_items(skip: int = 0, limit: int = 10):
    """Get a list of items with pagination"""
    # TODO: Implement database query
    return {"items": [], "total": 0}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Optional[str] = None):
    """Get a single item by ID"""
    # TODO: Implement database query
    return {"item_id": item_id, "query": q}


@app.post("/items", response_model=Item)
async def create_item(item: Item):
    """Create a new item"""
    # TODO: Implement database insert
    return item


@app.put("/items/{item_id}")
async def update_item(item_id: int, item: Item):
    """Update an existing item"""
    # TODO: Implement database update
    return {"item_id": item_id, **item.model_dump()}


@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item"""
    # TODO: Implement database delete
    return {"message": "Item deleted", "item_id": item_id}`
      },
      {
        path: 'requirements.txt',
        content: `fastapi>=0.100.0
uvicorn[standard]>=0.23.0
pydantic>=2.0.0
python-multipart>=0.0.6`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}

{{projectDescription}}

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Running

\`\`\`bash
uvicorn main:app --reload
\`\`\`

## API Documentation

Visit http://localhost:8000/docs for interactive API documentation.`
      },
      {
        path: 'tests/test_main.py',
        content: `import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_create_item(client: AsyncClient):
    response = await client.post("/items", json={
        "name": "Test Item",
        "price": 9.99
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Item"`
      }
    ],
    dependencies: { fastapi: '>=0.100.0', uvicorn: '>=0.23.0', pydantic: '>=2.0.0' },
    devDependencies: { pytest: '>=7.0.0', 'pytest-asyncio': '>=0.21.0', httpx: '>=0.24.0' },
    scripts: {},
    configFiles: {},
    bestPractices: [
      '使用 Pydantic 进行数据验证',
      '使用 async/await 进行异步编程',
      '添加详细的 docstring 和类型注解',
      '使用 pytest 进行测试',
      '使用 uvicorn 运行生产环境'
    ],
    complexity: 'beginner'
  },
  {
    id: 'cli-typer',
    name: 'CLI + Typer + Rich',
    description: '现代化的命令行工具，使用 Typer 和 Rich',
    category: 'cli',
    language: 'python',
    framework: 'typer',
    version: '1.0.0',
    tags: ['cli', 'typer', 'rich', 'python', 'terminal'],
    files: [
      {
        path: 'pyproject.toml',
        content: `[project]
name = "{{projectName}}"
version = "0.0.1"
description = "{{projectDescription}}"
requires-python = ">=3.10"
dependencies = [
    "typer>=0.9.0",
    "rich>=13.0.0",
]

[project.scripts]
{{projectName}} = "main:app"

[tool.uv]
dev-dependencies = [
    "pytest>=7.0.0",
]`
      },
      {
        path: 'main.py',
        content: `import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = typer.Typer(help="{{projectDescription}}")
console = Console()


@app.command()
def hello(
    name: str = typer.Option("World", help="Name to greet"),
    color: str = typer.Option("green", help="Text color")
):
    """Greet someone"""
    console.print(Panel(f"Hello, [bold {color}]{name}![/]"))


@app.command()
def list_items():
    """List items"""
    table = Table(title="Items")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="green")
    table.add_column("Status")
    
    # TODO: Implement actual data fetching
    
    console.print(table)


@app.command()
def version():
    """Show version"""
    console.print(f"{{projectName}} version 0.0.1")


if __name__ == "__main__":
    app()`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}

{{projectDescription}}

## Installation

\`\`\`bash
pip install {{projectName}}
\`\`\`

## Usage

\`\`\`bash
{{projectName}} hello --name World
{{projectName}} list
{{projectName}} version
\`\`\``
      }
    ],
    dependencies: { typer: '>=0.9.0', rich: '>=13.0.0' },
    devDependencies: { pytest: '>=7.0.0' },
    scripts: {},
    configFiles: {},
    bestPractices: [
      '使用 Typer 进行命令行参数解析',
      '使用 Rich 进行终端美化输出',
      '添加详细的帮助信息',
      '使用命令分组组织功能',
      '支持 --help 参数'
    ],
    complexity: 'beginner'
  },
  {
    id: 'nextjs-ts',
    name: 'Next.js + TypeScript',
    description: '全栈 React 框架，使用 Next.js 14',
    category: 'web',
    language: 'typescript',
    framework: 'nextjs',
    version: '1.0.0',
    tags: ['nextjs', 'react', 'typescript', 'fullstack', 'ssr'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: '{{projectName}}',
          version: '0.0.1',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
            next: '^14.0.0'
          },
          devDependencies: {
            '@types/node': '^20.0.0',
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            typescript: '^5.0.0',
            eslint: '^8.0.0'
          }
        }, null, 2)
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2017',
            lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
           esModuleInterop: true,
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve'
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules']
        }, null, 2)
      },
      {
        path: 'next.config.mjs',
        content: `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig`
      },
      {
        path: 'app/layout.tsx',
        content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '{{projectName}}',
  description: '{{projectDescription}}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}`
      },
      {
        path: 'app/page.tsx',
        content: `export default function Home() {
  return (
    <main className="container">
      <h1>{{projectName}}</h1>
      <p>{{projectDescription}}</p>
    </main>
  )
}`
      },
      {
        path: 'app/globals.css',
        content: `@import 'tailwindcss';

html,
body {
  max-width: 1280px;
  margin: auto;
}

.container {
  padding: 2rem 0;
}

main {
  padding: 2rem 0;
  text-align: center;
}`
      }
    ],
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', next: '^14.0.0' },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      typescript: '^5.0.0',
      eslint: '^8.0.0'
    },
    scripts: { dev: 'next dev', build: 'next build', start: 'next start', lint: 'next lint' },
    configFiles: {},
    bestPractices: [
      '使用 App Router 进行路由管理',
      '使用 Server Components 减少客户端 JavaScript',
      '使用 Middleware 进行认证和路由保护',
      '使用 Layouts 进行共享布局',
      '使用 Metadata 进行 SEO 优化'
    ],
    complexity: 'intermediate'
  }
];

// ==================== 模板管理器 ====================

export class TemplateManager {
  private templates: Map<string, ProjectTemplate> = new Map();
  private customTemplatesDir: string;
  
  constructor(customTemplatesDir?: string) {
    // 注册内置模板
    for (const template of BUILTIN_TEMPLATES) {
      this.templates.set(template.id, template);
    }
    
    // 设置自定义模板目录
    this.customTemplatesDir = customTemplatesDir || './templates';
  }
  
  /**
   * 获取所有模板
   */
  getAllTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * 根据 ID 获取模板
   */
  getTemplate(id: string): ProjectTemplate | undefined {
    return this.templates.get(id);
  }
  
  /**
   * 根据语言获取模板
   */
  getTemplatesByLanguage(language: string): ProjectTemplate[] {
    return this.getAllTemplates().filter(
      t => t.language.toLowerCase() === language.toLowerCase()
    );
  }
  
  /**
   * 根据分类获取模板
   */
  getTemplatesByCategory(category: ProjectTemplate['category']): ProjectTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }
  
  /**
   * 根据标签搜索模板
   */
  searchTemplates(tags: string[]): ProjectTemplate[] {
    return this.getAllTemplates().filter(template => {
      return tags.some(tag =>
        template.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
      );
    });
  }
  
  /**
   * 推荐模板
   */
  recommendTemplates(context: {
    language?: string;
    category?: string;
    features?: string[];
  }): ProjectTemplate[] {
    const templates = this.getAllTemplates();
    
    // 按语言过滤
    if (context.language) {
      templates.filter(t => t.language.toLowerCase() === context.language!.toLowerCase());
    }
    
    // 按分类过滤
    if (context.category) {
      templates.filter(t => t.category === context.category);
    }
    
    // 按特征匹配评分
    const scored = templates.map(template => {
      let score = 0;
      
      if (context.features) {
        for (const feature of context.features) {
          if (template.tags.some(tag => tag.includes(feature))) {
            score++;
          }
        }
      }
      
      return { template, score };
    });
    
    // 按评分排序
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.template);
  }
  
  /**
   * 生成项目
   */
  async generateProject(
    templateId: string,
    targetPath: string,
    context: TemplateContext
  ): Promise<GeneratedProject | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }
    
    const generatedFiles: string[] = [];
    const installCommands: string[] = [];
    
    // 创建目录
    fs.mkdirSync(targetPath, { recursive: true });
    
    // 生成文件
    for (const file of template.files) {
      const content = this.processTemplate(file.content, context);
      const filePath = path.join(targetPath, file.path);
      
      // 创建子目录
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      
      // 写入文件
      fs.writeFileSync(filePath, content, 'utf-8');
      generatedFiles.push(file.path);
    }
    
    // 生成配置文件
    for (const [filename, content] of Object.entries(template.configFiles)) {
      const processed = this.processTemplate(content, context);
      const filePath = path.join(targetPath, filename);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, processed, 'utf-8');
      generatedFiles.push(filename);
    }
    
    // 生成安装命令
    if (template.language === 'typescript' || template.language === 'javascript') {
      installCommands.push('npm install');
    } else if (template.language === 'python') {
      installCommands.push('pip install -r requirements.txt');
    }
    
    return {
      path: targetPath,
      templateId,
      files: generatedFiles,
      installCommands
    };
  }
  
  /**
   * 处理模板变量
   */
  private processTemplate(content: string, context: TemplateContext): string {
    let result = content;
    
    // 替换变量
    result = result.replace(/\{\{projectName\}\}/g, context.projectName);
    result = result.replace(/\{\{projectDescription\}\}/g, context.projectDescription || '');
    result = result.replace(/\{\{author\}\}/g, context.author || 'Developer');
    result = result.replace(/\{\{version\}\}/g, context.version || '0.0.1');
    
    return result;
  }
}

// 单例
export const templateManager = new TemplateManager();
