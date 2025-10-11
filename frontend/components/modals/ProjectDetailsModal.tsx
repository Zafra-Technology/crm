'use client';

import { X, Calendar, User, FileText, Clock, Building, Home, Mail, Phone } from 'lucide-react';
import { Project } from '@/types';
import { User as APIUser } from '@/lib/api/auth';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  clientInfo?: APIUser | null;
}

export default function ProjectDetailsModal({ 
  isOpen, 
  onClose, 
  project,
  clientInfo
}: ProjectDetailsModalProps) {

  if (!isOpen || !project) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Project Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Project Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">{project.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  {project.projectType === 'commercial' ? (
                    <Building size={16} className="text-blue-600" />
                  ) : (
                    <Home size={16} className="text-green-600" />
                  )}
                  <span className="capitalize">{project.projectType}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} className="text-gray-500" />
                  <span>Created {formatDate(project.createdAt)}</span>
                </div>
              </div>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              Pending Review
            </span>
          </div>

          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Timeline
                </label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{project.timeline || 'Not specified'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="inline w-4 h-4 mr-1" />
                  Client Information
                </label>
                <div className="bg-gray-50 p-3 rounded-md">
                  {clientInfo ? (
                    <div className="space-y-2">
                      <p className="text-gray-900 font-medium">{clientInfo.full_name || `${clientInfo.first_name} ${clientInfo.last_name}`.trim()}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail size={12} />
                          <span>{clientInfo.email}</span>
                        </div>
                        {clientInfo.mobile_number && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone size={12} />
                            <span>{clientInfo.mobile_number}</span>
                          </div>
                        )}
                        {clientInfo.company_name && (
                          <p className="text-sm text-gray-600">{clientInfo.company_name}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Client ID: {project.clientId || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="inline w-4 h-4 mr-1" />
                  Project Type
                </label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md capitalize">
                  {project.projectType || 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Last Updated
                </label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatDate(project.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Description
            </label>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {project.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Requirements */}
          {project.requirements && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirements
              </label>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {project.requirements}
                </p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {project.attachments && project.attachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Attachments
              </label>
              <div className="space-y-2">
                {project.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)} • Uploaded {formatDate(attachment.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-6 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
