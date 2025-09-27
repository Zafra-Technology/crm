import { NextRequest, NextResponse } from 'next/server';
import { ClientModel } from '@/lib/models/Client';

// GET /api/clients/[id] - Get single client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await ClientModel.getById(params.id);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ client }, { status: 200 });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, email, phoneNumber, company, status } = body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (company) updateData.company = company;
    if (status) updateData.status = status;
    
    const client = await ClientModel.update(params.id, updateData);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or update failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ client }, { status: 200 });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await ClientModel.delete(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Client not found or delete failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Client deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}