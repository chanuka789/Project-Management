'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import type { User } from '@/types/database';

interface DashboardLayoutProps {
  children: ReactNode;
  user: User | null;
  title?: string;
  logoUrl?: string | null;
  companyName?: string;
}

export function DashboardLayout({
  children,
  user,
  title,
  logoUrl,
  companyName,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Fixed position */}
      <Sidebar
        role={user?.role || 'user'}
        logoUrl={logoUrl}
        companyName={companyName}
      />

      {/* Main content - offset for fixed sidebar on large screens */}
      <div className="flex flex-col min-h-screen lg:ml-64">
        {/* Header - sticky within main content */}
        <Header
          user={user}
          title={title}
          logoUrl={logoUrl}
          companyName={companyName}
        />
        {/* Page content with smooth transitions */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
