# Supabase Email Templates

Copy these templates to your Supabase Dashboard:
**Authentication > Email Templates**

---

## 1. Password Reset Email

**Subject:** Reset your password

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto;">

          <!-- Logo/Brand Section -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #0a5082 0%, #3b82f6 100%); border-radius: 16px; line-height: 64px;">
                <span style="color: white; font-size: 28px; font-weight: bold;">P</span>
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

                <!-- Icon Header -->
                <tr>
                  <td style="padding: 40px 40px 24px 40px; text-align: center;">
                    <div style="display: inline-block; width: 72px; height: 72px; background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 50%; line-height: 72px;">
                      <span style="font-size: 32px;">🔐</span>
                    </div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td style="padding: 0 40px 8px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;">
                      Reset Your Password
                    </h1>
                  </td>
                </tr>

                <!-- Description -->
                <tr>
                  <td style="padding: 0 40px 32px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to create a new password.
                    </p>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td style="padding: 0 40px 24px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #0a5082; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(10, 80, 130, 0.3);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
                  </td>
                </tr>

                <!-- Security Notice -->
                <tr>
                  <td style="padding: 24px 40px 16px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0; font-size: 13px; color: #854d0e; line-height: 1.5;">
                            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Alternative Link -->
                <tr>
                  <td style="padding: 16px 40px 40px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #0a5082; word-break: break-all;">
                      {{ .ConfirmationURL }}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                This email was sent from
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500;">
                pms.qs-global-solutions.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link Email (Sign In)

**Subject:** Sign in to your account

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto;">

          <!-- Logo/Brand Section -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #0a5082 0%, #3b82f6 100%); border-radius: 16px; line-height: 64px;">
                <span style="color: white; font-size: 28px; font-weight: bold;">P</span>
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

                <!-- Icon Header -->
                <tr>
                  <td style="padding: 40px 40px 24px 40px; text-align: center;">
                    <div style="display: inline-block; width: 72px; height: 72px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50%; line-height: 72px;">
                      <span style="font-size: 32px;">✨</span>
                    </div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td style="padding: 0 40px 8px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;">
                      Sign In to Your Account
                    </h1>
                  </td>
                </tr>

                <!-- Description -->
                <tr>
                  <td style="padding: 0 40px 32px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                      Click the button below to securely sign in to your account. No password needed!
                    </p>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td style="padding: 0 40px 24px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #0a5082; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(10, 80, 130, 0.3);">
                            Sign In Now
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
                  </td>
                </tr>

                <!-- Info Box -->
                <tr>
                  <td style="padding: 24px 40px 16px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0; font-size: 13px; color: #0369a1; line-height: 1.5;">
                            <strong>One-time link:</strong> This sign-in link will expire in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Alternative Link -->
                <tr>
                  <td style="padding: 16px 40px 40px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #0a5082; word-break: break-all;">
                      {{ .ConfirmationURL }}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                This email was sent from
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500;">
                pms.qs-global-solutions.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Email Confirmation (Sign Up)

**Subject:** Confirm your email address

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto;">

          <!-- Logo/Brand Section -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #0a5082 0%, #3b82f6 100%); border-radius: 16px; line-height: 64px;">
                <span style="color: white; font-size: 28px; font-weight: bold;">P</span>
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

                <!-- Icon Header -->
                <tr>
                  <td style="padding: 40px 40px 24px 40px; text-align: center;">
                    <div style="display: inline-block; width: 72px; height: 72px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50%; line-height: 72px;">
                      <span style="font-size: 32px;">📧</span>
                    </div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td style="padding: 0 40px 8px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;">
                      Verify Your Email
                    </h1>
                  </td>
                </tr>

                <!-- Description -->
                <tr>
                  <td style="padding: 0 40px 24px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                      Thanks for signing up! Please verify your email address to complete your registration.
                    </p>
                  </td>
                </tr>

                <!-- OTP Code Box -->
                <tr>
                  <td style="padding: 0 40px 24px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">
                            Your verification code
                          </p>
                          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #0a5082; letter-spacing: 0.2em; font-family: 'Courier New', monospace;">
                            {{ .Token }}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Or Divider -->
                <tr>
                  <td style="padding: 0 40px 24px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="border-bottom: 1px solid #e2e8f0; width: 45%;"></td>
                        <td style="text-align: center; padding: 0 16px;">
                          <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">or</span>
                        </td>
                        <td style="border-bottom: 1px solid #e2e8f0; width: 45%;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td style="padding: 0 40px 24px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #0a5082; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(10, 80, 130, 0.3);">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
                  </td>
                </tr>

                <!-- Info Notice -->
                <tr>
                  <td style="padding: 24px 40px 40px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                      This verification code expires in <strong>1 hour</strong>.<br>
                      If you didn't create an account, please ignore this email.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                Welcome to
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500;">
                pms.qs-global-solutions.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Invite User Email

**Subject:** You've been invited to join the team

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto;">

          <!-- Logo/Brand Section -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #0a5082 0%, #3b82f6 100%); border-radius: 16px; line-height: 64px;">
                <span style="color: white; font-size: 28px; font-weight: bold;">P</span>
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

                <!-- Icon Header -->
                <tr>
                  <td style="padding: 40px 40px 24px 40px; text-align: center;">
                    <div style="display: inline-block; width: 72px; height: 72px; background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 50%; line-height: 72px;">
                      <span style="font-size: 32px;">🎉</span>
                    </div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td style="padding: 0 40px 8px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;">
                      You're Invited!
                    </h1>
                  </td>
                </tr>

                <!-- Description -->
                <tr>
                  <td style="padding: 0 40px 32px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                      You've been invited to join the Project Management System. Click below to accept the invitation and set up your account.
                    </p>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td style="padding: 0 40px 24px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #0a5082; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(10, 80, 130, 0.3);">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
                  </td>
                </tr>

                <!-- What's Next Box -->
                <tr>
                  <td style="padding: 24px 40px 16px 40px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #0369a1;">
                            What happens next?
                          </p>
                          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #0369a1; line-height: 1.8;">
                            <li>Click the button to accept your invitation</li>
                            <li>Create your password</li>
                            <li>Complete your profile</li>
                            <li>Start collaborating with your team!</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Alternative Link -->
                <tr>
                  <td style="padding: 16px 40px 40px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #0a5082; word-break: break-all;">
                      {{ .ConfirmationURL }}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                This invitation was sent from
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500;">
                pms.qs-global-solutions.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## How to Add Templates in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**

2. For each template type:
   - **Confirm signup** → Use the "Email Confirmation" template above
   - **Magic Link** → Use the "Magic Link Email" template above
   - **Reset Password** → Use the "Password Reset Email" template above
   - **Invite user** → Use the "Invite User Email" template above

3. Make sure to update the **Site URL** and **Redirect URLs** in **URL Configuration**:
   - Site URL: `https://pms.qs-global-solutions.com`
   - Redirect URLs:
     - `https://pms.qs-global-solutions.com/auth/callback`
     - `https://pms.qs-global-solutions.com/auth/callback?type=recovery`
     - `https://pms.qs-global-solutions.com/**`

---

## Design Notes

These templates use your app's design language:
- **Primary Color**: `#0a5082` (deep blue)
- **Primary Darker**: `#084068`
- **Accent Blue**: `#3b82f6`
- **Background**: `#f8fafc` (slate-50)
- **Card Background**: `#ffffff`
- **Text Colors**:
  - Headings: `#0f172a`
  - Body: `#64748b`
  - Muted: `#94a3b8`
- **Border Radius**: 8px (buttons), 16px (cards)
- **Shadow**: Subtle box shadows for depth
