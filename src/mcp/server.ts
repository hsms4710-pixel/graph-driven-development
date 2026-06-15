/**
 * Graph-Driven Development - MCP Server
 * 
 * 提供 Agent ↔ Graph 双向同步的 MCP 协议实现
 * 支持 Claude Code, Codex CLI, CodeBuddy, TRAE 等 Agent 平台
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// ==================== 数据库初始化 ====================

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'gdd.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS graphs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    graph_id TEXT NOT NULL,
    layer TEXT NOT NULL,
    label TEXT NOT NULL,
    properties TEXT,
    status TEXT DEFAULT 'draft',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    graph_id TEXT NOT NULL,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    type TEXT NOT NULL,
    label TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS brainstorm_sessions (
    id TEXT PRIMARY KEY,
    graph_id TEXT NOT NULL,
    state TEXT DEFAULT 'INIT',
    questions TEXT,
    answers TEXT,
    current_question_index INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE
  );
`);

// ==================== 工具定义 ====================

const TOOLS = [
  {
    name: 'gdd_create_graph',
    description: '创建新的图驱动开发项目',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '项目名称' },
        description: { type: 'string', description: '项目描述（可选）' }
      },
      required: ['name']
    }
  },
  {
    name: 'gdd_load_graph',
    description: '加载已有图谱或从代码库索引生成',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '图谱路径或代码库路径' },
        auto_index: { type: 'boolean', description: '是否自动索引代码', default: true }
      },
      required: ['path']
    }
  },
  {
    name: 'gdd_add_node',
    description: '在图谱中添加新节点',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        layer: { 
          type: 'string', 
          enum: ['L1_Constitution', 'L2_TechStack', 'L3_Epic', 'L4_Story', 'L5_Task'],
          description: '节点层级' 
        },
        label: { type: 'string', description: '节点标签' },
        properties: { type: 'object', description: '节点属性（可选）' },
        status: { 
          type: 'string', 
          enum: ['draft', 'reviewing', 'approved', 'implemented'],
          description: '节点状态（可选）'
        }
      },
      required: ['graph_id', 'layer', 'label']
    }
  },
  {
    name: 'gdd_update_node',
    description: '更新图谱中的节点',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        node_id: { type: 'string', description: '节点ID' },
        label: { type: 'string', description: '新标签（可选）' },
        properties: { type: 'object', description: '新属性（可选）' },
        status: { 
          type: 'string', 
          enum: ['draft', 'reviewing', 'approved', 'implemented'],
          description: '新状态（可选）'
        }
      },
      required: ['graph_id', 'node_id']
    }
  },
  {
    name: 'gdd_delete_node',
    description: '从图谱中删除节点及其相关边',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        node_id: { type: 'string', description: '节点ID' }
      },
      required: ['graph_id', 'node_id']
    }
  },
  {
    name: 'gdd_add_edge',
    description: '在两个节点间创建连接',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        source: { type: 'string', description: '源节点ID' },
        target: { type: 'string', description: '目标节点ID' },
        type: { 
          type: 'string', 
          enum: ['depends_on', 'contains', 'implements', 'refines'],
          description: '边类型' 
        },
        label: { type: 'string', description: '边标签（可选）' }
      },
      required: ['graph_id', 'source', 'target', 'type']
    }
  },
  {
    name: 'gdd_delete_edge',
    description: '删除图谱中的边',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        edge_id: { type: 'string', description: '边ID' }
      },
      required: ['graph_id', 'edge_id']
    }
  },
  {
    name: 'gdd_get_pending_clarifications',
    description: '获取当前图谱中需要用户澄清的问题',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' }
      },
      required: ['graph_id']
    }
  },
  {
    name: 'gdd_submit_clarification_answer',
    description: '提交用户对澄清问题的答案',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        session_id: { type: 'string', description: 'Brainstorm会话ID' },
        question_id: { type: 'string', description: '问题ID' },
        answer: { type: 'string', description: '用户答案' }
      },
      required: ['graph_id', 'session_id', 'question_id', 'answer']
    }
  },
  {
    name: 'gdd_get_dependency_impact',
    description: '分析修改某个节点对其他节点的影响',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        node_id: { type: 'string', description: '节点ID' }
      },
      required: ['graph_id', 'node_id']
    }
  },
  {
    name: 'gdd_export_graph',
    description: '导出图谱为 JSON、Markdown 或其他格式',
    inputSchema: {
      type: 'object',
      properties: {
        graph_id: { type: 'string', description: '图谱ID' },
        format: { 
          type: 'string', 
          enum: ['json', 'markdown', 'mermaid'],
          description: '导出格式',
          default: 'json'
        }
      },
      required: ['graph_id']
    }
  },
  {
    name: 'gdd_list_graphs',
    description: '列出所有图谱项目',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// ==================== 工具处理器 ====================

function handleCreateGraph(args: { name: string; description?: string }) {
  const graphId = `graph_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO graphs (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(graphId, args.name, args.description || '', now, now);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          graph_id: graphId,
          name: args.name,
          message: `图谱项目 "${args.name}" 创建成功`
        }, null, 2)
      }
    ]
  };
}

function handleLoadGraph(args: { path: string; auto_index?: boolean }) {
  // 检查是否是已有图谱
  const existingGraph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(args.path);
  
  if (existingGraph) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            graph_id: (existingGraph as any).id as string,
            name: ((existingGraph as any).name as string),
            message: `已加载图谱 "${((existingGraph as any).name as string)}"`
          }, null, 2)
        }
      ]
    };
  }
  
  // 检查是否是代码库路径
  if (fs.existsSync(args.path)) {
    const graphId = `graph_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const now = Date.now();
    const stats = fs.statSync(args.path);
    
    if (typeof stats.isDirectory === 'function' ? stats.isDirectory() : stats.isDirectory) {
      // 创建图谱
      db.prepare(`
        INSERT INTO graphs (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(graphId, path.basename(args.path), `从 ${args.path} 索引生成`, now, now);
      
      // 简单的代码索引
      if (args.auto_index !== false) {
        indexCodebase(graphId, args.path);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              graph_id: graphId,
              name: path.basename(args.path),
              message: `已从代码库索引生成图谱 "${path.basename(args.path)}"`
            }, null, 2)
          }
        ]
      };
    }
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: `路径不存在: ${args.path}`
        }, null, 2)
      }
    ],
    isError: true
  };
}

function handleAddNode(args: { 
  graph_id: string; 
  layer: string; 
  label: string; 
  properties?: Record<string, unknown>;
  status?: string 
}) {
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(args.graph_id);
  if (!graph) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '图谱不存在' }) }],
      isError: true
    };
  }
  
  const nodeId = `node_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO nodes (id, graph_id, layer, label, properties, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId, 
    args.graph_id, 
    args.layer, 
    args.label, 
    JSON.stringify(args.properties || {}),
    args.status || 'draft',
    now, 
    now
  );
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, args.graph_id);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          node_id: nodeId,
          layer: args.layer,
          label: args.label,
          message: `节点 "${args.label}" 添加成功`
        }, null, 2)
      }
    ]
  };
}

function handleUpdateNode(args: { 
  graph_id: string; 
  node_id: string;
  label?: string;
  properties?: Record<string, unknown>;
  status?: string 
}) {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(
    args.node_id, 
    args.graph_id
  );
  
  if (!node) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '节点不存在' }) }],
      isError: true
    };
  }
  
  const now = Date.now();
  
  db.prepare(`
    UPDATE nodes 
    SET label = COALESCE(?, label),
        properties = COALESCE(?, properties),
        status = COALESCE(?, status),
        updated_at = ?
    WHERE id = ? AND graph_id = ?
  `).run(
    args.label,
    JSON.stringify(args.properties),
    args.status,
    now,
    args.node_id,
    args.graph_id
  );
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, args.graph_id);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          node_id: args.node_id,
          message: '节点更新成功'
        }, null, 2)
      }
    ]
  };
}

function handleDeleteNode(args: { graph_id: string; node_id: string }) {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(
    args.node_id, 
    args.graph_id
  );
  
  if (!node) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '节点不存在' }) }],
      isError: true
    };
  }
  
  const now = Date.now();
  
  // 删除节点及其相关边
  db.prepare('DELETE FROM edges WHERE source = ? OR target = ? AND graph_id = ?').run(
    args.node_id, 
    args.node_id, 
    args.graph_id
  );
  
  db.prepare('DELETE FROM nodes WHERE id = ? AND graph_id = ?').run(args.node_id, args.graph_id);
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, args.graph_id);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          node_id: args.node_id,
          message: '节点删除成功'
        }, null, 2)
      }
    ]
  };
}

function handleAddEdge(args: { 
  graph_id: string; 
  source: string; 
  target: string; 
  type: string;
  label?: string 
}) {
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(args.graph_id);
  if (!graph) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '图谱不存在' }) }],
      isError: true
    };
  }
  
  // 检查源和目标节点是否存在
  const sourceNode = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(args.source, args.graph_id);
  const targetNode = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(args.target, args.graph_id);
  
  if (!sourceNode || !targetNode) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '源节点或目标节点不存在' }) }],
      isError: true
    };
  }
  
  const edgeId = `edge_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO edges (id, graph_id, source, target, type, label, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(edgeId, args.graph_id, args.source, args.target, args.type, args.label, now);
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, args.graph_id);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          edge_id: edgeId,
          source: args.source,
          target: args.target,
          type: args.type,
          message: `边创建成功: ${args.source} → ${args.target}`
        }, null, 2)
      }
    ]
  };
}

function handleDeleteEdge(args: { graph_id: string; edge_id: string }) {
  const edge = db.prepare('SELECT * FROM edges WHERE id = ? AND graph_id = ?').get(
    args.edge_id, 
    args.graph_id
  );
  
  if (!edge) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '边不存在' }) }],
      isError: true
    };
  }
  
  const now = Date.now();
  
  db.prepare('DELETE FROM edges WHERE id = ? AND graph_id = ?').run(args.edge_id, args.graph_id);
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, args.graph_id);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          edge_id: args.edge_id,
          message: '边删除成功'
        }, null, 2)
      }
    ]
  };
}

function handleGetPendingClarifications(args: { graph_id: string }) {
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(args.graph_id);
  if (!graph) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '图谱不存在' }) }],
      isError: true
    };
  }
  
  // 分析图谱，生成待澄清问题
  const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(args.graph_id);
  const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(args.graph_id);
  
  const questions = [];
  
  // 检查缺失的层级
  const layers = ['L1_Constitution', 'L2_TechStack', 'L3_Epic', 'L4_Story', 'L5_Task'];
  const existingLayers = new Set(nodes.map((n: any) => n.layer));
  
  for (const layer of layers) {
    if (!existingLayers.has(layer)) {
      questions.push({
        id: `q_missing_${layer}`,
        question: `图谱中缺少 ${layer} 层级的节点`,
        hint: `建议添加 ${layer} 层级来完善项目结构`,
        priority: 'high',
        type: 'missing_layer'
      });
    }
  }
  
  // 检查孤立节点
  
  const connectedNodes = new Set(edges.map((e: any) => [e.source, e.target]).flat());
  const orphanNodes = nodes.filter((n: any) => !connectedNodes.has(n.id) && n.layer !== 'L1_Constitution');
  
  for (const node of orphanNodes.slice(0, 3)) {
    questions.push({
      id: `q_orphan_${(node as any).id}`,
      question: `节点 "${(node as any).label}" 是孤立的，没有与其他节点连接`,
      hint: '建议添加边来表示依赖关系',
      priority: 'medium',
      type: 'orphan_node'
    });
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          graph_id: args.graph_id,
          questions,
          summary: {
            total_nodes: nodes.length,
            total_edges: edges.length,
            missing_layers: layers.filter(l => !existingLayers.has(l)),
            orphan_nodes: orphanNodes.length
          }
        }, null, 2)
      }
    ]
  };
}

function handleSubmitClarificationAnswer(args: { 
  graph_id: string; 
  session_id: string;
  question_id: string;
  answer: string 
}) {
  // 创建或更新 brainstorm session
  const now = Date.now();
  const sessionId = args.session_id || `bs_${Date.now()}_${uuidv4().slice(0, 8)}`;
  
  const existingSession = db.prepare('SELECT * FROM brainstorm_sessions WHERE id = ?').get(sessionId);
  
  if (!existingSession) {
    db.prepare(`
      INSERT INTO brainstorm_sessions (id, graph_id, state, questions, answers, current_question_index, created_at, updated_at)
      VALUES (?, ?, 'CLARIFY', '[]', '[{"question_id":"${args.question_id}","answer":"${args.answer}"}]', 0, ?, ?)
    `).run(sessionId, args.graph_id, now, now);
  } else {
    // 这里可以更新现有 session
    const currentAnswers = JSON.parse((existingSession as any).answers || '[]');
    currentAnswers.push({ question_id: args.question_id, answer: args.answer });
    db.prepare('UPDATE brainstorm_sessions SET answers = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(currentAnswers), now, sessionId);
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          session_id: sessionId,
          question_id: args.question_id,
          answer: args.answer,
          message: '答案已记录'
        }, null, 2)
      }
    ]
  };
}

function handleGetDependencyImpact(args: { graph_id: string; node_id: string }) {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(
    args.node_id, 
    args.graph_id
  );
  
  if (!node) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '节点不存在' }) }],
      isError: true
    };
  }
  
  // 查找依赖此节点的所有节点
  const outgoingEdges = db.prepare(
    'SELECT * FROM edges WHERE source = ? AND graph_id = ?'
  ).all(args.node_id, args.graph_id);
  
  const incomingEdges = db.prepare(
    'SELECT * FROM edges WHERE target = ? AND graph_id = ?'
  ).all(args.node_id, args.graph_id);
  
  const affectedNodes = new Set<string>();
  
  // 递归查找所有下游节点
  function findDownstream(nodeId: string) {
    const edges = db.prepare('SELECT * FROM edges WHERE source = ? AND graph_id = ?').all(nodeId, args.graph_id);
    for (const edge of edges) {
      affectedNodes.add((edge as any).target);
      findDownstream((edge as any).target);
    }
  }
  
  findDownstream(args.node_id);
  
  // 获取受影响节点的详细信息
  const affectedNodeDetails = affectedNodes.size > 0 
    ? db.prepare('SELECT * FROM nodes WHERE id IN (' + Array.from(affectedNodes).map(() => '?').join(',') + ') AND graph_id = ?')
        .all(...Array.from(affectedNodes), args.graph_id)
    : [];
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          node_id: args.node_id,
          node_label: (node as any).label,
          outgoing_edges: outgoingEdges.length,
          incoming_edges: incomingEdges.length,
          affected_nodes: affectedNodeDetails.map((n: any) => ({
            id: n.id,
            label: n.label,
            layer: n.layer
          })),
          impact_summary: `修改 "${(node as any).label}" 将影响 ${affectedNodeDetails.length} 个下游节点`
        }, null, 2)
      }
    ]
  };
}

function handleExportGraph(args: { graph_id: string; format?: string }) {
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(args.graph_id);
  if (!graph) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '图谱不存在' }) }],
      isError: true
    };
  }
  
  const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(args.graph_id);
  const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(args.graph_id);
  
  const format = args.format || 'json';
  
  if (format === 'json') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: (graph as any).id,
            name: (graph as any).name,
            description: (graph as any).description,
            created_at: (graph as any).created_at,
            updated_at: (graph as any).updated_at,
            nodes: nodes.map((n: any) => ({
              id: n.id,
              layer: n.layer,
              label: n.label,
              properties: JSON.parse(n.properties || '{}'),
              status: n.status
            })),
            edges: edges.map((e: any) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type,
              label: e.label
            }))
          }, null, 2)
        }
      ]
    };
  }
  
  if (format === 'markdown') {
    let md = `# ${(graph as any).name}\n\n`;
    if ((graph as any).description) {
      md += `${(graph as any).description}\n\n`;
    }
    
    md += `## 节点 (${nodes.length})\n\n`;
    md += `| ID | 层级 | 标签 | 状态 |\n`;
    md += `|----|------|------|------|\n`;
    
    for (const node of nodes) {
      md += `| ${(node as any).id} | ${(node as any).layer} | ${(node as any).label} | ${(node as any).status} |\n`;
    }
    
    md += `\n## 连接 (${edges.length})\n\n`;
    md += `| 类型 | 源 | 目标 | 标签 |\n`;
    md += `|------|----|------|------|\n`;
    
    for (const edge of edges) {
      const sourceNode = nodes.find((n: any) => n.id === (edge as any).source);
      const targetNode = nodes.find((n: any) => n.id === (edge as any).target);
      const sourceLabel = (sourceNode as any)?.label || (edge as any).source;
      const targetLabel = (targetNode as any)?.label || (edge as any).target;
      md += `| ${(edge as any).type} | ${sourceLabel} | ${targetLabel} | ${((edge as any).label as any) || '-'} |\n`;
    }
    
    return {
      content: [{ type: 'text', text: md }]
    };
  }
  
  if (format === 'mermaid') {
    let mermaid = `graph LR\n`;
    
    // 添加节点
    for (const node of nodes) {
      const safeId = (node as any).id.replace(/[^a-zA-Z0-9]/g, '_');
      mermaid += `    ${safeId}["${(node as any).label}"]\n`;
    }
    
    // 添加边
    for (const edge of edges) {
      const sourceId = (edge as any).source.replace(/[^a-zA-Z0-9]/g, '_');
      const targetId = (edge as any).target.replace(/[^a-zA-Z0-9]/g, '_');
      mermaid += `    ${sourceId} -->|${(edge as any).type}| ${targetId}\n`;
    }
    
    return {
      content: [{ type: 'text', text: mermaid }]
    };
  }
  
  return {
    content: [{ type: 'text', text: JSON.stringify({ success: false, error: '不支持的导出格式' }) }],
    isError: true
  };
}

function handleListGraphs() {
  const graphs = db.prepare('SELECT * FROM graphs ORDER BY updated_at DESC').all();
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          graphs: graphs.map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            created_at: g.created_at,
            updated_at: g.updated_at
          })),
          total: graphs.length
        }, null, 2)
      }
    ]
  };
}

// ==================== 代码索引（简化版） ====================

function indexCodebase(graphId: string, codePath: string) {
  const now = Date.now();
  
  // 简单的文件扫描和索引
  function scanDirectory(dir: string) {
    const items = fs.readdirSync(dir);
    const files: string[] = [];
    const directories: string[] = [];
    
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item.startsWith('.')) continue;
      
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (typeof stats.isDirectory === 'function' ? stats.isDirectory() : stats.isDirectory) {
        directories.push(fullPath);
      } else if (stats.isFile() && /\.(ts|js|py)$/.test(item)) {
        files.push(fullPath);
      }
    }
    
    // 为目录创建 L3_Epic 节点
    for (const dirPath of directories.slice(0, 5)) {
      const dirName = path.basename(dirPath);
      const nodeId = `node_${Date.now()}_${uuidv4().slice(0, 8)}`;
      
      db.prepare(`
        INSERT INTO nodes (id, graph_id, layer, label, properties, status, created_at, updated_at)
        VALUES (?, ?, 'L3_Epic', ?, ?, 'draft', ?, ?)
      `).run(nodeId, graphId, dirName, JSON.stringify({ path: dirPath }), now, now);
    }
    
    // 为文件创建 L5_Task 节点
    for (const filePath of files.slice(0, 20)) {
      const fileName = path.basename(filePath);
      const nodeId = `node_${Date.now()}_${uuidv4().slice(0, 8)}`;
      
      db.prepare(`
        INSERT INTO nodes (id, graph_id, layer, label, properties, status, created_at, updated_at)
        VALUES (?, ?, 'L5_Task', ?, ?, 'draft', ?, ?)
      `).run(nodeId, graphId, fileName, JSON.stringify({ path: filePath }), now, now);
    }
  }
  
  scanDirectory(codePath);
  
  // 添加简单的依赖关系
  const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(graphId);
  const nodeIds = nodes.map((n: any) => n.id);
  
  for (let i = 1; i < Math.min(nodeIds.length, 10); i++) {
    const edgeId = `edge_${Date.now()}_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO edges (id, graph_id, source, target, type, created_at)
      VALUES (?, ?, ?, ?, 'depends_on', ?)
    `).run(edgeId, graphId, nodeIds[i-1], nodeIds[i], now);
  }
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, graphId);
}

// ==================== MCP Server 实现 ====================

const server = new Server(
  {
    name: 'graph-driven-development',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {
        subscribe: true
      }
    }
  }
);

// 列出所有工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  console.log(`[MCP] Tool called: ${name}`, JSON.stringify(args, null, 2));
  
  try {
    switch (name) {
      case 'gdd_create_graph':
        return handleCreateGraph(args as { name: string; description?: string });
      case 'gdd_load_graph':
        return handleLoadGraph(args as { path: string; auto_index?: boolean });
      case 'gdd_add_node':
        return handleAddNode(args as { graph_id: string; layer: string; label: string; properties?: Record<string, unknown>; status?: string });
      case 'gdd_update_node':
        return handleUpdateNode(args as { graph_id: string; node_id: string; label?: string; properties?: Record<string, unknown>; status?: string });
      case 'gdd_delete_node':
        return handleDeleteNode(args as { graph_id: string; node_id: string });
      case 'gdd_add_edge':
        return handleAddEdge(args as { graph_id: string; source: string; target: string; type: string; label?: string });
      case 'gdd_delete_edge':
        return handleDeleteEdge(args as { graph_id: string; edge_id: string });
      case 'gdd_get_pending_clarifications':
        return handleGetPendingClarifications(args as { graph_id: string });
      case 'gdd_submit_clarification_answer':
        return handleSubmitClarificationAnswer(args as { graph_id: string; session_id: string; question_id: string; answer: string });
      case 'gdd_get_dependency_impact':
        return handleGetDependencyImpact(args as { graph_id: string; node_id: string });
      case 'gdd_export_graph':
        return handleExportGraph(args as { graph_id: string; format?: string });
      case 'gdd_list_graphs':
        return handleListGraphs();
      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: `未知工具: ${name}` }) }],
          isError: true
        };
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message || String(error) }) }],
      isError: true
    };
  }
});

// ==================== 主函数 ====================

async function main() {
  console.log('🚀 Graph-Driven Development MCP Server starting...');
  console.log('   Database:', DB_PATH);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log('✅ MCP Server ready');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// 导出供 HTTP 模式使用
export { server, db, TOOLS };
