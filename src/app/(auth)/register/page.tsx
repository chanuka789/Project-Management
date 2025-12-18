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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a5082] via-[#0d6ebd] to-[#1a8cdb] p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-2xl bg-white p-1 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={companyName}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl mb-4 border border-white/20">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">{companyName}</h1>
          <p className="text-white/70 text-sm mt-1">Project Management System</p>
        </div>

        {/* Registration Card */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          {/* Step 1: Email & Name Entry */}
          {step === 'email' && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your details to get started</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSendOTP} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        name="fullName"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
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
                        className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a5082] hover:bg-[#0d6ebd] text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Send Verification Code
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-400">or</span>
                    </div>
                  </div>

                  <p className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#0a5082] font-semibold hover:text-[#0d6ebd] transition-colors">
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
                  <div className="h-16 w-16 rounded-full bg-[#0a5082]/10 flex items-center justify-center">
                    <KeyRound className="h-8 w-8 text-[#0a5082]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Verify Your Email</h2>
                <p className="text-gray-500 text-sm mt-1">
                  We sent an 8-digit code to{' '}
                  <span className="font-medium text-[#0a5082]">{formData.email}</span>
                </p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleVerifyOTP} className="space-y-5">
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
                      className="pl-10 h-12 text-center text-xl tracking-widest font-mono bg-gray-50 border-gray-200 focus:bg-white"
                      maxLength={8}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a5082] hover:bg-[#0d6ebd] text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
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
                      className="text-[#0a5082] font-medium hover:text-[#0d6ebd] transition-colors"
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
                <h2 className="text-2xl font-bold text-gray-800">Complete Your Profile</h2>
                <p className="text-gray-500 text-sm mt-1">Add your contact details (optional)</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleCompleteProfile} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="p-4 bg-[#0a5082]/5 rounded-lg border border-[#0a5082]/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Registered as</p>
                    <p className="font-semibold text-gray-800 mt-1">{formData.fullName}</p>
                    <p className="text-sm text-[#0a5082]">{formData.email}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number (optional)"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
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
                        className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a5082] hover:bg-[#0d6ebd] text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
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
              <CardHeader className="text-center pb-2 pt-8">
                <div className="flex justify-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-green-600">Welcome!</h2>
                <p className="text-gray-500 mt-1">Your account has been created successfully</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
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

        {/* Footer */}
        <p className="text-center text-sm text-white/60 mt-8">
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
