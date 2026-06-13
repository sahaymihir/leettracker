import { Plus, Loader2, FileText, Sparkles, Check } from 'lucide-react';
import { BLANK_PACK } from '@/features/groups/constants';
import { cn } from '@/shared/lib/utils';
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

const PackCard = ({ selected, onClick, icon, title, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors',
      selected
        ? 'border-indigo-500/60 bg-indigo-500/10'
        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
    )}
  >
    {selected && (
      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white">
        <Check className="h-3 w-3" />
      </span>
    )}
    <span className={cn(selected ? 'text-indigo-300' : 'text-muted-foreground')}>{icon}</span>
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </button>
);

const CreateGroupDialog = ({
  open,
  onClose,
  groupName,
  setGroupName,
  error,
  creating,
  starterPacks = [],
  selectedPack,
  setSelectedPack,
  onCreate,
}) => (
  <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogDescription>Invite friends and track problems together.</DialogDescription>
      </DialogHeader>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="group-name">Group Name</Label>
        <Input
          id="group-name"
          type="text"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          placeholder="e.g. Blind 75 Squad"
          onKeyDown={e => e.key === 'Enter' && onCreate()}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Start with</Label>
        <div className="grid grid-cols-3 gap-2">
          <PackCard
            selected={selectedPack === BLANK_PACK}
            onClick={() => setSelectedPack(BLANK_PACK)}
            icon={<FileText className="h-5 w-5" />}
            title="Blank group"
            subtitle="Add problems later"
          />
          {starterPacks.map(pack => (
            <PackCard
              key={pack.id}
              selected={selectedPack === pack.id}
              onClick={() => setSelectedPack(pack.id)}
              icon={<Sparkles className="h-5 w-5" />}
              title={pack.name}
              subtitle={`${pack.count} problems`}
            />
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={creating}>Cancel</Button>
        <Button onClick={onCreate} disabled={!groupName.trim() || creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {creating ? 'Creating...' : 'Create'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CreateGroupDialog;
