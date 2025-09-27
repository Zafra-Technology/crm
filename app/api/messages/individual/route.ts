import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

interface IndividualMessage {
  _id?: ObjectId;
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: string;
  createdAt: string;
  // File attachment fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  messageType?: 'text' | 'file' | 'image';
}

// GET - Get messages between two users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');

    if (!user1 || !user2) {
      return NextResponse.json(
        { error: 'Both user1 and user2 parameters are required' },
        { status: 400 }
      );
    }

    console.log('Loading messages between:', user1, 'and', user2);

    const { db } = await connectToDatabase();
    
    const messages = await db
      .collection('individual_messages')
      .find({
        $or: [
          { senderId: user1, receiverId: user2 },
          { senderId: user2, receiverId: user1 }
        ]
      })
      .sort({ timestamp: 1 })
      .toArray();

    console.log('Found messages:', messages.length);

    return NextResponse.json(messages.map(msg => ({
      ...msg,
      id: msg._id?.toString() || msg.id,
    })));
  } catch (error) {
    console.error('Error fetching individual messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send a message between two users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderId, senderName, receiverId, message, messageType, fileUrl, fileName, fileSize, fileType } = body;

    console.log('Received individual message:', { 
      senderId, senderName, receiverId, message, messageType, fileName, hasFileUrl: !!fileUrl 
    });

    if (!senderId || !senderName || !receiverId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const messageData: IndividualMessage = {
      id: new ObjectId().toString(),
      senderId,
      senderName,
      receiverId,
      message,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      // Include file attachment fields if present
      ...(messageType && { messageType }),
      ...(fileUrl && { fileUrl }),
      ...(fileName && { fileName }),
      ...(fileSize && { fileSize }),
      ...(fileType && { fileType }),
    };

    const { db } = await connectToDatabase();
    const result = await db.collection('individual_messages').insertOne(messageData);
    
    console.log('✅ Individual message saved with ID:', result.insertedId);

    return NextResponse.json({ 
      ...messageData, 
      _id: result.insertedId 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating individual message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete conversation between two users
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');

    if (!user1 || !user2) {
      return NextResponse.json(
        { error: 'Both user1 and user2 parameters are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('individual_messages').deleteMany({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    });

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting individual messages:', error);
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    );
  }
}