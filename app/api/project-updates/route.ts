import { NextRequest, NextResponse } from 'next/server';
import { ProjectUpdateModel } from '@/lib/models/ProjectUpdate';

// GET /api/project-updates - Get all updates or by project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    let updates;
    if (projectId) {
      updates = await ProjectUpdateModel.getByProjectId(projectId);
    } else {
      updates = await ProjectUpdateModel.getAll();
    }
    
    return NextResponse.json({ updates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching project updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project updates' },
      { status: 500 }
    );
  }
}

// POST /api/project-updates - Create new update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userId, type, title, description, fileUrl, fileName, fileSize, fileType } = body;
    
    // Validate required fields
    if (!projectId || !userId || !type || !title) {
      return NextResponse.json(
        { error: 'ProjectId, userId, type, and title are required' },
        { status: 400 }
      );
    }
    
    const updateData = {
      projectId,
      userId,
      type,
      title,
      description: description || '',
      fileUrl: fileUrl || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      fileType: fileType || undefined,
      createdAt: new Date().toISOString()
    };
    
    const update = await ProjectUpdateModel.create(updateData);
    
    if (!update) {
      return NextResponse.json(
        { error: 'Failed to create project update' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    console.error('Error creating project update:', error);
    return NextResponse.json(
      { error: 'Failed to create project update' },
      { status: 500 }
    );
  }
}