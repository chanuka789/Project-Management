'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { Mail, Lock, Building2, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          // Profile fetch failed - redirect to user dashboard as fallback
          router.push('/user');
          return;
        }

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/user');
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-300 bg-slate-50 dark:bg-slate-950">
      
      {/* Background Gradient & Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0a5082]/10 dark:bg-[#0a5082]/20 rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-10 mix-blend-soft-light"></div>
      </div>

      <div className="w-full max-w-sm z-10 relative">
        
        {/* Brand / Logo Section */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl}
              alt={companyName}
              className="h-16 w-auto object-contain"
            />
          ) : (
            <div className="h-16 w-16 bg-gradient-to-br from-[#0a5082] to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          )}
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
          <CardHeader className="space-y-1 text-center pb-2 pt-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your credentials to access your account
            </p>
          </CardHeader>
          
          <CardContent className="px-8 pb-8 pt-4">
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Error Alert */}
              {error && (
                <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors outline-none focus:text-[#0a5082]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="peer h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[#0a5082] focus:ring-[#0a5082] dark:bg-slate-900 dark:checked:bg-blue-600 transition-all" 
                    />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[#0a5082] dark:text-blue-400 hover:text-[#084068] dark:hover:text-blue-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#0a5082] hover:bg-[#084068] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-500">
                    New here?
                  </span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/register"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-[#0a5082] dark:hover:text-blue-400 font-medium transition-colors inline-flex items-center gap-1 group"
                >
                  Create an account
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-8">
          &copy; {new Date().getFullYear()} {companyName || 'Company'}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
