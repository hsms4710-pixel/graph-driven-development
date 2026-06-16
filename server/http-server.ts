/**
 * Graph-Driven Development - HTTP Server with WebSocket
 * 
 * 提供 REST API + WebSocket 实时同步 + 代码索引
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CodeIndexer } from '../src/indexer/CodeIndexer';

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
  
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    graph_id TEXT,
    connected_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    FOREIGN KEY (graph_id) REFERENCES graphs(id)
  );
`);

// ==================== Express 应用 ====================

const app = express();
app.use(cors());
app.use(express.json());

// ==================== REST API 路由 ====================

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), database: DB_PATH });
});

// 列出所有图谱
app.get('/api/graphs', (_req, res) => {
  const graphs = db.prepare('SELECT * FROM graphs ORDER BY updated_at DESC').all();
  res.json(graphs.map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    nodeCount: db.prepare('SELECT COUNT(*) as count FROM nodes WHERE graph_id = ?').get(g.id).count,
    edgeCount: db.prepare('SELECT COUNT(*) as count FROM edges WHERE graph_id = ?').get(g.id).count,
    createdAt: g.created_at,
    updatedAt: g.updated_at
  })));
});

// 创建图谱
app.post('/api/graphs', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  
  const graphId = `graph_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO graphs (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(graphId, name, description || '', now, now);
  
  broadcastToGraph(graphId, {
    type: 'graph:created',
    graphId,
    name,
    description
  });
  
  res.json({ id: graphId, name, description, createdAt: now });
});

// 获取单个图谱
app.get('/api/graphs/:id', (req, res) => {
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(req.params.id);
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(req.params.id);
  const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(req.params.id);
  
  res.json({
    ...graph,
    nodes: nodes.map((n: any) => ({
      id: n.id,
      layer: n.layer,
      label: n.label,
      properties: JSON.parse(n.properties || '{}'),
      status: n.status,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    })),
    edges: edges.map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      label: e.label,
      createdAt: e.created_at
    }))
  });
});

// 添加节点
app.post('/api/graphs/:graphId/nodes', (req, res) => {
  const { layer, label, properties, status } = req.body;
  const graphId = req.params.graphId;
  
  if (!layer || !label) {
    return res.status(400).json({ error: 'layer and label are required' });
  }
  
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(graphId);
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const nodeId = `node_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO nodes (id, graph_id, layer, label, properties, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nodeId, graphId, layer, label, JSON.stringify(properties || {}), status || 'draft', now, now);
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, graphId);
  
  broadcastToGraph(graphId, {
    type: 'node:added',
    nodeId,
    node: {
      id: nodeId,
      layer,
      label,
      properties,
      status: status || 'draft'
    }
  });
  
  res.json({ id: nodeId, createdAt: now });
});

// 更新节点
app.put('/api/graphs/:graphId/nodes/:nodeId', (req, res) => {
  const { label, properties, status } = req.body;
  const graphId = req.params.graphId;
  const nodeId = req.params.nodeId;
  
  const node = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(nodeId, graphId);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  const now = Date.now();
  
  db.prepare(`
    UPDATE nodes 
    SET label = COALESCE(?, label),
        properties = COALESCE(?, properties),
        status = COALESCE(?, status),
        updated_at = ?
    WHERE id = ? AND graph_id = ?
  `).run(label, JSON.stringify(properties), status, now, nodeId, graphId);
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, graphId);
  
  broadcastToGraph(graphId, {
    type: 'node:updated',
    nodeId,
    updates: { label, properties, status }
  });
  
  res.json({ success: true });
});

// 删除节点
app.delete('/api/graphs/:graphId/nodes/:nodeId', (req, res) => {
  const { graphId, nodeId } = req.params;
  
  const node = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(nodeId, graphId);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  const now = Date.now();
  
  db.prepare('DELETE FROM edges WHERE source = ? OR target = ? AND graph_id = ?').run(nodeId, nodeId, graphId);
  db.prepare('DELETE FROM nodes WHERE id = ? AND graph_id = ?').run(nodeId, graphId);
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, graphId);
  
  broadcastToGraph(graphId, {
    type: 'node:deleted',
    nodeId
  });
  
  res.json({ success: true });
});

// 添加边
app.post('/api/graphs/:graphId/edges', (req, res) => {
  const { source, target, type, label } = req.body;
  const graphId = req.params.graphId;
  
  if (!source || !target || !type) {
    return res.status(400).json({ error: 'source, target, and type are required' });
  }
  
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(graphId);
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const sourceNode = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(source, graphId);
  const targetNode = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(target, graphId);
  
  if (!sourceNode || !targetNode) {
    return res.status(400).json({ error: 'Source or target node not found' });
  }
  
  const edgeId = `edge_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO edges (id, graph_id, source, target, type, label, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(edgeId, graphId, source, target, type, label, now);
  
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, graphId);
  
  broadcastToGraph(graphId, {
    type: 'edge:added',
    edgeId,
    edge: { id: edgeId, source, target, type, label }
  });
  
  res.json({ id: edgeId, createdAt: now });
});

// 删除边
app.delete('/api/graphs/:graphId/edges/:edgeId', (req, res) => {
  const { graphId, edgeId } = req.params;
  
  const edge = db.prepare('SELECT * FROM edges WHERE id = ? AND graph_id = ?').get(edgeId, graphId);
  if (!edge) {
    return res.status(404).json({ error: 'Edge not found' });
  }
  
  const now = Date.now();
  
  db.prepare('DELETE FROM edges WHERE id = ? AND graph_id = ?').run(edgeId, graphId);
  db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, graphId);
  
  broadcastToGraph(graphId, {
    type: 'edge:deleted',
    edgeId
  });
  
  res.json({ success: true });
});

// Brainstorm 会话
app.post('/api/graphs/:graphId/brainstorm', (req, res) => {
  const graphId = req.params.graphId;
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(graphId);
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const sessionId = `bs_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO brainstorm_sessions (id, graph_id, state, questions, answers, created_at, updated_at)
    VALUES (?, ?, 'INIT', '[]', '[]', ?, ?)
  `).run(sessionId, graphId, now, now);
  
  res.json({ sessionId });
});

// 获取待澄清问题
app.get('/api/graphs/:graphId/pending-questions', (req, res) => {
  const graphId = req.params.graphId;
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(graphId);
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(graphId);
  const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(graphId);
  
  const questions = [];
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
  
  res.json({
    questions,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      missingLayers: layers.filter(l => !existingLayers.has(l))
    }
  });
});

// 导出图谱
app.get('/api/graphs/:graphId/export', (req, res) => {
  const { format = 'json' } = req.query;
  const graphId = req.params.graphId;
  
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(graphId);
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(graphId);
  const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(graphId);
  
  if (format === 'markdown') {
    let md = `# ${graph.name}\n\n`;
    if (graph.description) md += `${graph.description}\n\n`;
    
    md += `## 节点 (${nodes.length})\n\n| ID | 层级 | 标签 | 状态 |\n|----|------|------|------|\n`;
    for (const node of nodes) {
      md += `| ${node.id} | ${node.layer} | ${node.label} | ${node.status} |\n`;
    }
    
    md += `\n## 连接 (${edges.length})\n\n| 类型 | 源 | 目标 |\n|------|----|------|\n`;
    for (const edge of edges) {
      md += `| ${edge.type} | ${edge.source} | ${edge.target} |\n`;
    }
    
    return res.type('text/markdown').send(md);
  }
  
  res.json({
    id: graph.id,
    name: graph.name,
    description: graph.description,
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
  });
});

// ==================== 代码索引 API ====================

// 从代码索引生成图谱
app.post('/api/graphs/from-code', async (req, res) => {
  const { projectPath, name } = req.body;
  
  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }
  
  // 验证路径存在
  const resolvedPath = path.resolve(projectPath);
  if (!fs.existsSync(resolvedPath)) {
    return res.status(400).json({ error: 'Project path does not exist' });
  }
  
  // 创建图谱
  const graphId = `graph_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const graphName = name || path.basename(resolvedPath);
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO graphs (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(graphId, graphName, `从 ${resolvedPath} 索引生成`, now, now);
  
  // 执行代码索引
  try {
    const indexer = new CodeIndexer(graphId, resolvedPath);
    const result = await indexer.index();
    
    // 保存节点
    for (const node of result.nodes) {
      db.prepare(`
        INSERT INTO nodes (id, graph_id, layer, label, properties, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        node.id,
        graphId,
        node.layer,
        node.label,
        JSON.stringify(node.properties),
        node.properties.status || 'draft',
        now,
        now
      );
    }
    
    // 保存边
    for (const edge of result.edges) {
      db.prepare(`
        INSERT INTO edges (id, graph_id, source, target, type, label, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        edge.id,
        graphId,
        edge.source,
        edge.target,
        edge.type,
        edge.label || '',
        now
      );
    }
    
    // 更新图谱时间戳
    db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, graphId);
    
    // 广播图谱创建事件
    broadcastToGraph(graphId, {
      type: 'graph:created',
      graphId,
      name: graphName,
      nodeCount: result.nodes.length,
      edgeCount: result.edges.length
    });
    
    res.json({
      id: graphId,
      name: graphName,
      indexedAt: now,
      summary: result.summary
    });
  } catch (error: any) {
    // 删除失败的图谱
    db.prepare('DELETE FROM graphs WHERE id = ?').run(graphId);
    res.status(500).json({ error: error.message });
  }
});

// 获取代码索引状态
app.get('/api/graphs/:graphId/index-status', (req, res) => {
  const graphId = req.params.graphId;
  const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(graphId);
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(graphId);
  const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(graphId);
  
  const layers: Record<string, number> = {};
  for (const node of nodes) {
    layers[node.layer] = (layers[node.layer] || 0) + 1;
  }
  
  res.json({
    graphId,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    layers,
    lastUpdated: graph.updated_at
  });
});

// ==================== WebSocket 服务器 ====================

const serverHttp = http.createServer(app);
const wss = new WebSocketServer({ server: serverHttp, path: '/ws' });

interface Client {
  id: string;
  ws: WebSocket;
  graphId?: string;
}

const clients: Map<string, Client> = new Map();

wss.on('connection', (ws: WebSocket, req) => {
  const clientId = `client_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const graphId = url.searchParams.get('graphId');
  
  const client: Client = { id: clientId, ws, graphId };
  clients.set(clientId, client);
  
  console.log(`[WS] Client connected: ${clientId}${graphId ? ` (graph: ${graphId})` : ''}`);
  
  // 发送连接成功消息
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    graphId
  }));
  
  // 如果指定了 graphId，发送当前图谱状态
  if (graphId) {
    const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(graphId);
    if (graph) {
      const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(graphId);
      const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(graphId);
      
      ws.send(JSON.stringify({
        type: 'graph:state',
        graph: { id: graph.id, name: graph.name, description: graph.description },
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
      }));
    }
  }
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[WS] Message from ${clientId}:`, message.type);
      
      // 处理客户端消息
      switch (message.type) {
        case 'subscribe':
          if (message.graphId) {
            client.graphId = message.graphId;
            console.log(`[WS] Client ${clientId} subscribed to graph ${message.graphId}`);
          }
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('[WS] Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });
  
  ws.on('error', (error) => {
    console.error(`[WS] Error for ${clientId}:`, error);
    clients.delete(clientId);
  });
});

// 广播消息到指定图谱的所有客户端
function broadcastToGraph(graphId: string, message: any) {
  const messageStr = JSON.stringify(message);
  
  for (const [id, client] of clients) {
    if (client.graphId === graphId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  }
}

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || 3001;

serverHttp.listen(PORT, () => {
  console.log(`\n🚀 Graph-Driven Development Server running at http://localhost:${PORT}`);
  console.log(`   REST API: http://localhost:${PORT}/api`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws?graphId=xxx`);
  console.log(`   Database: ${DB_PATH}\n`);
});

export { app, serverHttp, wss, db };
