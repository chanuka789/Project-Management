'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { Mail, Building2, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

type ForgotPasswordStep = 'email' | 'sent';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?type=recovery`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) throw resetError;

      setStep('sent');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to send reset email');
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
          {step === 'email' && (
            <>
              <CardHeader className="space-y-1 text-center pb-2 pt-8">
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Forgot Password?
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-8 pb-8 pt-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {error && (
                    <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                      {error}
                    </div>
                  )}

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

                  <Button
                    type="submit"
                    className="w-full h-11 bg-[#0a5082] hover:bg-[#084068] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Link...</span>
                      </div>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-[#0a5082] dark:hover:text-blue-400 font-medium transition-colors group"
                    >
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {step === 'sent' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 dark:bg-green-500/10 rounded-full blur-xl animate-pulse" />
                    <div className="relative h-20 w-20 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-medium text-[#0a5082] dark:text-blue-400 block mt-1">{email}</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-8 pb-8 pt-2">
                <div className="space-y-6">
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Click the link in the email to reset your password. The link will expire in 1 hour.
                  </p>
                  
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Didn&apos;t receive the email? Check spam or{' '}
                      <button
                        onClick={() => setStep('email')}
                        className="text-[#0a5082] dark:text-blue-400 hover:text-[#084068] dark:hover:text-blue-300 hover:underline font-medium transition-colors"
                      >
                        try again
                      </button>
                    </p>
                  </div>

                  <Link href="/login" className="block">
                    <Button 
                      variant="outline" 
                      className="w-full h-11 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
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
