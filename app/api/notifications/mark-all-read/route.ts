import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// PUT - Mark all notifications as read for a user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('notifications').updateMany(
      { userId, isRead: false },
      { 
        $set: { 
          isRead: true,
          updatedAt: new Date().toISOString()
        } 
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} notifications as read for user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}