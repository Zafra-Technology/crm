import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET - Get unread message counts for a user from all their conversations
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
    
    // Aggregate unread message counts per sender
    const pipeline = [
      {
        $match: {
          receiverId: userId,
          isRead: { $ne: true } // Messages that are not marked as read
        }
      },
      {
        $group: {
          _id: '$senderId',
          unreadCount: { $sum: 1 },
          lastMessageTimestamp: { $max: '$timestamp' },
          senderName: { $first: '$senderName' }
        }
      },
      {
        $project: {
          userId: '$_id',
          unreadCount: 1,
          lastMessageTimestamp: 1,
          senderName: 1,
          _id: 0
        }
      }
    ];

    const counts = await db
      .collection('individual_messages')
      .aggregate(pipeline)
      .toArray();

    console.log('Message counts for user', userId, ':', counts);

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching message counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message counts' },
      { status: 500 }
    );
  }
}