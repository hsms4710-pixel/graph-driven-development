#!/usr/bin/env npx ts-node
/**
 * 项目管理和版本控制
 * 
 * V3.0 企业功能 - 多项目管理、导入导出、版本历史
 */

// ==================== 类型定义 ====================

export interface EnterpriseProject {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  teamId?: string;
  visibility: 'private' | 'team' | 'public';
  status: 'active' | 'archived' | 'deleted';
  settings: ProjectSettings;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
  statistics: ProjectStatistics;
}

export interface ProjectSettings {
  autoSave: boolean;
  autoBackup: boolean;
  backupInterval: number; // 分钟
  versionControl: boolean;
  collaborationMode: 'free' | 'locked' | 'suggestion';
  accessControl: {
    allowAnonymous: boolean;
    requireLogin: boolean;
    allowFork: boolean;
  };
  notifications: {
    emailOnChanges: boolean;
    emailOnComments: boolean;
    pushNotifications: boolean;
  };
}

export interface ProjectStatistics {
  nodeCount: number;
  edgeCount: number;
  versionCount: number;
  forkCount: number;
  viewCount: number;
  collaboratorCount: number;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  label?: string;
  authorId: string;
  authorName: string;
  changes: VersionChange[];
  snapshot: ProjectSnapshot;
  createdAt: number;
  size: number;
}

export interface VersionChange {
  type: 'add' | 'modify' | 'delete' | 'move';
  nodeId: string;
  nodeName?: string;
  details?: Record<string, unknown>;
}

export interface ProjectSnapshot {
  nodes: Record<string, unknown>;
  edges: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ProjectExport {
  version: string;
  format: 'gdd' | 'json' | 'markdown';
  content: string;
  createdAt: number;
  exportedBy: string;
}

export interface ProjectImport {
  id: string;
  projectId: string;
  source: 'file' | 'url' | 'clipboard';
  format: 'gdd' | 'json' | 'markdown';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errors?: string[];
  createdAt: number;
  completedAt?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'api' | 'cli' | 'mobile' | 'desktop';
  tags: string[];
  sourceProjectId?: string;
  settings: ProjectSettings;
  defaultNodes: DefaultNode[];
  createdAt: number;
  usageCount: number;
}

export interface DefaultNode {
  id: string;
  layer: number;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

// ==================== 项目管理器 ====================

export class ProjectManager {
  private projects: Map<string, EnterpriseProject> = new Map();
  private versions: Map<string, ProjectVersion[]> = new Map();
  private templates: Map<string, ProjectTemplate> = new Map();
  private imports: Map<string, ProjectImport> = new Map();
  private maxVersions = 100;
  
  // ==================== 项目管理 ====================
  
  /**
   * 创建项目
   */
  createProject(data: {
    name: string;
    description?: string;
    ownerId: string;
    teamId?: string;
    visibility?: 'private' | 'team' | 'public';
  }): EnterpriseProject {
    const project: EnterpriseProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      teamId: data.teamId,
      visibility: data.visibility || 'private',
      status: 'active',
      settings: this.getDefaultSettings(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActivityAt: Date.now(),
      statistics: this.getDefaultStatistics(),
    };
    
    this.projects.set(project.id, project);
    this.versions.set(project.id, []);
    
    return project;
  }
  
  /**
   * 获取项目
   */
  getProject(projectId: string): EnterpriseProject | undefined {
    return this.projects.get(projectId);
  }
  
  /**
   * 更新项目
   */
  updateProject(projectId: string, updates: Partial<EnterpriseProject>): EnterpriseProject {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    const updated = { ...project, ...updates };
    updated.updatedAt = Date.now();
    updated.lastActivityAt = Date.now();
    
    this.projects.set(projectId, updated);
    
    return updated;
  }
  
  /**
   * 归档项目
   */
  archiveProject(projectId: string, userId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    
    if (project.ownerId !== userId) {
      throw new Error('Only owner can archive project');
    }
    
    project.status = 'archived';
    project.updatedAt = Date.now();
    
    return true;
  }
  
  /**
   * 删除项目
   */
  deleteProject(projectId: string, userId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    
    if (project.ownerId !== userId) {
      throw new Error('Only owner can delete project');
    }
    
    this.projects.delete(projectId);
    this.versions.delete(projectId);
    
    return true;
  }
  
  /**
   * 获取用户项目列表
   */
  getUserProjects(userId: string): EnterpriseProject[] {
    const projects = [...this.projects.values()]
      .filter(p => 
        p.ownerId === userId || 
        p.teamId === userId ||
        p.visibility === 'public'
      )
      .filter(p => p.status !== 'deleted')
      .sort((a, b) => b.updatedAt - a.updatedAt);
    
    return projects;
  }
  
  // ==================== 版本控制 ====================
  
