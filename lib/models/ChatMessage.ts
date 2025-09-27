import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongodb';

// Remove auto-connection test to avoid startup issues

export interface ChatMessage {
  _id?: ObjectId;
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userRole: 'client' | 'project_manager' | 'designer';
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

export class ChatMessageModel {
  private static collection = 'chat_messages';

  static async create(messageData: Omit<ChatMessage, '_id' | 'id' | 'createdAt'>): Promise<ChatMessage> {
    try {
      console.log('Creating chat message:', messageData);
      const { db } = await connectToDatabase();
      
      const message: ChatMessage = {
        ...messageData,
        id: new ObjectId().toString(),
        createdAt: new Date().toISOString(),
      };

      console.log('Inserting message to collection:', this.collection);
      const result = await db.collection(this.collection).insertOne(message);
      console.log('Insert result:', result.insertedId);
      
      return { ...message, _id: result.insertedId };
    } catch (error) {
      console.error('Error in ChatMessage.create:', error);
      throw error;
    }
  }

  static async getByProjectId(projectId: string): Promise<ChatMessage[]> {
    try {
      console.log('Fetching messages for project:', projectId);
      const { db } = await connectToDatabase();
      
      const messages = await db
        .collection(this.collection)
        .find({ projectId })
        .sort({ timestamp: 1 })
        .toArray();

      console.log('Found messages:', messages.length);
      return messages.map(msg => ({
        ...msg,
        id: msg._id?.toString() || msg.id,
      }));
    } catch (error) {
      console.error('Error in ChatMessage.getByProjectId:', error);
      throw error;
    }
  }

  static async deleteById(id: string): Promise<boolean> {
    const { db } = await connectToDatabase();
    
    const result = await db.collection(this.collection).deleteOne({ 
      $or: [
        { _id: new ObjectId(id) },
        { id: id }
      ]
    });
    
    return result.deletedCount > 0;
  }

  static async deleteByProjectId(projectId: string): Promise<number> {
    const { db } = await connectToDatabase();
    
    const result = await db.collection(this.collection).deleteMany({ projectId });
    return result.deletedCount || 0;
  }
}