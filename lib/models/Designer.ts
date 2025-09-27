import { getDatabase } from '@/lib/mongodb';
import { Designer } from '@/types/designer';
import { ObjectId } from 'mongodb';

export class DesignerModel {
  private static collection = 'designers';

  static async getAll(): Promise<Designer[]> {
    try {
      const db = await getDatabase();
      const designers = await db.collection(this.collection)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return designers.map(designer => ({
        ...designer,
        id: designer._id.toString(),
        _id: undefined
      })) as Designer[];
    } catch (error) {
      console.error('Error fetching designers:', error);
      return [];
    }
  }

  static async getById(id: string): Promise<Designer | null> {
    try {
      const db = await getDatabase();
      const designer = await db.collection(this.collection)
        .findOne({ _id: new ObjectId(id) });
      
      if (!designer) return null;
      
      return {
        ...designer,
        id: designer._id.toString(),
        _id: undefined
      } as Designer;
    } catch (error) {
      console.error('Error fetching designer:', error);
      return null;
    }
  }

  static async create(designerData: Omit<Designer, 'id'>): Promise<Designer | null> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection).insertOne({
        ...designerData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (result.insertedId) {
        return await this.getById(result.insertedId.toString());
      }
      return null;
    } catch (error) {
      console.error('Error creating designer:', error);
      return null;
    }
  }

  static async update(id: string, updateData: Partial<Designer>): Promise<Designer | null> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection).updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            ...updateData, 
            updatedAt: new Date().toISOString() 
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        return await this.getById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating designer:', error);
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection)
        .deleteOne({ _id: new ObjectId(id) });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting designer:', error);
      return false;
    }
  }

  static async search(searchTerm: string): Promise<Designer[]> {
    try {
      const db = await getDatabase();
      const designers = await db.collection(this.collection)
        .find({
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { role: { $regex: searchTerm, $options: 'i' } }
          ]
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      return designers.map(designer => ({
        ...designer,
        id: designer._id.toString(),
        _id: undefined
      })) as Designer[];
    } catch (error) {
      console.error('Error searching designers:', error);
      return [];
    }
  }
}