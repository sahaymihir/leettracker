import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';

const DeleteProblemDialog = ({ deleteTarget, onCancel, onConfirm }) => (
  <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) onCancel(); }}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete problem?</DialogTitle>
        <DialogDescription>
          This removes <span className="text-foreground font-medium">"{deleteTarget?.title}"</span> from your tracker. This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DeleteProblemDialog;
