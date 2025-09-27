// This is a utility script to seed the database with initial client data
import { getDatabase } from './mongodb';

const initialClients = [
  {
    name: 'John Smith',
    email: 'john.smith@company.com',
    phoneNumber: '+1 (555) 987-6543',
    company: 'Tech Solutions Inc.',
    status: 'active',
    joinedDate: '2024-01-10',
    projectsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.j@startup.io',
    phoneNumber: '+1 (555) 876-5432',
    company: 'Startup Innovations',
    status: 'active',
    joinedDate: '2024-02-05',
    projectsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Michael Brown',
    email: 'mbrown@enterprise.com',
    phoneNumber: '+1 (555) 765-4321',
    company: 'Enterprise Corp',
    status: 'active',
    joinedDate: '2023-11-20',
    projectsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function seedClients() {
  try {
    const db = await getDatabase();
    const collection = db.collection('clients');
    
    // Check if clients already exist
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log('Clients already exist in database');
      return;
    }
    
    // Insert initial clients
    const result = await collection.insertMany(initialClients);
    console.log(`Seeded ${result.insertedCount} clients`);
  } catch (error) {
    console.error('Error seeding clients:', error);
  }
}