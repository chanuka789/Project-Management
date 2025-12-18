'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { Mail, Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0a5082]/10 dark:bg-[#0a5082]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          {logoUrl ? (
            <div className="mb-6 p-4 bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={companyName}
                className="h-16 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-xl mb-6 border border-slate-200 dark:border-slate-700">
              <Building2 className="h-10 w-10 text-[#0a5082]" />
            </div>
          )}
        </div>

        <Card className="shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 backdrop-blur-xl">
          {step === 'email' && (
            <>
              <CardHeader className="text-center space-y-2 pt-8">
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Forgot Password?</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-sm">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-[#0a5082] dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a5082] hover:bg-[#0d6ebd] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Send Reset Link
                  </Button>

                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-[#0a5082] dark:hover:text-blue-400 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                  </Link>
                </form>
              </CardContent>
            </>
          )}

          {step === 'sent' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="flex justify-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">Check Your Email</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-medium text-[#0a5082] dark:text-blue-400">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="space-y-4">
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Click the link in the email to reset your password. The link will expire in 1 hour.
                  </p>
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Didn&apos;t receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => setStep('email')}
                      className="text-[#0a5082] dark:text-blue-400 hover:text-[#0d6ebd] dark:hover:text-blue-300 hover:underline font-medium"
                    >
                      try again
                    </button>
                  </p>
                  <Link href="/login">
                    <Button variant="outline" className="w-full h-12 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white">
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
        <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8">
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
