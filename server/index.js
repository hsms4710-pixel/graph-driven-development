/**
 * Graph-Driven Development - MCP Server
 * 
 * 提供 Agent ↔ Graph 双向同步的 HTTP API
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 数据存储目录
const DATA_DIR = path.join(process.cwd(), 'data');
const GRAPHS_FILE = path.join(DATA_DIR, 'graphs.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 工具函数
function loadData(file) {
  if (!fs.existsSync(file)) {
    return {};
  }
  const data = fs.readFileSync(file, 'utf-8');
  return JSON.parse(data);
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

// 初始化数据
let graphs = loadData(GRAPHS_FILE);
let sessions = loadData(SESSIONS_FILE);

// 持久化
setInterval(() => {
  saveData(GRAPHS_FILE, graphs);
  saveData(SESSIONS_FILE, sessions);
}, 5000);

// 创建 Express 应用
const app = express();
app.use(cors());
app.use(express.json());

// ==================== Graph API ====================

app.post('/api/graphs', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  
  const graphId = generateId('graph');
  const newGraph = {
    id: graphId,
    name,
    description: description || '',
    nodes: [],
    edges: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  graphs[graphId] = newGraph;
  res.json(newGraph);
});

app.get('/api/graphs', (req, res) => {
  const graphList = Object.values(graphs).map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    nodeCount: g.nodes.length,
    edgeCount: g.edges.length,
    updatedAt: g.updatedAt
  }));
  
  res.json(graphList);
});

app.get('/api/graphs/:id', (req, res) => {
  const graph = graphs[req.params.id];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  res.json(graph);
});

app.put('/api/graphs/:id', (req, res) => {
  const graph = graphs[req.params.id];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const { name, description, nodes, edges } = req.body;
  
  if (name !== undefined) graph.name = name;
  if (description !== undefined) graph.description = description;
  if (nodes !== undefined) graph.nodes = nodes;
  if (edges !== undefined) graph.edges = edges;
  
  graph.updatedAt = Date.now();
  graphs[req.params.id] = graph;
  
  res.json(graph);
});

app.delete('/api/graphs/:id', (req, res) => {
  if (!graphs[req.params.id]) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  delete graphs[req.params.id];
  
  Object.keys(sessions).forEach(sessionId => {
    if (sessions[sessionId].graphId === req.params.id) {
      delete sessions[sessionId];
    }
  });
  
  res.json({ success: true });
});

// ==================== Node API ====================

app.post('/api/graphs/:graphId/nodes', (req, res) => {
  const graph = graphs[req.params.graphId];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const { label, type, layer, layerLabel, properties, status } = req.body;
  
  if (!label || !layer) {
    return res.status(400).json({ error: 'label and layer are required' });
  }
  
  const nodeId = generateId('node');
  const newNode = {
    id: nodeId,
    label,
    type: type || 'custom',
    layer,
    layerLabel: layerLabel || layer,
    properties,
    status: status || 'draft'
  };
  
  graph.nodes.push(newNode);
  graph.updatedAt = Date.now();
  
  res.json(newNode);
});

app.put('/api/graphs/:graphId/nodes/:nodeId', (req, res) => {
  const graph = graphs[req.params.graphId];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const nodeIndex = graph.nodes.findIndex(n => n.id === req.params.nodeId);
  
  if (nodeIndex === -1) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  const { label, properties, status } = req.body;
  const node = graph.nodes[nodeIndex];
  
  if (label !== undefined) node.label = label;
  if (properties !== undefined) node.properties = properties;
  if (status !== undefined) node.status = status;
  
  graph.updatedAt = Date.now();
  
  res.json(node);
});

app.delete('/api/graphs/:graphId/nodes/:nodeId', (req, res) => {
  const graph = graphs[req.params.graphId];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const nodeIndex = graph.nodes.findIndex(n => n.id === req.params.nodeId);
  
  if (nodeIndex === -1) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  graph.nodes.splice(nodeIndex, 1);
  graph.edges = graph.edges.filter(e => e.source !== req.params.nodeId && e.target !== req.params.nodeId);
  graph.updatedAt = Date.now();
  
  res.json({ success: true });
});

// ==================== Edge API ====================

app.post('/api/graphs/:graphId/edges', (req, res) => {
  const graph = graphs[req.params.graphId];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const { source, target, type } = req.body;
  
  if (!source || !target || !type) {
    return res.status(400).json({ error: 'source, target, and type are required' });
  }
  
  if (!graph.nodes.find(n => n.id === source) || !graph.nodes.find(n => n.id === target)) {
    return res.status(400).json({ error: 'Source or target node not found' });
  }
  
  const edgeId = generateId('edge');
  const newEdge = { id: edgeId, source, target, type };
  
  graph.edges.push(newEdge);
  graph.updatedAt = Date.now();
  
  res.json(newEdge);
});

app.delete('/api/graphs/:graphId/edges/:edgeId', (req, res) => {
  const graph = graphs[req.params.graphId];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const edgeIndex = graph.edges.findIndex(e => e.id === req.params.edgeId);
  
  if (edgeIndex === -1) {
    return res.status(404).json({ error: 'Edge not found' });
  }
  
  graph.edges.splice(edgeIndex, 1);
  graph.updatedAt = Date.now();
  
  res.json({ success: true });
});

// ==================== Brainstorm API ====================

app.post('/api/graphs/:graphId/brainstorm', (req, res) => {
  const graph = graphs[req.params.graphId];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  const sessionId = generateId('bs');
  const newSession = {
    sessionId,
    graphId: req.params.graphId,
    state: 'INIT',
    questions: [],
    answers: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentQuestionIndex: 0,
    history: []
  };
  
  sessions[sessionId] = newSession;
  
  res.json({ sessionId });
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions[req.params.sessionId];
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

app.post('/api/sessions/:sessionId/analyze', async (req, res) => {
  const session = sessions[req.params.sessionId];
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const graph = graphs[session.graphId];
  
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  
  session.state = 'ANALYZE';
  session.updatedAt = Date.now();
  
  const mockQuestions = generateMockQuestions(graph);
  
  session.questions = mockQuestions;
  session.state = 'CLARIFY';
  session.updatedAt = Date.now();
  
  res.json({
    state: session.state,
    questions: mockQuestions
  });
});

app.post('/api/sessions/:sessionId/answer', (req, res) => {
  const session = sessions[req.params.sessionId];
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const { questionId, optionIds } = req.body;
  
  if (!questionId || !optionIds) {
    return res.status(400).json({ error: 'questionId and optionIds are required' });
  }
  
  const question = session.questions.find(q => q.id === questionId);
  
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  
  question.status = 'answered';
  question.selectedOptionIds = optionIds;
  session.answers[questionId] = optionIds;
  session.currentQuestionIndex++;
  session.updatedAt = Date.now();
  
  const allAnswered = session.questions.every(q => q.status === 'answered');
  
  if (allAnswered) {
    session.state = 'BUILD';
  }
  
  res.json({
    state: session.state,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length
  });
});

app.get('/api/sessions/:sessionId/pending', (req, res) => {
  const session = sessions[req.params.sessionId];
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const pendingQuestions = session.questions.filter(q => q.status === 'pending');
  
  res.json({
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length,
    pending: pendingQuestions
  });
});

app.post('/api/sessions/:sessionId/generate', async (req, res) => {
  const session = sessions[req.params.sessionId];
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.state = 'GENERATE';
  session.updatedAt = Date.now();
  
  res.json({
    state: session.state,
    message: 'Code generation started',
    files: []
  });
});

function generateMockQuestions(graph) {
  const questions = [];
  
  if (graph.nodes.length === 0) {
    questions.push({
      id: 'q_init_1',
      question: '这个项目的主要目标是什么？',
      hint: '明确目标有助于后续的技术选型',
      options: [
        { id: 'opt_1', label: '构建新项目', implications: ['需要完整的技术选型', '从零开始设计架构'] },
        { id: 'opt_2', label: '重构现有项目', implications: ['需要考虑迁移策略', '可能保留部分现有代码'] },
        { id: 'opt_3', label: '添加新功能', implications: ['需要理解现有架构', '增量开发模式'] }
      ],
      status: 'pending'
    });
  }
  
  const hasConstitution = graph.nodes.some(n => n.layer === 'L1_Constitution');
  
  if (!hasConstitution) {
    questions.push({
      id: 'q_l1_1',
      question: '项目的核心原则是什么？',
      hint: '这些原则将指导后续所有技术决策',
      options: [
        { id: 'opt_l1_1', label: '简洁优先', implications: ['减少抽象层', '优先使用成熟方案'] },
        { id: 'opt_l1_2', label: '可扩展优先', implications: ['预留扩展点', '模块化设计'] },
        { id: 'opt_l1_3', label: '安全优先', implications: ['严格的权限控制', '完整的审计日志'] }
      ],
      status: 'pending'
    });
  }
  
  const hasTechStack = graph.nodes.some(n => n.layer === 'L2_TechStack');
  
  if (!hasTechStack) {
    questions.push({
      id: 'q_l2_1',
      question: '前端技术栈选择？',
      hint: '技术栈选择影响开发效率和维护成本',
      options: [
        { id: 'opt_l2_1', label: 'React + TypeScript', implications: ['丰富的生态系统', '类型安全'] },
        { id: 'opt_l2_2', label: 'Vue 3 + TypeScript', implications: ['更温和的学习曲线', '国内社区活跃'] },
        { id: 'opt_l2_3', label: 'Next.js (React)', implications: ['内置 SSR', '完善的路由'] }
      ],
      status: 'pending'
    });
  }
  
  return questions;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Graph-Driven Development Server running at http://localhost:${PORT}`);
  console.log(`   API endpoints available at /api/\n`);
});
