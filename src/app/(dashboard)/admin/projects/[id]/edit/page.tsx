'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCompanySettings } from '@/hooks/use-company-settings';
import type { User, Project, SupportedCurrency } from '@/types/database';
import { SUPPORTED_CURRENCIES, DEFAULT_EXCHANGE_RATES, convertToAED, formatCurrencyWithCode } from '@/lib/currency';

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    client_name: '',
    status: 'planning',
    contract_value: '',
    currency: 'AED' as SupportedCurrency,
    exchange_rate: 1.0,
    start_date: '',
    end_date: '',
  });
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

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

        // Fetch project data
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;

        if (projectData) {
          setFormData({
            name: projectData.name || '',
            description: projectData.description || '',
            location: projectData.location || '',
            client_name: projectData.client_name || '',
            status: projectData.status || 'planning',
            contract_value: projectData.contract_value?.toString() || '',
            currency: (projectData.currency as SupportedCurrency) || 'AED',
            exchange_rate: projectData.exchange_rate || DEFAULT_EXCHANGE_RATES[projectData.currency as SupportedCurrency] || 1.0,
            start_date: projectData.start_date || '',
            end_date: projectData.end_date || '',
          });
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Calculate exchange rate and AED equivalent
      const contractValue = parseFloat(formData.contract_value) || 0;
      const exchangeRate = DEFAULT_EXCHANGE_RATES[formData.currency];
      const contractValueAed = formData.currency === 'AED'
        ? contractValue
        : convertToAED(contractValue, formData.currency, exchangeRate);

      const { data, error } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          description: formData.description || null,
          location: formData.location || null,
          client_name: formData.client_name || null,
          status: formData.status,
          contract_value: contractValue,
          contract_value_aed: contractValueAed,
          currency: formData.currency,
          exchange_rate: exchangeRate,
          exchange_rate_date: new Date().toISOString().split('T')[0],
          start_date: formData.start_date,
          end_date: formData.end_date,
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Error updating project:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from update');
      }

      toast.success('Project updated successfully!');
      router.push(`/admin/projects/${projectId}`);
    } catch (error: any) {
      console.error('Error updating project:', error);
      const errorMessage = error?.message || 'Failed to update project';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Edit Project" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="Edit Project" logoUrl={logoUrl} companyName={companyName}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/admin/projects/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Edit Project</h2>
            <p className="text-sm text-muted-foreground">Update project information and settings</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Basic Information
                </h3>

                <Input
                  label="Project Name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter project name"
                  required
                />

                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the project objectives and scope"
                  rows={4}
                />

                <Textarea
                  label="Location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Enter project location"
                  rows={3}
                />

                <Input
                  label="Client Name"
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  placeholder="Enter client or company name"
                />
              </div>

              {/* Project Settings */}
              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Project Settings
                </h3>

                <Select
                  label="Project Status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  options={[
                    { value: 'planning', label: 'Planning' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'on_hold', label: 'On Hold' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Currency"
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    options={SUPPORTED_CURRENCIES.map(c => ({
                      value: c.code,
                      label: `${c.flag} ${c.code} - ${c.name}`
                    }))}
                  />
                  <Input
                    label={`Contract Value (${formData.currency})`}
                    type="number"
                    value={formData.contract_value}
                    onChange={(e) => handleChange('contract_value', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* AED Equivalent Preview */}
                {formData.currency !== 'AED' && formData.contract_value && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">AED Equivalent (at current rate):</span>
                      <span className="text-lg font-semibold text-primary">
                        {formatCurrencyWithCode(
                          convertToAED(
                            parseFloat(formData.contract_value) || 0,
                            formData.currency,
                            DEFAULT_EXCHANGE_RATES[formData.currency]
                          ),
                          'AED'
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exchange Rate: 1 {formData.currency} = {DEFAULT_EXCHANGE_RATES[formData.currency].toFixed(4)} AED
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Project Timeline
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    required
                  />

                  <Input
                    label="End Date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border">
                <Link href={`/admin/projects/${projectId}`}>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  isLoading={isSaving}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
