import { NextRequest, NextResponse } from 'next/server';
import { ClientModel } from '@/lib/models/Client';

// GET /api/clients - Get all clients or search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    let clients;
    if (search) {
      clients = await ClientModel.search(search);
    } else {
      clients = await ClientModel.getAll();
    }
    
    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phoneNumber, company } = body;
    
    // Validate required fields
    if (!name || !email || !phoneNumber || !company) {
      return NextResponse.json(
        { error: 'Name, email, phone number, and company are required' },
        { status: 400 }
      );
    }
    
    const clientData = {
      name,
      email,
      phoneNumber,
      company,
      status: 'active' as const,
      joinedDate: new Date().toISOString().split('T')[0],
      projectsCount: 0
    };
    
    const client = await ClientModel.create(clientData);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}