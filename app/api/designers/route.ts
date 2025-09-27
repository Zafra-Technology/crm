import { NextRequest, NextResponse } from 'next/server';
import { DesignerModel } from '@/lib/models/Designer';

// GET /api/designers - Get all designers or search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    let designers;
    if (search) {
      designers = await DesignerModel.search(search);
    } else {
      designers = await DesignerModel.getAll();
    }
    
    return NextResponse.json({ designers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching designers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch designers' },
      { status: 500 }
    );
  }
}

// POST /api/designers - Create new designer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phoneNumber, role } = body;
    
    // Validate required fields
    if (!name || !email || !phoneNumber || !role) {
      return NextResponse.json(
        { error: 'Name, email, phone number, and role are required' },
        { status: 400 }
      );
    }
    
    const designerData = {
      name,
      email,
      phoneNumber,
      role,
      status: 'active' as const,
      joinedDate: new Date().toISOString().split('T')[0],
      projectsCount: 0
    };
    
    const designer = await DesignerModel.create(designerData);
    
    if (!designer) {
      return NextResponse.json(
        { error: 'Failed to create designer' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ designer }, { status: 201 });
  } catch (error) {
    console.error('Error creating designer:', error);
    return NextResponse.json(
      { error: 'Failed to create designer' },
      { status: 500 }
    );
  }
}