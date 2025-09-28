'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { designersApi } from '@/lib/api/designers';
import { X, CalendarIcon, UserIcon, AlertCircleIcon } from 'lucide-react';

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
        const designersList = await designersApi.getAll();
        console.log('📋 Designers from API:', designersList.length);
        
        const activeDesigners = designersList.filter(d => d.status === 'active');
        console.log('✅ Active designers:', activeDesigners.length);
        
        console.log('👥 Active designers available:', activeDesigners.length);
        setDesigners(activeDesigners);
      } catch (error) {
        console.error('❌ Error loading designers:', error);
      }
    };

    loadDesigners();
  }, []);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-black">Create New Task</h3>
            <p className="text-sm text-gray-600">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
              placeholder="Enter task title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
              rows={3}
              placeholder="Describe the task..."
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Designer *
            </label>
            <select
              required
              value={formData.assigneeId}
              onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
            >
              <option value="">Select a designer...</option>
              {designers.map((designer) => (
                <option key={designer.id} value={designer.id}>
                  {designer.name} - {designer.role}
                  {designer.id === '3' ? ' (Login User)' : ''}
                </option>
              ))}
            </select>
            
            {designers.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                No designers found. Using fallback option.
              </p>
            )}
          </div>

          {/* Selected Assignee Preview */}
          {formData.assigneeId && (
            <div className="p-3 bg-gray-50 rounded-md">
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
                      <p className="text-sm font-medium text-gray-900">
                        {selectedDesigner.name}
                        {selectedDesigner.id === '3' && <span className="text-green-600"> (Can Login)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{selectedDesigner.role}</p>
                      <p className="text-xs text-blue-600">ID: {selectedDesigner.id}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.assigneeId}
              className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}