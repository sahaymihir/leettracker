import { Plus, FileQuestion } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import ProblemCard from '@/features/problems/components/ProblemCard';
import ProblemTableRow, { PROBLEM_ROW_GRID } from '@/features/problems/components/ProblemTableRow';

// Presentational list: handles the loading, empty, mobile-card and desktop-table
// states plus the "show more" pager. All behaviour is passed in as callbacks.
const ProblemList = ({
  loading,
  totalCount,
  visibleProblems,
  hasMoreProblems,
  expandedTopics,
  onToggleTopics,
  onSetStatus,
  onRequestDelete,
  onShowMore,
  onAddProblem,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No problems found</h3>
        <p className="text-muted-foreground mb-6">Add your first problem or adjust your filters.</p>
        <Button onClick={onAddProblem}>
          <Plus className="h-4 w-4" />
          Add Problem
        </Button>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {visibleProblems.map((p) => (
          <ProblemCard
            key={p.id}
            problem={p}
            expanded={expandedTopics[p.id]}
            onToggleTopics={onToggleTopics}
            onSetStatus={onSetStatus}
            onRequestDelete={onRequestDelete}
          />
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-hidden">
        <div className={cn('grid gap-4 p-4 border-b border-white/[0.08] text-[11px] font-semibold text-muted-foreground bg-white/[0.03] uppercase tracking-wider', PROBLEM_ROW_GRID)}>
          <span className="text-center">Attempted</span>
          <span className="text-center">Solved</span>
          <span>#</span>
          <span>Title</span>
          <span>Difficulty</span>
          <span>Topics</span>
          <span className="text-center">Del</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {visibleProblems.map((p) => (
            <ProblemTableRow
              key={p.id}
              problem={p}
              expanded={expandedTopics[p.id]}
              onToggleTopics={onToggleTopics}
              onSetStatus={onSetStatus}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
      </Card>

      {hasMoreProblems && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button variant="outline" onClick={onShowMore}>
            Show more
          </Button>
          <span className="text-xs text-muted-foreground">
            Showing {visibleProblems.length} of {totalCount}
          </span>
        </div>
      )}
    </>
  );
};

export default ProblemList;
