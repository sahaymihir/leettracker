import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'syncTargetGroups';

function loadSavedGroupIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSyncGroupIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

const CONSOLE_SCRIPT = `(async () => {
  console.log('LeetTracker: Fetching solved and attempted problems...');

  const apiResp = await fetch('/api/problems/all/', {
    headers: { 'Content-Type': 'application/json' }
  });
  const apiJson = await apiResp.json();

  if (!apiJson.stat_status_pairs) {
    console.error('LeetTracker: Failed to fetch problems. Are you logged in?');
    return;
  }

  const allSlugs = new Set(
    apiJson.stat_status_pairs
      .filter(p => p.status === 'ac')
      .map(p => p.stat.question__title_slug)
  );
  console.log(\`LeetTracker: Found \${allSlugs.size} solved problems.\`);

  const subQuery = \`query submissionList($offset: Int!, $limit: Int!) {
    submissionList(offset: $offset, limit: $limit) {
      hasNext submissions { titleSlug statusDisplay timestamp }
    }
  }\`;

  const solvedDateMap = {};
  const attemptedDateMap = {};
  let offset = 0, hasNext = true, page = 1;

  while (hasNext) {
    console.log(\`LeetTracker: Fetching dates page \${page}...\`);
    const resp = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: subQuery, variables: { offset, limit: 50 } })
    });
    const json = await resp.json();
    const list = json?.data?.submissionList;
    if (!list) break;

    for (const sub of list.submissions) {
      if (!sub?.titleSlug) continue;

      if (sub.statusDisplay === 'Accepted') {
        if (!solvedDateMap[sub.titleSlug]) {
          solvedDateMap[sub.titleSlug] = sub.timestamp;
        }
      } else if (!attemptedDateMap[sub.titleSlug]) {
        attemptedDateMap[sub.titleSlug] = sub.timestamp;
      }
    }

    hasNext = list.hasNext;
    offset += 50;
    page++;
    if (hasNext) await new Promise(r => setTimeout(r, 400));
  }

  const fallbackTs = Math.floor(Date.now() / 1000).toString();
  const solvedMap = {};
  for (const slug of allSlugs)
    solvedMap[slug] = solvedDateMap[slug] || fallbackTs;

  const attemptedMap = {};
  for (const [slug, timestamp] of Object.entries(attemptedDateMap))
    if (!allSlugs.has(slug))
      attemptedMap[slug] = timestamp || fallbackTs;

  const withDates = Object.values(solvedMap).filter(t => t !== fallbackTs).length;
  console.log(\`LeetTracker: \${withDates}/\${allSlugs.size} have exact dates. Rest use today as fallback.\`);
  console.log(\`LeetTracker: Found \${Object.keys(attemptedMap).length} attempted-only problems.\`);

  const importPayload = {
    solvedMap,
    attemptedMap
  };

  // Prepare final JSON (pretty)
  const finalJson = JSON.stringify(importPayload, null, 2);

  // 1) Try modern clipboard API
  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(finalJson);
      console.log('LeetTracker: Successfully copied JSON to clipboard (navigator.clipboard).');
      copied = true;
    } catch (err) {
      console.warn('LeetTracker: navigator.clipboard failed:', err);
      copied = false;
    }
  }

  // 2) Fallback to document.execCommand copy attempt
  if (!copied) {
    try {
      const ta = document.createElement('textarea');
      ta.value = finalJson;
      // keep off-screen
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        console.log('LeetTracker: Successfully copied JSON to clipboard (execCommand).');
        copied = true;
      } else {
        console.warn('LeetTracker: execCommand copy returned false.');
      }
    } catch (err) {
      console.warn('LeetTracker: execCommand copy failed:', err);
    }
  }

  // 3) ALWAYS print to console for visibility
  console.log('LeetTracker: Final import JSON (copy manually if needed):');
  console.log(finalJson);

  // 4) Create visible panel with textarea + buttons so user can manually copy/select
  (function createCopyPanel() {
    // Avoid creating multiple panels if script run multiple times
    if (document.getElementById('leettracker-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'leettracker-panel';
    panel.style.position = 'fixed';
    panel.style.right = '12px';
    panel.style.bottom = '12px';
    panel.style.width = '420px';
    panel.style.maxWidth = 'calc(100% - 24px)';
    panel.style.zIndex = 999999;
    panel.style.background = 'white';
    panel.style.border = '1px solid rgba(0,0,0,0.12)';
    panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    panel.style.borderRadius = '8px';
    panel.style.padding = '10px';
    panel.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    panel.style.fontSize = '12px';
    panel.style.color = '#111';

    const title = document.createElement('div');
    title.textContent = 'LeetTracker — import JSON';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    panel.appendChild(title);

    const ta = document.createElement('textarea');
    ta.value = finalJson;
    ta.readOnly = true;
    ta.style.width = '100%';
    ta.style.height = '200px';
    ta.style.resize = 'vertical';
    ta.style.fontFamily = 'monospace';
    ta.style.fontSize = '11px';
    ta.style.lineHeight = '1.2';
    ta.style.padding = '8px';
    ta.style.boxSizing = 'border-box';
    panel.appendChild(ta);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '8px';
    btnRow.style.justifyContent = 'flex-end';

    const selectBtn = document.createElement('button');
    selectBtn.textContent = 'Select all';
    selectBtn.onclick = () => {
      ta.focus();
      ta.select();
    };
    selectBtn.style.cursor = 'pointer';
    selectBtn.style.padding = '6px 8px';
    selectBtn.style.borderRadius = '6px';
    selectBtn.style.border = '1px solid rgba(0,0,0,0.12)';
    selectBtn.style.background = '#fff';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = copied ? 'Copied' : 'Copy to clipboard';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.padding = '6px 8px';
    copyBtn.style.borderRadius = '6px';
    copyBtn.style.border = '1px solid rgba(0,0,0,0.12)';
    copyBtn.style.background = copied ? '#e6ffe6' : '#fff';
    copyBtn.onclick = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(ta.value);
        } else {
          ta.select();
          document.execCommand('copy');
        }
        copyBtn.textContent = 'Copied';
        copyBtn.style.background = '#e6ffe6';
        console.log('LeetTracker: User clicked copy — successful.');
      } catch (err) {
        console.error('LeetTracker: User clicked copy — failed:', err);
        copyBtn.textContent = 'Copy failed — select manually';
        copyBtn.style.background = '#ffe6e6';
      }
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '6px 8px';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.border = '1px solid rgba(0,0,0,0.12)';
    closeBtn.style.background = '#fff';
    closeBtn.onclick = () => panel.remove();

    btnRow.appendChild(selectBtn);
    btnRow.appendChild(copyBtn);
    btnRow.appendChild(closeBtn);
    panel.appendChild(btnRow);

    document.body.appendChild(panel);
  })();

})();`;

