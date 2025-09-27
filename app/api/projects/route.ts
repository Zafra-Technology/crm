import { NextRequest, NextResponse } from 'next/server';
import { ProjectModel } from '@/lib/models/Project';

// GET /api/projects - Get all projects or search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    
    let projects;
    if (search) {
      projects = await ProjectModel.search(search);
    } else if (userId && userRole) {
      projects = await ProjectModel.getByUserId(userId, userRole);
    } else {
      projects = await ProjectModel.getAll();
    }
    
    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, requirements, timeline, clientId, managerId, designerIds } = body;
    
    // Validate required fields
    if (!name || !description || !requirements || !timeline || !clientId || !managerId) {
      return NextResponse.json(
        { error: 'Name, description, requirements, timeline, clientId, and managerId are required' },
        { status: 400 }
      );
    }
    
    const projectData = {
      name,
      description,
      requirements,
      timeline,
      status: 'planning' as const,
      clientId,
      managerId,
      designerIds: designerIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const project = await ProjectModel.create(projectData);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}