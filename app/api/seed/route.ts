import { NextResponse } from 'next/server';
import { seedDesigners } from '@/lib/seed-designers';
import { seedProjects } from '@/lib/seed-projects';

export async function POST() {
  try {
    await seedDesigners();
    await seedProjects();
    return NextResponse.json({ message: 'Database seeded successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}