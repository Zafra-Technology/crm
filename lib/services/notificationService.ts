export class NotificationService {
  static async createTaskAssignedNotification(
    taskId: string,
    taskTitle: string,
    assigneeId: string,
    projectName: string,
    assignedBy: string
  ) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${taskTitle}" in project "${projectName}"`,
          userId: assigneeId,
          taskId,
          senderName: assignedBy
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
    submittedBy: string
  ) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_review',
          title: 'Task Ready for Review',
          message: `"${taskTitle}" in project "${projectName}" is ready for your review`,
          userId: managerId,
          taskId,
          senderName: submittedBy
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
    approvedBy: string
  ) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_completed',
          title: 'Task Approved',
          message: `Your task "${taskTitle}" in project "${projectName}" has been approved and completed`,
          userId: assigneeId,
          taskId,
          senderName: approvedBy
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
    projectName?: string
  ) {
    try {
      const title = projectName ? 'New Project Message' : 'New Message';
      const message = projectName 
        ? `${senderName} sent a message in project "${projectName}": ${messagePreview}`
        : `${senderName} sent you a message: ${messagePreview}`;

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          title,
          message,
          userId: recipientId,
          senderName
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
    messagePreview: string
  ) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          title: 'Task Tagged in Message',
          message: `${senderName} tagged you about task "${taskTitle}" in project "${projectName}": ${messagePreview}`,
          userId: recipientId,
          senderName
        })
      });
    } catch (error) {
      console.error('Error creating task tagged notification:', error);
    }
  }
}