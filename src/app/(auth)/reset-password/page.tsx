'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { Lock, Building2, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to reset password');
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

        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
          {!isSuccess ? (
            <>
              <CardHeader className="space-y-1 text-center pb-2 pt-8">
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Create New Password
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Enter your new password below.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="New Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                          required
                          minLength={6}
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

                    <div className="space-y-2">
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-[#0a5082] hover:bg-[#084068] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating Password...</span>
                      </div>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 dark:bg-green-500/10 rounded-full blur-xl animate-pulse" />
                    <div className="relative h-20 w-20 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400 animate-in zoom-in duration-300" />
                    </div>
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Password Reset!
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Your password has been successfully reset.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-4">
                <div className="text-center space-y-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Redirecting you to the login page...
                  </p>
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#0a5082] dark:text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-8">
          &copy; {new Date().getFullYear()} {companyName || 'Company'}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
