// This is a utility script to seed the database with initial designer data
import { getDatabase } from './mongodb';

const initialDesigners = [
  {
    name: 'Mike Designer',
    email: 'mike@example.com',
    phoneNumber: '+1 (555) 123-4567',
    role: 'Senior UI/UX Designer',
    status: 'active',
    joinedDate: '2024-01-15',
    projectsCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    phoneNumber: '+1 (555) 234-5678',
    role: 'Graphic Designer',
    status: 'active',
    joinedDate: '2024-02-01',
    projectsCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    phoneNumber: '+1 (555) 345-6789',
    role: 'Web Designer',
    status: 'active',
    joinedDate: '2023-12-10',
    projectsCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function seedDesigners() {
  try {
    const db = await getDatabase();
    const collection = db.collection('designers');
    
    // Check if designers already exist
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log('Designers already exist in database');
      return;
    }
    
    // Insert initial designers
    const result = await collection.insertMany(initialDesigners);
    console.log(`Seeded ${result.insertedCount} designers`);
  } catch (error) {
    console.error('Error seeding designers:', error);
  }
}