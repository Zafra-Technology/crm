import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { Task } from '@/components/tasks/KanbanBoard';

// GET - Get all tasks for a project or assignee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const assigneeId = searchParams.get('assigneeId');

    console.log('📋 GET /api/tasks - projectId:', projectId, 'assigneeId:', assigneeId);

    const { db } = await connectToDatabase();
    
    let query = {};
    if (projectId) {
      query = { projectId };
    } else if (assigneeId) {
      query = { assigneeId };
    }

    const tasks = await db
      .collection('tasks')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log('✅ Found tasks:', tasks.length);

    return NextResponse.json(tasks.map(task => ({
      ...task,
      id: task._id?.toString() || task.id,
    })));
  } catch (error) {
    console.error('❌ Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId, 
      title, 
      description, 
      assigneeId, 
      assigneeName,
      createdBy,
      createdByName,
      status,
      priority,
      dueDate 
    } = body;

    console.log('📝 POST /api/tasks - Creating task:', { 
      title, projectId, assigneeId, status, priority 
    });

    if (!projectId || !title || !assigneeId || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const taskData = {
      projectId,
      title,
      description: description || '',
      assigneeId,
      assigneeName: assigneeName || 'Unknown',
      createdBy,
      createdByName: createdByName || 'Unknown',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      attachments: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { db } = await connectToDatabase();
    const result = await db.collection('tasks').insertOne(taskData);
    
    const newTask = {
      ...taskData,
      id: result.insertedId.toString(),
      _id: result.insertedId
    };

    console.log('✅ Task created successfully:', newTask.id);

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PUT - Update a task
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, status, ...updateData } = body;

    console.log('🔄 PUT /api/tasks - Updating task:', taskId, 'status:', status);

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const updateFields = {
      ...updateData,
      ...(status && { status }),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const updatedTask = await db.collection('tasks').findOne({ _id: new ObjectId(taskId) });

    console.log('✅ Task updated successfully');

    return NextResponse.json({
      ...updatedTask,
      id: updatedTask?._id?.toString()
    });
  } catch (error) {
    console.error('❌ Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    console.log('🗑️ DELETE /api/tasks - Deleting task:', taskId);

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('tasks').deleteOne({
      _id: new ObjectId(taskId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    console.log('✅ Task deleted successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}