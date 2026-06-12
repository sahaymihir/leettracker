import { useState, useRef, useEffect, useMemo } from 'react';
import {
  searchProblems,
  createProblem,
} from '@/features/problems/services/problemsApi';
import {
  parseBulkProblemNumbers,
  createEmptyBulkProgress,
} from '@/shared/components/StatusControls';
import { toast } from '@/shared/ui/use-toast';

const BULK_ADD_CONCURRENCY = 3;

// Drives the "Add Problem" dialog: debounced single search/preview/add and the
// concurrent bulk-add flow. It reaches back into the list via the callbacks the
// page passes in (onProblemAdded / refetch) so it never owns the list itself.
export const useAddProblem = ({ onProblemAdded, refetch }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState('single');

  // Single-add state.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [preview, setPreview] = useState(null);
  const [addError, setAddError] = useState('');
  const searchTimeoutRef = useRef(null);

  // Bulk-add state.
  const [bulkInput, setBulkInput] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(() => createEmptyBulkProgress());
  const [bulkResults, setBulkResults] = useState([]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const bulkParseResult = useMemo(() => parseBulkProblemNumbers(bulkInput), [bulkInput]);
  const bulkCompletionPercent = bulkProgress.total > 0
    ? Math.round((bulkProgress.completed / bulkProgress.total) * 100)
    : 0;

  const resetAddModalState = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setPreview(null);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setAddError('');
    setAddMode('single');
    setBulkInput('');
    setBulkError('');
    setIsBulkAdding(false);
    setBulkProgress(createEmptyBulkProgress());
    setBulkResults([]);
  };

  const openAddModal = () => setShowAddModal(true);

  const closeAddModal = () => {
    if (isBulkAdding) return;
    setShowAddModal(false);
    resetAddModalState();
  };

  const switchAddMode = (mode) => {
    setAddMode(mode);
    if (mode === 'single') setBulkError('');
    else setAddError('');
  };

  const updateBulkInput = (value) => {
    setBulkInput(value);
    setBulkError('');
    setBulkResults([]);
    setBulkProgress(createEmptyBulkProgress());
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setPreview(null);
    setAddError('');

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchProblems(query);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce
  };

  const handleSelectProblem = (prob) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setPreview(prob);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setAddError('');
  };

  const handleAddProblem = async () => {
    if (!preview) return;
    setAddError('');
    try {
      const res = await createProblem({
        leetcode_number: preview.number,
        title: preview.title,
        difficulty: preview.difficulty,
        pattern_name: preview.topics?.[0] || null,
      });
      onProblemAdded(res.data);
      toast({ title: 'Problem added', description: `#${preview.number} ${preview.title}`, variant: 'success' });
      closeAddModal();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add problem');
    }
  };

  const recordBulkResult = (result) => {
    setBulkResults(prev => [...prev, result]);
    setBulkProgress(prev => {
      const next = {
        ...prev,
        completed: prev.completed + 1,
      };

      if (result.status === 'added') {
        next.added += 1;
      } else if (result.status === 'skipped') {
        next.skipped += 1;
      } else {
        next.failed += 1;
      }

      return next;
    });
  };

  const handleBulkAddProblems = async () => {
    if (isBulkAdding) return;

    const { numbers, duplicates, invalidTokens } = bulkParseResult;
    if (numbers.length === 0) {
      setBulkError('Enter at least one valid LeetCode question number.');
      return;
    }

    const preflightResults = [
      ...duplicates.map(number => ({
        status: 'duplicate',
        number,
        message: 'Duplicate in input',
      })),
      ...invalidTokens.map(token => ({
        status: 'invalid',
        token,
        message: 'Invalid number',
      })),
    ];

    setBulkError('');
    setBulkResults(preflightResults);
    setBulkProgress(createEmptyBulkProgress(numbers.length));
    setIsBulkAdding(true);

    let nextIndex = 0;

    const addNextProblem = async () => {
      while (nextIndex < numbers.length) {
        const number = numbers[nextIndex];
        nextIndex += 1;

        try {
          const res = await createProblem({
            leetcode_number: number,
            require_dataset: true,
          });
          onProblemAdded(res.data);
          recordBulkResult({
            status: 'added',
            number,
            title: res.data.title,
            message: 'Added',
          });
        } catch (err) {
          const responseData = err.response?.data || {};
          const alreadyTracked = responseData.error === 'Problem already in your list' && responseData.problem;

          if (alreadyTracked) {
            onProblemAdded(responseData.problem);
            recordBulkResult({
              status: 'skipped',
              number,
              title: responseData.problem.title,
              message: 'Already tracked',
            });
          } else {
            recordBulkResult({
              status: 'failed',
              number,
              message: responseData.error || 'Failed to add problem',
            });
          }
        }
      }
    };

    try {
      const workerCount = Math.min(BULK_ADD_CONCURRENCY, numbers.length);
      await Promise.all(Array.from({ length: workerCount }, addNextProblem));
      await refetch();
    } finally {
      setIsBulkAdding(false);
    }
  };

  return {
    showAddModal,
    openAddModal,
    closeAddModal,
    addMode,
    switchAddMode,
    // single
    searchQuery,
    searchResults,
    isSearching,
    preview,
    addError,
    handleSearch,
    handleSelectProblem,
    handleAddProblem,
    // bulk
    bulkInput,
    updateBulkInput,
    bulkError,
    isBulkAdding,
    bulkProgress,
    bulkResults,
    bulkParseResult,
    bulkCompletionPercent,
    handleBulkAddProblems,
  };
};
