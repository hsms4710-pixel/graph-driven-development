#!/usr/bin/env npx ts-node
/**
 * V3.0 企业功能测试
 * 
 * 测试内容：
 * 1. 用户管理（创建、认证、权限）
 * 2. 协作编辑（会话、评论、冲突处理）
 * 3. 项目管理（版本控制、导入导出）
 * 4. 通知系统（订阅、发送）
 */

import { UserManager, userManager } from '../dist/enterprise/UserManager.js';
import { CollaborationManager, collaborationManager } from '../dist/enterprise/CollaborationManager.js';
import { ProjectManager, projectManager } from '../dist/enterprise/ProjectManager.js';
import { NotificationManager, notificationManager } from '../dist/enterprise/NotificationManager.js';

// ==================== 测试工具 ====================

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ FAIL: ${name}`);
    console.log(`  Error: ${error}`);
    failed++;
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContains<T>(array: T[], item: T, message: string): void {
  if (!array.includes(item)) {
    throw new Error(`${message}: ${item} not found in array`);
  }
}

// ==================== 测试组 1: 用户管理 ====================

console.log('\n=== 测试组 1: 用户管理 ===\n');

// 测试 1.1: 创建用户
test('创建用户', () => {
  const user = userManager.createUser({
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
    role: 'developer',
  });
  
  assertEquals(user.name, 'Test User', '用户名应正确');
  assertEquals(user.role, 'developer', '角色应正确');
  assertEquals(user.status, 'active', '状态应为 active');
  assertTrue(!!user.apiKey, '应生成 API Key');
});

// 测试 1.2: 用户登录
test('用户登录', () => {
  const session = userManager.login(
    'test@example.com',
    'password123',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    '127.0.0.1'
  );
  
  assertTrue(!!session.id, '应返回会话 ID');
  assertTrue(!!session.token, '应返回 token');
  assertTrue(session.expiresAt > Date.now(), 'token 应在有效期内');
});

// 测试 1.3: 权限检查
test('权限检查', () => {
  const user = userManager.createUser({
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'admin123',
    role: 'admin',
  });
  
  assertTrue(userManager.hasPermission(user.id, 'project:create'), 'admin 应有 project:create 权限');
  assertTrue(userManager.hasPermission(user.id, 'admin:access'), 'admin 应有 admin:access 权限');
  assertTrue(userManager.hasPermission(user.id, 'user:manage'), 'admin 应有 user:manage 权限');
});

// 测试 1.4: 非 admin 权限检查
test('非 admin 权限检查', () => {
  const user = userManager.createUser({
    email: 'viewer@example.com',
    name: 'Viewer User',
    password: 'viewer123',
    role: 'viewer',
  });
  
  assertTrue(userManager.hasPermission(user.id, 'project:read'), 'viewer 应有 project:read 权限');
  assertTrue(!userManager.hasPermission(user.id, 'project:write'), 'viewer 不应有 project:write 权限');
  assertTrue(!userManager.hasPermission(user.id, 'admin:access'), 'viewer 不应有 admin:access 权限');
});

// 测试 1.5: 审计日志
test('审计日志', () => {
  const logs = userManager.getAuditLogs({ limit: 10 });
  assertTrue(logs.length >= 4, `应有至少 4 条审计日志，实际 ${logs.length}`);
  
  const createLogs = logs.filter(l => l.action === 'create');
  assertTrue(createLogs.length >= 3, '应有创建用户审计日志');
});

// ==================== 测试组 2: 协作编辑 ====================

console.log('\n=== 测试组 2: 协作编辑 ===\n');

// 测试 2.1: 加入协作会话
test('加入协作会话', () => {
  const session = collaborationManager.joinSession(
    'project_123',
    'user_1',
    'User 1'
  );
  
  assertTrue(!!session.id, '应返回会话 ID');
  assertEquals(session.projectId, 'project_123', '项目 ID 应正确');
  assertTrue(session.users.length === 1, '应有 1 个用户');
  assertEquals(session.users[0].userName, 'User 1', '用户名应正确');
  assertTrue(!!session.users[0].color, '应分配颜色');
});

// 测试 2.2: 多用户加入会话
test('多用户加入会话', () => {
  collaborationManager.joinSession('project_123', 'user_2', 'User 2');
  
  const session = collaborationManager.getSession('project_123');
  assertTrue(session !== undefined, '会话应存在');
  assertTrue(session!.users.length === 2, `应有 2 个用户，实际 ${session!.users.length}`);
});

// 测试 2.3: 创建评论
test('创建评论', () => {
  const comment = collaborationManager.createComment({
    projectId: 'project_123',
    nodeId: 'node_1',
    authorId: 'user_1',
    authorName: 'User 1',
    content: '这是一个测试评论',
    mentions: ['user_2'],
  });
  
  assertTrue(!!comment.id, '应返回评论 ID');
  assertEquals(comment.projectId, 'project_123', '项目 ID 应正确');
  assertEquals(comment.nodeId, 'node_1', '节点 ID 应正确');
  assertEquals(comment.content, '这是一个测试评论', '内容应正确');
  assertTrue(comment.mentions!.includes('user_2'), '应包含提及的用户');
  assertTrue(!comment.resolved, '新评论应为未解决状态');
});

// 测试 2.4: 回复评论
test('回复评论', () => {
  const comments = collaborationManager.getComments('project_123');
  const commentId = comments[0].id;
  
  const reply = collaborationManager.replyComment(commentId, {
    authorId: 'user_2',
    authorName: 'User 2',
    content: '这是回复',
  });
  
  assertTrue(!!reply.id, '应返回回复 ID');
  assertEquals(reply.authorName, 'User 2', '作者名应正确');
});

// 测试 2.5: 创建讨论线程
test('创建讨论线程', () => {
  const thread = collaborationManager.createDiscussion({
    projectId: 'project_123',
    title: '讨论主题',
    authorId: 'user_1',
    authorName: 'User 1',
    content: '讨论内容',
  });
  
  assertTrue(!!thread.id, '应返回线程 ID');
  assertEquals(thread.title, '讨论主题', '标题应正确');
  assertTrue(thread.messages.length === 1, '应有 1 条消息');
  assertTrue(thread.participants.includes('user_1'), '参与者应包含作者');
});

// ==================== 测试组 3: 项目管理 ====================

console.log('\n=== 测试组 3: 项目管理 ===\n');

// 测试 3.1: 创建项目
test('创建项目', () => {
  const project = projectManager.createProject({
    name: 'Test Project',
    description: '这是一个测试项目',
    ownerId: 'user_1',
    visibility: 'team',
  });
  
  assertTrue(!!project.id, '应返回项目 ID');
  assertEquals(project.name, 'Test Project', '项目名应正确');
  assertEquals(project.visibility, 'team', '可见性应正确');
  assertTrue(project.status === 'active', '状态应为 active');
  assertTrue(!!project.settings, '应有设置');
  assertTrue(!!project.statistics, '应有统计');
});

// 测试 3.2: 项目版本控制
test('项目版本控制', () => {
  const project = projectManager.createProject({
    name: 'Version Test',
    ownerId: 'user_1',
  });
  
  // 创建第一个版本
  const v1 = projectManager.createVersion(project.id, {
    authorId: 'user_1',
    authorName: 'User 1',
    label: 'Initial',
    changes: [
      { type: 'add', nodeId: 'n1', nodeName: 'Node 1' },
    ],
    snapshot: { nodes: {}, edges: {}, metadata: {} },
  });
  
  assertEquals(v1.versionNumber, 1, '版本号应为 1');
  assertEquals(v1.label, 'Initial', '标签应正确');
  
  // 创建第二个版本
  const v2 = projectManager.createVersion(project.id, {
    authorId: 'user_1',
    authorName: 'User 1',
    label: 'Add more nodes',
    changes: [
      { type: 'add', nodeId: 'n2', nodeName: 'Node 2' },
      { type: 'modify', nodeId: 'n1', nodeName: 'Node 1 Updated' },
    ],
    snapshot: { nodes: {}, edges: {}, metadata: {} },
  });
  
  assertEquals(v2.versionNumber, 2, '版本号应为 2');
});

// 测试 3.3: 项目导出
test('项目导出', () => {
  const project = projectManager.createProject({
    name: 'Export Test',
    ownerId: 'user_1',
  });
  
  // 创建版本
  projectManager.createVersion(project.id, {
    authorId: 'user_1',
    authorName: 'User 1',
    snapshot: { nodes: { n1: { label: 'Test' } }, edges: {}, metadata: {} },
  });
  
  // 导出为 JSON
  const exportJson = projectManager.exportProject(project.id, 'json', 'user_1');
  assertTrue(!!exportJson.content, '应有内容');
  assertTrue(exportJson.format === 'json', '格式应为 json');
  
  // 解析验证
  const parsed = JSON.parse(exportJson.content);
  assertEquals(parsed.project.name, 'Export Test', '项目名应正确');
});

// 测试 3.4: 项目导入
test('项目导入', () => {
  const importResult = projectManager.importProject({
    ownerId: 'user_1',
    format: 'json',
    content: JSON.stringify({
      project: { name: 'Imported Project' },
      snapshot: { nodes: {}, edges: {}, metadata: {} },
    }),
  });
  
  assertTrue(!!importResult.id, '应返回导入 ID');
  assertEquals(importResult.status, 'processing', '状态应为 processing');
  
  // 等待处理完成
  setTimeout(() => {
    const status = projectManager.getImportStatus(importResult.id);
    assertTrue(status !== undefined, '应能找到导入状态');
  }, 1500);
});

// ==================== 测试组 4: 通知系统 ====================

console.log('\n=== 测试组 4: 通知系统 ===\n');

// 测试 4.1: 发送通知
test('发送通知', () => {
  const notification = notificationManager.sendNotification('user_1', 'project:update', {
    title: '项目更新',
    message: '您的项目有新更新',
    payload: { projectId: 'project_123' },
    actions: [
      { id: 'view', label: '查看项目', url: '/project/123' },
    ],
  });
  
  assertTrue(!!notification.id, '应返回通知 ID');
  assertEquals(notification.userId, 'user_1', '用户 ID 应正确');
  assertEquals(notification.type, 'project:update', '类型应正确');
  assertEquals(notification.title, '项目更新', '标题应正确');
  assertTrue(!notification.read, '新通知应为未读');
});

// 测试 4.2: 获取通知
test('获取通知', () => {
  const notifications = notificationManager.getNotifications('user_1');
  assertTrue(notifications.length >= 1, `应有至少 1 条通知，实际 ${notifications.length}`);
  
  const unreadCount = notificationManager.getUnreadCount('user_1');
  assertTrue(unreadCount >= 1, `未读通知数应 >= 1，实际 ${unreadCount}`);
});

// 测试 4.3: 标记通知已读
test('标记通知已读', () => {
  const notifications = notificationManager.getNotifications('user_1');
  if (notifications.length > 0) {
    const result = notificationManager.markAsRead('user_1', notifications[0].id);
    assertTrue(result, '应返回 true');
    
    const unreadCount = notificationManager.getUnreadCount('user_1');
    assertEquals(unreadCount, notifications.length - 1, '未读数应减少');
  }
});

// 测试 4.4: 通知订阅
test('通知订阅', () => {
  const subs = notificationManager.getSubscriptions('user_1');
  assertTrue(subs.length >= 2, `应有至少 2 个订阅，实际 ${subs.length}`);
  
  const inAppSub = subs.find(s => s.channel === 'in_app');
  assertTrue(inAppSub !== undefined, '应有 in_app 订阅');
  assertTrue(inAppSub!.enabled, 'in_app 订阅应启用');
});

// ==================== 测试结果汇总 ====================

console.log('\n============================================================');
console.log('V3.0 企业功能测试结果');
console.log('============================================================');
console.log(`通过: ${passed} | 失败: ${failed} | 总计: ${passed + failed}`);
console.log('============================================================\n');

process.exit(failed > 0 ? 1 : 0);
