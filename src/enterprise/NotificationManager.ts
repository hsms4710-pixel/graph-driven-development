#!/usr/bin/env npx ts-node
/**
 * 通知管理系统
 * 
 * V3.0 企业功能 - 通知、邮件、推送
 */

// ==================== 类型定义 ====================

export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app';

export type NotificationType =
  | 'project:update'
  | 'project:share'
  | 'comment:mention'
  | 'comment:reply'
  | 'team:invite'
  | 'team:approval'
  | 'permission:change'
  | 'version:created'
  | 'version:restored'
  | 'backup:success'
  | 'backup:failed'
  | 'quota:warning'
  | 'billing:due'
  | 'security:alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: number;
  readAt?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  url?: string;
  handler?: string;
}

export interface NotificationSubscription {
  userId: string;
  channel: NotificationChannel;
  types: NotificationType[];
  enabled: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
}

export interface PushNotification {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string;
}

export interface NotificationQueueItem {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  retries: number;
  maxRetries: number;
  createdAt: number;
  processedAt?: number;
  error?: string;
}

// ==================== 通知管理器 ====================

export class NotificationManager {
  private notifications: Map<string, Notification[]> = new Map(); // userId -> notifications
  private subscriptions: Map<string, NotificationSubscription[]> = new Map(); // userId -> subscriptions
  private emailTemplates: Map<string, EmailTemplate> = new Map();
  private pushSubscriptions: Map<string, PushNotification[]> = new Map(); // userId -> subscriptions
  private queue: NotificationQueueItem[] = [];
  private maxNotificationsPerUser = 1000;
  
  // ==================== 通知发送 ====================
  
  /**
   * 发送通知
   */
  sendNotification(userId: string, type: NotificationType, data: {
    title: string;
    message: string;
    payload?: Record<string, unknown>;
    actions?: NotificationAction[];
  }): Notification {
    // 检查订阅
    const subs = this.getSubscriptions(userId);
    const enabledChannels = subs
      .filter(s => s.enabled && s.types.includes(type))
      .map(s => s.channel);
    
    if (enabledChannels.length === 0) {
      // 默认发送 in_app 通知
      enabledChannels.push('in_app');
    }
    
    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      channel: enabledChannels[0],
      title: data.title,
      message: data.message,
      payload: data.payload || {},
      read: false,
      createdAt: Date.now(),
      actions: data.actions,
    };
    
    // 添加到用户通知列表
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    
    const userNotifications = this.notifications.get(userId)!;
    userNotifications.push(notification);
    
    // 限制通知数量
    if (userNotifications.length > this.maxNotificationsPerUser) {
      userNotifications.shift();
    }
    
    // 添加到队列
    for (const channel of enabledChannels) {
      this.queue.push({
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        notificationId: notification.id,
        channel,
        payload: {
          ...data,
          userId,
          type,
        },
        status: 'pending',
        retries: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      });
    }
    
    // 异步处理队列
    this.processQueue();
    
