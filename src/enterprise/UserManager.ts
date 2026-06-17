#!/usr/bin/env npx ts-node
/**
 * 用户管理系统
 * 
 * V3.0 企业功能 - 用户认证、权限管理、团队协作
 */

// ==================== 类型定义 ====================

export type UserRole = 'admin' | 'manager' | 'developer' | 'viewer';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
  lastLoginAt?: number;
  preferences?: UserPreferences;
  apiKey?: string;
  apiRateLimit?: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  editor: {
    fontSize: number;
    tabSize: number;
    autoSave: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  projects: string[];
  createdAt: number;
  settings: TeamSettings;
}

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: number;
  permissions: Permission[];
}

export interface TeamSettings {
  visibility: 'public' | 'private' | 'team';
  invitePolicy: 'anyone' | 'admin_only' | 'invite_only';
  collaborationMode: 'free' | 'locked' | 'suggestion';
  autoSave: boolean;
  versionControl: boolean;
}

export type Permission =
  | 'project:create'
  | 'project:read'
  | 'project:write'
  | 'project:delete'
  | 'team:manage'
  | 'team:invite'
  | 'team:remove'
  | 'user:manage'
  | 'admin:access'
  | 'billing:manage';

export interface Session {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ip: string;
  createdAt: number;
  expiresAt: number;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ip: string;
  userAgent: string;
  createdAt: number;
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'share'
  | 'permission:change'
  | 'team:join'
  | 'team:leave'
  | 'api:call';

// ==================== 用户管理器 ====================

export class UserManager {
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private sessions: Map<string, Session> = new Map();
  private auditLogs: AuditLog[] = [];
  private maxAuditLogs = 10000;
  
  constructor() {
    this.initializeDefaultUsers();
  }
  
  // ==================== 用户管理 ====================
  
  /**
   * 创建新用户
   */
  createUser(data: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
  }): User {
    const emailLower = data.email.toLowerCase();
    
    if (this.users.has(emailLower)) {
      throw new Error('User already exists');
    }
    
    const user: User = {
      id: this.generateId(),
      email: emailLower,
      name: data.name,
      role: data.role || 'viewer',
      status: 'active',
      createdAt: Date.now(),
      preferences: this.getDefaultPreferences(),
      apiKey: this.generateApiKey(),
      apiRateLimit: 1000,
    };
    
    this.users.set(emailLower, user);
    this.logAudit(user.id, 'create', 'user', user.id, { email: user.email });
    
    return user;
  }
  
  /**
   * 获取用户
   */
  getUser(email: string): User | undefined {
    return this.users.get(email.toLowerCase());
  }
  
