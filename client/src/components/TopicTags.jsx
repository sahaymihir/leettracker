// Compact, collapsible topic tags. Collapsed by default to a single count pill
// so the topics never dominate a problem row; expands inline on click.
export default function TopicTags({ topics = [], expanded, onToggle, emptyLabel }) {
  if (!topics.length) {
    return emptyLabel ? <span className="text-xs text-gray-500">{emptyLabel}</span> : null;
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
        title="Show topics"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
        </svg>
        {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
      </button>
    );
  }

  return (
    <>
      {topics.map(topic => (
        <span
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20"
          key={topic}
        >
          {topic}
        </span>
      ))}
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
        Hide
      </button>
    </>
  );
}
