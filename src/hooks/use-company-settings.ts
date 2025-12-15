'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CompanySettings } from '@/types/database';

export function useCompanySettings() {
  const [companyName, setCompanyName] = useState<string>('');
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
        } else {
          // No settings found, use defaults
          setCompanyName('QS Consultancy');
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
        // Use defaults if fetch fails
        setCompanyName('QS Consultancy');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [supabase]);

  return { companyName, logoUrl, isLoading };
}
