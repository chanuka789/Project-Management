'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CompanySettings } from '@/types/database';

export function useCompanySettings() {
  const [companyName, setCompanyName] = useState<string>('QS Consultancy');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
          setCompanyName(settings.company_name || 'QS Consultancy');
          setLogoUrl(settings.logo_url || null);
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
        // Keep defaults if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [supabase]);

  return { companyName, logoUrl, isLoading };
}
