#!/usr/bin/env npx ts-node
/**
 * 协作编辑和评论系统
 * 
 * V3.0 企业功能 - 实时协作、评论讨论
 */

// ==================== 类型定义 ====================

export interface CollaborationSession {
  id: string;
  projectId: string;
  users: Collaborator[];
  cursorPositions: Map<string, CursorPosition>;
  lastActivity: number;
  createdAt: number;
}

export interface Collaborator {
  userId: string;
  userName: string;
  color: string;
  presence: 'active' | 'away' | 'offline';
  joinedAt: number;
}

export interface CursorPosition {
  nodeId: string;
  x: number;
  y: number;
  selection?: {
    start: number;
    end: number;
  };
}

export interface Comment {
  id: string;
  projectId: string;
  nodeId?: string;
  authorId: string;
  authorName: string;
  content: string;
  replies: CommentReply[];
  mentions: string[];
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  pinned: boolean;
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: number;
}

export interface DiscussionThread {
  id: string;
  projectId: string;
  title: string;
  authorId: string;
  authorName: string;
  messages: DiscussionMessage[];
  participants: string[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
}

export interface DiscussionMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  attachments: string[];
  createdAt: number;
  reactions: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface EditOperation {
  id: string;
  sessionId: string;
  userId: string;
  type: EditType;
  nodeId: string;
  before: unknown;
  after: unknown;
  timestamp: number;
  acknowledged: boolean;
}

export type EditType =
  | 'node:create'
  | 'node:update'
  | 'node:delete'
  | 'edge:create'
  | 'edge:delete'
  | 'node:move'
  | 'node:resize';

export interface ConflictResolution {
  id: string;
  operations: EditOperation[];
  resolution: 'auto' | 'manual' | 'keep_mine' | 'keep_theirs';
  resolvedBy: string;
  resolvedAt: number;
}

// ==================== 协作管理器 ====================

export class CollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();
  private comments: Map<string, Comment> = new Map();
  private discussions: Map<string, DiscussionThread> = new Map();
  private operations: Map<string, EditOperation[]> = new Map();
  private conflictQueue: ConflictResolution[] = [];
  
