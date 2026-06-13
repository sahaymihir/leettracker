import { Search, Loader2, FolderOpen } from 'lucide-react';
import { useAddFromProblemset } from '@/features/groups/hooks/useAddFromProblemset';
import ProblemRow from '@/features/groups/components/ProblemRow';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';

const AddFromProblemsetModal = ({ isOpen, onClose, onAddProblem, onAddProblems, existingProblems = [] }) => {
  const {
    loading,
    filteredProblems,
    existingSet,
    selectableProblems,
    hasAddableProblems,
    searchQuery,
    setSearchQuery,
    selectedIds,
    selectedCount,
    toggleSelected,
    selectVisible,
    clearSelection,
    isSubmitting,
    error,
    confirmCount,
    cancelConfirm,
    handleConfirmedAdd,
    handleAddAll,
    handleAddCurrentSelection,
  } = useAddFromProblemset({ isOpen, onClose, onAddProblems, existingProblems });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-3xl p-0 gap-0 flex flex-col max-h-[85vh]">
          <DialogHeader className="px-6 py-5 border-b border-white/[0.08]">
            <DialogTitle className="flex items-center gap-2.5">
              <FolderOpen className="w-5 h-5 text-indigo-400" />
              Select Problems From Your Problemset
            </DialogTitle>
            <DialogDescription>
              Quickly add problems you've already tracked directly into this group.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pt-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                type="text"
                className="pl-10"
                placeholder="Search your problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-sm text-muted-foreground">
                {selectedCount} selected · {selectableProblems.length} available in this view
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectVisible}
                  disabled={!selectableProblems.length || isSubmitting}
                >
                  Select Visible
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={!selectedCount || isSubmitting}
                >
                  Clear
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  onClick={handleAddAll}
                  disabled={!hasAddableProblems || isSubmitting}
                >
                  Add All Not Added
                </Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500"
                  onClick={handleAddCurrentSelection}
                  disabled={!selectedCount || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSubmitting ? 'Adding...' : `Add Selected (${selectedCount})`}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-[300px] px-6 pb-6 pt-2">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-3 text-muted-foreground text-sm py-12">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                Loading problemset...
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm py-12">
                No problems found matching your search.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] overflow-hidden">
                {filteredProblems.map(prob => {
                  const topics = prob.topics || (prob.pattern_name ? [prob.pattern_name] : []);

                  return (
                    <ProblemRow
                      key={prob.id}
                      problem={{ ...prob, topics }}
                      isAdded={existingSet.has(prob.id)}
                      isSelected={selectedIds.includes(prob.id)}
                      onToggleSelect={toggleSelected}
                      onAdd={onAddProblem}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm bulk add */}
      <Dialog open={confirmCount !== null} onOpenChange={(open) => { if (!open) cancelConfirm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to group?</DialogTitle>
            <DialogDescription>
              Add {confirmCount} problem{confirmCount === 1 ? '' : 's'} to this group?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancelConfirm}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={handleConfirmedAdd}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddFromProblemsetModal;
