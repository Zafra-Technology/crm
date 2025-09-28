import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export interface Notification {
  _id?: ObjectId;
  id: string;
  type: 'task_assigned' | 'task_review' | 'message' | 'task_completed';
  title: string;
  message: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  senderId?: string;
  senderName?: string;
  isRead: boolean;
  createdAt: string;
}

// GET - Get notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const notifications = await db
      .collection('notifications')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      notifications: notifications.map(notification => ({
        ...notification,
        id: notification._id?.toString() || notification.id,
      }))
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      title, 
      message, 
      userId, 
      projectId, 
      taskId, 
      senderId, 
      senderName 
    } = body;

    if (!type || !title || !message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notificationData: Notification = {
      id: new ObjectId().toString(),
      type,
      title,
      message,
      userId,
      projectId: projectId || undefined,
      taskId: taskId || undefined,
      senderId: senderId || undefined,
      senderName: senderName || undefined,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    const { db } = await connectToDatabase();
    const result = await db.collection('notifications').insertOne(notificationData);
    
    console.log('✅ Notification created:', result.insertedId);

    return NextResponse.json({ 
      ...notificationData, 
      _id: result.insertedId 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}