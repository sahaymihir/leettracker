import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Code2, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { consumePostAuthRedirect } from '@/shared/lib/postAuthRedirect';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardFooter } from '@/shared/ui/card';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, loading, error, handleLogin } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={consumePostAuthRedirect() || '/dashboard'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await handleLogin({ email, password })) {
      navigate(consumePostAuthRedirect() || '/dashboard');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-6 animate-fade-in">
      {/* Decorative glows */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-10%] w-[500px] h-[400px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-rise">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-5 shadow-lg shadow-emerald-950/50">
            <Code2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue your coding journey
          </p>
        </div>

        <Card className="border-white/[0.08] bg-card/60 backdrop-blur-xl shadow-2xl shadow-black/40">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm font-medium text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-white/[0.06] py-5">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
