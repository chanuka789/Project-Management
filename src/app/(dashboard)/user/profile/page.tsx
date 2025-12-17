'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserForm } from '@/components/users/user-form';
import { useCompanySettings } from '@/hooks/use-company-settings';
import toast from 'react-hot-toast';
import type { User } from '@/types/database';
import { User as UserIcon } from 'lucide-react';

export default function UserProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();
    const { companyName, logoUrl } = useCompanySettings();

    const fetchUser = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                setIsLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            setUser(profile);
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handleUpdateProfile = async (updatedData: Partial<User>) => {
        if (!user) return;

        setIsSaving(true);
        try {
            // Prevent users from updating restricted fields
            const { role, hourly_rate, ...allowedUpdates } = updatedData;

            const { error } = await supabase
                .from('users')
                .update(allowedUpdates)
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Profile updated successfully');
            fetchUser(); // Refresh data
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout user={user} title="My Profile" logoUrl={logoUrl} companyName={companyName}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} title="My Profile" logoUrl={logoUrl} companyName={companyName}>
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-[#0a5082]" />
                            <div>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your personal details below.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {user && (
                            <UserForm
                                initialData={user}
                                isAdmin={false} // Regular users cannot edit admin fields
                                onSubmit={handleUpdateProfile}
                                onCancel={() => { }} // No cancel action needed for main page form
                                isLoading={isSaving}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