export default function LeetCodeImport({ onSuccess, onCancel }) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0); // 0: Method Selection, 1-3: Advanced, 4: Success, 5: Instant Setup
  const [importMethod, setImportMethod] = useState(null); // 'instant' or 'advanced'
  const [pastedData, setPastedData] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Instant Sync states
  const [tempUsername, setTempUsername] = useState(user?.leetcodeUsername || '');

  // Group selection states
  const [userGroups, setUserGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState(() => loadSavedGroupIds());
  const [showGroupConfig, setShowGroupConfig] = useState(false);

  // Fetch user's groups on mount
  useEffect(() => {
    api.getCached('/groups', {}, 15000)
      .then(res => {
        setUserGroups(res.data || []);
        // Prune stale group IDs
        const validIds = new Set((res.data || []).map(g => g.id));
        setSelectedGroupIds(prev => {
          const pruned = prev.filter(id => validIds.has(id));
          saveSyncGroupIds(pruned);
          return pruned;
        });
      })
      .catch(() => setUserGroups([]))
      .finally(() => setGroupsLoading(false));
  }, []);

  const toggleGroup = useCallback((groupId) => {
    setSelectedGroupIds(prev => {
      const next = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];
      saveSyncGroupIds(next);
      return next;
    });
  }, []);

  const toggleAllGroups = useCallback(() => {
    setSelectedGroupIds(prev => {
      const next = prev.length === userGroups.length
        ? []
        : userGroups.map(g => g.id);
      saveSyncGroupIds(next);
      return next;
    });
  }, [userGroups]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(CONSOLE_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstantSync = async (usernameToUse = tempUsername) => {
    const normalizedUsername = usernameToUse.trim();

    if (!normalizedUsername) {
      setError('Please enter your LeetCode username');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. If username is new, save it to profile first
      if (normalizedUsername !== user?.leetcodeUsername) {
        await api.put('/auth/me/leetcode-username', { leetcodeUsername: normalizedUsername });
        updateUser({ ...user, leetcodeUsername: normalizedUsername });
      }

      // 2. Trigger sync with groupIds
      const resp = await api.post('/leetcode/sync', {
        groupIds: selectedGroupIds,
      });
      const {
        newlyImported,
        attemptedImported = 0,
        alreadyTracked,
        totalFound,
        failed = 0,
        totalSolvedOnLeetCode = 0,
        recentSolvedFound = 0,
        recentAttemptedFound = 0,
        bestEffortAttempted = false,
        groupsUpdated = 0,
        groupsFailed = 0,
      } = resp.data;
      
      setResult({
        mode: 'recent-sync',
        solved: newlyImported,
        attempted: attemptedImported,
        alreadyExists: alreadyTracked,
        failed,
        total: totalFound,
        totalSolvedOnLeetCode,
        recentSolvedFound,
        recentAttemptedFound,
        bestEffortAttempted,
        groupsUpdated,
        groupsFailed,
      });
      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      setStep(5);
      setError(err.response?.data?.error || 'Sync failed. Check your username and privacy settings on LeetCode.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setError('');
    setLoading(true);

    let importPayload;
    try {
      const parsed = JSON.parse(pastedData.trim());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();

      if ('solvedMap' in parsed || 'attemptedMap' in parsed) {
        importPayload = {
          solvedMap: parsed.solvedMap && typeof parsed.solvedMap === 'object' && !Array.isArray(parsed.solvedMap)
            ? parsed.solvedMap
            : {},
          attemptedMap: parsed.attemptedMap && typeof parsed.attemptedMap === 'object' && !Array.isArray(parsed.attemptedMap)
            ? parsed.attemptedMap
            : {},
        };
      } else {
        importPayload = {
          solvedMap: parsed,
          attemptedMap: {},
        };
      }

      if (
        Object.keys(importPayload.solvedMap).length === 0
        && Object.keys(importPayload.attemptedMap).length === 0
      ) {
        throw new Error();
      }
    } catch {
      setError('Invalid data. Make sure you pasted the full output from the console script.');
      setLoading(false);
      return;
    }

    try {
      const resp = await api.post('/leetcode/import', {
        ...importPayload,
        groupIds: selectedGroupIds,
      });
      setResult({
        ...resp.data,
        mode: 'advanced-import',
        groupsUpdated: resp.data.groupsUpdated || 0,
        groupsFailed: resp.data.groupsFailed || 0,
      });
      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectedGroupIds.length;

  return (
    <div className="text-gray-300">
      {/* Step indicators (only for Advanced) */}
      {importMethod === 'advanced' && step > 0 && step < 4 && (
        <div className="flex gap-2 mb-6 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-[#FFA116] text-black' : 'bg-white/10 text-gray-500'}`}>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 0: Selection ── */}
      {step === 0 && (
        <div className="space-y-6 animate-fade-in">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Group Config Panel ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => setShowGroupConfig(!showGroupConfig)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Auto-add to Groups</div>
                  <div className="text-xs text-gray-500">
                    {groupsLoading
                      ? 'Loading groups...'
                      : selectedCount > 0
                        ? `${selectedCount} group${selectedCount > 1 ? 's' : ''} selected`
                        : 'No groups selected — problems go to your tracker only'}
                  </div>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showGroupConfig ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showGroupConfig && (
              <div className="border-t border-white/10 p-4 animate-fade-in">
                {groupsLoading ? (
                  <div className="text-center text-gray-500 text-sm py-4">Loading your groups...</div>
                ) : userGroups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm mb-2">You haven't joined any groups yet.</p>
                    <a href="/groups" className="text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors">
                      Browse Groups &rarr;
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Select All toggle */}
                    <button
                      onClick={toggleAllGroups}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                        selectedGroupIds.length === userGroups.length
                          ? 'bg-indigo-500 border-indigo-500'
                          : selectedGroupIds.length > 0
                            ? 'bg-indigo-500/30 border-indigo-500/50'
                            : 'border-white/20'
                      }`}>
                        {selectedGroupIds.length > 0 && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            {selectedGroupIds.length === userGroups.length
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />}
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-300">
                        {selectedGroupIds.length === userGroups.length ? 'Deselect All' : 'Select All'}
                      </span>
                    </button>

                    <div className="h-px bg-white/5" />

                    {/* Group list */}
                    {userGroups.map(group => {
                      const isSelected = selectedGroupIds.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          onClick={() => toggleGroup(group.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                            isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                            isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'
                          }`}>
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-white truncate">{group.name}</div>
                            <div className="text-xs text-gray-500">{group.member_count} member{group.member_count !== 1 ? 's' : ''} · {group.problem_count} problem{group.problem_count !== 1 ? 's' : ''}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Import Method Cards */}
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => {
                setImportMethod('instant');
                if (user?.leetcodeUsername) handleInstantSync(user.leetcodeUsername);
                else setStep(5);
              }}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFA116]/50 hover:bg-[#FFA116]/5 transition-all text-left"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#FFA116]/10 flex items-center justify-center border border-[#FFA116]/20">
                  <svg className="w-6 h-6 text-[#FFA116]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Instant Sync</h4>
                  <p className="text-xs text-[#FFA116] font-medium uppercase tracking-wider">Zero Config</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Uses your public profile to import recent solved problems plus best-effort recent attempts. Fast and easy, but limited to your most recent public activity.
              </p>
            </button>

            <button 
              onClick={() => {
                setImportMethod('advanced');
                setStep(1);
              }}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Advanced Import</h4>
                  <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Full History</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Uses a browser script to fetch your full solved history and attempted-only problems from your logged-in LeetCode session.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Instant Setup ── */}
      {step === 5 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Set Your LeetCode Username</h3>
            <p className="text-gray-400 text-sm">We need your public username to fetch your recent solved and attempted activity.</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your LeetCode Username"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-[#FFA116] focus:border-[#FFA116] outline-none transition-all"
              value={tempUsername}
              onChange={e => setTempUsername(e.target.value)}
            />
            {error && <p className="text-red-400 text-sm">❌ {error}</p>}
          </div>

          <div className="flex gap-4">
            <button className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors" onClick={() => setStep(0)}>
              &larr; Back
            </button>
            <button 
              className="flex-1 px-6 py-2.5 rounded-lg bg-[#FFA116] text-black font-semibold hover:bg-[#ffb038] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={() => handleInstantSync()}
              disabled={loading}
            >
              {loading ? (
                <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Syncing...</>
              ) : 'Start Syncing &rarr;'}
            </button>
          </div>
        </div>
      )}

      {/* ── SYNC LOADING (if username already exists) ── */}
      {loading && step === 0 && (
         <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <svg className="animate-spin h-10 w-10 text-[#FFA116]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400 animate-pulse">Fetching your recent LeetCode activity...</p>
         </div>
      )}

      {step === 1 && importMethod === 'advanced' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Step 1: Open LeetCode</h3>
            <p className="text-gray-400">Open a new tab and go to LeetCode. Make sure you are logged in.</p>
          </div>
          
          <div className="flex gap-4">
            <a
              href="https://leetcode.com"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-2.5 rounded-lg bg-[#FFA116] text-black font-semibold hover:bg-[#ffb038] transition-colors flex-1 text-center"
              onClick={() => setStep(2)}
            >
              Open LeetCode &rarr;
            </a>
            <button className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex-1" onClick={() => setStep(2)}>
              I'm already logged in
            </button>
          </div>
        </div>
      )}

      {step === 2 && importMethod === 'advanced' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Step 2: Run the Script in Console</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-400">
              <li>On the LeetCode tab, press <kbd className="bg-white/10 px-1 rounded text-gray-200">F12</kbd> (Windows) or <kbd className="bg-white/10 px-1 rounded text-gray-200">Cmd + Option + J</kbd> (Mac) to open DevTools.</li>
              <li>Click the <strong className="text-white">Console</strong> tab.</li>
              <li>Copy the script below and paste it into the console, then press <kbd className="bg-white/10 px-1 rounded text-gray-200">Enter</kbd>.</li>
              <li>Wait for the floating panel or the final import JSON in the console.</li>
            </ol>
          </div>

          <div className="relative group">
            <pre className="bg-black/50 border border-white/10 p-4 rounded-xl text-xs font-mono text-gray-300 overflow-x-auto max-h-48 overflow-y-auto">
              {CONSOLE_SCRIPT}
            </pre>
            <button 
              className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md transition-colors backdrop-blur-md border border-white/10"
              onClick={handleCopyScript}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <p className="text-xs text-yellow-500/80 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            ⚠️ Never paste scripts from unknown sources into your browser console.
            This script only reads your submission list from LeetCode and copies it locally — 
            it does not send your cookies or credentials anywhere.
          </p>

          <div className="flex gap-4">
            <button className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors" onClick={() => setStep(1)}>
              &larr; Back
            </button>
            <button className="flex-1 px-6 py-2.5 rounded-lg bg-[#FFA116] text-black font-semibold hover:bg-[#ffb038] transition-colors" onClick={() => setStep(3)}>
              Script ran successfully &rarr;
            </button>
          </div>
        </div>
      )}

      {step === 3 && importMethod === 'advanced' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Step 3: Paste the Result Here</h3>
            <p className="text-sm text-gray-400">
              The script copied your data to clipboard automatically.
              Just paste it below (<kbd className="bg-white/10 px-1 rounded">Ctrl+V</kbd> / <kbd className="bg-white/10 px-1 rounded">Cmd+V</kbd>).
            </p>
          </div>

          <textarea
            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-mono text-sm text-gray-300 focus:border-[#FFA116] focus:ring-1 focus:ring-[#FFA116] outline-none transition-all placeholder:text-gray-600"
            rows={5}
            placeholder='Paste your data here... it should start with {"solvedMap":{...},"attemptedMap":{...}}'
            value={pastedData}
            onChange={e => {
              setPastedData(e.target.value);
              setError('');
            }}
          />

          {error && <p className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">❌ {error}</p>}

          <div className="flex gap-4">
            <button className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors" onClick={() => setStep(2)}>
              &larr; Back
            </button>
            <button
              className="flex-1 px-6 py-2.5 rounded-lg bg-[#FFA116] text-black font-semibold hover:bg-[#ffb038] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleImport}
              disabled={!pastedData.trim() || loading}
            >
              {loading ? (
                <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Importing...</>
              ) : 'Import My Problems'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Success ── */}
      {step === 4 && result && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Import Complete!</h3>
          </div>
          
          <div className={`grid gap-4 ${typeof result.attempted === 'number' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{result.solved}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{result.mode === 'recent-sync' ? 'Solved Imported' : 'Newly Imported'}</div>
            </div>
            {typeof result.attempted === 'number' && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-300">{result.attempted || 0}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Attempted Imported</div>
              </div>
            )}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{result.alreadyExists}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{result.mode === 'recent-sync' ? 'Already Up To Date' : 'Already Existed'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{result.failed}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Failed</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{result.total}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{result.mode === 'recent-sync' ? 'Recent Found' : 'Total Found'}</div>
            </div>
          </div>

          {/* Group add results */}
          {(result.groupsUpdated > 0 || result.groupsFailed > 0) && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              result.groupsFailed > 0
                ? 'bg-yellow-500/10 border-yellow-500/20'
                : 'bg-indigo-500/10 border-indigo-500/20'
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                result.groupsFailed > 0 ? 'bg-yellow-500/20' : 'bg-indigo-500/20'
              }`}>
                <svg className={`w-5 h-5 ${result.groupsFailed > 0 ? 'text-yellow-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Problems added to {result.groupsUpdated} group{result.groupsUpdated !== 1 ? 's' : ''}
                </div>
                {result.groupsFailed > 0 && (
                  <div className="text-xs text-yellow-400 mt-0.5">
                    {result.groupsFailed} group{result.groupsFailed !== 1 ? 's' : ''} failed (not a member or group removed)
                  </div>
                )}
              </div>
            </div>
          )}

          {result.mode === 'recent-sync' && result.total === 0 && result.totalSolvedOnLeetCode > 0 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
              No recent public activity was available to import right now. Use Advanced Import once if you want your full LeetCode history.
            </div>
          )}

          {result.mode === 'recent-sync' && result.bestEffortAttempted && result.recentAttemptedFound > 0 && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">
              Attempted imports are best-effort and only come from your recent public submissions.
            </div>
          )}
          
          <div className="flex gap-4">
            <button className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors" onClick={() => {
              setStep(0);
              setImportMethod(null);
              setPastedData('');
              setResult(null);
            }}>
              Import Again
            </button>
            <button className="flex-1 px-6 py-2.5 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-colors" onClick={onCancel}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
