'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useCompanySettings } from '@/hooks/use-company-settings';
import Link from 'next/link';
import type { User, SupportedCurrency } from '@/types/database';
import { SUPPORTED_CURRENCIES, DEFAULT_EXCHANGE_RATES, convertToAED, formatCurrencyWithCode } from '@/lib/currency';

export default function NewProjectPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    description: '',
    location: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    contract_value: '',
    currency: 'AED' as SupportedCurrency,
    status: 'planning',
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(profile);
      }

      // Fetch users for assignment
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('full_name');
      setUsers(usersData || []);
    };

    fetchData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      // Calculate exchange rate and AED equivalent
      const contractValue = parseFloat(formData.contract_value) || 0;
      const exchangeRate = DEFAULT_EXCHANGE_RATES[formData.currency];
      const contractValueAed = formData.currency === 'AED'
        ? contractValue
        : convertToAED(contractValue, formData.currency, exchangeRate);

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          client_name: formData.client_name || null,
          description: formData.description || null,
          location: formData.location || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          contract_value: contractValue,
          contract_value_aed: contractValueAed,
          currency: formData.currency,
          exchange_rate: exchangeRate,
          exchange_rate_date: new Date().toISOString().split('T')[0],
          status: formData.status,
          created_by: authUser?.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Assign users to project
      if (selectedUsers.length > 0 && project) {
        const projectUsers = selectedUsers.map(userId => ({
          project_id: project.id,
          user_id: userId,
        }));

        const { error: assignError } = await supabase
          .from('project_users')
          .insert(projectUsers);

        if (assignError) throw assignError;
      }

      router.push('/admin/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <DashboardLayout user={user} title="New Project" logoUrl={logoUrl} companyName={companyName}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-black">Create New Project</h2>
            <p className="text-gray-500 mt-1">
              Fill in the details to create a new project
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Name */}
              <Input
                label="Project Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
                required
              />

              {/* Client Name */}
              <Input
                label="Client Name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Enter client name"
              />

              {/* Description */}
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter project description"
                rows={4}
              />

              {/* Location */}
              <Textarea
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter project location"
                rows={3}
              />

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>

              {/* Currency & Contract Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as SupportedCurrency })}
                  options={SUPPORTED_CURRENCIES.map(c => ({
                    value: c.code,
                    label: `${c.flag} ${c.code} - ${c.name}`
                  }))}
                />
                <Input
                  label={`Contract Value (${formData.currency})`}
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={statusOptions}
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

              {/* Team Assignment */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Assign Team Members
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          }
                        }}
                        className="rounded border-gray-300 text-[#0a5082] focus:ring-[#0a5082]"
                      />
                      <span className="text-sm">{u.full_name}</span>
                      <span className="text-xs text-gray-500">({u.email})</span>
                    </label>
                  ))}
                  {users.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-2 text-center py-4">
                      No users available
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Link href="/admin/projects">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" isLoading={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
