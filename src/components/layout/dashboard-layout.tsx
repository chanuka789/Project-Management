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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        role={user?.role || 'user'}
        logoUrl={logoUrl}
        companyName={companyName}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Header user={user} title={title} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
