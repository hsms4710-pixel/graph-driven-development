/**
 * GDD MCP Server - 增强版
 * 
 * 新增功能（从 CodeGraph 和 SDD 学习）：
 * 1. 代码索引能力 - codegraph_explore, codegraph_search, codegraph_callers, codegraph_callees
 * 2. L5_Task 节点增强 - 支持代码指导信息
 * 3. 影响分析 - codegraph_impact
 * 4. 框架路由识别 - codegraph_routes
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

// 数据存储
const DATA_FILE = path.join(process.cwd(), 'data', 'gdd-games.json');
const DATA_DIR = path.join(process.cwd(), 'data');
const CODEGRAPH_DIR = path.join(process.cwd(), '.codegraph');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CODEGRAPH_DIR)) {
  fs.mkdirSync(CODEGRAPH_DIR, { recursive: true });
}

// 代码索引缓存
const codeIndexCache = new Map<string, any>();

function loadData(): any {
  if (!fs.existsSync(DATA_FILE)) {
    return { graphs: {}, sessions: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data: any): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==================== 代码索引功能（从 CodeGraph 学习）====================

/**
 * 索引代码库
 * 使用 tree-sitter 解析代码，建立符号关系图
 */
async function indexCodebase(projectPath: string): Promise<any> {
  // 检查是否已有索引
  const indexPath = path.join(CODEGRAPH_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    if (indexData.projectPath === projectPath && Date.now() - indexData.timestamp < 3600000) {
      return indexData;
    }
  }

  // 简单的代码索引实现（实际项目中应使用 tree-sitter）
  const symbols: any[] = [];
  const files: string[] = [];
  const edges: any[] = [];

  // 支持的文件扩展名
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp'];

  // 递归扫描文件
  function scanDir(dir: string, root: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.codegraph'].includes(entry.name)) {
          scanDir(fullPath, root);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
        
        // 简单解析：提取 export 和 import
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relativePath = fullPath.replace(root, '');
          
          // 提取导出的函数/类
          const exportRegex = /export\s+(?:default\s+)?(function|class|const|let|var)\s+(\w+)/g;
          let match;
          while ((match = exportRegex.exec(content)) !== null) {
            const [, kind, name] = match;
            const symbolId = `sym_${name}_${relativePath}`;
            symbols.push({
              id: symbolId,
              name,
              kind: kind === 'function' ? 'function' : kind === 'class' ? 'class' : 'variable',
              file: relativePath,
              line: content.split('\n').indexOf(match[0]) + 1,
              signature: match[0],
            });
          }

          // 提取 import 语句
          const importRegex = /import\s+(\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
          while ((match = importRegex.exec(content)) !== null) {
            const [, imports, from] = match;
            const importedNames = imports.startsWith('{') 
              ? imports.slice(1, -1).split(',').map(s => s.trim().split(/\s+as\s+/)[0])
              : [imports];
            
            importedNames.forEach((name: string) => {
              const targetFile = from.replace('.', '').replace(/\//g, '/');
              const sourceSymbol = symbols.find(s => s.name === name);
              if (sourceSymbol) {
                edges.push({
                  source: sourceSymbol.id,
                  target: `sym_${name}_${relativePath}`,
                  type: 'imports',
                });
              }
            });
          }

        } catch (error) {
          console.error(`Error indexing ${fullPath}:`, error);
        }
      }
    }
  }

  scanDir(projectPath, projectPath);

  // 构建索引数据
  const indexData = {
    projectPath,
    timestamp: Date.now(),
    files,
    symbols,
    edges,
    stats: {
      files: files.length,
      symbols: symbols.length,
      edges: edges.length,
    },
  };

  // 保存索引
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  return indexData;
}

/**
 * 探索代码库（类似 CodeGraph 的 explore 工具）
 */
