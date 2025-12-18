'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { Mail, User, Phone, MapPin, Building2, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
      alert('Verification code resent! Check your email.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to resend code');
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

        {/* Registration Card */}
        <Card className="shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 backdrop-blur-xl">
          {/* Step 1: Email & Name Entry */}
          {step === 'email' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Account</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">Enter your details to get started</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSendOTP} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                      <Input
                        type="text"
                        name="fullName"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-[#0a5082] dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                        required
                      />
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                      <Input
                        type="email"
                        name="email"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-[#0a5082] dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a5082] hover:bg-[#0d6ebd] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Send Verification Code
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500">or</span>
                    </div>
                  </div>

                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#0a5082] dark:text-blue-400 font-semibold hover:text-[#0d6ebd] dark:hover:text-blue-300 transition-colors">
                      Sign In
                    </Link>
                  </p>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'verify' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-[#0a5082]/10 dark:bg-blue-500/10 flex items-center justify-center">
                    <KeyRound className="h-8 w-8 text-[#0a5082] dark:text-blue-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verify Your Email</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  We sent an 8-digit code to{' '}
                  <span className="font-medium text-[#0a5082] dark:text-blue-400">{formData.email}</span>
                </p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="text"
                      name="otp"
                      placeholder="Enter 8-digit code"
                      value={formData.otp}
                      onChange={handleChange}
                      className="pl-10 h-12 text-center text-xl tracking-widest font-mono bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-[#0a5082] dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                      maxLength={8}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a5082] hover:bg-[#0d6ebd] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Verify Code
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-[#0a5082] dark:hover:text-blue-400 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-[#0a5082] dark:text-blue-400 font-medium hover:text-[#0d6ebd] dark:hover:text-blue-300 transition-colors"
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
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Complete Your Profile</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">Add your contact details (optional)</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleCompleteProfile} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="p-4 bg-[#0a5082]/5 dark:bg-blue-500/10 rounded-lg border border-[#0a5082]/10 dark:border-blue-500/20">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Registered as</p>
                    <p className="font-semibold text-slate-900 dark:text-white mt-1">{formData.fullName}</p>
                    <p className="text-sm text-[#0a5082] dark:text-blue-400">{formData.email}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                      <Input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number (optional)"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-[#0a5082] dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                      <Input
                        type="text"
                        name="location"
                        placeholder="Location (optional)"
                        value={formData.location}
                        onChange={handleChange}
                        className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-[#0a5082] dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a5082] hover:bg-[#0d6ebd] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Complete Registration
                  </Button>

                  <button
                    type="button"
                    onClick={handleCompleteProfile}
                    className="w-full text-center text-sm text-slate-500 dark:text-slate-400 hover:text-[#0a5082] dark:hover:text-blue-400 transition-colors"
                  >
                    Skip for now
                  </button>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="flex justify-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">Welcome!</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Your account has been created successfully</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="text-center space-y-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    Redirecting you to your dashboard...
                  </p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082] dark:border-blue-500" />
                  </div>
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