  /**
   * 获取用户（通过 ID）
   */
  getUserById(userId: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.id === userId) return user;
    }
    return undefined;
  }
  
  /**
   * 更新用户
   */
  updateUser(email: string, updates: Partial<User>): User {
    const user = this.getUser(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updated = { ...user, ...updates };
    this.users.set(email.toLowerCase(), updated);
    
    this.logAudit(user.id, 'update', 'user', user.id, updates);
    
    return updated;
  }
  
  /**
   * 删除用户
   */
  deleteUser(email: string): boolean {
    const user = this.getUser(email);
    if (!user) return false;
    
    this.users.delete(email.toLowerCase());
    this.logAudit(user.id, 'delete', 'user', user.id, { email });
    
    return true;
  }
  
  /**
   * 检查用户权限
   */
  hasPermission(userId: string, permission: Permission, resourceId?: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;
    
    // Admin 有所有权限
    if (user.role === 'admin') return true;
    
    // 检查角色权限
    const rolePermissions = this.getRolePermissions(user.role);
    if (rolePermissions.includes(permission)) return true;
    
    // 检查团队权限
    if (resourceId) {
      for (const team of this.teams.values()) {
        const member = team.members.find(m => m.userId === userId);
        if (member && member.permissions.includes(permission)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 获取角色权限
   */
  private getRolePermissions(role: UserRole): Permission[] {
    const permissions: Record<UserRole, Permission[]> = {
      admin: [
        'project:create', 'project:read', 'project:write', 'project:delete',
        'team:manage', 'team:invite', 'team:remove',
        'user:manage', 'admin:access', 'billing:manage',
      ],
      manager: [
        'project:create', 'project:read', 'project:write', 'project:delete',
        'team:manage', 'team:invite', 'team:remove',
        'billing:manage',
      ],
      developer: [
        'project:create', 'project:read', 'project:write',
        'team:invite',
      ],
      viewer: [
        'project:read',
      ],
    };
    
    return permissions[role] || [];
  }
  
  // ==================== 认证 ====================
  
  /**
   * 用户登录
   */
  login(email: string, password: string, userAgent: string, ip: string): Session {
    const user = this.getUser(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }
    
    // 简化密码验证（实际应用中应使用 bcrypt）
    if (password !== 'password123') { // 仅示例
      throw new Error('Invalid credentials');
    }
    
    const session: Session = {
      id: this.generateId(),
      userId: user.id,
      token: this.generateToken(),
      userAgent,
      ip,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 小时
      device: this.parseDevice(userAgent),
    };
    
    this.sessions.set(session.id, session);
    user.lastLoginAt = Date.now();
    
    this.logAudit(user.id, 'login', 'session', session.id, { ip });
    
    return session;
  }
  
  /**
   * 用户登出
   */
  logout(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.sessions.delete(sessionId);
    this.logAudit(session.userId, 'logout', 'session', sessionId, {});
    
    return true;
  }
  
  /**
   * 验证会话
   */
  validateSession(token: string): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.token === token && session.expiresAt > Date.now()) {
        return session;
      }
    }
    return undefined;
  }
  
  // ==================== 团队管理 ====================
  
  /**
   * 创建团队
   */
  createTeam(data: {
    name: string;
    description?: string;
    ownerId: string;
  }): Team {
    const team: Team = {
      id: this.generateId(),
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      members: [
        {
          userId: data.ownerId,
          role: 'owner',
          joinedAt: Date.now(),
          permissions: this.getRolePermissions('admin'),
        },
      ],
      projects: [],
      createdAt: Date.now(),
      settings: {
        visibility: 'private',
        invitePolicy: 'admin_only',
        collaborationMode: 'free',
        autoSave: true,
        versionControl: true,
      },
    };
    
    this.teams.set(team.id, team);
    this.logAudit(data.ownerId, 'create', 'team', team.id, { name: team.name });
    
    return team;
  }
  
  /**
   * 获取团队
   */
  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }
  
  /**
   * 添加团队成员
   */
  addTeamMember(teamId: string, userId: string, role: TeamMember['role']): TeamMember {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');
    
    if (team.members.some(m => m.userId === userId)) {
      throw new Error('User is already a member');
    }
    
    const member: TeamMember = {
      userId,
      role,
      joinedAt: Date.now(),
      permissions: this.getTeamMemberPermissions(role),
    };
    
    team.members.push(member);
    this.logAudit(userId, 'create', 'team:member', teamId, { teamId, role });
    
    return member;
  }
  
  /**
   * 移除团队成员
   */
  removeTeamMember(teamId: string, userId: string): boolean {
    const team = this.getTeam(teamId);
    if (!team) return false;
    
    const index = team.members.findIndex(m => m.userId === userId);
    if (index === -1) return false;
    
    if (team.members[index].role === 'owner') {
      throw new Error('Cannot remove team owner');
    }
    
    team.members.splice(index, 1);
    this.logAudit(userId, 'delete', 'team:member', teamId, { teamId });
    
    return true;
  }
  
  /**
   * 获取团队成员权限
   */
  private getTeamMemberPermissions(role: TeamMember['role']): Permission[] {
    const permissions: Record<TeamMember['role'], Permission[]> = {
      owner: [
        'project:create', 'project:read', 'project:write', 'project:delete',
        'team:manage', 'team:invite', 'team:remove',
        'user:manage', 'admin:access', 'billing:manage',
      ],
      admin: [
        'project:create', 'project:read', 'project:write', 'project:delete',
        'team:manage', 'team:invite', 'team:remove',
        'billing:manage',
      ],
      member: [
        'project:create', 'project:read', 'project:write',
        'team:invite',
      ],
      viewer: [
        'project:read',
      ],
    };
    
    return permissions[role] || [];
  }
  
  // ==================== 审计日志 ====================
  
  /**
   * 记录审计日志
   */
  private logAudit(userId: string, action: AuditAction, resource: string, resourceId: string, details: Record<string, unknown>): void {
    const log: AuditLog = {
      id: this.generateId(),
      userId,
      action,
      resource,
      resourceId,
      details,
      ip: '127.0.0.1',
      userAgent: 'GDD/3.0',
      createdAt: Date.now(),
    };
    
    this.auditLogs.push(log);
    
    // 限制日志数量
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs.shift();
    }
  }
  
  /**
   * 获取审计日志
   */
  getAuditLogs(options?: {
    userId?: string;
    action?: AuditAction;
    resource?: string;
    limit?: number;
    offset?: number;
  }): AuditLog[] {
    let logs = [...this.auditLogs].reverse();
    
    if (options?.userId) {
      logs = logs.filter(l => l.userId === options.userId);
    }
    
    if (options?.action) {
      logs = logs.filter(l => l.action === options.action);
    }
    
    if (options?.resource) {
      logs = logs.filter(l => l.resource === options.resource);
    }
    
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    
    return logs.slice(offset, offset + limit);
  }
  
  // ==================== 工具方法 ====================
  
  private generateId(): string {
    return `gdd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateToken(): string {
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Math.random().toString(36).substr(2)}.${Date.now()}`;
  }
  
  private generateApiKey(): string {
    return `gdd_${Math.random().toString(36).substr(2, 16)}_${Math.random().toString(36).substr(2, 16)}`;
  }
  
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'system',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      editor: {
        fontSize: 14,
        tabSize: 2,
        autoSave: true,
      },
    };
  }
  
  private parseDevice(userAgent: string): Session['device'] | undefined {
    // 简化的设备检测
    if (userAgent.includes('Mobile')) {
      return {
        type: 'mobile',
        os: userAgent.includes('Android') ? 'Android' : 'iOS',
        browser: userAgent.includes('Chrome') ? 'Chrome Mobile' : 'Safari Mobile',
      };
    }
    
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return {
        type: 'tablet',
        os: userAgent.includes('Android') ? 'Android' : 'iOS',
        browser: userAgent.includes('Chrome') ? 'Chrome' : 'Safari',
      };
    }
    
    return {
      type: 'desktop',
      os: userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : 'Linux',
      browser: userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : 'Safari',
    };
  }
  
  private initializeDefaultUsers(): void {
    // 创建默认管理员
    this.createUser({
      email: 'admin@gdd.local',
      name: 'System Admin',
      password: 'admin123',
      role: 'admin',
    });
  }
}

// 导出单例
export const userManager = new UserManager();
