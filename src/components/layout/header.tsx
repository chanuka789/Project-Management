'use client';

import { Bell, Search, Settings } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import type { User } from '@/types/database';

interface HeaderProps {
  user: User | null;
  title?: string;
}

export function Header({ user, title }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-black hidden lg:block">
          {title || 'Dashboard'}
        </h1>
      </div>

      {/* Search (hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search projects, users..."
            className="pl-10 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-[#0a5082] rounded-full" />
        </button>

        {/* Settings (Admin only) */}
        {user?.role === 'admin' && (
          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        )}

        {/* User profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-black">{user?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
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
