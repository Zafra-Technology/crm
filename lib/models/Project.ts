import { getDatabase } from '@/lib/mongodb';
import { Project } from '@/types';
import { ObjectId } from 'mongodb';

export class ProjectModel {
  private static collection = 'projects';

  static async getAll(): Promise<Project[]> {
    try {
      const db = await getDatabase();
      const projects = await db.collection(this.collection)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return projects.map(project => ({
        ...project,
        id: project._id.toString(),
        _id: undefined
      })) as Project[];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  static async getById(id: string): Promise<Project | null> {
    try {
      const db = await getDatabase();
      const project = await db.collection(this.collection)
        .findOne({ _id: new ObjectId(id) });
      
      if (!project) return null;
      
      return {
        ...project,
        id: project._id.toString(),
        _id: undefined
      } as Project;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  }

  static async getByUserId(userId: string, userRole: string): Promise<Project[]> {
    try {
      const db = await getDatabase();
      let query = {};

      switch (userRole) {
        case 'client':
          query = { clientId: userId };
          break;
        case 'project_manager':
          query = { managerId: userId };
          break;
        case 'designer':
          query = { designerIds: { $in: [userId] } };
          break;
      }

      const projects = await db.collection(this.collection)
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      return projects.map(project => ({
        ...project,
        id: project._id.toString(),
        _id: undefined
      })) as Project[];
    } catch (error) {
      console.error('Error fetching user projects:', error);
      return [];
    }
  }

  static async create(projectData: Omit<Project, 'id'>): Promise<Project | null> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection).insertOne({
        ...projectData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (result.insertedId) {
        return await this.getById(result.insertedId.toString());
      }
      return null;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  }

  static async update(id: string, updateData: Partial<Project>): Promise<Project | null> {
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
      console.error('Error updating project:', error);
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
      console.error('Error deleting project:', error);
      return false;
    }
  }

  static async assignDesigner(projectId: string, designerId: string): Promise<Project | null> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection).updateOne(
        { _id: new ObjectId(projectId) },
        { 
          $addToSet: { designerIds: designerId },
          $set: { updatedAt: new Date().toISOString() }
        }
      );
      
      if (result.modifiedCount > 0) {
        return await this.getById(projectId);
      }
      return null;
    } catch (error) {
      console.error('Error assigning designer:', error);
      return null;
    }
  }

  static async unassignDesigner(projectId: string, designerId: string): Promise<Project | null> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection).updateOne(
        { _id: new ObjectId(projectId) },
        { 
          $pull: { designerIds: designerId },
          $set: { updatedAt: new Date().toISOString() }
        }
      );
      
      if (result.modifiedCount > 0) {
        return await this.getById(projectId);
      }
      return null;
    } catch (error) {
      console.error('Error unassigning designer:', error);
      return null;
    }
  }

  static async search(searchTerm: string): Promise<Project[]> {
    try {
      const db = await getDatabase();
      const projects = await db.collection(this.collection)
        .find({
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { requirements: { $regex: searchTerm, $options: 'i' } }
          ]
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      return projects.map(project => ({
        ...project,
        id: project._id.toString(),
        _id: undefined
      })) as Project[];
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  }
}