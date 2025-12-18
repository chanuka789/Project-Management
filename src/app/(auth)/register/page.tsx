'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Get the base URL for redirects
      const redirectUrl = `${window.location.origin}/auth/callback`;

      // Sign up with email OTP (magic link)
      const { error: signUpError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
          },
          // For new users, this creates an account
          shouldCreateUser: true,
        },
      });

      if (signUpError) throw signUpError;

      // Move to verification step
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
        // Move to profile completion step
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

      // Update user profile with additional details
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
        // Profile might already be created by trigger, try insert as fallback
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

      // Show success step
      setStep('success');

      // Redirect after showing success
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
      // Get the base URL for redirects
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
      setError(''); // Clear any previous error
      alert('Verification code resent! Check your email.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a5082]/5 via-white to-[#0a5082]/10 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#0a5082] to-[#063a5e] flex items-center justify-center shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0a5082]">QS Global Solutions</h1>
              <p className="text-sm text-gray-500">Project Management System</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          {/* Step 1: Email & Name Entry */}
          {step === 'email' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create Account</CardTitle>
                <CardDescription>
                  Enter your email to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      name="fullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      name="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Send Verification Code
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#0a5082] font-medium hover:underline">
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
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-[#0a5082]/10 flex items-center justify-center">
                    <KeyRound className="h-8 w-8 text-[#0a5082]" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription>
                  We sent an 8-digit code to{' '}
                  <span className="font-medium text-[#0a5082]">{formData.email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      name="otp"
                      placeholder="Enter 8-digit code"
                      value={formData.otp}
                      onChange={handleChange}
                      className="pl-10 text-center text-xl tracking-widest font-mono"
                      maxLength={8}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Verify Code
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="flex items-center gap-1 text-gray-500 hover:text-[#0a5082] transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-[#0a5082] font-medium hover:underline"
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
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                <CardDescription>
                  Add your contact details (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompleteProfile} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Registered as</p>
                    <p className="font-medium text-gray-900">{formData.fullName}</p>
                    <p className="text-sm text-[#0a5082]">{formData.email}</p>
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number (optional)"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      name="location"
                      placeholder="Location (optional)"
                      value={formData.location}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Complete Registration
                  </Button>

                  <button
                    type="button"
                    onClick={handleCompleteProfile}
                    className="w-full text-center text-sm text-gray-500 hover:text-[#0a5082] transition-colors"
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
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-green-600">Welcome!</CardTitle>
                <CardDescription className="text-base">
                  Your account has been created successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <p className="text-gray-500">
                    Redirecting you to your dashboard...
                  </p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} QS Global Solutions. All rights reserved.
        </p>
      </div>
    </div>
  );
}
