import { useState, useEffect, useMemo, useCallback } from 'react';
import { listProblems } from '@/features/problems/services/problemsApi';

// Owns the "add from my problemset" modal: loads the user's tracked problems,
// the search/filter, the multi-select + dedup against problems already in the
// group, and the confirm-then-bulk-add flow. The modal component only renders
// what this returns.
export const useAddFromProblemset = ({ isOpen, onClose, onAddProblems, existingProblems = [] }) => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCount, setConfirmCount] = useState(null);
  const [pendingProblems, setPendingProblems] = useState(null);

  const loadProblems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProblems();
      setProblems(res.data);
    } catch (err) {
      console.error('Failed to load problems:', err);
      setError('Failed to load your problems.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset state and (re)load the user's problemset each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setError('');
      setSelectedIds([]);
      setConfirmCount(null);
      setPendingProblems(null);
      loadProblems();
    }
  }, [isOpen, loadProblems]);

  // Client-side search across title, difficulty, pattern, and topics.
  const filteredProblems = useMemo(() => {
    if (!searchQuery.trim()) return problems;

    const query = searchQuery.toLowerCase();
    return problems.filter(p => {
      const titleMatch = p.title?.toLowerCase().includes(query);
      const diffMatch = p.difficulty?.toLowerCase().includes(query);
      const patternMatch = p.pattern_name?.toLowerCase().includes(query);
      const topicMatch = p.topics?.some(topic => topic.toLowerCase().includes(query));

      return titleMatch || diffMatch || patternMatch || topicMatch;
    });
  }, [problems, searchQuery]);

  // Problems already in the group, for quick lookup / dedup.
  const existingSet = useMemo(() => new Set(existingProblems.map(p => p.id)), [existingProblems]);
  const selectableProblems = filteredProblems.filter(problem => !existingSet.has(problem.id));
  const selectedCount = selectedIds.filter(id => !existingSet.has(id)).length;
  const hasAddableProblems = problems.some(problem => !existingSet.has(problem.id));

  const toggleSelected = useCallback((problemId) => {
    setSelectedIds(prev => (
      prev.includes(problemId)
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    ));
  }, []);

  const selectVisible = useCallback(() => {
    setSelectedIds(selectableProblems.map(problem => problem.id));
  }, [selectableProblems]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const cancelConfirm = useCallback(() => {
    setConfirmCount(null);
    setPendingProblems(null);
  }, []);

  const requestAdd = useCallback((problemsToAdd) => {
    if (!problemsToAdd.length || !onAddProblems) return;
    setPendingProblems(problemsToAdd);
    setConfirmCount(problemsToAdd.length);
  }, [onAddProblems]);

  const handleConfirmedAdd = useCallback(async () => {
    const problemsToAdd = pendingProblems;
    setConfirmCount(null);
    setPendingProblems(null);
    if (!problemsToAdd?.length) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await onAddProblems(problemsToAdd);
      setSelectedIds([]);

      if (result?.failedCount) {
        setError(`${result.failedCount} problem${result.failedCount === 1 ? '' : 's'} could not be added.`);
      } else {
        onClose();
      }
    } catch {
      setError('Failed to add selected problems.');
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingProblems, onAddProblems, onClose]);

  const handleAddAll = useCallback(() => {
    requestAdd(problems.filter(problem => !existingSet.has(problem.id)));
  }, [requestAdd, problems, existingSet]);

  const handleAddCurrentSelection = useCallback(() => {
    requestAdd(problems.filter(problem => selectedIds.includes(problem.id) && !existingSet.has(problem.id)));
  }, [requestAdd, problems, selectedIds, existingSet]);

  return {
    // data
    loading,
    filteredProblems,
    existingSet,
    selectableProblems,
    hasAddableProblems,
    // search
    searchQuery,
    setSearchQuery,
    // selection
    selectedIds,
    selectedCount,
    toggleSelected,
    selectVisible,
    clearSelection,
    // submit / confirm
    isSubmitting,
    error,
    confirmCount,
    cancelConfirm,
    handleConfirmedAdd,
    handleAddAll,
    handleAddCurrentSelection,
  };
};
