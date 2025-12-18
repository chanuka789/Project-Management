import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/user';

  const supabase = await createClient();
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  // Helper function for redirect
  const getRedirectUrl = (path: string) => {
    if (isLocalEnv) {
      return `${origin}${path}`;
    } else if (forwardedHost) {
      return `https://${forwardedHost}${path}`;
    } else {
      return `${origin}${path}`;
    }
  };

  // Handle token_hash for email links (magic link, password recovery)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'magiclink' | 'signup' | 'invite' | 'email',
    });

    if (!error) {
      // Handle password recovery - redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(getRedirectUrl('/reset-password'));
      }

      // Handle magic link - redirect based on role
      if (type === 'magiclink' || type === 'signup' || type === 'email') {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

          const redirectPath = userData?.role === 'admin' ? '/admin' : '/user';
          return NextResponse.redirect(getRedirectUrl(redirectPath));
        }
      }
    }
  }

  // Handle PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Handle password recovery - redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(getRedirectUrl('/reset-password'));
      }

      // Get user and check role
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch user role from database
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        // Redirect based on role
        const redirectPath = userData?.role === 'admin' ? '/admin' : '/user';
        return NextResponse.redirect(getRedirectUrl(redirectPath));
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
