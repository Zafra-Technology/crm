import { NextRequest, NextResponse } from 'next/server';
import { DesignerModel } from '@/lib/models/Designer';

// GET /api/designers/[id] - Get single designer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const designer = await DesignerModel.getById(params.id);
    
    if (!designer) {
      return NextResponse.json(
        { error: 'Designer not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ designer }, { status: 200 });
  } catch (error) {
    console.error('Error fetching designer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch designer' },
      { status: 500 }
    );
  }
}

// PUT /api/designers/[id] - Update designer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, email, phoneNumber, role, status } = body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    
    const designer = await DesignerModel.update(params.id, updateData);
    
    if (!designer) {
      return NextResponse.json(
        { error: 'Designer not found or update failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ designer }, { status: 200 });
  } catch (error) {
    console.error('Error updating designer:', error);
    return NextResponse.json(
      { error: 'Failed to update designer' },
      { status: 500 }
    );
  }
}

// DELETE /api/designers/[id] - Delete designer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await DesignerModel.delete(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Designer not found or delete failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Designer deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting designer:', error);
    return NextResponse.json(
      { error: 'Failed to delete designer' },
      { status: 500 }
    );
  }
}