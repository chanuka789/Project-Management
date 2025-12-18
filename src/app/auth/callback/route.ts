import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/user';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
