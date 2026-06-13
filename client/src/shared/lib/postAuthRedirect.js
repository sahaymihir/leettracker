// Capture-and-resume for auth-gated deep links (e.g. group invite links opened
// while logged out). The target page stashes a relative path here, sends the
// user to /login, and the auth pages consume it on success to land the user back
// where they intended instead of the generic dashboard.

const KEY = 'postAuthRedirect';

// Only same-origin relative paths are stored/honored, so a crafted value can't
// turn the login flow into an open redirect.
const isSafePath = (path) => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');

export const setPostAuthRedirect = (path) => {
  if (isSafePath(path)) {
    localStorage.setItem(KEY, path);
  }
};

// Read and clear in one step so a stale redirect can't fire on a later login.
export const consumePostAuthRedirect = () => {
  const path = localStorage.getItem(KEY);
  localStorage.removeItem(KEY);
  return isSafePath(path) ? path : null;
};
