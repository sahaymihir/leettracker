import { useState, useEffect } from 'react';
import { Sparkles, Loader2, ListChecks } from 'lucide-react';
import { listStarterLists } from '@/features/groups/services/groupsApi';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';

// One-click import of a curated problem set (Blind 75, NeetCode 150) so a new
// group starts with content instead of an empty table. The catalog is fetched
// from the API; importing delegates to the parent's onImport handler.
const StarterListDialog = ({ open, onClose, onImport }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importingId, setImportingId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setImportingId(null);
    setLoading(true);
    listStarterLists()
      .then((res) => setLists(res.data))
      .catch(() => setError('Failed to load starter lists.'))
      .finally(() => setLoading(false));
  }, [open]);

  const handleImport = async (list) => {
    setImportingId(list.id);
    setError('');
    try {
      const result = await onImport(list);
      if (result !== false) onClose();
    } catch {
      setError('Failed to import this list.');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !importingId) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Add a starter list
          </DialogTitle>
          <DialogDescription>
            Import a curated problem set so your group has content from day one.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading lists...
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="font-semibold text-white truncate">{list.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{list.count} problems</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleImport(list)}
                  disabled={!!importingId}
                >
                  {importingId === list.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StarterListDialog;
