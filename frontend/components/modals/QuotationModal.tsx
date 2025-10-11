'use client';

import { useState, useRef } from 'react';
import { X, Upload, Paperclip } from 'lucide-react';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quotationMessage: string, quotationFile?: File) => void;
  loading?: boolean;
}

export default function QuotationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false 
}: QuotationModalProps) {
  const [quotationMessage, setQuotationMessage] = useState('');
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quotationMessage.trim()) {
      onSubmit(quotationMessage.trim(), quotationFile || undefined);
      setQuotationMessage('');
      setQuotationFile(null);
    }
  };

  const handleClose = () => {
    setQuotationMessage('');
    setQuotationFile(null);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size too large. Please select a file smaller than 10MB.');
        return;
      }
      setQuotationFile(file);
    }
  };

  const removeFile = () => {
    setQuotationFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Accept Project & Submit Quotation</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quotation Message *
            </label>
            <textarea
              value={quotationMessage}
              onChange={(e) => setQuotationMessage(e.target.value)}
              required
              rows={4}
              placeholder="Please provide your quotation details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quotation File (Optional)
            </label>
            <div className="space-y-3">
              {!quotationFile ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-3 pb-4">
                      <Upload className="w-6 h-6 mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> quotation file
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, etc. (MAX. 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{quotationFile.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(quotationFile.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
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
              type="submit"
              disabled={loading || !quotationMessage.trim()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? 'Accepting...' : 'Accept & Submit Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