    return notification;
  }
  
  /**
   * 批量发送通知
   */
  sendBatchNotifications(users: Array<{ userId: string; type: NotificationType; data: {
    title: string;
    message: string;
    payload?: Record<string, unknown>;
  } }>): Notification[] {
    return users.map(u => this.sendNotification(u.userId, u.type, u.data));
  }
  
  /**
   * 获取用户通知
   */
  getNotifications(userId: string, options?: {
    read?: boolean;
    limit?: number;
    offset?: number;
  }): Notification[] {
    const notifications = this.notifications.get(userId) || [];
    
    let filtered = notifications;
    if (options?.read !== undefined) {
      filtered = filtered.filter(n => n.read === options.read);
    }
    
    // 按时间倒序
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    return filtered.slice(offset, offset + limit);
  }
  
  /**
   * 标记通知已读
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      notification.readAt = Date.now();
      return true;
    }
    
    return false;
  }
  
  /**
   * 标记所有通知已读
   */
  markAllAsRead(userId: string): number {
    const notifications = this.notifications.get(userId) || [];
    let count = 0;
    
    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = Date.now();
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * 获取未读通知数量
   */
  getUnreadCount(userId: string): number {
    const notifications = this.notifications.get(userId) || [];
    return notifications.filter(n => !n.read).length;
  }
  
  // ==================== 订阅管理 ====================
  
  /**
   * 获取用户订阅
   */
  getSubscriptions(userId: string): NotificationSubscription[] {
    return this.subscriptions.get(userId) || this.getDefaultSubscriptions();
  }
  
  /**
   * 更新订阅
   */
  updateSubscription(userId: string, channel: NotificationChannel, types: NotificationType[]): void {
    let subs = this.subscriptions.get(userId) || this.getDefaultSubscriptions();
    
    const existingIndex = subs.findIndex(s => s.channel === channel);
    if (existingIndex !== -1) {
      subs[existingIndex].types = types;
    } else {
      subs.push({
        userId,
        channel,
        types,
        enabled: true,
      });
    }
    
    this.subscriptions.set(userId, subs);
  }
  
  /**
   * 切换订阅启用状态
   */
  toggleSubscription(userId: string, channel: NotificationChannel, enabled: boolean): void {
    let subs = this.subscriptions.get(userId) || this.getDefaultSubscriptions();
    
    const existingIndex = subs.findIndex(s => s.channel === channel);
    if (existingIndex !== -1) {
      subs[existingIndex].enabled = enabled;
      this.subscriptions.set(userId, subs);
    }
  }
  
  /**
   * 获取默认订阅
   */
  private getDefaultSubscriptions(): NotificationSubscription[] {
    return [
      {
        userId: '',
        channel: 'in_app',
        types: [
          'project:update', 'project:share',
          'comment:mention', 'comment:reply',
          'team:invite', 'team:approval',
          'permission:change',
        ],
        enabled: true,
      },
      {
        userId: '',
        channel: 'email',
        types: [
          'team:invite', 'backup:failed',
          'quota:warning', 'billing:due',
          'security:alert',
        ],
        enabled: true,
      },
      {
        userId: '',
        channel: 'push',
        types: [
          'project:update', 'comment:mention',
          'team:invite',
        ],
        enabled: false, // 默认关闭推送
      },
    ];
  }
  
  // ==================== 推送订阅 ====================
  
  /**
   * 添加推送订阅
   */
  addPushSubscription(userId: string, subscription: PushNotification): void {
    if (!this.pushSubscriptions.has(userId)) {
      this.pushSubscriptions.set(userId, []);
    }
    
    const userSubs = this.pushSubscriptions.get(userId)!;
    userSubs.push(subscription);
    
    // 限制订阅数量
    if (userSubs.length > 10) {
      userSubs.shift();
    }
    
    this.pushSubscriptions.set(userId, userSubs);
  }
  
  /**
   * 删除推送订阅
   */
  removePushSubscription(userId: string, endpoint: string): boolean {
    const userSubs = this.pushSubscriptions.get(userId);
    if (!userSubs) return false;
    
    const index = userSubs.findIndex(s => s.endpoint === endpoint);
    if (index !== -1) {
      userSubs.splice(index, 1);
      this.pushSubscriptions.set(userId, userSubs);
      return true;
    }
    
    return false;
  }
  
  // ==================== 队列处理 ====================
  
  /**
   * 处理通知队列
   */
  private async processQueue(): Promise<void> {
    // 处理待发送的通知
    const pending = this.queue.filter(q => q.status === 'pending');
    
    for (const item of pending) {
      try {
        await this.sendViaChannel(item);
        item.status = 'sent';
        item.processedAt = Date.now();
      } catch (error) {
        item.retries++;
        if (item.retries >= item.maxRetries) {
          item.status = 'failed';
          item.error = String(error);
        }
        // 否则保持 pending，稍后重试
      }
    }
  }
  
  /**
   * 通过特定渠道发送
   */
  private async sendViaChannel(item: NotificationQueueItem): Promise<void> {
    switch (item.channel) {
      case 'email':
        await this.sendEmail(item);
        break;
      case 'push':
        await this.sendPush(item);
        break;
      case 'sms':
        await this.sendSMS(item);
        break;
      case 'in_app':
        // in_app 通知已直接添加到用户列表
        item.status = 'sent';
        break;
    }
  }
  
  /**
   * 发送邮件
   */
  private async sendEmail(item: NotificationQueueItem): Promise<void> {
    // TODO: 集成实际的邮件服务
    console.log(`[Notification] Send email to ${item.payload.userId}:`, item.payload);
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  /**
   * 发送推送通知
   */
  private async sendPush(item: NotificationQueueItem): Promise<void> {
    const userId = item.payload.userId as string;
    const subs = this.pushSubscriptions.get(userId) || [];
    
    // TODO: 实际的 Web Push 发送
    for (const sub of subs) {
      console.log(`[Notification] Send push to ${sub.endpoint}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  /**
   * 发送短信
   */
  private async sendSMS(item: NotificationQueueItem): Promise<void> {
    // TODO: 集成短信服务
    console.log(`[Notification] Send SMS to ${item.payload.userId}`);
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // ==================== 预定义通知 ====================
  
  /**
   * 发送项目更新通知
   */
  sendProjectUpdate(projectId: string, projectName: string, userIds: string[]): void {
    this.sendBatchNotifications(userIds.map(uid => ({
      userId: uid,
      type: 'project:update',
      data: {
        title: `项目已更新: ${projectName}`,
        message: `项目 "${projectName}" 有新的更新`,
        payload: { projectId, projectName },
        actions: [
          { id: 'view', label: '查看项目', url: `/project/${projectId}` },
        ],
      },
    })));
  }
  
  /**
   * 发送评论提及通知
   */
  sendCommentMention(projectId: string, projectName: string, mentionedUserIds: string[], authorName: string, commentId: string): void {
    this.sendBatchNotifications(mentionedUserIds.map(uid => ({
      userId: uid,
      type: 'comment:mention',
      data: {
        title: `您被提及: ${projectName}`,
        message: `${authorName} 在项目 "${projectName}" 中提及了您`,
        payload: { projectId, projectName, commentId },
        actions: [
          { id: 'view', label: '查看评论', url: `/project/${projectId}/comments/${commentId}` },
        ],
      },
    })));
  }
  
  /**
   * 发送团队邀请通知
   */
  sendTeamInvite(teamId: string, teamName: string, inviteeId: string, inviterName: string): void {
    this.sendNotification(inviteeId, 'team:invite', {
      title: `团队邀请: ${teamName}`,
      message: `${inviterName} 邀请您加入团队 "${teamName}"`,
      payload: { teamId, teamName },
      actions: [
        { id: 'accept', label: '接受邀请', handler: 'acceptTeamInvite' },
        { id: 'reject', label: '拒绝', handler: 'rejectTeamInvite' },
      ],
    });
  }
  
  // ==================== 统计 ====================
  
  /**
   * 获取通知统计
   */
  getStats(): {
    totalNotifications: number;
    pendingQueue: number;
    sentToday: number;
    failedToday: number;
  } {
    let totalNotifications = 0;
    for (const notifications of this.notifications.values()) {
      totalNotifications += notifications.length;
    }
    
    const today = new Date().setHours(0, 0, 0, 0);
    const sentToday = this.queue.filter(
      q => q.status === 'sent' && q.createdAt > today
    ).length;
    
    const failedToday = this.queue.filter(
      q => q.status === 'failed' && q.createdAt > today
    ).length;
    
    return {
      totalNotifications,
      pendingQueue: this.queue.filter(q => q.status === 'pending').length,
      sentToday,
      failedToday,
    };
  }
}

// 导出单例
export const notificationManager = new NotificationManager();
