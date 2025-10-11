'use client';

import { useState } from 'react';
import { X, Check, XCircle, Download, FileText, Eye, Paperclip } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api/auth';

interface QuotationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: (feedback: string) => void;
  quotationMessage: string;
  quotationFile?: string;
  loading?: boolean;
}

export default function QuotationReviewModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  onReject, 
  quotationMessage,
  quotationFile,
  loading = false 
}: QuotationReviewModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  const handleAccept = () => {
    onAccept();
    onClose();
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectFeedback.trim()) {
      onReject(rejectFeedback.trim());
      setRejectFeedback('');
      setShowRejectForm(false);
      onClose();
    }
  };

  const handleClose = () => {
    setShowRejectForm(false);
    setRejectFeedback('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Quotation Review</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {!showRejectForm ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quotation Details:
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotationMessage}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quotation File:
              </label>
              {quotationFile ? (
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Paperclip className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {quotationFile.split('/').pop() || 'Quotation File'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Quotation document
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const url = resolveMediaUrl(quotationFile);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Preview file"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const url = resolveMediaUrl(quotationFile);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = quotationFile.split('/').pop() || 'quotation';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Download file"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
                  <div className="flex items-center justify-center space-x-2 text-gray-500">
                    <FileText size={16} />
                    <span className="text-sm">No quotation file attached</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                Reject
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Accept
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Feedback *
              </label>
              <textarea
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                required
                rows={4}
                placeholder="Please provide your feedback for rejecting this quotation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                disabled={loading}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !rejectFeedback.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