  // 用户颜色列表
  private colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B88B', '#A8E6CF', '#FFD3B6', '#FFAAA5',
  ];
  
  // ==================== 协作会话 ====================
  
  /**
   * 加入协作会话
   */
  joinSession(projectId: string, userId: string, userName: string): CollaborationSession {
    let session = this.sessions.get(projectId);
    
    if (!session) {
      session = this.createSession(projectId);
    }
    
    // 添加协作者
    const color = this.getColorForUser(userId);
    const collaborator: Collaborator = {
      userId,
      userName,
      color,
      presence: 'active',
      joinedAt: Date.now(),
    };
    
    session.users.push(collaborator);
    session.cursorPositions.set(userId, {
      nodeId: '',
      x: 0,
      y: 0,
    });
    session.lastActivity = Date.now();
    
    this.broadcastSessionUpdate(projectId, {
      type: 'user_joined',
      userId,
      userName,
      color,
    });
    
    return session;
  }
  
  /**
   * 离开协作会话
   */
  leaveSession(projectId: string, userId: string): void {
    const session = this.sessions.get(projectId);
    if (!session) return;
    
    const index = session.users.findIndex(u => u.userId === userId);
    if (index !== -1) {
      session.users.splice(index, 1);
      session.cursorPositions.delete(userId);
      session.lastActivity = Date.now();
    }
    
    this.broadcastSessionUpdate(projectId, {
      type: 'user_left',
      userId,
    });
    
    // 如果没有用户，清理会话
    if (session.users.length === 0) {
      this.sessions.delete(projectId);
    }
  }
  
  /**
   * 更新光标位置
   */
  updateCursor(projectId: string, userId: string, cursor: CursorPosition): void {
    const session = this.sessions.get(projectId);
    if (!session) return;
    
    session.cursorPositions.set(userId, cursor);
    session.lastActivity = Date.now();
    
    this.broadcastSessionUpdate(projectId, {
      type: 'cursor_update',
      userId,
      cursor,
    });
  }
  
  /**
   * 获取会话状态
   */
  getSession(projectId: string): CollaborationSession | undefined {
    return this.sessions.get(projectId);
  }
  
  /**
   * 创建会话
   */
  private createSession(projectId: string): CollaborationSession {
    const session: CollaborationSession = {
      id: `session_${projectId}_${Date.now()}`,
      projectId,
      users: [],
      cursorPositions: new Map(),
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };
    
    this.sessions.set(projectId, session);
    return session;
  }
  
  /**
   * 获取用户颜色
   */
  private getColorForUser(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.colors[Math.abs(hash) % this.colors.length];
  }
  
  // ==================== 编辑操作 ====================
  
  /**
   * 提交编辑操作
   */
  submitOperation(operation: Omit<EditOperation, 'id' | 'timestamp' | 'acknowledged'>): EditOperation {
    const sessionId = operation.sessionId;
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    const editOp: EditOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false,
    };
    
    // 存储操作
    if (!this.operations.has(sessionId)) {
      this.operations.set(sessionId, []);
    }
    this.operations.get(sessionId)!.push(editOp);
    
    // 检测冲突
    const conflicts = this.detectConflicts(sessionId, editOp);
    if (conflicts.length > 0) {
      this.handleConflicts(conflicts);
    }
    
    // 广播操作
    this.broadcastSessionUpdate(sessionId, {
      type: 'operation',
      operation: editOp,
    });
    
    return editOp;
  }
  
  /**
   * 检测冲突
   */
  private detectConflicts(sessionId: string, newOp: EditOperation): EditOperation[] {
    const ops = this.operations.get(sessionId) || [];
    const conflicts: EditOperation[] = [];
    
    for (const op of ops) {
      if (op.id === newOp.id) continue;
      if (op.acknowledged) continue;
      
      // 同一节点的并发操作视为潜在冲突
      if (op.nodeId === newOp.nodeId && op.userId !== newOp.userId) {
        // 检查时间窗口（500ms 内的操作）
        if (Math.abs(op.timestamp - newOp.timestamp) < 500) {
          conflicts.push(op);
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * 处理冲突
   */
  private handleConflicts(conflicts: EditOperation[]): void {
    if (conflicts.length === 0) return;
    
    // 自动解决：按时间戳排序，后者优先
    conflicts.sort((a, b) => a.timestamp - b.timestamp);
    
    const resolution: ConflictResolution = {
      id: `conflict_${Date.now()}`,
      operations: conflicts,
      resolution: 'auto',
      resolvedBy: 'system',
      resolvedAt: Date.now(),
    };
    
    this.conflictQueue.push(resolution);
    
    // 广播冲突解决
    for (const op of conflicts) {
      const session = this.sessions.get(op.sessionId);
      if (session) {
        this.broadcastSessionUpdate(op.sessionId, {
          type: 'conflict_resolved',
          resolution,
        });
      }
    }
  }
  
  // ==================== 评论系统 ====================
  
  /**
   * 创建评论
   */
  createComment(data: {
    projectId: string;
    nodeId?: string;
    authorId: string;
    authorName: string;
    content: string;
    mentions?: string[];
  }): Comment {
    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: data.projectId,
      nodeId: data.nodeId,
      authorId: data.authorId,
      authorName: data.authorName,
      content: data.content,
      replies: [],
      mentions: data.mentions || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolved: false,
      pinned: false,
    };
    
    this.comments.set(comment.id, comment);
    
    // 通知提及的用户
    if (data.mentions && data.mentions.length > 0) {
      this.notifyMentions(data.projectId, data.mentions, comment);
    }
    
    return comment;
  }
  
  /**
   * 回复评论
   */
  replyComment(commentId: string, data: {
    authorId: string;
    authorName: string;
    content: string;
    mentions?: string[];
  }): CommentReply {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    const reply: CommentReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId: data.authorId,
      authorName: data.authorName,
      content: data.content,
      mentions: data.mentions || [],
      createdAt: Date.now(),
    };
    
    comment.replies.push(reply);
    comment.updatedAt = Date.now();
    
    // 通知提及的用户
    if (data.mentions && data.mentions.length > 0) {
      this.notifyMentions(comment.projectId, data.mentions, comment);
    }
    
    return reply;
  }
  
  /**
   * 解决评论
   */
  resolveComment(commentId: string, userId: string): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) return false;
    
    comment.resolved = true;
    comment.updatedAt = Date.now();
    
    return true;
  }
  
  /**
   * 获取评论列表
   */
  getComments(projectId: string, nodeId?: string): Comment[] {
    const comments = [...this.comments.values()]
      .filter(c => c.projectId === projectId)
      .filter(c => !nodeId || c.nodeId === nodeId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    
    return comments;
  }
  
  /**
   * 通知提及的用户
   */
  private notifyMentions(projectId: string, userIds: string[], comment: Comment): void {
    // TODO: 实现 WebSocket 通知
    console.log(`[Collaboration] Notify mentions in ${projectId}:`, userIds);
  }
  
  // ==================== 讨论系统 ====================
  
  /**
   * 创建讨论线程
   */
  createDiscussion(data: {
    projectId: string;
    title: string;
    authorId: string;
    authorName: string;
    content: string;
  }): DiscussionThread {
    const thread: DiscussionThread = {
      id: `discussion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: data.projectId,
      title: data.title,
      authorId: data.authorId,
      authorName: data.authorName,
      messages: [
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          authorId: data.authorId,
          authorName: data.authorName,
          content: data.content,
          attachments: [],
          createdAt: Date.now(),
          reactions: [],
        },
      ],
      participants: [data.authorId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      archived: false,
    };
    
    this.discussions.set(thread.id, thread);
    return thread;
  }
  
  /**
   * 添加讨论消息
   */
  addDiscussionMessage(threadId: string, data: {
    authorId: string;
    authorName: string;
    content: string;
    attachments?: string[];
  }): DiscussionMessage {
    const thread = this.discussions.get(threadId);
    if (!thread) {
      throw new Error('Discussion thread not found');
    }
    
    const message: DiscussionMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId: data.authorId,
      authorName: data.authorName,
      content: data.content,
      attachments: data.attachments || [],
      createdAt: Date.now(),
      reactions: [],
    };
    
    thread.messages.push(message);
    if (!thread.participants.includes(data.authorId)) {
      thread.participants.push(data.authorId);
    }
    thread.updatedAt = Date.now();
    
    return message;
  }
  
  /**
   * 获取讨论列表
   */
  getDiscussions(projectId: string): DiscussionThread[] {
    return [...this.discussions.values()]
      .filter(t => t.projectId === projectId && !t.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  // ==================== 广播 ====================
  
  /**
   * 广播会话更新
   */
  private broadcastSessionUpdate(projectId: string, update: Record<string, unknown>): void {
    // TODO: 实现 WebSocket 广播
    console.log(`[Collaboration] Broadcast to ${projectId}:`, update);
  }
  
  // ==================== 统计 ====================
  
  /**
   * 获取协作统计
   */
  getStats(): {
    activeSessions: number;
    totalUsers: number;
    totalComments: number;
    totalDiscussions: number;
    pendingConflicts: number;
  } {
    let totalUsers = 0;
    for (const session of this.sessions.values()) {
      totalUsers += session.users.length;
    }
    
    return {
      activeSessions: this.sessions.size,
      totalUsers,
      totalComments: this.comments.size,
      totalDiscussions: this.discussions.size,
      pendingConflicts: this.conflictQueue.filter(c => c.resolution === 'auto').length,
    };
  }
}

// 导出单例
export const collaborationManager = new CollaborationManager();
