'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, FolderKanban, User as UserIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { User, Project } from '@/types/database';

interface SearchResult {
  type: 'project' | 'user';
  id: string;
  name: string;
  description?: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function
  useEffect(() => {
    const searchData = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const searchTerm = `%${query}%`;

        // Search projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, description')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);

        // Search users
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        const searchResults: SearchResult[] = [
          ...(projects?.map(p => ({
            type: 'project' as const,
            id: p.id,
            name: p.name,
            description: p.description || undefined,
          })) || []),
          ...(users?.map(u => ({
            type: 'user' as const,
            id: u.id,
            name: u.full_name,
            description: u.email,
          })) || []),
        ];

        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query, supabase]);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');

    if (result.type === 'project') {
      router.push(`/admin/projects/${result.id}`);
    } else {
      router.push(`/admin/users/${result.id}`);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects, users..."
          className="pl-10 pr-10 bg-muted border-border"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <div className="mt-1">
                  {result.type === 'project' ? (
                    <FolderKanban className="h-4 w-4 text-primary" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {result.name}
                  </p>
                  {result.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {result.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.type === 'project' ? 'Project' : 'User'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
          <p className="text-sm text-muted-foreground text-center">
            No results found for &quot;{query}&quot;
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
          <p className="text-sm text-muted-foreground text-center">
            Searching...
          </p>
        </div>
      )}
    </div>
  );
}
