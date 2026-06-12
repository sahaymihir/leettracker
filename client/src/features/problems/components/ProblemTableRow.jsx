import { Trash2 } from 'lucide-react';
import TopicTags from '@/shared/components/TopicTags';
import { StatusCheckbox } from '@/shared/components/StatusControls';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { DifficultyBadge } from '@/shared/ui/badge';

export const PROBLEM_ROW_GRID =
  'grid-cols-[110px_110px_60px_minmax(220px,1fr)_100px_minmax(150px,1fr)_48px]';

// Desktop table row for a single problem.
const ProblemTableRow = ({ problem, expanded, onToggleTopics, onSetStatus, onRequestDelete }) => {
  const topics = problem.topics?.length
    ? problem.topics
    : (problem.pattern_name ? [problem.pattern_name] : []);

  return (
    <div
      className={cn(
        'grid gap-4 p-4 items-center transition-colors hover:bg-white/[0.04]',
        PROBLEM_ROW_GRID,
        problem.status === 'solved' ? 'bg-emerald-500/[0.02]' : problem.status === 'attempted' ? 'bg-amber-500/[0.02]' : ''
      )}
    >
      <div className="flex justify-center flex-shrink-0">
        <StatusCheckbox
          active={problem.status === 'attempted'}
          kind="attempted"
          onClick={() => onSetStatus(problem.id, problem.status === 'attempted' ? 'unsolved' : 'attempted')}
          title={problem.status === 'attempted' ? 'Mark unattempted' : 'Mark attempted'}
        />
      </div>
      <div className="flex justify-center flex-shrink-0">
        <StatusCheckbox
          active={problem.status === 'solved'}
          kind="solved"
          onClick={() => onSetStatus(problem.id, problem.status === 'solved' ? 'unsolved' : 'solved')}
          title={problem.status === 'solved' ? 'Mark unsolved' : 'Mark solved'}
        />
      </div>
      <span className="font-mono text-muted-foreground text-sm">#{problem.leetcode_number}</span>
      <span className="truncate">
        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-200 hover:text-emerald-400 transition-colors">
          {problem.title}
        </a>
      </span>
      <span>
        <DifficultyBadge difficulty={problem.difficulty} />
      </span>
      <div className="flex flex-wrap gap-2 pr-2">
        <TopicTags
          topics={topics}
          expanded={expanded}
          onToggle={() => onToggleTopics(problem.id)}
        />
      </div>
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10"
          onClick={(e) => { e.stopPropagation(); onRequestDelete({ id: problem.id, title: problem.title }); }}
          title="Delete problem"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProblemTableRow;