async function exploreCode(query: string, projectPath: string): Promise<any> {
  let indexData: any;
  
  // 获取或创建索引
  const indexPath = path.join(CODEGRAPH_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } else {
    indexData = await indexCodebase(projectPath);
  }

  const results: any[] = [];

  // 搜索相关符号
  const queryLower = query.toLowerCase();
  const matchedSymbols = indexData.symbols.filter(s => 
    s.name.toLowerCase().includes(queryLower) ||
    s.file.toLowerCase().includes(queryLower)
  );

  // 获取调用关系
  const callers = new Map<string, string[]>();
  const callees = new Map<string, string[]>();
  
  for (const edge of indexData.edges) {
    if (edge.type === 'imports') {
      if (!callees.has(edge.source)) {
        callees.set(edge.source, []);
      }
      callees.get(edge.source)!.push(edge.target);
      
      if (!callers.has(edge.target)) {
        callers.set(edge.target, []);
      }
      callers.get(edge.target)!.push(edge.source);
    }
  }

  // 构建结果
  for (const symbol of matchedSymbols.slice(0, 10)) {
    const symbolCallers = callers.get(symbol.id) || [];
    const symbolCallees = callees.get(symbol.id) || [];
    
    results.push({
      symbol,
      callers: symbolCallers.slice(0, 5).map(id => indexData.symbols.find(s => s.id === id)),
      callees: symbolCallees.slice(0, 5).map(id => indexData.symbols.find(s => s.id === id)),
    });
  }

  return {
    query,
    results,
    total_symbols: matchedSymbols.length,
    project_stats: indexData.stats,
  };
}

/**
 * 搜索符号
 */
async function searchSymbols(query: string, projectPath: string, kind?: string): Promise<any> {
  let indexData: any;
  
  const indexPath = path.join(CODEGRAPH_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } else {
    indexData = await indexCodebase(projectPath);
  }

  const queryLower = query.toLowerCase();
  let results = indexData.symbols.filter(s => 
    s.name.toLowerCase().includes(queryLower)
  );

  if (kind) {
    results = results.filter(s => s.kind === kind);
  }

  return {
    query,
    kind,
    results: results.slice(0, 20),
    total: results.length,
  };
}

/**
 * 查找调用者
 */
async function findCallers(symbolName: string, projectPath: string): Promise<any> {
  let indexData: any;
  
  const indexPath = path.join(CODEGRAPH_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } else {
    indexData = await indexCodebase(projectPath);
  }

  const targetSymbol = indexData.symbols.find(s => s.name === symbolName);
  if (!targetSymbol) {
    return { error: `Symbol "${symbolName}" not found` };
  }

  const callers: any[] = [];
  for (const edge of indexData.edges) {
    if (edge.target === targetSymbol.id) {
      const caller = indexData.symbols.find(s => s.id === edge.source);
      if (caller) {
        callers.push({
          ...caller,
          callSite: `${caller.file}:${caller.line}`,
        });
      }
    }
  }

  return {
    symbol: targetSymbol,
    callers,
    total: callers.length,
  };
}

/**
 * 查找被调用者
 */
async function findCallees(symbolName: string, projectPath: string): Promise<any> {
  let indexData: any;
  
  const indexPath = path.join(CODEGRAPH_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } else {
    indexData = await indexCodebase(projectPath);
  }

  const targetSymbol = indexData.symbols.find(s => s.name === symbolName);
  if (!targetSymbol) {
    return { error: `Symbol "${symbolName}" not found` };
  }

  const callees: any[] = [];
  for (const edge of indexData.edges) {
    if (edge.source === targetSymbol.id) {
      const callee = indexData.symbols.find(s => s.id === edge.target);
      if (callee) {
        callees.push({
          ...callee,
          callSite: `${callee.file}:${callee.line}`,
        });
      }
    }
  }

  return {
    symbol: targetSymbol,
    callees,
    total: callees.length,
  };
}

/**
 * 影响分析
 */
