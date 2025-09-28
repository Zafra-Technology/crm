import { NextRequest, NextResponse } from 'next/server';
import { ChatMessageModel } from '@/lib/models/ChatMessage';
import { fileStorage } from '@/lib/storage/fileStorage';

// Global in-memory storage - shared across all users and persists across page navigation
const memoryMessages: any[] = [];

console.log('💾 Chat storage initialized - messages will persist across navigation');

const fallbackChatAPI = {
  async create(messageData: any) {
    const message = {
      ...messageData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    memoryMessages.push(message);
    console.log('Message saved to memory:', message);
    return message;
  },

  async getByProjectId(projectId: string) {
    const messages = memoryMessages
      .filter(msg => msg.projectId === projectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log(`📨 Found ${messages.length} messages for project ${projectId}`);
    console.log('Messages:', messages.map(m => `${m.userName}: ${m.message.substring(0, 30)}...`));
    return messages;
  },

  async deleteByProjectId(projectId: string) {
    const toDelete = memoryMessages.filter(msg => msg.projectId === projectId);
    const newLength = memoryMessages.length - toDelete.length;
    memoryMessages.splice(0, memoryMessages.length, ...memoryMessages.filter(msg => msg.projectId !== projectId));
    return toDelete.length;
  }
};

// GET - Get all messages for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log('GET /api/chat - MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    // Try MongoDB first, then file storage, then memory
    try {
      const messages = await ChatMessageModel.getByProjectId(params.projectId);
      console.log('✅ MongoDB: Retrieved', messages.length, 'messages');
      return NextResponse.json(messages);
    } catch (dbError) {
      console.error('❌ MongoDB error, trying file storage:', dbError instanceof Error ? dbError.message : dbError);
      
      try {
        const messages = await fileStorage.getMessagesByProject(params.projectId);
        console.log('📁 File storage: Retrieved', messages.length, 'messages');
        return NextResponse.json(messages);
      } catch (fileError) {
        console.error('❌ File storage error, using memory:', fileError instanceof Error ? fileError.message : fileError);
        const messages = await fallbackChatAPI.getByProjectId(params.projectId);
        console.log('🔄 Memory fallback: Retrieved', messages.length, 'messages');
        return NextResponse.json(messages);
      }
    }
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Create a new message
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log('POST /api/chat - MongoDB URI exists:', !!process.env.MONGODB_URI);
    const body = await request.json();
    const { userId, userName, userRole, message, messageType, fileUrl, fileName, fileSize, fileType } = body;

    console.log('Received message data:', { 
      userId, userName, userRole, message, projectId: params.projectId,
      messageType, fileName, hasFileUrl: !!fileUrl 
    });

    if (!userId || !userName || !userRole || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const messageData = {
      projectId: params.projectId,
      userId,
      userName,
      userRole,
      message,
      timestamp: new Date().toISOString(),
      // Include file attachment fields if present
      ...(messageType && { messageType }),
      ...(fileUrl && { fileUrl }),
      ...(fileName && { fileName }),
      ...(fileSize && { fileSize }),
      ...(fileType && { fileType }),
    };

    // Try MongoDB first, then file storage, then memory
    try {
      const newMessage = await ChatMessageModel.create(messageData);
      console.log('✅ MongoDB: Message saved with ID:', newMessage.id);
      return NextResponse.json(newMessage, { status: 201 });
    } catch (dbError) {
      console.error('❌ MongoDB error, trying file storage:', dbError instanceof Error ? dbError.message : dbError);
      
      try {
        const messageWithId = {
          ...messageData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        
        const newMessage = await fileStorage.saveMessage(messageWithId);
        console.log('📁 File storage: Message saved with ID:', newMessage.id);
        return NextResponse.json(newMessage, { status: 201 });
      } catch (fileError) {
        console.error('❌ File storage error, using memory:', fileError instanceof Error ? fileError.message : fileError);
        const newMessage = await fallbackChatAPI.create(messageData);
        console.log('🔄 Memory fallback: Message saved with ID:', newMessage.id);
        return NextResponse.json(newMessage, { status: 201 });
      }
    }
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all messages for a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const deletedCount = await ChatMessageModel.deleteByProjectId(params.projectId);
    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error('Error deleting chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    );
  }
}