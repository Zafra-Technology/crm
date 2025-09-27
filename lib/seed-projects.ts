// This is a utility script to seed the database with initial project data
import { getDatabase } from './mongodb';

const initialProjects = [
  {
    name: 'E-commerce Website Redesign',
    description: 'Complete redesign of the company e-commerce platform with modern UI/UX',
    requirements: 'Mobile-first design, accessibility compliance, fast loading times',
    timeline: '8 weeks',
    status: 'in_progress',
    clientId: '1',
    managerId: '2', 
    designerIds: ['3'],
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-20T00:00:00.000Z'
  },
  {
    name: 'Mobile App Interface',
    description: 'Design new mobile application interface for iOS and Android',
    requirements: 'Native feel, intuitive navigation, brand consistency',
    timeline: '6 weeks',
    status: 'planning',
    clientId: '1',
    managerId: '2',
    designerIds: ['3'],
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-18T00:00:00.000Z'
  },
  {
    name: 'Brand Identity Package',
    description: 'Complete brand identity including logo, colors, typography',
    requirements: 'Professional, memorable, scalable across mediums',
    timeline: '4 weeks',
    status: 'review',
    clientId: '1',
    managerId: '2',
    designerIds: ['3'],
    createdAt: '2024-01-05T00:00:00.000Z',
    updatedAt: '2024-01-22T00:00:00.000Z'
  }
];

export async function seedProjects() {
  try {
    const db = await getDatabase();
    const collection = db.collection('projects');
    
    // Check if projects already exist
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log('Projects already exist in database');
      return;
    }
    
    // Insert initial projects
    const result = await collection.insertMany(initialProjects);
    console.log(`Seeded ${result.insertedCount} projects`);
  } catch (error) {
    console.error('Error seeding projects:', error);
  }
}