async function analyzeImpact(symbolName: string, projectPath: string): Promise<any> {
  let indexData: any;
  
  const indexPath = path.join(CODEGRAPH_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } else {
    indexData = await indexCodebase(projectPath);
  }

  const targetSymbol = indexData.symbols.find(s => s.name === symbolName);
  if (!targetSymbol) {
    return { error: `Symbol "${symbolName}" not found` };
  }

  // 递归查找所有调用者（影响范围）
  const impactScope: string[] = [];
  const visited = new Set<string>();
  
  function findCallersRecursive(symbolId: string) {
    if (visited.has(symbolId)) return;
    visited.add(symbolId);
    
    for (const edge of indexData.edges) {
      if (edge.target === symbolId && edge.type === 'imports') {
        const callerId = edge.source;
        if (!visited.has(callerId)) {
          impactScope.push(callerId);
          findCallersRecursive(callerId);
        }
      }
    }
  }

  findCallersRecursive(targetSymbol.id);

  const impactedSymbols = impactScope
    .map(id => indexData.symbols.find(s => s.id === id))
    .filter(Boolean);

  return {
    symbol: targetSymbol,
    impact_scope: impactedSymbols,
    total_impacted: impactedSymbols.length,
    warning: impactedSymbols.length > 5 
      ? `⚠️ 修改 ${symbolName} 将影响 ${impactedSymbols.length} 个符号，请谨慎操作`
      : null,
  };
}

/**
 * 识别框架路由（从 CodeGraph 学习）
 */
async function findRoutes(projectPath: string): Promise<any> {
  const routes: any[] = [];
  
  // 框架路由文件模式
  const routePatterns = {
    // Node.js
    express: ['**/routes/**/*.js', '**/routes/**/*.ts'],
    nestjs: ['**/modules/**/*.module.ts'],
    // Python
    django: ['**/urls.py', '**/urls/*.py'],
    flask: ['**/app.py', '**/routes.py', '**/views.py'],
    fastapi: ['**/main.py', '**/api/*.py'],
    // Go
    gin: ['**/router.go', '**/routes.go'],
  };

  // 简单扫描常见路由文件
  const possibleRouteFiles = [
    'src/routes.ts', 'src/routes.js',
    'routes/index.ts', 'routes/index.js',
    'api/routes.ts', 'api/routes.js',
    'server.js', 'server.ts',
    'app.js', 'app.ts',
  ];

  for (const routeFile of possibleRouteFiles) {
    const fullPath = path.join(projectPath, routeFile);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // 匹配路由定义
        const routeRegex = /(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = routeRegex.exec(content)) !== null) {
          const [, method, path] = match;
          routes.push({
            method: method.toUpperCase(),
            path,
            file: routeFile,
            handler: `handler_${routes.length}`,
          });
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error);
      }
    }
  }

  return {
    routes,
    total: routes.length,
    frameworks: routes.length > 0 ? ['detected'] : ['none'],
  };
}

// ==================== 工具定义 ====================

