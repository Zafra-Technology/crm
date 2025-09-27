import { NextRequest, NextResponse } from 'next/server';
import { ProjectUpdateModel } from '@/lib/models/ProjectUpdate';

// GET /api/project-updates/[id] - Get single update
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const update = await ProjectUpdateModel.getById(params.id);
    
    if (!update) {
      return NextResponse.json(
        { error: 'Project update not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ update }, { status: 200 });
  } catch (error) {
    console.error('Error fetching project update:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project update' },
      { status: 500 }
    );
  }
}

// PUT /api/project-updates/[id] - Update project update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { type, title, description, fileUrl } = body;
    
    const updateData: any = {};
    if (type) updateData.type = type;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    
    const update = await ProjectUpdateModel.update(params.id, updateData);
    
    if (!update) {
      return NextResponse.json(
        { error: 'Project update not found or update failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ update }, { status: 200 });
  } catch (error) {
    console.error('Error updating project update:', error);
    return NextResponse.json(
      { error: 'Failed to update project update' },
      { status: 500 }
    );
  }
}

// DELETE /api/project-updates/[id] - Delete project update
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await ProjectUpdateModel.delete(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Project update not found or delete failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Project update deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting project update:', error);
    return NextResponse.json(
      { error: 'Failed to delete project update' },
      { status: 500 }
    );
  }
}