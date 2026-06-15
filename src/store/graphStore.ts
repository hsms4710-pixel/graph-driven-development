/**
 * Graph Store - Zustand 状态管理
 * 
 * 管理图数据和 Brainstorm 会话的状态
 * 支持与后端 API 双向同步
 */

import { create } from 'zustand';

// 类型定义
export type LayerType = 'L1_Constitution' | 'L2_TechStack' | 'L3_Epic' | 'L4_Story' | 'L5_Task';

export interface NodeData {
  id: string;
  label: string;
  type: string;
  layer: LayerType;
  layerLabel: string;
  properties?: Record<string, any>;
  status?: 'draft' | 'reviewing' | 'approved' | 'implemented';
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: 'depends_on' | 'contains' | 'implements' | 'refines';
}

export interface GraphData {
  id: string;
  name: string;
  description: string;
  nodes: NodeData[];
  edges: EdgeData[];
  createdAt: number;
  updatedAt: number;
}

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  implications?: string[];
  selected?: boolean;
  disabled?: boolean;
  cost?: 'low' | 'medium' | 'high';
  complexity?: 'simple' | 'moderate' | 'complex';
  time?: 'short' | 'medium' | 'long';
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  hint?: string;
  options: ClarificationOption[];
  status: 'pending' | 'answered';
  selectedOptionIds?: string[];
}

export interface BrainstormSession {
  sessionId: string;
  graphId: string;
  state: 'INIT' | 'ANALYZE' | 'CLARIFY' | 'BUILD' | 'GENERATE';
  questions: ClarificationQuestion[];
  answers: Record<string, string[]>;
  createdAt: number;
  updatedAt: number;
  currentQuestionIndex: number;
  history: Array<{ timestamp: number; action: string; data: Record<string, unknown> }>;
}

interface GraphStoreState {
  // 当前图
  currentGraph: GraphData | null;
  graphs: GraphData[];
  
  // Brainstorm 会话
  currentSessionId: string | null;
  brainstormSessions: Record<string, BrainstormSession>;
  
  // UI 状态
  selectedNodeId: string | null;
  isSidebarOpen: boolean;
  isBrainstormPanelOpen: boolean;
  
  // API 状态
  serverUrl: string;
  isConnected: boolean;
  
  // 操作 - Graph
  setCurrentGraph: (graph: GraphData | null) => void;
  addGraph: (graph: GraphData) => void;
  updateGraph: (graphId: string, updates: Partial<GraphData>) => void;
  deleteGraph: (graphId: string) => void;
  fetchGraphs: () => Promise<void>;
  fetchGraph: (graphId: string) => Promise<void>;
  saveGraph: (graphId: string) => Promise<void>;
  
  // 操作 - Node
  selectNode: (nodeId: string | null) => void;
  addNode: (node: NodeData) => void;
  updateNode: (nodeId: string, updates: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  
  // 操作 - Edge
  addEdge: (edge: EdgeData) => void;
  deleteEdge: (edgeId: string) => void;
  
  // 操作 - Brainstorm
  createBrainstormSession: (graphId: string) => Promise<string>;
  setCurrentSessionId: (sessionId: string | null) => void;
  startAnalysis: () => Promise<void>;
  answerQuestion: (questionId: string, optionIds: string[]) => Promise<void>;
  getPendingQuestions: (sessionId: string) => ClarificationQuestion[] | null;
  
  // UI 操作
  toggleSidebar: () => void;
  toggleBrainstormPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBrainstormPanelOpen: (open: boolean) => void;
  
  // 连接
  connectServer: (url?: string) => Promise<void>;
  
  // 重置
  reset: () => void;
}

// API 调用封装
const api = {
  baseUrl: (url: string) => `${url}/api`,
  
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },
  
  async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },
  
  async put<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },
  
  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }
};

