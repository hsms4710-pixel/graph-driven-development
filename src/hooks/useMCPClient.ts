/**
 * useMCPClient - MCP 客户端 Hook
 * 
 * 提供与 MCP Server 通信的能力
 */

import { useState, useCallback, useRef } from 'react';
import { 
  MCPServer,
  GraphData,
  NodeData,
  EdgeData,
  ClarificationQuestion,
  ClarificationOption,
  CreateGraphInput,
  TopologicalSortOutput
} from '../mcp';

interface MCPClientState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface UseMCPClientReturn extends MCPClientState {
  // 连接管理
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // 图操作
  createGraph: (input: CreateGraphInput) => Promise<GraphData | null>;
  loadGraph: (graphId: string) => Promise<GraphData | null>;
  exportGraph: (graphId: string, format?: 'json' | 'graphml' | 'markdown') => Promise<string | null>;
  
  // 节点操作
  addNode: (graphId: string, node: NodeData, parentId?: string) => Promise<NodeData | null>;
  updateNode: (graphId: string, nodeId: string, updates: Partial<NodeData>) => Promise<NodeData | null>;
  deleteNode: (graphId: string, nodeId: string, cascade?: boolean) => Promise<boolean>;
  
  // 边操作
  addEdge: (graphId: string, edge: EdgeData) => Promise<EdgeData | null>;
  deleteEdge: (graphId: string, edgeId: string) => Promise<boolean>;
  
  // 澄清操作
  addOptionsToNode: (graphId: string, nodeId: string, options: ClarificationOption[]) => Promise<boolean>;
  getPendingClarifications: (graphId: string) => Promise<ClarificationQuestion[]>;
  
  // 拓扑排序
  topologicalSort: (graphId: string) => Promise<TopologicalSortOutput | null>;
}

export function useMCPClient(): UseMCPClientReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const serverRef = useRef<MCPServer | null>(null);
  
  // 模拟连接延迟
  const connect = useCallback(async () => {
    if (isConnected) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // 模拟连接过程
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 创建 MCP Server 实例
      serverRef.current = new MCPServer();
      setIsConnected(true);
    } catch (e: any) {
      setError(e.message || '连接失败');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected]);
  
  const disconnect = useCallback(() => {
    serverRef.current = null;
    setIsConnected(false);
    setError(null);
  }, []);
  
  const getServer = () => {
    if (!serverRef.current) {
      throw new Error('MCP Server not connected');
    }
    return serverRef.current;
  };
  
  const createGraph = useCallback(async (input: CreateGraphInput): Promise<GraphData | null> => {
    try {
      const result = await getServer().createGraph(input);
      return result.success ? result.data! : null;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [getServer]);
  
  const loadGraph = useCallback(async (graphId: string): Promise<GraphData | null> => {
    try {
      const result = await getServer().loadGraph({ graphId });
      return result.success ? result.data! : null;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [getServer]);
  
  const exportGraph = useCallback(async (graphId: string, format?: 'json' | 'graphml' | 'markdown'): Promise<string | null> => {
    try {
      const result = await getServer().exportGraph({ graphId, format });
      return result.success ? result.data!.content : null;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [getServer]);
  
  const addNode = useCallback(async (graphId: string, node: NodeData, parentId?: string): Promise<NodeData | null> => {
    try {
      const result = await getServer().addNode({ graphId, node, parentId });
      return result.success ? result.data!.node : null;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [getServer]);
  
  const updateNode = useCallback(async (graphId: string, nodeId: string, updates: Partial<NodeData>): Promise<NodeData | null> => {
    try {
      const result = await getServer().updateNode({ graphId, nodeId, updates });
      return result.success ? result.data! : null;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [getServer]);
  
  const deleteNode = useCallback(async (graphId: string, nodeId: string, cascade?: boolean): Promise<boolean> => {
    try {
      const result = await getServer().deleteNode({ graphId, nodeId, cascade });
      return result.success;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [getServer]);
  
  const addEdge = useCallback(async (graphId: string, edge: EdgeData): Promise<EdgeData | null> => {
    try {
      const result = await getServer().addEdge({ graphId, edge });
      return result.success ? result.data! : null;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [getServer]);
  
  const deleteEdge = useCallback(async (_graphId: string, _edgeId: string): Promise<boolean> => {
    try {
      // MCP Server 目前没有单独的 deleteEdge 工具，这里模拟实现
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, []);
  
  const addOptionsToNode = useCallback(async (graphId: string, nodeId: string, options: ClarificationOption[]): Promise<boolean> => {
    try {
      const result = await getServer().addOptionsToNode({ graphId, nodeId, options });
      return result.success;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [getServer]);
  
  const getPendingClarifications = useCallback(async (graphId: string): Promise<ClarificationQuestion[]> => {
    try {
      const result = await getServer().getPendingClarifications({ graphId });
      return result.success ? result.data!.questions : [];
    } catch (e: any) {
      setError(e.message);
      return [];
    }
  }, [getServer]);
  
  const topologicalSort = useCallback(async (graphId: string): Promise<TopologicalSortOutput | null> => {
    try {
      const result = await getServer().topologicalSort({ graphId });
      return result.success ? result.data! : null;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [getServer]);
  
  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    createGraph,
    loadGraph,
    exportGraph,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge,
    addOptionsToNode,
    getPendingClarifications,
    topologicalSort
  };
}
