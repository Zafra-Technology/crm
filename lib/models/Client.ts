import { getDatabase } from '@/lib/mongodb';
import { Client } from '@/types/client';
import { ObjectId } from 'mongodb';

export class ClientModel {
  private static collection = 'clients';

  static async getAll(): Promise<Client[]> {
    try {
      const db = await getDatabase();
      const clients = await db.collection(this.collection)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return clients.map(client => ({
        ...client,
        id: client._id.toString(),
        _id: undefined
      })) as Client[];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  }

  static async getById(id: string): Promise<Client | null> {
    try {
      const db = await getDatabase();
      const client = await db.collection(this.collection)
        .findOne({ _id: new ObjectId(id) });
      
      if (!client) return null;
      
      return {
        ...client,
        id: client._id.toString(),
        _id: undefined
      } as Client;
    } catch (error) {
      console.error('Error fetching client:', error);
      return null;
    }
  }

  static async create(clientData: Omit<Client, 'id'>): Promise<Client | null> {
    try {
      const db = await getDatabase();
      const result = await db.collection(this.collection).insertOne({
        ...clientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (result.insertedId) {
        return await this.getById(result.insertedId.toString());
      }
      return null;
    } catch (error) {
      console.error('Error creating client:', error);
      return null;
    }
  }

  static async update(id: string, updateData: Partial<Client>): Promise<Client | null> {
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
      console.error('Error updating client:', error);
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
      console.error('Error deleting client:', error);
      return false;
    }
  }

  static async search(searchTerm: string): Promise<Client[]> {
    try {
      const db = await getDatabase();
      const clients = await db.collection(this.collection)
        .find({
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { company: { $regex: searchTerm, $options: 'i' } }
          ]
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      return clients.map(client => ({
        ...client,
        id: client._id.toString(),
        _id: undefined
      })) as Client[];
    } catch (error) {
      console.error('Error searching clients:', error);
      return [];
    }
  }
}