export const useGraphStore = create<GraphStoreState>((set, get) => ({
  // 初始状态
  currentGraph: null,
  graphs: [],
  currentSessionId: null,
  brainstormSessions: {},
  selectedNodeId: null,
  isSidebarOpen: true,
  isBrainstormPanelOpen: false,
  serverUrl: 'http://localhost:3001',
  isConnected: false,
  
  // Graph 操作
  setCurrentGraph: (graph) => set({ currentGraph: graph }),
  
  addGraph: (graph) => set((state) => ({
    graphs: [...state.graphs, graph],
    currentGraph: graph
  })),
  
  updateGraph: (graphId, updates) => set((state) => ({
    graphs: state.graphs.map(g => 
      g.id === graphId ? { ...g, ...updates, updatedAt: Date.now() } : g
    ),
    currentGraph: state.currentGraph?.id === graphId 
      ? { ...state.currentGraph, ...updates, updatedAt: Date.now() }
      : state.currentGraph
  })),
  
  deleteGraph: (graphId) => set((state) => ({
    graphs: state.graphs.filter(g => g.id !== graphId),
    currentGraph: state.currentGraph?.id === graphId ? null : state.currentGraph
  })),
  
  fetchGraphs: async () => {
    const { serverUrl } = get();
    try {
      const graphs = await api.get<GraphData[]>(`${serverUrl}/graphs`);
      set({ graphs });
    } catch (error) {
      console.error('Failed to fetch graphs:', error);
    }
  },
  
  fetchGraph: async (graphId) => {
    const { serverUrl } = get();
    try {
      const graph = await api.get<GraphData>(`${serverUrl}/graphs/${graphId}`);
      set({ currentGraph: graph });
    } catch (error) {
      console.error('Failed to fetch graph:', error);
    }
  },
  
  saveGraph: async (graphId) => {
    const { serverUrl, currentGraph } = get();
    if (!currentGraph) return;
    
    try {
      await api.put(`${serverUrl}/graphs/${graphId}`, currentGraph);
    } catch (error) {
      console.error('Failed to save graph:', error);
    }
  },
  
  // Node 操作
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  
  addNode: (node) => set((state) => ({
    currentGraph: state.currentGraph 
      ? {
          ...state.currentGraph,
          nodes: [...state.currentGraph.nodes, node],
          updatedAt: Date.now()
        }
      : null
  })),
  
  updateNode: (nodeId, updates) => set((state) => ({
    currentGraph: state.currentGraph
      ? {
          ...state.currentGraph,
          nodes: state.currentGraph.nodes.map(n => 
            n.id === nodeId ? { ...n, ...updates } : n
          ),
          updatedAt: Date.now()
        }
      : null
  })),
  
  deleteNode: (nodeId) => set((state) => ({
    currentGraph: state.currentGraph
      ? {
          ...state.currentGraph,
          nodes: state.currentGraph.nodes.filter(n => n.id !== nodeId),
          edges: state.currentGraph.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
          updatedAt: Date.now()
        }
      : null
  })),
  
  // Edge 操作
  addEdge: (edge) => set((state) => ({
    currentGraph: state.currentGraph
      ? {
          ...state.currentGraph,
          edges: [...state.currentGraph.edges, edge],
          updatedAt: Date.now()
        }
      : null
  })),
  
  deleteEdge: (edgeId) => set((state) => ({
    currentGraph: state.currentGraph
      ? {
          ...state.currentGraph,
          edges: state.currentGraph.edges.filter(e => e.id !== edgeId),
          updatedAt: Date.now()
        }
      : null
  })),
  
  // Brainstorm 操作
  createBrainstormSession: async (graphId) => {
    const { serverUrl } = get();
    try {
      const { sessionId } = await api.post<{ sessionId: string }>(
        `${serverUrl}/graphs/${graphId}/brainstorm`,
        {}
      );
      set((state) => ({
        currentSessionId: sessionId,
        brainstormSessions: {
          ...state.brainstormSessions,
          [sessionId]: {
            sessionId,
            graphId,
            state: 'INIT',
            questions: [],
            answers: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
            currentQuestionIndex: 0,
            history: []
          }
        }
      }));
      return sessionId;
    } catch (error) {
      console.error('Failed to create brainstorm session:', error);
      throw error;
    }
  },
  
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  
  startAnalysis: async () => {
    const { serverUrl, currentSessionId } = get();
    if (!currentSessionId) return;
    
    try {
      const result: { state: string; questions: ClarificationQuestion[] } = await api.post(
        `${serverUrl}/sessions/${currentSessionId}/analyze`,
        {}
      );
      set((state) => ({
        brainstormSessions: {
          ...state.brainstormSessions,
          [currentSessionId]: {
            ...state.brainstormSessions[currentSessionId],
            state: result.state as any,
            questions: result.questions,
            updatedAt: Date.now()
          }
        }
      }));
    } catch (error) {
      console.error('Failed to start analysis:', error);
      throw error;
    }
  },
  
  answerQuestion: async (questionId, optionIds) => {
    const { serverUrl, currentSessionId } = get();
    if (!currentSessionId) return;
    
    try {
      const result: { state: string; currentQuestionIndex: number } = await api.post(
        `${serverUrl}/sessions/${currentSessionId}/answer`,
        { questionId, optionIds }
      );
      set((state) => ({
        brainstormSessions: {
          ...state.brainstormSessions,
          [currentSessionId]: {
            ...state.brainstormSessions[currentSessionId],
            state: result.state as any,
            currentQuestionIndex: result.currentQuestionIndex,
            updatedAt: Date.now()
          }
        }
      }));
    } catch (error) {
      console.error('Failed to answer question:', error);
      throw error;
    }
  },
  
  getPendingQuestions: (sessionId) => {
    const state = get();
    const session = state.brainstormSessions[sessionId];
    return session ? session.questions.filter(q => q.status === 'pending') : null;
  },
  
  // UI 操作
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleBrainstormPanel: () => set((state) => ({ isBrainstormPanelOpen: !state.isBrainstormPanelOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setBrainstormPanelOpen: (open) => set({ isBrainstormPanelOpen: open }),
  
  // 连接
  connectServer: async (url) => {
    const serverUrl = url || 'http://localhost:3001';
    try {
      await api.get(`${serverUrl}/health`);
      set({ serverUrl, isConnected: true });
      await get().fetchGraphs();
    } catch (error) {
      console.error('Failed to connect to server:', error);
      set({ serverUrl, isConnected: false });
      throw error;
    }
  },
  
  // 重置
  reset: () => set({
    currentGraph: null,
    graphs: [],
    currentSessionId: null,
    brainstormSessions: {},
    selectedNodeId: null,
    isSidebarOpen: true,
    isBrainstormPanelOpen: false
  })
}));