  /**
   * 创建版本
   */
  createVersion(projectId: string, data: {
    authorId: string;
    authorName: string;
    label?: string;
    changes: VersionChange[];
    snapshot: ProjectSnapshot;
  }): ProjectVersion {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    const versions = this.versions.get(projectId) || [];
    const versionNumber = versions.length + 1;
    
    const version: ProjectVersion = {
      id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      versionNumber,
      label: data.label,
      authorId: data.authorId,
      authorName: data.authorName,
      changes: data.changes,
      snapshot: data.snapshot,
      createdAt: Date.now(),
      size: JSON.stringify(data.snapshot).length,
    };
    
    versions.push(version);
    
    // 限制版本数量
    if (versions.length > this.maxVersions) {
      versions.shift();
    }
    
    this.versions.set(projectId, versions);
    
    // 更新统计
    project.statistics.versionCount = versions.length;
    project.updatedAt = Date.now();
    
    return version;
  }
  
  /**
   * 获取版本列表
   */
  getVersions(projectId: string): ProjectVersion[] {
    return [...(this.versions.get(projectId) || [])]
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }
  
  /**
   * 获取特定版本
   */
  getVersion(projectId: string, versionNumber: number): ProjectVersion | undefined {
    const versions = this.versions.get(projectId) || [];
    return versions.find(v => v.versionNumber === versionNumber);
  }
  
  /**
   * 比较版本
   */
  compareVersions(projectId: string, versionA: number, versionB: number): {
    added: VersionChange[];
    modified: VersionChange[];
    deleted: VersionChange[];
  } {
    const vA = this.getVersion(projectId, versionA);
    const vB = this.getVersion(projectId, versionB);
    
    if (!vA || !vB) {
      throw new Error('Version not found');
    }
    
    // 简化的比较逻辑
    const added = vB.changes.filter(c => c.type === 'add');
    const modified = vB.changes.filter(c => c.type === 'modify');
    const deleted = vB.changes.filter(c => c.type === 'delete');
    
    return { added, modified, deleted };
  }
  
  /**
   * 恢复版本
   */
  restoreVersion(projectId: string, versionNumber: number, userId: string): ProjectVersion {
    const version = this.getVersion(projectId, versionNumber);
    if (!version) {
      throw new Error('Version not found');
    }
    
    // 创建恢复版本
    return this.createVersion(projectId, {
      authorId: userId,
      authorName: 'System',
      label: `Restored from v${versionNumber}`,
      changes: version.changes.map(c => ({
        ...c,
        type: c.type === 'delete' ? 'add' : c.type === 'add' ? 'delete' : c.type,
      })),
      snapshot: version.snapshot,
    });
  }
  
  // ==================== 导入导出 ====================
  
  /**
   * 导出项目
   */
  exportProject(projectId: string, format: 'gdd' | 'json' | 'markdown', exportedBy: string): ProjectExport {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    const versions = this.versions.get(projectId) || [];
    const latestVersion = versions[versions.length - 1];
    
    let content = '';
    
    switch (format) {
      case 'gdd':
        content = this.generateGDDFormat(project, latestVersion);
        break;
      case 'json':
        content = JSON.stringify({ project, version: latestVersion }, null, 2);
        break;
      case 'markdown':
        content = this.generateMarkdownFormat(project, latestVersion);
        break;
    }
    
    return {
      version: '3.0.0',
      format,
      content,
      createdAt: Date.now(),
      exportedBy,
    };
  }
  
  /**
   * 导入项目
   */
  importProject(data: {
    ownerId: string;
    format: 'gdd' | 'json' | 'markdown';
    content: string;
    name?: string;
  }): ProjectImport {
    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const projectImport: ProjectImport = {
      id: importId,
      projectId: '', // 创建后填充
      source: 'file',
      format: data.format,
      status: 'processing',
      progress: 0,
      createdAt: Date.now(),
    };
    
    this.imports.set(importId, projectImport);
    
    // 模拟异步处理
    setTimeout(() => {
      try {
        const project = this.parseImportContent(data);
        const enterpriseProject = this.createProject({
          name: data.name || project.name,
          ownerId: data.ownerId,
        });
        
        // 创建初始版本
        this.createVersion(enterpriseProject.id, {
          authorId: data.ownerId,
          authorName: 'Import',
          label: 'Initial import',
          changes: [],
          snapshot: project.snapshot,
        });
        
        projectImport.projectId = enterpriseProject.id;
        projectImport.status = 'completed';
        projectImport.progress = 100;
        projectImport.completedAt = Date.now();
        
      } catch (error) {
        projectImport.status = 'failed';
        projectImport.errors = [String(error)];
      }
    }, 1000);
    
    return projectImport;
  }
  
  /**
   * 获取导入状态
   */
  getImportStatus(importId: string): ProjectImport | undefined {
    return this.imports.get(importId);
  }
  
  // ==================== 模板管理 ====================
  
  /**
   * 创建项目模板
   */
  createTemplate(data: {
    name: string;
    description: string;
    category: 'web' | 'api' | 'cli' | 'mobile' | 'desktop';
    tags: string[];
    sourceProjectId?: string;
    settings: ProjectSettings;
    defaultNodes: DefaultNode[];
  }): ProjectTemplate {
    const template: ProjectTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      sourceProjectId: data.sourceProjectId,
      settings: data.settings,
      defaultNodes: data.defaultNodes,
      createdAt: Date.now(),
      usageCount: 0,
    };
    
