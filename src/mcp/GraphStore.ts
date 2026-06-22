/**
 * Graph Store - 图数据存储
 * 
 * 管理所有图的存储和检索
 * 支持浏览器 localStorage 和 Node.js 环境
 */

import { GraphData, NodeData, EdgeData, ClarificationSession, ClarificationQuestion } from './types';

const STORAGE_KEY = 'gdd_graphs';
const SESSION_KEY = 'gdd_sessions';

// 检测是否在浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Node.js 环境下的简单存储
const nodeStorage: Record<string, string> = {};

/**
 * 跨环境的 localStorage 兼容层
 */
function getItem(key: string): string | null {
  if (isBrowser) {
    return localStorage.getItem(key);
  }
  return nodeStorage[key] || null;
}

function setItem(key: string, value: string): void {
  if (isBrowser) {
    localStorage.setItem(key, value);
  } else {
    nodeStorage[key] = value;
  }
}

export class GraphStore {
  private graphs: Map<string, GraphData> = new Map();
  private sessions: Map<string, ClarificationSession> = new Map();
  
  constructor() {
    this.loadFromStorage();
  }
  
  // ==================== 图操作 ====================
  
  /**
   * 创建新图
   */
  createGraph(data: { name: string; description?: string; nodes?: NodeData[]; edges?: EdgeData[]; id?: string }): GraphData {
    const id = data.id || `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const graph: GraphData = {
      id,
      name: data.name,
      description: data.description,
      nodes: data.nodes || [],
      edges: data.edges || [],
      context: {
        id: `ctx_${id}`,
        name: data.name,
        description: data.description,
        goals: [],
        principles: [],
        constraints: [],
        domain: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      version: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0'
      }
    };
    
    this.graphs.set(graph.id, graph);
    this.saveToStorage();
    
    return graph;
  }
  
  /**
   * 获取图
   */
  getGraph(graphId: string): GraphData | undefined {
    return this.graphs.get(graphId);
  }
  
  /**
   * 更新图
   */
  updateGraph(graphId: string, updates: Partial<GraphData>): GraphData | undefined {
    const existing = this.graphs.get(graphId);
    if (!existing) return undefined;
    
    const updated: GraphData = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        updatedAt: Date.now()
      }
    };
    
    this.graphs.set(graphId, updated);
    this.saveToStorage();
    
    return updated;
  }
  
  /**
   * 删除图
   */
  deleteGraph(graphId: string): boolean {
    const deleted = this.graphs.delete(graphId);
    if (deleted) {
      // 同时删除关联的会话
      for (const [sessionId, session] of this.sessions) {
        if (session.graphId === graphId) {
          this.sessions.delete(sessionId);
        }
      }
      this.saveToStorage();
    }
    return deleted;
  }
  
  /**
   * 列出所有图
   */
  listGraphs(): GraphData[] {
    return Array.from(this.graphs.values());
  }
  
  // ==================== 节点操作 ====================
  
  /**
   * 添加节点
   */
  addNode(graphId: string, node: NodeData): NodeData | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;
    
    const newNode: NodeData = {
      ...node,
      id: node.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: node.status || 'pending'
    };
    
    graph.nodes.push(newNode);
    this.saveToStorage();
    
    return newNode;
  }
  
  /**
   * 更新节点
   */
  updateNode(graphId: string, nodeId: string, updates: Partial<NodeData>): NodeData | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;
    
    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return undefined;
    
    const updatedNode: NodeData = {
      ...graph.nodes[nodeIndex],
      ...updates
    };
    
    graph.nodes[nodeIndex] = updatedNode;
    this.saveToStorage();
    
    return updatedNode;
  }
  
  /**
   * 删除节点
   */
  deleteNode(graphId: string, nodeId: string, cascade = false): {
    deleted: boolean;
    deletedEdges: string[];
    cascadeDeleted: string[];
  } {
    const graph = this.graphs.get(graphId);
    if (!graph) return { deleted: false, deletedEdges: [], cascadeDeleted: [] };
    
    const deletedEdges: string[] = [];
    const cascadeDeleted: string[] = [];
    
    // 删除相关边
    graph.edges = graph.edges.filter(edge => {
      if (edge.from === nodeId || edge.to === nodeId) {
        deletedEdges.push(edge.id);
        return false;
      }
      return true;
    });
    
    // 级联删除子节点
    if (cascade) {
      const children = graph.nodes.filter(n => 
        graph.edges.some(e => e.from === nodeId && e.to === n.id)
      );
      
      for (const child of children) {
        cascadeDeleted.push(child.id);
        const result = this.deleteNode(graphId, child.id, true);
        cascadeDeleted.push(...result.cascadeDeleted);
        deletedEdges.push(...result.deletedEdges);
      }
    }
    
    // 删除节点
    const deleted = graph.nodes.some(n => n.id === nodeId);
    graph.nodes = graph.nodes.filter(n => n.id !== nodeId);
    
    if (deleted) {
      this.saveToStorage();
    }
    
    return { deleted, deletedEdges, cascadeDeleted };
  }
  
  // ==================== 边操作 ====================
  
  /**
   * 添加边
   */
  addEdge(graphId: string, edge: EdgeData): EdgeData | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;
    
    // 验证节点存在
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    
    if (!fromNode || !toNode) return undefined;
    
    const newEdge: EdgeData = {
      ...edge,
      id: edge.id || `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      weight: edge.weight || 1
    };
    
