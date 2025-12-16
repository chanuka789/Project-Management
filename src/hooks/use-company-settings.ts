'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CompanySettings } from '@/types/database';

const CACHE_KEY_COMPANY_NAME = 'qs_company_name';
const CACHE_KEY_LOGO_URL = 'qs_logo_url';

// Get cached values synchronously to prevent flash
function getCachedSettings() {
  if (typeof window === 'undefined') {
    return { companyName: 'QS Consultancy', logoUrl: null };
  }

  try {
    const cachedName = localStorage.getItem(CACHE_KEY_COMPANY_NAME);
    const cachedLogo = localStorage.getItem(CACHE_KEY_LOGO_URL);

    return {
      companyName: cachedName || 'QS Consultancy',
      logoUrl: cachedLogo === 'null' || !cachedLogo ? null : cachedLogo,
    };
  } catch {
    return { companyName: 'QS Consultancy', logoUrl: null };
  }
}

export function useCompanySettings() {
  // Initialize with cached values to prevent flash
  const cached = getCachedSettings();
  const [companyName, setCompanyName] = useState<string>(cached.companyName);
  const [logoUrl, setLogoUrl] = useState<string | null>(cached.logoUrl);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('company_settings')
          .select('*')
          .single();

        if (settings) {
          const newCompanyName = settings.company_name || 'QS Consultancy';
          const newLogoUrl = settings.logo_url || null;

          setCompanyName(newCompanyName);
          setLogoUrl(newLogoUrl);

          // Cache the values in localStorage
          try {
            localStorage.setItem(CACHE_KEY_COMPANY_NAME, newCompanyName);
            localStorage.setItem(CACHE_KEY_LOGO_URL, newLogoUrl || 'null');
          } catch {
            // Ignore localStorage errors
          }
        } else {
          // No settings found, use defaults
          setCompanyName('QS Consultancy');
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
        // Use defaults if fetch fails (cached values already set)
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [supabase]);

  return { companyName, logoUrl, isLoading };
}