    this.templates.set(template.id, template);
    return template;
  }
  
  /**
   * 获取模板列表
   */
  getTemplates(category?: string): ProjectTemplate[] {
    const templates = [...this.templates.values()]
      .sort((a, b) => b.usageCount - a.usageCount);
    
    if (category) {
      return templates.filter(t => t.category === category);
    }
    
    return templates;
  }
  
  /**
   * 从模板创建项目
   */
  createFromTemplate(templateId: string, data: {
    name: string;
    ownerId: string;
    teamId?: string;
  }): EnterpriseProject {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    
    const project = this.createProject({
      name: data.name,
      ownerId: data.ownerId,
      teamId: data.teamId,
      visibility: 'private',
    });
    
    // 应用模板设置
    project.settings = { ...template.settings };
    
    // 创建初始节点
    const defaultNodes = template.defaultNodes.map(n => ({
      ...n,
      id: `${n.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    }));
    
    // 创建初始版本
    this.createVersion(project.id, {
      authorId: data.ownerId,
      authorName: 'Template',
      label: `From template: ${template.name}`,
      changes: defaultNodes.map(n => ({
        type: 'add' as const,
        nodeId: n.id,
        nodeName: n.label,
      })),
      snapshot: {
        nodes: defaultNodes.reduce((acc, n) => {
          acc[n.id] = n;
          return acc;
        }, {} as Record<string, unknown>),
        edges: {},
        metadata: {
          templateId,
          templateName: template.name,
        },
      },
    });
    
    // 更新模板使用计数
    template.usageCount++;
    
    return project;
  }
  
  // ==================== 工具方法 ====================
  
  private getDefaultSettings(): ProjectSettings {
    return {
      autoSave: true,
      autoBackup: true,
      backupInterval: 60,
      versionControl: true,
      collaborationMode: 'free',
      accessControl: {
        allowAnonymous: false,
        requireLogin: true,
        allowFork: true,
      },
      notifications: {
        emailOnChanges: false,
        emailOnComments: true,
        pushNotifications: true,
      },
    };
  }
  
  private getDefaultStatistics(): ProjectStatistics {
    return {
      nodeCount: 0,
      edgeCount: 0,
      versionCount: 0,
      forkCount: 0,
      viewCount: 0,
      collaboratorCount: 0,
    };
  }
  
  private generateGDDFormat(project: EnterpriseProject, version?: ProjectVersion): string {
    return JSON.stringify({
      format: 'GDD',
      version: '3.0.0',
      project,
      snapshot: version?.snapshot,
      exportedAt: Date.now(),
    }, null, 2);
  }
  
  private generateMarkdownFormat(project: EnterpriseProject, version?: ProjectVersion): string {
    const lines: string[] = [];
    
    lines.push(`# ${project.name}`);
    if (project.description) {
      lines.push(`\n${project.description}`);
    }
    
    lines.push('\n## Project Information');
    lines.push(`- **Owner**: ${project.ownerId}`);
    lines.push(`- **Visibility**: ${project.visibility}`);
    lines.push(`- **Created**: ${new Date(project.createdAt).toISOString()}`);
    
    if (version && version.snapshot.nodes) {
      lines.push('\n## Nodes');
      for (const [id, node] of Object.entries(version.snapshot.nodes)) {
        const n = node as { label?: string; type?: string };
        lines.push(`- **${n.label || id}** (${n.type || 'unknown'})`);
      }
    }
    
    return lines.join('\n');
  }
  
  private parseImportContent(data: {
    ownerId: string;
    format: 'gdd' | 'json' | 'markdown';
    content: string;
  }): { name: string; snapshot: ProjectSnapshot } {
    let parsed: Record<string, unknown>;
    
    if (data.format === 'json' || data.format === 'gdd') {
      parsed = JSON.parse(data.content);
      return {
        name: (parsed.project as { name: string }).name,
        snapshot: (parsed.snapshot as ProjectSnapshot) || { nodes: {}, edges: {}, metadata: {} },
      };
    }
    
    if (data.format === 'markdown') {
      // 简化的 Markdown 解析
      const lines = data.content.split('\n');
      const name = lines[0].replace('#', '').trim();
      
      return {
        name,
        snapshot: { nodes: {}, edges: {}, metadata: {} },
      };
    }
    
    throw new Error('Unsupported format');
  }
  
  // ==================== 统计 ====================
  
  /**
   * 获取项目统计
   */
  getStats(): {
    totalProjects: number;
    activeProjects: number;
    archivedProjects: number;
    totalVersions: number;
    totalTemplates: number;
  } {
    let active = 0;
    let archived = 0;
    let totalVersions = 0;
    
    for (const project of this.projects.values()) {
      if (project.status === 'active') active++;
      if (project.status === 'archived') archived++;
      totalVersions += project.statistics.versionCount;
    }
    
    return {
      totalProjects: this.projects.size,
      activeProjects: active,
      archivedProjects: archived,
      totalVersions,
      totalTemplates: this.templates.size,
    };
  }
}

// 导出单例
export const projectManager = new ProjectManager();