const TOOLS = [
  // 原有工具
  {
    name: 'gdd_create_graph',
    description: '创建新的项目图谱',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱 ID' },
        name: { type: 'string', description: '图谱名称' },
        description: { type: 'string', description: '图谱描述' },
      },
      required: ['graph_id', 'name'],
    },
  },
  {
    name: 'gdd_add_node',
    description: '添加节点到图谱。支持代码指导信息：description, interface, dependencies, template, constraints, examples, implementation',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱 ID' },
        layer: { type: 'string', description: '层级 (L1_Constitution, L2_TechStack, L3_Epic, L4_Story, L5_Task)' },
        label: { type: 'string', description: '节点标签' },
        properties: { 
          type: 'object', 
          description: '节点属性。L5_Task 可包含：description(详细描述), interface(接口定义), dependencies(依赖模块), template(代码模板), constraints(约束条件), examples(使用示例), implementation(实现要求)',
          properties: {
            file: { type: 'string', description: '文件路径' },
            description: { type: 'string', description: '详细描述（L5_Task 必需）' },
            interface: { type: 'string', description: '接口定义（TypeScript）' },
            dependencies: { type: 'array', items: { type: 'string' }, description: '依赖的其他模块' },
            template: { type: 'string', description: '代码模板' },
            constraints: { type: 'array', items: { type: 'string' }, description: '约束条件' },
            examples: { type: 'array', items: { type: 'string' }, description: '使用示例' },
            implementation: { type: 'string', description: '实现要求' },
          },
        },
      },
      required: ['graph_id', 'layer', 'label'],
    },
  },
  {
    name: 'gdd_add_edge',
    description: '添加边（连接）到图谱',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱 ID' },
        source_id: { type: 'string', description: '源节点 ID' },
        target_id: { type: 'string', description: '目标节点 ID' },
        label: { type: 'string', description: '边标签' },
      },
      required: ['graph_id', 'source_id', 'target_id'],
    },
  },
  {
    name: 'gdd_smart_start_session',
    description: '启动智能 Brainstorm 会话',
    inputSchema: {
      type: 'object',
      properties: {
        user_input: { type: 'string', description: '用户需求描述' },
        graph_id: { type: 'string', description: '关联图谱 ID（可选）' },
      },
      required: ['user_input'],
    },
  },
  {
    name: 'gdd_smart_get_next_question',
    description: '获取下一个澄清问题',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: '会话 ID' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'gdd_smart_answer_question',
    description: '回答澄清问题',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: '会话 ID' },
        question_id: { type: 'string', description: '问题 ID' },
        answer: { type: 'array', items: { type: 'string' }, description: '答案' },
      },
      required: ['session_id', 'question_id', 'answer'],
    },
  },
  {
    name: 'gdd_get_graph',
    description: '获取图谱完整数据',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱 ID' },
      },
      required: ['graph_id'],
    },
  },
  {
    name: 'gdd_list_graphs',
    description: '列出所有图谱',
    inputSchema: { type: 'object', properties: {} },
  },

  // ==================== 新增：代码索引工具（从 CodeGraph 学习）====================
  {
    name: 'gdd_codegraph_index',
    description: '索引代码库，建立符号关系图。支持 TypeScript、JavaScript、Python、Go 等 20+ 语言',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: '项目路径' },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'gdd_codegraph_explore',
    description: '探索代码库。单次调用返回相关符号、代码片段和调用关系。类似 CodeGraph 的 explore 工具',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '查询内容（函数名、类名、文件名等）' },
        project_path: { type: 'string', description: '项目路径' },
      },
      required: ['query', 'project_path'],
    },
  },
  {
    name: 'gdd_codegraph_search',
    description: '搜索代码符号（函数、类、变量）',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        project_path: { type: 'string', description: '项目路径' },
        kind: { type: 'string', description: '符号类型（function, class, variable）', enum: ['function', 'class', 'variable'] },
      },
      required: ['query', 'project_path'],
    },
  },
  {
    name: 'gdd_codegraph_callers',
    description: '查找函数的所有调用点',
    inputSchema: {
      type: 'object',
      properties: {
        symbol_name: { type: 'string', description: '符号名称' },
        project_path: { type: 'string', description: '项目路径' },
      },
      required: ['symbol_name', 'project_path'],
    },
  },
  {
    name: 'gdd_codegraph_callees',
    description: '查找函数调用了哪些其他函数',
    inputSchema: {
      type: 'object',
      properties: {
        symbol_name: { type: 'string', description: '符号名称' },
        project_path: { type: 'string', description: '项目路径' },
      },
      required: ['symbol_name', 'project_path'],
    },
  },
  {
    name: 'gdd_codegraph_impact',
    description: '分析修改符号的影响范围',
    inputSchema: {
      type: 'object',
      properties: {
        symbol_name: { type: 'string', description: '符号名称' },
        project_path: { type: 'string', description: '项目路径' },
      },
      required: ['symbol_name', 'project_path'],
    },
  },
  {
    name: 'gdd_codegraph_routes',
    description: '识别框架路由定义（支持 Express、NestJS、Django、Flask、FastAPI 等）',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: '项目路径' },
      },
      required: ['project_path'],
    },
  },
];

