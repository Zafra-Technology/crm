'use client';

import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false
}: ConfirmModalProps) {
  const typeStyles = {
    danger: {
      icon: 'text-destructive',
      iconBg: 'bg-destructive/10',
      buttonVariant: 'destructive' as const
    },
    warning: {
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      buttonVariant: 'default' as const
    },
    info: {
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      buttonVariant: 'default' as const
    }
  };

  const currentStyle = typeStyles[type];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className={`w-12 h-12 ${currentStyle.iconBg} rounded-full flex items-center justify-center mb-4`}>
              <AlertTriangleIcon size={24} className={currentStyle.icon} />
            </div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-2">
              {message}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="flex space-x-3">
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={currentStyle.buttonVariant}
            className="flex-1"
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}