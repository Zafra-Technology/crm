import { NextResponse } from 'next/server';
import { seedDesigners } from '@/lib/seed-designers';
import { seedProjects } from '@/lib/seed-projects';
import { seedClients } from '@/lib/seed-clients';
import { updateProjectsWithAttachments } from '@/lib/seed-projects-with-attachments';
import { seedProjectUpdates } from '@/lib/seed-project-updates';

export async function POST() {
  try {
    await seedClients();
    await seedDesigners();
    await seedProjects();
    await updateProjectsWithAttachments();
    await seedProjectUpdates();
    return NextResponse.json({ message: 'Database seeded successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}