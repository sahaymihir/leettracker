import { useState, useEffect } from 'react';
import {
  listGroups,
  createGroup,
  listStarterLists,
  importStarterList,
} from '@/features/groups/services/groupsApi';
import { BLANK_PACK } from '@/features/groups/constants';
import { toast } from '@/shared/ui/use-toast';

// Owns the groups list and the create-group dialog state (name + optional
// starter pack). The Groups page only renders what this returns.
export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // Starter packs offered in the create dialog.
  const [starterPacks, setStarterPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(BLANK_PACK);

  useEffect(() => {
    listGroups()
      .then(res => setGroups(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load the starter-pack catalog once for the create dialog. Best-effort: if it
  // fails, the dialog still works for creating a blank group.
  useEffect(() => {
    listStarterLists()
      .then(res => setStarterPacks(res.data))
      .catch(() => setStarterPacks([]));
  }, []);

  const openCreate = () => setShowCreate(true);

  const closeCreate = () => {
    if (creating) return;
    setShowCreate(false);
    setError('');
    setGroupName('');
    setSelectedPack(BLANK_PACK);
  };

  // Create the group, then (if a pack was chosen) import it into the new group.
  // Returns the new group id so the page can navigate into it.
  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name || creating) return;
    setError('');
    setCreating(true);
    try {
      const res = await createGroup(name);
      const newGroup = res.data;
      setGroups(prev => [{ ...newGroup, creator_name: 'You' }, ...prev]);

      const pack = selectedPack !== BLANK_PACK
        ? starterPacks.find(p => p.id === selectedPack)
        : null;

      if (pack) {
        try {
          const importRes = await importStarterList(newGroup.id, pack.id);
          const addedCount = importRes.data?.addedCount ?? pack.count;
          toast({
            title: 'Group created',
            description: `${name} · ${pack.name} (${addedCount} problem${addedCount === 1 ? '' : 's'})`,
            variant: 'success',
          });
        } catch {
          // The group exists; only the import failed — let the user in and tell them.
          toast({
            title: 'Group created, pack import failed',
            description: `${name} was created, but ${pack.name} couldn't be added. Try importing from the group.`,
            variant: 'destructive',
          });
        }
      } else {
        toast({ title: 'Group created', description: name, variant: 'success' });
      }

      setGroupName('');
      setSelectedPack(BLANK_PACK);
      setShowCreate(false);
      return newGroup.id;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
      return null;
    } finally {
      setCreating(false);
    }
  };

  return {
    groups,
    loading,
    showCreate,
    openCreate,
    closeCreate,
    groupName,
    setGroupName,
    error,
    creating,
    starterPacks,
    selectedPack,
    setSelectedPack,
    handleCreate,
  };
};
