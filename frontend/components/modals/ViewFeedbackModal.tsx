'use client';

import { MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Feedback</DialogTitle>
          <DialogDescription>
            View feedback details for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Project Name</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant="secondary" className="text-sm font-medium">
                {projectName}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Feedback Message
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {feedbackMessage || 'No feedback message provided.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
