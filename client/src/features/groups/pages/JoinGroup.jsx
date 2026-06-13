import { Navigate, Link } from 'react-router-dom';
import { Users, Loader2, AlertCircle, Code2 } from 'lucide-react';
import { useJoinGroup } from '@/features/groups/hooks/useJoinGroup';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

// Landing page for shareable invite links: /groups/:id/join?token=...
// Public route — handles the logged-out case by stashing the link and bouncing
// to login, and the logged-in case by previewing then joining the group.
const JoinGroup = () => {
  const join = useJoinGroup();

  // Logged out: remember where we were headed, then send to login. Registering
  // or signing in will resume here via consumePostAuthRedirect.
  if (!join.user) {
    join.rememberRedirect();
    return <Navigate to="/login" replace />;
  }

  const { preview, error, joining } = join;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-rise">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mb-5 shadow-lg shadow-indigo-950/50">
            <Code2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Group invite</h1>
        </div>

        <Card className="border-white/[0.08] bg-card/60 backdrop-blur-xl shadow-2xl shadow-black/40">
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm font-medium text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {!error && !preview && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading invite...
              </div>
            )}

            {preview && (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{preview.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {preview.member_count} member{preview.member_count === 1 ? '' : 's'}
                      {preview.creator_name ? ` · Created by ${preview.creator_name}` : ''}
                    </p>
                  </div>
                </div>

                {preview.already_member ? (
                  <Button size="lg" className="w-full font-semibold" onClick={join.goToGroup}>
                    Open group
                  </Button>
                ) : (
                  <Button size="lg" className="w-full font-semibold" onClick={join.handleJoin} disabled={joining}>
                    {joining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join group'
                    )}
                  </Button>
                )}
              </>
            )}

            <p className="text-center text-sm">
              <Link to="/groups" className="text-muted-foreground hover:text-white transition-colors">
                Back to my groups
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinGroup;
