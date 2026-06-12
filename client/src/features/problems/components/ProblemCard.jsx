import { Check, Trash2 } from 'lucide-react';
import TopicTags from '@/shared/components/TopicTags';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DifficultyBadge } from '@/shared/ui/badge';

// Mobile layout for a single problem.
const ProblemCard = ({ problem, expanded, onToggleTopics, onSetStatus, onRequestDelete }) => {
  const topics = problem.topics?.length
    ? problem.topics
    : (problem.pattern_name ? [problem.pattern_name] : []);

  return (
    <Card
      className={cn(
        'p-4 space-y-4',
        problem.status === 'solved' ? 'bg-emerald-500/[0.03]' : problem.status === 'attempted' ? 'bg-amber-500/[0.03]' : ''
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted-foreground mb-1">#{problem.leetcode_number}</div>
          <a href={problem.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-100 hover:text-emerald-400 transition-colors block">
            {problem.title}
          </a>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
          onClick={(e) => { e.stopPropagation(); onRequestDelete({ id: problem.id, title: problem.title }); }}
          title="Delete problem"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <DifficultyBadge difficulty={problem.difficulty} />
        <TopicTags
          topics={topics}
          expanded={expanded}
          onToggle={() => onToggleTopics(problem.id)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
            problem.status === 'attempted'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-white/5 border-white/10 text-gray-300'
          )}
          onClick={() => onSetStatus(problem.id, problem.status === 'attempted' ? 'unsolved' : 'attempted')}
        >
          <span className={cn('w-4 h-4 rounded border flex items-center justify-center', problem.status === 'attempted' ? 'border-amber-400' : 'border-white/20')}>
            {problem.status === 'attempted' && <Check className="w-3 h-3" strokeWidth={3} />}
          </span>
          Attempted
        </button>
        <button
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
            problem.status === 'solved'
              ? 'bg-emerald-500 border-emerald-500 text-black'
              : 'bg-white/5 border-white/10 text-gray-300'
          )}
          onClick={() => onSetStatus(problem.id, problem.status === 'solved' ? 'unsolved' : 'solved')}
        >
          <span className={cn('w-4 h-4 rounded border flex items-center justify-center', problem.status === 'solved' ? 'border-black/20' : 'border-white/20')}>
            {problem.status === 'solved' && <Check className="w-3 h-3" strokeWidth={3} />}
          </span>
          Solved
        </button>
      </div>
    </Card>
  );
};

export default ProblemCard;
