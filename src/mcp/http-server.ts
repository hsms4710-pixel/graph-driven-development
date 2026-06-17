/**
 * GDD HTTP Server
 * 
 * 提供 REST API 让前端直接与 GDD 通信
 * 与 MCP Server 共享同一个 SQLite 数据库
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 数据库路径
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
    position_x REAL,
    position_y REAL,
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
`);

const app = express();
const PORT = process.env.GDD_PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// ==================== Graphs API ====================

// 获取所有图谱
app.get('/api/graphs', (req, res) => {
  try {
    const graphs = db.prepare('SELECT * FROM graphs ORDER BY updated_at DESC').all();
    res.json({
      success: true,
      graphs: graphs.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        createdAt: g.created_at,
        updatedAt: g.updated_at
      })),
      total: graphs.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建图谱
app.post('/api/graphs', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: '缺少项目名称' });
    }
    
    const graphId = `graph_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO graphs (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(graphId, name, description || '', now, now);
    
    res.json({
      success: true,
      graph: {
        id: graphId,
        name,
        description,
        createdAt: now,
        updatedAt: now
      },
      message: `图谱项目 "${name}" 创建成功`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个图谱（包含节点和边）
app.get('/api/graphs/:id', (req, res) => {
  try {
    const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(req.params.id);
    if (!graph) {
      return res.status(404).json({ success: false, error: '图谱不存在' });
    }
    
    const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ? ORDER BY layer').all(req.params.id);
    const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(req.params.id);
    
    // 构建层级映射
    const layerMap: Record<string, number> = {
      'L1_Constitution': 0,
      'L2_TechStack': 1,
      'L3_Epic': 2,
      'L4_Story': 3,
      'L5_Task': 4
    };
    
    // 计算节点位置（按层级排列）
    const layerNodes: Record<number, any[]> = {};
    nodes.forEach((node: any) => {
      const layer = layerMap[node.layer] ?? 2;
      if (!layerNodes[layer]) layerNodes[layer] = [];
      layerNodes[layer].push(node);
    });
    
    // 为每个层级计算位置
    const layerPositions: Record<number, { x: number; y: number }[]> = {};
    Object.keys(layerNodes).forEach(layerKey => {
      const layer = parseInt(layerKey);
      const nodesInLayer = layerNodes[layer];
      const positions = nodesInLayer.map((_, i) => ({
        x: 200 + (i * 200),
        y: layer * 150 + 100
      }));
      layerPositions[layer] = positions;
    });
    
    // 转换为前端格式
    const formattedNodes = nodes.map((node: any) => {
      const layer = layerMap[node.layer] ?? 2;
      const posIndex = layerNodes[layer].indexOf(node);
      const pos = layerPositions[layer]?.[posIndex] || { x: 200, y: 200 };
      
      return {
        id: node.id,
        type: node.layer === 'L3_Epic' || node.layer === 'L4_Story' ? 'feature' : 'module',
        position: { x: node.position_x ?? pos.x, y: node.position_y ?? pos.y },
        data: {
          label: node.label,
          layer: node.layer,
          layerLabel: node.layer.replace('L', ''),
          status: node.status,
          properties: JSON.parse(node.properties || '{}')
        }
      };
    });
    
    const formattedEdges = edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'custom',
      markerEnd: { type: 'arrowclosed', color: '#667eea' },
      data: { type: edge.type, label: edge.label }
    }));
    
    res.json({
      success: true,
      graph: {
        id: graph.id,
        name: graph.name,
        description: graph.description,
        createdAt: graph.created_at,
        updatedAt: graph.updated_at
      },
      nodes: formattedNodes,
      edges: formattedEdges,
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        byLayer: {
          L1: nodes.filter((n: any) => n.layer === 'L1_Constitution').length,
          L2: nodes.filter((n: any) => n.layer === 'L2_TechStack').length,
          L3: nodes.filter((n: any) => n.layer === 'L3_Epic').length,
          L4: nodes.filter((n: any) => n.layer === 'L4_Story').length,
          L5: nodes.filter((n: any) => n.layer === 'L5_Task').length
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除图谱
app.delete('/api/graphs/:id', (req, res) => {
  try {
    const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(req.params.id);
    if (!graph) {
      return res.status(404).json({ success: false, error: '图谱不存在' });
    }
    
    db.prepare('DELETE FROM edges WHERE graph_id = ?').run(req.params.id);
    db.prepare('DELETE FROM nodes WHERE graph_id = ?').run(req.params.id);
    db.prepare('DELETE FROM graphs WHERE id = ?').run(req.params.id);
    
    res.json({ success: true, message: '图谱已删除' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Nodes API ====================

// 添加节点
app.post('/api/graphs/:graphId/nodes', (req, res) => {
  try {
    const { layer, label, properties, status, position } = req.body;
    
    if (!layer || !label) {
      return res.status(400).json({ success: false, error: '缺少 layer 或 label' });
    }
    
    const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(req.params.graphId);
    if (!graph) {
      return res.status(404).json({ success: false, error: '图谱不存在' });
    }
    
    const nodeId = `node_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO nodes (id, graph_id, layer, label, properties, status, position_x, position_y, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nodeId,
      req.params.graphId,
      layer,
      label,
      JSON.stringify(properties || {}),
      status || 'draft',
      position?.x ?? 200,
      position?.y ?? 200,
      now,
      now
    );
    
    db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, req.params.graphId);
    
    res.json({
      success: true,
      node: {
        id: nodeId,
        layer,
        label,
        status: status || 'draft'
      },
      message: `节点 "${label}" 添加成功`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新节点
app.put('/api/graphs/:graphId/nodes/:nodeId', (req, res) => {
  try {
    const { label, properties, status, position } = req.body;
    
    const node = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(
      req.params.nodeId,
      req.params.graphId
    );
    
    if (!node) {
      return res.status(404).json({ success: false, error: '节点不存在' });
    }
    
    const now = Date.now();
    
    db.prepare(`
      UPDATE nodes 
      SET label = COALESCE(?, label),
          properties = COALESCE(?, properties),
          status = COALESCE(?, status),
          position_x = COALESCE(?, position_x),
          position_y = COALESCE(?, position_y),
          updated_at = ?
      WHERE id = ? AND graph_id = ?
    `).run(
      label,
      JSON.stringify(properties),
      status,
      position?.x,
      position?.y,
      now,
      req.params.nodeId,
      req.params.graphId
    );
    
    db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, req.params.graphId);
    
    res.json({ success: true, message: '节点更新成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除节点
app.delete('/api/graphs/:graphId/nodes/:nodeId', (req, res) => {
  try {
    const node = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(
      req.params.nodeId,
      req.params.graphId
    );
    
    if (!node) {
      return res.status(404).json({ success: false, error: '节点不存在' });
    }
    
    const now = Date.now();
    
    db.prepare('DELETE FROM edges WHERE source = ? OR target = ? AND graph_id = ?').run(
      req.params.nodeId,
      req.params.nodeId,
      req.params.graphId
    );
    
    db.prepare('DELETE FROM nodes WHERE id = ? AND graph_id = ?').run(
      req.params.nodeId,
      req.params.graphId
    );
    
    db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, req.params.graphId);
    
    res.json({ success: true, message: '节点删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Edges API ====================

// 添加边
app.post('/api/graphs/:graphId/edges', (req, res) => {
  try {
    const { source, target, type, label } = req.body;
    
    if (!source || !target || !type) {
      return res.status(400).json({ success: false, error: '缺少 source, target 或 type' });
    }
    
    const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(req.params.graphId);
    if (!graph) {
      return res.status(404).json({ success: false, error: '图谱不存在' });
    }
    
    const sourceNode = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(source, req.params.graphId);
    const targetNode = db.prepare('SELECT * FROM nodes WHERE id = ? AND graph_id = ?').get(target, req.params.graphId);
    
    if (!sourceNode || !targetNode) {
      return res.status(404).json({ success: false, error: '源节点或目标节点不存在' });
    }
    
    const edgeId = `edge_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO edges (id, graph_id, source, target, type, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(edgeId, req.params.graphId, source, target, type, label, now);
    
    db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, req.params.graphId);
    
    res.json({
      success: true,
      edge: {
        id: edgeId,
        source,
        target,
        type
      },
      message: `边创建成功: ${source} → ${target}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除边
app.delete('/api/graphs/:graphId/edges/:edgeId', (req, res) => {
  try {
    const edge = db.prepare('SELECT * FROM edges WHERE id = ? AND graph_id = ?').get(
      req.params.edgeId,
      req.params.graphId
    );
    
    if (!edge) {
      return res.status(404).json({ success: false, error: '边不存在' });
    }
    
    const now = Date.now();
    
    db.prepare('DELETE FROM edges WHERE id = ? AND graph_id = ?').run(req.params.edgeId, req.params.graphId);
    db.prepare('UPDATE graphs SET updated_at = ? WHERE id = ?').run(now, req.params.graphId);
    
    res.json({ success: true, message: '边删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 导出 API ====================

// 导出图谱
app.get('/api/graphs/:id/export', (req, res) => {
  try {
    const graph = db.prepare('SELECT * FROM graphs WHERE id = ?').get(req.params.id);
    if (!graph) {
      return res.status(404).json({ success: false, error: '图谱不存在' });
    }
    
    const nodes = db.prepare('SELECT * FROM nodes WHERE graph_id = ?').all(req.params.id);
    const edges = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(req.params.id);
    const format = req.query.format as string || 'json';
    
    if (format === 'json') {
      res.json({
        success: true,
        graph: {
          id: graph.id,
          name: graph.name,
          description: graph.description,
          createdAt: graph.created_at,
          updatedAt: graph.updated_at,
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
        }
      });
    } else if (format === 'markdown') {
      let md = `# ${graph.name}\n\n`;
      if (graph.description) md += `${graph.description}\n\n`;
      
      md += `## 节点 (${nodes.length})\n\n`;
      md += `| ID | 层级 | 标签 | 状态 |\n`;
      md += `|----|------|------|------|\n`;
      
      for (const node of nodes) {
        md += `| ${node.id} | ${node.layer} | ${node.label} | ${node.status} |\n`;
      }
      
      md += `\n## 连接 (${edges.length})\n\n`;
      md += `| 类型 | 源 | 目标 |\n`;
      md += `|------|----|------|\n`;
      
      for (const edge of edges) {
        const sourceNode = nodes.find((n: any) => n.id === edge.source);
        const targetNode = nodes.find((n: any) => n.id === edge.target);
        md += `| ${edge.type} | ${sourceNode?.label || edge.source} | ${targetNode?.label || edge.target} |\n`;
      }
      
      res.setHeader('Content-Type', 'text/markdown');
      res.send(md);
    } else {
      res.status(400).json({ success: false, error: '不支持的导出格式' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 健康检查 ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
  console.log(`🚀 GDD HTTP Server running at http://localhost:${PORT}`);
  console.log(`   Database: ${DB_PATH}`);
  console.log(`   API Endpoints:`);
  console.log(`     - GET  /api/graphs           - 获取所有图谱`);
  console.log(`     - POST /api/graphs           - 创建图谱`);
  console.log(`     - GET  /api/graphs/:id       - 获取图谱详情`);
  console.log(`     - POST /api/graphs/:id/nodes - 添加节点`);
  console.log(`     - POST /api/graphs/:id/edges - 添加边`);
  console.log(`     - GET  /api/graphs/:id/export - 导出图谱`);
});

export { app, db };
