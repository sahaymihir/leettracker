import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Heatmap from '../components/Heatmap';

function hasVisibleHeatmapActivity(data, year) {
  const entries = Object.entries(data || {}).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    return false;
  }

  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    return entries.some(([date]) => date.startsWith(`${year}-`));
  }

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 364);

  return entries.some(([date]) => {
    const dateObj = new Date(`${date}T00:00:00`);
    return dateObj >= startDate && dateObj <= endDate;
  });
}

function getBestHeatmapYear(data) {
  const currentYear = new Date().getFullYear();
  if (hasVisibleHeatmapActivity(data, currentYear)) {
    return currentYear;
  }

  const years = Object.entries(data || {})
    .filter(([, count]) => count > 0)
    .map(([date]) => Number(date.slice(0, 4)))
    .filter(Number.isFinite);

  return years.length > 0 ? Math.max(...years) : currentYear;
}

function getLeetCodeUrl(problem) {
  if (problem.url) {
    return problem.url;
  }

  const searchTerm = problem.leetcode_number || problem.title || '';
  return `https://leetcode.com/problemset/all/?search=${encodeURIComponent(searchTerm)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  const d = Math.floor(diff / day);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// Current consecutive-day streak + total active days from the heatmap.
function computeStreak(heatmapData) {
  const days = new Set(
    Object.entries(heatmapData || {})
      .filter(([, count]) => count > 0)
      .map(([date]) => date)
  );
  if (days.size === 0) return { current: 0, activeDays: 0 };

  const key = (d) => d.toISOString().slice(0, 10);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Allow the streak to count even if today has no solve yet.
  if (!days.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let current = 0;
  while (days.has(key(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, activeDays: days.size };
}

const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 };
const DIFFICULTY_COLOR = {
  Easy: { text: 'text-sky-400', bar: 'bg-sky-400', dot: 'bg-sky-400' },
  Medium: { text: 'text-amber-400', bar: 'bg-amber-400', dot: 'bg-amber-400' },
  Hard: { text: 'text-rose-400', bar: 'bg-rose-400', dot: 'bg-rose-400' },
};

const cardBase = 'rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm';

function SectionLabel({ children, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{children}</h2>
      {hint && <span className="text-xs text-gray-600">{hint}</span>}
    </div>
  );
}

function StatCard({ label, value, sub, accentText, accentBg, icon, delay = 0 }) {
  return (
    <div
      className={`${cardBase} p-5 sm:p-6 animate-rise hover:bg-white/[0.05] transition-colors`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
        <span className={`p-1.5 rounded-lg ${accentBg} ${accentText}`}>{icon}</span>
      </div>
      <div className="mt-4 text-3xl font-bold text-white tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-sm text-gray-500">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState({});
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [patternHeatmap, setPatternHeatmap] = useState(null);
  const [showAllPatterns, setShowAllPatterns] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applyHeatmapData = (nextHeatmapData) => {
      if (!isMounted) {
        return;
      }

      setHeatmapData(nextHeatmapData);
      setSelectedYear((prevYear) => (
        hasVisibleHeatmapActivity(nextHeatmapData, prevYear)
          ? prevYear
          : getBestHeatmapYear(nextHeatmapData)
      ));
    };

    const loadFallbackHeatmap = async () => {
      try {
        const heatmapRes = await api.getCached('/dashboard/heatmap?groupId=me', {}, 30000);
        applyHeatmapData(heatmapRes.data || {});
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setHeatmapLoading(false);
        }
      }
    };

    api.getCached('/dashboard', {}, 15000)
      .then((dashRes) => {
        if (!isMounted) {
          return;
        }

        const nextStats = dashRes.data || {};
        const initialHeatmapData = nextStats.heatmapData || {};

        setStats(nextStats);
        setPatternHeatmap(nextStats.patternHeatmap || null);

        if (Object.keys(initialHeatmapData).length > 0) {
          applyHeatmapData(initialHeatmapData);
          setHeatmapLoading(false);
        } else {
          loadFallbackHeatmap();
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setHeatmapLoading(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const streak = useMemo(() => computeStreak(heatmapData), [heatmapData]);

  const difficultyStats = useMemo(() => {
    return [...(stats?.difficultyStats || [])].sort(
      (a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9)
    );
  }, [stats]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="flex items-center justify-center min-h-[50vh] text-red-400">Failed to load dashboard</div>;
  }

  const totalSolved = stats.totalSolved || 0;
  const totalAttempted = stats.totalAttempted || 0;
  const totalProblems = stats.totalProblems || 0;
  const remaining = Math.max(totalProblems - totalSolved, 0);
  const totalPercent = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;
  const ringCircumference = 2 * Math.PI * 42;

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const allPatterns = patternHeatmap?.allPatterns || [];
  const visiblePatterns = showAllPatterns ? allPatterns : allPatterns.slice(0, 8);

  const isEmpty = totalProblems === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-12 space-y-12">
      {/* Greeting */}
      <header className="animate-fade-in">
        <p className="text-sm text-gray-500">{todayLabel}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-white tracking-tight">
          {getGreeting()}{user?.username ? `, ${user.username}` : ''}
        </h1>
        <p className="text-gray-400 mt-2">
          {isEmpty
            ? 'Start tracking problems to see your progress here.'
            : `You've solved ${totalSolved} of ${totalProblems} tracked problems.`}
        </p>
      </header>

      {isEmpty ? (
        <div className={`${cardBase} p-12 flex flex-col items-center text-center animate-rise`}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No data yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm">Add problems or import your LeetCode history to build your dashboard.</p>
          <button
            onClick={() => navigate('/problems')}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            Go to Problems
          </button>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                label="Solved"
                value={totalSolved}
                sub={`${totalPercent}% of tracked`}
                accentText="text-emerald-400"
                accentBg="bg-emerald-500/10"
                delay={0}
                icon={(
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              />
              <StatCard
                label="Attempted"
                value={totalAttempted}
                sub="in progress"
                accentText="text-amber-400"
                accentBg="bg-amber-500/10"
                delay={60}
                icon={(
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
              />
              <StatCard
                label="Remaining"
                value={remaining}
                sub="left to solve"
                accentText="text-indigo-400"
                accentBg="bg-indigo-500/10"
                delay={120}
                icon={(
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
              />
              <StatCard
                label="Day streak"
                value={streak.current}
                sub={`${streak.activeDays} active days`}
                accentText="text-orange-400"
                accentBg="bg-orange-500/10"
                delay={180}
                icon={(
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 12.48Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
                  </svg>
                )}
              />
            </div>
          </section>

          {/* Overview: completion + difficulty */}
          <section>
            <SectionLabel hint={`${totalSolved}/${totalProblems} solved`}>Overview</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Completion donut */}
              <div className={`${cardBase} p-6 sm:p-8 flex flex-col items-center justify-center animate-rise`}>
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" className="stroke-white/[0.06]" strokeWidth="7" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      className="stroke-emerald-500"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${(totalPercent / 100) * ringCircumference} ${ringCircumference}`}
                      style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)' }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold text-white tabular-nums">{totalPercent}%</span>
                    <span className="text-xs text-gray-500 mt-0.5">complete</span>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-6 text-center">
                  <div>
                    <div className="text-lg font-bold text-emerald-400 tabular-nums">{totalSolved}</div>
                    <div className="text-xs text-gray-500">Solved</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <div className="text-lg font-bold text-gray-300 tabular-nums">{totalProblems}</div>
                    <div className="text-xs text-gray-500">Tracked</div>
                  </div>
                </div>
              </div>

              {/* Difficulty breakdown */}
              <div className={`${cardBase} p-6 sm:p-8 lg:col-span-2 animate-rise`} style={{ animationDelay: '80ms' }}>
                <h3 className="text-sm font-medium text-gray-300 mb-6">By difficulty</h3>
                {difficultyStats.length === 0 ? (
                  <p className="text-sm text-gray-500">No difficulty data.</p>
                ) : (
                  <div className="space-y-6">
                    {difficultyStats.map((d) => {
                      const colors = DIFFICULTY_COLOR[d.difficulty] || DIFFICULTY_COLOR.Medium;
                      const percent = d.total > 0 ? Math.round((d.solved / d.total) * 100) : 0;
                      return (
                        <div key={d.difficulty}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-300">
                              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                              {d.difficulty}
                            </span>
                            <span className="text-sm text-gray-500 tabular-nums">
                              <span className={`font-semibold ${colors.text}`}>{d.solved}</span>
                              {' / '}{d.total}
                              <span className="ml-2 text-gray-600">{percent}%</span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Activity graph */}
          <section>
            <SectionLabel hint="Daily solves">Activity</SectionLabel>
            <div className={`${cardBase} p-4 sm:p-6 min-h-[280px] animate-rise`}>
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  const isActive = selectedYear === year;
                  return (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`text-xs font-medium transition-all duration-200 px-3 py-1.5 rounded-lg border ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>

              {heatmapLoading ? (
                <div className="flex items-center justify-center text-gray-400 h-full py-20">Loading activity...</div>
              ) : (
                <Heatmap data={heatmapData} year={selectedYear} />
              )}
            </div>
          </section>

          {/* Pattern focus */}
          {patternHeatmap && (patternHeatmap.strongest || patternHeatmap.weakest || patternHeatmap.neglected) && (
            <section>
              <SectionLabel hint="Where to focus next">Pattern focus</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                  {
                    data: patternHeatmap.strongest,
                    label: 'Strongest',
                    accent: 'text-emerald-400',
                    bg: 'bg-emerald-500/10',
                    bar: 'bg-emerald-500',
                    icon: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
                  },
                  {
                    data: patternHeatmap.weakest,
                    label: 'Needs work',
                    accent: 'text-amber-400',
                    bg: 'bg-amber-500/10',
                    bar: 'bg-amber-500',
                    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                  },
                  {
                    data: patternHeatmap.neglected,
                    label: 'Neglected',
                    accent: 'text-gray-400',
                    bg: 'bg-gray-500/10',
                    bar: 'bg-gray-500',
                    icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
                  },
                ].filter(({ data }) => data).map(({ data, label, accent, bg, bar, icon }, idx) => (
                  <div
                    key={label}
                    className={`${cardBase} p-6 animate-rise`}
                    style={{ animationDelay: `${idx * 70}ms` }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`p-1.5 rounded-lg ${bg} ${accent}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                        </svg>
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
                    </div>
                    <div className="text-lg font-bold text-white truncate" title={data.pattern}>{data.pattern}</div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500 tabular-nums">{data.solved}/{data.total}</span>
                      <span className={`font-semibold ${accent} tabular-nums`}>{data.percent}%</span>
                    </div>
                    <div className="mt-2 w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${data.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recently solved + Groups */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            {/* Recently solved */}
            <div>
              <SectionLabel>Recently solved</SectionLabel>
              {stats.recentSolved && stats.recentSolved.length > 0 ? (
                <div className={`${cardBase} divide-y divide-white/[0.05] overflow-hidden animate-rise`}>
                  {stats.recentSolved.slice(0, 8).map((p) => (
                    <a
                      key={p.leetcode_number}
                      href={getLeetCodeUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open ${p.title} on LeetCode`}
                      className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="text-emerald-400 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                      <span className="text-gray-600 font-mono text-xs w-10 flex-shrink-0">#{p.leetcode_number}</span>
                      <span className="font-medium text-gray-200 flex-1 min-w-0 truncate group-hover:text-white transition-colors">{p.title}</span>
                      {p.solved_at && <span className="text-xs text-gray-600 flex-shrink-0 hidden sm:block">{timeAgo(p.solved_at)}</span>}
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                        p.difficulty === 'Easy' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                        p.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {p.difficulty}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className={`${cardBase} p-8 text-center text-sm text-gray-500 animate-rise`}>
                  No solved problems yet.
                </div>
              )}
            </div>

            {/* Groups */}
            <div>
              <SectionLabel hint={stats.groupStats?.length ? `${stats.groupStats.length} groups` : undefined}>Groups</SectionLabel>
              {stats.groupStats && stats.groupStats.length > 0 ? (
                <div className="space-y-3">
                  {stats.groupStats.map((g, idx) => {
                    const percent = g.total_problems > 0 ? Math.round((g.solved_problems / g.total_problems) * 100) : 0;
                    return (
                      <button
                        key={g.id}
                        onClick={() => navigate(`/groups/${g.id}`)}
                        className={`${cardBase} w-full text-left p-5 transition-colors hover:bg-white/[0.05] animate-rise`}
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-white truncate">{g.name}</h3>
                          <span className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z" />
                            </svg>
                            {g.member_count}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">{g.solved_problems}/{g.total_problems}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`${cardBase} p-8 text-center text-sm text-gray-500 animate-rise`}>
                  You're not in any groups yet.
                </div>
              )}
            </div>
          </section>

          {/* Topic mastery */}
          {allPatterns.length > 0 && (
            <section>
              <SectionLabel hint={`${allPatterns.length} topics`}>Topic mastery</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {visiblePatterns.map((p, idx) => {
                  const barColor = p.percent >= 80 ? 'bg-emerald-500' : p.percent >= 50 ? 'bg-indigo-400' : 'bg-amber-500';
                  return (
                    <div
                      key={p.pattern}
                      className={`${cardBase} p-4 sm:p-5 animate-rise`}
                      style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-medium text-sm text-gray-200 truncate" title={p.pattern}>{p.pattern}</span>
                        <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">{p.solved}/{p.total}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${p.percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {allPatterns.length > 8 && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setShowAllPatterns(v => !v)}
                    className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium text-gray-300"
                  >
                    {showAllPatterns ? 'Show less' : `Show all ${allPatterns.length} topics`}
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
