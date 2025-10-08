import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'data');
const MESSAGES_FILE = path.join(STORAGE_DIR, 'chat_messages.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export const fileStorage = {
  async saveMessage(message: any): Promise<any> {
    try {
      const messages = await this.getAllMessages();
      messages.push(message);
      
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
      console.log('💾 File storage: Message saved');
      return message;
    } catch (error) {
      console.error('❌ File storage error:', error);
      throw error;
    }
  },

  async getAllMessages(): Promise<any[]> {
    try {
      if (!fs.existsSync(MESSAGES_FILE)) {
        return [];
      }
      
      const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(data);
      console.log('📁 File storage: Retrieved', messages.length, 'messages');
      return messages;
    } catch (error) {
      console.error('❌ File storage read error:', error);
      return [];
    }
  },

  async getMessagesByProject(projectId: string): Promise<any[]> {
    const allMessages = await this.getAllMessages();
    const projectMessages = allMessages
      .filter(msg => msg.projectId === projectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    console.log('📁 File storage: Found', projectMessages.length, 'messages for project', projectId);
    return projectMessages;
  },

  async deleteMessagesByProject(projectId: string): Promise<number> {
    const allMessages = await this.getAllMessages();
    const filteredMessages = allMessages.filter(msg => msg.projectId !== projectId);
    const deletedCount = allMessages.length - filteredMessages.length;
    
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(filteredMessages, null, 2));
    console.log('🗑️ File storage: Deleted', deletedCount, 'messages for project', projectId);
    return deletedCount;
  }
};