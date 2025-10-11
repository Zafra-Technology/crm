'use client';

import { X, MessageSquare } from 'lucide-react';

interface ViewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  feedbackMessage: string;
}

export default function ViewFeedbackModal({ 
  isOpen, 
  onClose, 
  projectName,
  feedbackMessage 
}: ViewFeedbackModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Project Feedback</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-md font-medium">
              {projectName}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="inline w-4 h-4 mr-1" />
              Feedback Message
            </label>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {feedbackMessage || 'No feedback message provided.'}
              </p>
            </div>
          </div>

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
