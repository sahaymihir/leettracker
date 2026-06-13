import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { previewGroupInvite, joinGroup } from '@/features/groups/services/groupsApi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { setPostAuthRedirect } from '@/shared/lib/postAuthRedirect';

// Owns everything the JoinGroup page needs: the invite preview, the join
// mutation, and the logged-out capture-and-resume bookkeeping. The page only
// renders. Mirrors useGroupDetail's split of state/handlers from presentation.
export const useJoinGroup = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  // Guard the preview effect so it runs once even under StrictMode double-invoke.
  const loadedRef = useRef(false);

  // A missing token is knowable at render time, so derive it rather than setting
  // state in the effect. Join errors and fetch errors are surfaced together.
  const error = (!token ? 'This invite link is missing its token.' : '') || fetchError || joinError;

  // Logged-out visitors are sent to login; this is the link they resume to once
  // they authenticate (consumed by Login/Register via consumePostAuthRedirect).
  const inviteUrl = `/groups/${id}/join${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  useEffect(() => {
    // Only the logged-in branch with a token loads a preview; the logged-out
    // branch redirects and the missing-token case is handled by `error` above.
    if (!user || !token || loadedRef.current) return;
    loadedRef.current = true;

    previewGroupInvite(id, token)
      .then((res) => setPreview(res.data))
      .catch((err) => setFetchError(err.response?.data?.error || 'This invite link is invalid or has expired.'));
  }, [id, token, user]);

  const rememberRedirect = () => setPostAuthRedirect(inviteUrl);

  const goToGroup = () => navigate(`/groups/${id}`, { replace: true });

  const handleJoin = async () => {
    setJoining(true);
    setJoinError('');
    try {
      await joinGroup(id, token);
      goToGroup();
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join the group.');
      setJoining(false);
    }
  };

  return {
    groupId: id,
    user,
    preview,
    error,
    joining,
    rememberRedirect,
    goToGroup,
    handleJoin,
  };
};
