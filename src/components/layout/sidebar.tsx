'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  DollarSign,
  Settings,
  ClipboardList,
  Clock,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  role: 'admin' | 'user';
  logoUrl?: string | null;
  companyName?: string;
}

export function Sidebar({ role, logoUrl, companyName = 'QS Consultancy' }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/timesheet', label: 'Timesheet', icon: Clock },
    { href: '/admin/finance', label: 'Finance', icon: DollarSign },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const userLinks = [
    { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/user/projects', label: 'My Projects', icon: FolderKanban },
    { href: '/user/timesheet', label: 'Timesheet', icon: Clock },
    { href: '/user/tasks', label: 'My Tasks', icon: ClipboardList },
  ];

  const links = role === 'admin' ? adminLinks : userLinks;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-md text-primary border border-border"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Always fixed on desktop for consistency */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 will-change-transform',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-border px-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">QS</span>
              </div>
              <span className="font-semibold text-foreground truncate">{companyName}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href ||
              (link.href !== '/admin' && link.href !== '/user' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