    graph.edges.push(newEdge);
    this.saveToStorage();
    
    return newEdge;
  }
  
  /**
   * 删除边
   */
  deleteEdge(graphId: string, edgeId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;
    
    const deleted = graph.edges.some(e => e.id === edgeId);
    graph.edges = graph.edges.filter(e => e.id !== edgeId);
    
    if (deleted) {
      this.saveToStorage();
    }
    
    return deleted;
  }
  
  // ==================== 会话操作 ====================
  
  /**
   * 创建澄清会话
   */
  createSession(graphId: string): ClarificationSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: ClarificationSession = {
      graphId,
      sessionId,
      questions: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.sessions.set(sessionId, session);
    this.saveToStorage();
    
    return session;
  }
  
  /**
   * 获取会话
   */
  getSession(sessionId: string): ClarificationSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * 获取图关联的最新会话
   */
  getLatestSession(graphId: string): ClarificationSession | undefined {
    // 找到该图关联的最新会话
    let latestSession: ClarificationSession | undefined;
    let latestTime = 0;
    
    for (const session of this.sessions.values()) {
      if (session.graphId === graphId && session.updatedAt > latestTime) {
        latestTime = session.updatedAt;
        latestSession = session;
      }
    }
    
    return latestSession;
  }
  
  /**
   * 添加澄清问题
   */
  addClarificationQuestion(sessionId: string, question: {
    nodeId: string;
    question: string;
    options: Array<{
      id: string;
      label: string;
      description?: string;
      implications?: string[];
    }>;
    multiSelect?: boolean;
    context?: string;
  }): ClarificationQuestion | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const clarificationQuestion: ClarificationQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeId: question.nodeId,
      question: question.question,
      options: question.options.map(opt => ({
        id: opt.id,
        label: opt.label,
        description: opt.description,
        implications: opt.implications,
        selected: false,
        disabled: false
      })),
      multiSelect: question.multiSelect || false,
      context: question.context,
      status: 'pending' as const
    };
    
    session.questions.push(clarificationQuestion);
    session.updatedAt = Date.now();
    
    this.saveToStorage();
    
    return clarificationQuestion;
  }
  
  /**
   * 回答澄清问题
   */
  answerClarificationQuestion(
    sessionId: string, 
    questionIndex: number, 
    selectedOptionIds: string[]
  ): ClarificationQuestion | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const question = session.questions[questionIndex];
    if (!question) return undefined;
    
    // 更新选项选择状态
    question.options.forEach(opt => {
      opt.selected = selectedOptionIds.includes(opt.id);
    });
    
    // 更新问题状态
    question.status = 'answered';
    session.updatedAt = Date.now();
    
    this.saveToStorage();
    
    return question;
  }
  
  // ==================== 持久化 ====================
  
  private saveToStorage(): void {
    try {
      const graphsData = Array.from(this.graphs.values());
      const sessionsData = Array.from(this.sessions.values());
      
      setItem(STORAGE_KEY, JSON.stringify(graphsData));
      setItem(SESSION_KEY, JSON.stringify(sessionsData));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }
  
  private loadFromStorage(): void {
    try {
      const graphsJson = getItem(STORAGE_KEY);
      const sessionsJson = getItem(SESSION_KEY);
      
      if (graphsJson) {
        const graphsData = JSON.parse(graphsJson) as Array<GraphData>;
        graphsData.forEach((graph: GraphData) => this.graphs.set(graph.id, graph));
      }
      
      if (sessionsJson) {
        const sessionsData = JSON.parse(sessionsJson) as Array<ClarificationSession>;
        sessionsData.forEach((session: ClarificationSession) => this.sessions.set(session.sessionId, session));
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }
}

// 单例
export const graphStore = new GraphStore();
