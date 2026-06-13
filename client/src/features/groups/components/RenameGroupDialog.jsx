import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';

const RenameGroupDialog = ({
  open,
  onClose,
  value,
  setValue,
  error,
  isRenaming,
  onRename,
}) => (
  <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Rename Group</DialogTitle>
        <DialogDescription>Update the group name everyone sees.</DialogDescription>
      </DialogHeader>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="rename-group">Group Name</Label>
        <Input
          id="rename-group"
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onRename()}
          autoFocus
        />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={isRenaming}>Cancel</Button>
        <Button onClick={onRename} disabled={!value.trim() || isRenaming}>
          {isRenaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          {isRenaming ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default RenameGroupDialog;
