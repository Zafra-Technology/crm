// Seed some initial project updates for demo
import { getDatabase } from './mongodb';

const initialUpdates = [
  {
    projectId: '1', // This should match a project ID from your seeded projects
    userId: '3', // Designer
    type: 'design',
    title: 'Homepage wireframes completed',
    description: 'Initial wireframes for the new homepage design have been completed and are ready for review.',
    createdAt: '2024-01-20T10:30:00Z'
  },
  {
    projectId: '1',
    userId: '2', // Project Manager
    type: 'comment',
    title: 'Requirements updated',
    description: 'Added accessibility requirements based on client feedback from the initial meeting.',
    createdAt: '2024-01-19T14:15:00Z'
  },
  {
    projectId: '2',
    userId: '3', // Designer
    type: 'file',
    title: 'Research documents uploaded',
    description: 'User research and competitive analysis documents have been uploaded for team review.',
    fileUrl: '/files/mobile-research.pdf',
    createdAt: '2024-01-18T09:45:00Z'
  }
];

export async function seedProjectUpdates() {
  try {
    const db = await getDatabase();
    const collection = db.collection('project_updates');
    
    // Check if updates already exist
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log('Project updates already exist in database');
      return;
    }
    
    // Insert initial updates
    const result = await collection.insertMany(initialUpdates);
    console.log(`Seeded ${result.insertedCount} project updates`);
  } catch (error) {
    console.error('Error seeding project updates:', error);
  }
}