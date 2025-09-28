import { getDatabase } from '@/lib/mongodb';
import { ProjectUpdate } from '@/types';
import { ObjectId } from 'mongodb';

export class ProjectUpdateModel {
  private static collection = 'project_updates';

  static async getAll(): Promise<ProjectUpdate[]> {
    try {
      const db = await getDatabase();
      const updates = await db.collection(this.collection)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return updates.map(update => ({
        ...update,
        id: update._id.toString(),
        _id: undefined
      })) as ProjectUpdate[];
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  }

  static async getByProjectId(projectId: string): Promise<ProjectUpdate[]> {
    try {
      const db = await getDatabase();
      const updates = await db.collection(this.collection)
        .find({ projectId })
        .sort({ createdAt: -1 })
        .toArray();
      
      return updates.map(update => ({
        ...update,
        id: update._id.toString(),
        _id: undefined
      })) as ProjectUpdate[];
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  }

  static async getByUserId(userId: string): Promise<ProjectUpdate[]> {
    try {
      const db = await getDatabase();
      const updates = await db.collection(this.collection)
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      return updates.map(update => ({
        ...update,
        id: update._id.toString(),
        _id: undefined
      })) as ProjectUpdate[];
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  }

  static async getById(id: string): Promise<ProjectUpdate | null> {
    try {
      const db = await getDatabase();
      const update = await db.collection(this.collection)
        .findOne({ _id: new ObjectId(id) });
      
      if (!update) return null;
      
      return {
        ...update,
        id: update._id.toString(),
        _id: undefined
      } as ProjectUpdate;
    } catch (error) {
      console.error('Error fetching project update:', error);
      return null;
    }
  }

  static async create(updateData: Omit<ProjectUpdate, 'id'>): Promise<ProjectUpdate | null> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection).insertOne({
        ...updateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (result.insertedId) {
        return await this.getById(result.insertedId.toString());
      }
      return null;
    } catch (error) {
      console.error('Error creating project update:', error);
      return null;
    }
  }

  static async update(id: string, updateData: Partial<ProjectUpdate>): Promise<ProjectUpdate | null> {
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
      console.error('Error updating project update:', error);
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
      console.error('Error deleting project update:', error);
      return false;
    }
  }
}