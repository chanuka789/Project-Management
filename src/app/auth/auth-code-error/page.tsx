'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a5082]/5 via-white to-[#0a5082]/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Email Link Expired</CardTitle>
          <CardDescription className="text-base mt-2">
            The email verification link has expired or is invalid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>How to verify your email:</strong>
            </p>
            <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
              <li>Open the verification email we sent you</li>
              <li>Find the 6-digit verification code</li>
              <li>Enter the code on the registration page</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Link href="/register" className="block">
              <Button className="w-full" size="lg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Registration
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full" size="lg">
                Go to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
