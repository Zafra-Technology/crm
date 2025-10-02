import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// PUT - Mark messages as read between two users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentUserId, otherUserId } = body;

    if (!currentUserId || !otherUserId) {
      return NextResponse.json(
        { error: 'Both currentUserId and otherUserId are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Mark all messages from otherUserId to currentUserId as read
    const result = await db
      .collection('individual_messages')
      .updateMany(
        {
          senderId: otherUserId,
          receiverId: currentUserId,
          isRead: { $ne: true }
        },
        {
          $set: { 
            isRead: true,
            readAt: new Date().toISOString()
          }
        }
      );

    console.log(`Marked ${result.modifiedCount} messages as read between ${otherUserId} and ${currentUserId}`);

    return NextResponse.json({ 
      success: true,
      markedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}