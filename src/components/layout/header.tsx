'use client';

import { Bell, Settings } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { GlobalSearch } from '@/components/ui/search';
import { SimpleThemeToggle, ThemeToggle } from '@/components/ui/theme-toggle';
import type { User } from '@/types/database';

interface HeaderProps {
  user: User | null;
  title?: string;
  logoUrl?: string | null;
  companyName?: string;
}

export function Header({ user, title, logoUrl, companyName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 sm:px-6">
      {/* Left side - Company Branding */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Company Logo and Name - visible on mobile, only show when loaded */}
        {companyName && (
          <div className="flex items-center gap-2 lg:hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {companyName.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-semibold text-foreground truncate max-w-[100px] sm:max-w-[150px]">
              {companyName}
            </span>
          </div>
        )}

        {/* Page Title - visible on desktop */}
        <h1 className="text-xl font-semibold text-foreground hidden lg:block">
          {title || 'Dashboard'}
        </h1>
      </div>

      {/* Search (hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme toggle - Full on desktop, Simple on mobile */}
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
        <div className="block md:hidden">
          <SimpleThemeToggle />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
        </button>

        {/* Settings (Admin only, hidden on mobile) */}
        {user?.role === 'admin' && (
          <button className="hidden sm:block p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        )}

        {/* User profile */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground">{user?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role || 'User'}</p>
          </div>
          <Avatar
            name={user?.full_name || 'User'}
            src={user?.avatar_url}
            size="md"
          />
        </div>
      </div>
    </header>
  );
}
