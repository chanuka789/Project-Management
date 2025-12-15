'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import {
  Settings,
  Building2,
  Upload,
  Save,
  Trash2,
  Image,
} from 'lucide-react';
import type { User, CompanySettings } from '@/types/database';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyName, setCompanyName] = useState('QS Consultancy');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          setUser(profile);
        }

        // Fetch company settings
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('*')
          .single();

        if (settingsData) {
          setSettings(settingsData);
          setCompanyName(settingsData.company_name);
          setLogoUrl(settingsData.logo_url);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      let uploadedLogoUrl = logoUrl;

      // Upload logo if new file selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('company-assets')
          .getPublicUrl(fileName);

        uploadedLogoUrl = publicUrl;
      }

      // Update or insert settings
      const settingsData = {
        company_name: companyName,
        logo_url: uploadedLogoUrl,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('company_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert(settingsData);

        if (error) throw error;
      }

      alert('Settings saved successfully!');
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    setLogoFile(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="Settings">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-black">Settings</h2>
          <p className="text-gray-500 mt-1">
            Manage company branding and system settings
          </p>
        </div>

        {/* Company Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#0a5082]" />
              Company Branding
            </CardTitle>
            <CardDescription>
              Customize your company name and logo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Name */}
            <Input
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Company Logo
              </label>
              <div className="flex items-start gap-6">
                {/* Preview */}
                <div className="flex-shrink-0">
                  {logoUrl ? (
                    <div className="relative">
                      <img
                        src={logoUrl}
                        alt="Company Logo"
                        className="h-24 w-24 object-contain rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-fit">
                      <Upload className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Upload Logo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Recommended: PNG or SVG, max 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Colors</CardTitle>
            <CardDescription>
              The approved brand colors for the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200">
                <div className="h-12 w-12 rounded-lg bg-[#0a5082]" />
                <div>
                  <p className="font-medium text-black">Primary</p>
                  <p className="text-sm text-gray-500">#0a5082</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200">
                <div className="h-12 w-12 rounded-lg bg-white border border-gray-200" />
                <div>
                  <p className="font-medium text-black">White</p>
                  <p className="text-sm text-gray-500">#FFFFFF</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200">
                <div className="h-12 w-12 rounded-lg bg-black" />
                <div>
                  <p className="font-medium text-black">Black</p>
                  <p className="text-sm text-gray-500">#000000</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