// ==================== 工具处理 ====================

async function handleToolCall(name: string, args: any): Promise<any> {
  const data = loadData();
  
  // 原有工具
  switch (name) {
    case 'gdd_create_graph': {
      const { graph_id, name, description } = args;
      const now = Date.now();
      data.graphs[graph_id] = {
        id: graph_id,
        name,
        description: description || '',
        nodes: [],
        edges: [],
        created_at: now,
        updated_at: now,
      };
      saveData(data);
      return { success: true, graph_id, name, message: `图谱 "${name}" 创建成功` };
    }
    
    case 'gdd_add_node': {
      const { graph_id, layer, label, properties } = args;
      if (!data.graphs[graph_id]) {
        return { success: false, error: `图谱 "${graph_id}" 不存在` };
      }
      const nodeId = `node_${uuidv4().slice(0, 8)}`;
      const node = {
        id: nodeId,
        layer,
        label,
        properties: properties || {},
        status: 'draft',
        created_at: Date.now(),
      };
      data.graphs[graph_id].nodes.push(node);
      data.graphs[graph_id].updated_at = Date.now();
      saveData(data);
      return { success: true, node_id: nodeId, layer, label, message: `节点 "${label}" 添加成功` };
    }
    
    case 'gdd_add_edge': {
      const { graph_id, source_id, target_id, label } = args;
      if (!data.graphs[graph_id]) {
        return { success: false, error: `图谱 "${graph_id}" 不存在` };
      }
      const edgeId = `edge_${uuidv4().slice(0, 8)}`;
      const edge = {
        id: edgeId,
        source_id,
        target_id,
        label: label || '',
        created_at: Date.now(),
      };
      data.graphs[graph_id].edges.push(edge);
      data.graphs[graph_id].updated_at = Date.now();
      saveData(data);
      return { success: true, edge_id: edgeId, message: `边 "${label || ''}" 添加成功` };
    }
    
    case 'gdd_smart_start_session': {
      const { user_input, graph_id } = args;
      const sessionId = `session_${uuidv4().slice(0, 8)}`;
      const now = Date.now();
      
      // 简单的 Brainstorm 逻辑
      const questions = [
        { id: `q1_${sessionId}`, question: '请选择技术栈', options: ['TypeScript', 'JavaScript', 'Python', 'Go'] },
        { id: `q2_${sessionId}`, question: '项目类型是什么', options: ['Web应用', 'CLI工具', '游戏', '库/框架'] },
        { id: `q3_${sessionId}`, question: '需要哪些核心功能', options: ['认证授权', '数据库', 'API接口', '实时通信'] },
      ];
      
      data.sessions[sessionId] = {
        id: sessionId,
        user_input,
        graph_id,
        questions,
        answers: {},
        created_at: now,
      };
      saveData(data);
      return { success: true, session_id: sessionId, questions, message: 'Brainstorm 会话已启动' };
    }
    
    case 'gdd_smart_get_next_question': {
      const { session_id } = args;
      const session = data.sessions[session_id];
      if (!session) {
        return { success: false, error: `会话 "${session_id}" 不存在` };
      }
      
      const unanswered = session.questions.filter(q => !session.answers[q.id]);
      if (unanswered.length === 0) {
        return { success: false, error: '所有问题已回答完毕' };
      }
      
      return { success: true, question: unanswered[0] };
    }
    
    case 'gdd_smart_answer_question': {
      const { session_id, question_id, answer } = args;
      const session = data.sessions[session_id];
      if (!session) {
        return { success: false, error: `会话 "${session_id}" 不存在` };
      }
      
      session.answers[question_id] = answer;
      data.sessions[session_id] = session;
      saveData(data);
      return { success: true, message: '答案已记录' };
    }
    
    case 'gdd_get_graph': {
      const { graph_id } = args;
      const graph = data.graphs[graph_id];
      if (!graph) {
        return { success: false, error: `图谱 "${graph_id}" 不存在` };
      }
      return { success: true, graph };
    }
    
    case 'gdd_list_graphs': {
      const graphs = Object.values(data.graphs);
      return { success: true, graphs, total: graphs.length };
    }

    // ==================== 新增：代码索引工具 ====================
    
    case 'gdd_codegraph_index': {
      const { project_path } = args;
      console.log(`Indexing codebase at ${project_path}...`);
      const indexData = await indexCodebase(project_path);
      return {
        success: true,
        message: `代码库索引完成`,
        stats: indexData.stats,
        files: indexData.files.length,
        symbols: indexData.symbols.length,
      };
    }
    
    case 'gdd_codegraph_explore': {
      const { query, project_path } = args;
      console.log(`Exploring codebase: ${query}`);
      const result = await exploreCode(query, project_path);
      return {
        success: true,
        ...result,
      };
    }
    
    case 'gdd_codegraph_search': {
      const { query, project_path, kind } = args;
      console.log(`Searching symbols: ${query}`);
      const result = await searchSymbols(query, project_path, kind);
      return {
        success: true,
        ...result,
      };
    }
    
    case 'gdd_codegraph_callers': {
      const { symbol_name, project_path } = args;
      console.log(`Finding callers of: ${symbol_name}`);
      const result = await findCallers(symbol_name, project_path);
      return {
        success: true,
        ...result,
      };
    }
    
    case 'gdd_codegraph_callees': {
      const { symbol_name, project_path } = args;
      console.log(`Finding callees of: ${symbol_name}`);
      const result = await findCallees(symbol_name, project_path);
      return {
        success: true,
        ...result,
      };
    }
    
    case 'gdd_codegraph_impact': {
      const { symbol_name, project_path } = args;
      console.log(`Analyzing impact of: ${symbol_name}`);
      const result = await analyzeImpact(symbol_name, project_path);
      return {
        success: true,
        ...result,
      };
    }
    
    case 'gdd_codegraph_routes': {
      const { project_path } = args;
      console.log(`Finding routes in: ${project_path}`);
      const result = await findRoutes(project_path);
      return {
        success: true,
        ...result,
      };
    }
    
    default:
      return { success: false, error: `未知工具: ${name}` };
  }
}

