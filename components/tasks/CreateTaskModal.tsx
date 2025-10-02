'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { designersApi } from '@/lib/api/designers';
import { X, CalendarIcon, UserIcon, AlertCircleIcon } from 'lucide-react';
import { NotificationService } from '@/lib/services/notificationService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateTaskModalProps {
  project: Project;
  currentUser: User;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function CreateTaskModal({ project, currentUser, onClose, onTaskCreated }: CreateTaskModalProps) {
  const [designers, setDesigners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
  });

  useEffect(() => {
    const loadDesigners = async () => {
      try {
        console.log('🔍 Loading designers for task assignment...');
        console.log('📋 Project designer IDs:', project.designerIds);
        
        const designersList = await designersApi.getAll();
        console.log('📋 All designers from API:', designersList.length);
        
        // Filter to only show designers assigned to this project
        const projectDesigners = designersList.filter(designer => 
          designer.status === 'active' && 
          project.designerIds.includes(designer.id)
        );
        
        console.log('✅ Project-assigned designers:', projectDesigners.length);
        console.log('👥 Available designers for this project:', projectDesigners.map(d => d.name));
        
        setDesigners(projectDesigners);
      } catch (error) {
        console.error('❌ Error loading designers:', error);
      }
    };

    loadDesigners();
  }, [project.designerIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Task creation attempt:', {
      title: formData.title.trim(),
      assigneeId: formData.assigneeId,
      hasTitle: !!formData.title.trim(),
      hasAssignee: !!formData.assigneeId
    });
    
    if (!formData.title.trim() || !formData.assigneeId) {
      console.log('❌ Validation failed - missing title or assignee');
      alert('Please fill in all required fields (title and assignee).');
      return;
    }

    if (designers.length === 0) {
      console.log('❌ Validation failed - no designers assigned to project');
      alert('No designers are assigned to this project. Please assign designers to the project first.');
      return;
    }

    setLoading(true);

    try {
      const assignee = designers.find(d => d.id === formData.assigneeId);
      console.log('👤 Selected assignee:', assignee);
      
      const taskData = {
        projectId: project.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        assigneeId: formData.assigneeId,
        assigneeName: assignee?.name || 'Unknown',
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        status: 'todo' as const,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
      };
      
      console.log('🚀 Creating task with data:', taskData);
      const newTask = await tasksApi.create(taskData);
      console.log('✅ Task created successfully:', newTask);

      // Create notification for task assignment
      await NotificationService.createTaskAssignedNotification(
        newTask.id,
        newTask.title,
        formData.assigneeId,
        project.name,
        currentUser.name
      );

      onTaskCreated();
    } catch (error) {
      console.error('❌ Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>{project.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe the task..."
            />
          </div>

          {/* Assignee */}
          <div>
            <Label htmlFor="assignee">Assign to Designer *</Label>
            <Select
              required
              value={formData.assigneeId}
              onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a designer..." />
              </SelectTrigger>
              <SelectContent>
                {designers.map((designer) => (
                  <SelectItem key={designer.id} value={designer.id}>
                    {designer.name} - {designer.role}
                    {designer.id === '3' ? ' (Login User)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {designers.length === 0 && (
              <p className="text-xs text-destructive mt-1">
                No designers assigned to this project. Please assign designers to the project first.
              </p>
            )}
          </div>

          {/* Selected Assignee Preview */}
          {formData.assigneeId && (
            <Card>
              <CardContent className="p-3">
                {(() => {
                  const selectedDesigner = designers.find(d => d.id === formData.assigneeId);
                  if (!selectedDesigner) return null;
                  
                  return (
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${getAvatarColor(selectedDesigner.name)} rounded-full flex items-center justify-center`}>
                        <span className="text-white font-medium text-xs">
                          {getInitials(selectedDesigner.name)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedDesigner.name}
                          {selectedDesigner.id === '3' && <span className="text-green-600"> (Can Login)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{selectedDesigner.role}</p>
                        <p className="text-xs text-blue-600">ID: {selectedDesigner.id}</p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Priority */}
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.title.trim() || !formData.assigneeId || designers.length === 0}
            className="flex-1"
            onClick={handleSubmit}
          >
            {loading ? 'Creating...' : designers.length === 0 ? 'No Designers Available' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}