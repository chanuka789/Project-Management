'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { Mail, User, Phone, MapPin, Building2, KeyRound, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

type RegistrationStep = 'email' | 'verify' | 'profile' | 'success';

export default function RegisterPage() {
  const [step, setStep] = useState<RegistrationStep>('email');
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    location: '',
    otp: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error: signUpError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
          },
          shouldCreateUser: true,
        },
      });

      if (signUpError) throw signUpError;

      setStep('verify');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      if (data.user) {
        setStep('profile');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete profile
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not found');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          phone: formData.phone || null,
          location: formData.location || null,
        })
        .eq('id', user.id);

      if (updateError) {
        console.log('Profile update error (may be expected):', updateError);
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: formData.email,
            full_name: formData.fullName,
            phone: formData.phone || null,
            location: formData.location || null,
            role: 'user',
            hourly_rate: 0,
          });

        if (insertError) {
          console.log('Profile insert error:', insertError);
        }
      }

      setStep('success');

      setTimeout(() => {
        router.push('/user');
      }, 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError('');
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
          },
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      setError('');
      // In a real app, use a toast here
      alert('Verification code resent! Check your email.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to resend code');
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

      <div className="w-full max-w-md z-10 relative">
        
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
          
          {/* Step 1: Email & Name Entry */}
          {step === 'email' && (
            <>
              <CardHeader className="space-y-1 text-center pb-2 pt-8">
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Create Account
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Enter your details to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-4">
                <form onSubmit={handleSendOTP} className="space-y-6">
                  {error && (
                    <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                        <Input
                          type="text"
                          name="fullName"
                          placeholder="Full Name"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                        <Input
                          type="email"
                          name="email"
                          placeholder="Email address"
                          value={formData.email}
                          onChange={handleChange}
                          className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                          required
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
                        <span>Sending Code...</span>
                      </div>
                    ) : (
                      'Send Verification Code'
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-500">
                        Or
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Already have an account?{' '}
                      <Link href="/login" className="text-[#0a5082] dark:text-blue-400 font-medium hover:text-[#084068] dark:hover:text-blue-300 transition-colors">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'verify' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#0a5082]/20 dark:bg-blue-500/10 rounded-full blur-xl animate-pulse" />
                    <div className="relative h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <KeyRound className="h-8 w-8 text-[#0a5082] dark:text-blue-500" />
                    </div>
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Verify Your Email
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  We sent an 8-digit code to{' '}
                  <span className="font-medium text-[#0a5082] dark:text-blue-400">{formData.email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-4">
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  {error && (
                    <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="relative group">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                      <Input
                        type="text"
                        name="otp"
                        placeholder="Enter 8-digit code"
                        value={formData.otp}
                        onChange={handleChange}
                        className="pl-10 h-12 text-center text-lg tracking-[0.2em] font-mono bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                        maxLength={8}
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
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors group"
                    >
                      <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-[#0a5082] dark:text-blue-400 font-medium hover:text-[#084068] dark:hover:text-blue-300 transition-colors"
                      disabled={isLoading}
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 3: Complete Profile */}
          {step === 'profile' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Complete Profile
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Add your contact details (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-4">
                <form onSubmit={handleCompleteProfile} className="space-y-6">
                  {error && (
                    <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                      {error}
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#0a5082]/10 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-[#0a5082] dark:text-blue-400" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Registered as</p>
                        <p className="font-medium text-slate-900 dark:text-slate-200 truncate">{formData.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                        <Input
                          type="tel"
                          name="phone"
                          placeholder="Phone Number (optional)"
                          value={formData.phone}
                          onChange={handleChange}
                          className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#0a5082] dark:group-focus-within:text-blue-400" />
                        <Input
                          type="text"
                          name="location"
                          placeholder="Location (optional)"
                          value={formData.location}
                          onChange={handleChange}
                          className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#0a5082]/20 dark:focus:ring-blue-500/20 focus:border-[#0a5082] dark:focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-11 bg-[#0a5082] hover:bg-[#084068] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        'Complete Registration'
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={handleCompleteProfile}
                      className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors py-2"
                    >
                      Skip for now
                    </button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
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
                  Welcome!
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Your account has been created successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-4">
                <div className="text-center space-y-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Redirecting you to your dashboard...
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