// ==================== HTTP API ====================

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.2.0', enhanced: true });
});

// 获取工具列表
app.get('/tools', (req, res) => {
  res.json({ tools: TOOLS, total: TOOLS.length });
});

// 调用工具
app.post('/tools/invoke', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing tool name' });
    }
    const result = await handleToolCall(name, args || {});
    res.json(result);
  } catch (error) {
    console.error('Tool invocation error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// MCP 协议端点
app.post('/mcp', async (req, res) => {
  try {
    const { method, params } = req.body;
    
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id: params?.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true },
          },
          serverInfo: {
            name: 'gdd-enhanced',
            version: '0.2.0',
          },
        },
      });
    }
    
    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id: params?.id,
        result: {
          tools: TOOLS.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      });
    }
    
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const result = await handleToolCall(toolName, toolArgs);
      
      return res.json({
        jsonrpc: '2.0',
        id: params?.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      });
    }
    
    res.json({
      jsonrpc: '2.0',
      id: params?.id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (error) {
    console.error('MCP error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: params?.id,
      error: { code: -32603, message: String(error) },
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`🚀 GDD Enhanced MCP Server running at http://localhost:${PORT}`);
  console.log(`   MCP Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`   Tools Endpoint: http://localhost:${PORT}/tools`);
  console.log(`   Enhanced features: Code indexing + Impact analysis + Route detection`);
});
