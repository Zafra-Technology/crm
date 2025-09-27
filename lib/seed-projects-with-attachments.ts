// Update existing projects to include empty attachments array
import { getDatabase } from './mongodb';

export async function updateProjectsWithAttachments() {
  try {
    const db = await getDatabase();
    const collection = db.collection('projects');
    
    // Update all projects to have attachments array if they don't have one
    const result = await collection.updateMany(
      { attachments: { $exists: false } },
      { $set: { attachments: [] } }
    );
    
    console.log(`Updated ${result.modifiedCount} projects with attachments field`);
  } catch (error) {
    console.error('Error updating projects with attachments:', error);
  }
}