import { getBackendOrigin } from '@/lib/api/auth';
import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export class NotificationService {
  private static getAuthHeaders() {
    const token = getCookie('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  static async createTaskAssignedNotification(
    taskId: string,
    taskTitle: string,
    assigneeId: string,
    projectName: string,
    assignedBy: string,
    projectId?: number
  ) {
    try {
      await fetch(`${API_BASE_URL}/notifications/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${taskTitle}" in project "${projectName}"`,
          userId: Number(assigneeId),
          taskId,
          senderName: assignedBy,
          projectId: projectId ? Number(projectId) : undefined
        })
      });
    } catch (error) {
      console.error('Error creating task assigned notification:', error);
    }
  }

  static async createTaskReviewNotification(
    taskId: string,
    taskTitle: string,
    managerId: string,
    projectName: string,
    submittedBy: string,
    projectId?: number
  ) {
    try {
      await fetch(`${API_BASE_URL}/notifications/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: 'task_review',
          title: 'Task Ready for Review',
          message: `"${taskTitle}" in project "${projectName}" is ready for your review`,
          userId: Number(managerId),
          taskId,
          senderName: submittedBy,
          projectId: projectId ? Number(projectId) : undefined
        })
      });
    } catch (error) {
      console.error('Error creating task review notification:', error);
    }
  }

  static async createTaskCompletedNotification(
    taskId: string,
    taskTitle: string,
    assigneeId: string,
    projectName: string,
    approvedBy: string,
    projectId?: number
  ) {
    try {
      await fetch(`${API_BASE_URL}/notifications/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: 'task_completed',
          title: 'Task Approved',
          message: `Your task "${taskTitle}" in project "${projectName}" has been approved and completed`,
          userId: Number(assigneeId),
          taskId,
          senderName: approvedBy,
          projectId: projectId ? Number(projectId) : undefined
        })
      });
    } catch (error) {
      console.error('Error creating task completed notification:', error);
    }
  }

  static async createMessageNotification(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    projectName?: string,
    projectId?: number
  ) {
    try {
      const title = projectName ? 'New Project Message' : 'New Message';
      const message = projectName 
        ? `${senderName} sent a message in project "${projectName}": ${messagePreview}`
        : `${senderName} sent you a message: ${messagePreview}`;

      await fetch(`${API_BASE_URL}/notifications/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: 'message',
          title,
          message,
          userId: Number(recipientId),
          senderName,
          projectId: projectId ? Number(projectId) : undefined
        })
      });
    } catch (error) {
      console.error('Error creating message notification:', error);
    }
  }

  static async createTaskTaggedNotification(
    recipientId: string,
    taskTitle: string,
    projectName: string,
    senderName: string,
    messagePreview: string,
    projectId?: number
  ) {
    try {
      await fetch(`${API_BASE_URL}/notifications/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: 'message',
          title: 'Task Tagged in Message',
          message: `${senderName} tagged you about task "${taskTitle}" in project "${projectName}": ${messagePreview}`,
          userId: Number(recipientId),
          senderName,
          projectId: projectId ? Number(projectId) : undefined
        })
      });
    } catch (error) {
      console.error('Error creating task tagged notification:', error);
    }
  }
}