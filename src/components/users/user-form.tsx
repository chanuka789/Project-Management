'use client';

import { useState } from 'react';
import { User, UserRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface UserFormProps {
    initialData: User;
    isAdmin: boolean;
    onSubmit: (data: Partial<User>) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export function UserForm({
    initialData,
    isAdmin,
    onSubmit,
    onCancel,
    isLoading = false,
}: UserFormProps) {
    const [formData, setFormData] = useState<Partial<User>>({
        full_name: initialData.full_name,
        phone: initialData.phone || '',
        birthday: initialData.birthday || '',
        location: initialData.location || '',
        hourly_rate: initialData.hourly_rate,
        role: initialData.role,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
                <Input
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    disabled={isLoading}
                />

                <Input
                    label="Email"
                    value={initialData.email}
                    disabled={true}
                    helperText="Email cannot be changed directly."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={isLoading}
                    />

                    <Input
                        type="date"
                        label="Birthday"
                        value={formData.birthday ? new Date(formData.birthday).toISOString().split('T')[0] : ''}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        disabled={isLoading}
                    />
                </div>

                <Input
                    label="Location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={isLoading}
                />

                {isAdmin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                        <Select
                            label="Role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                            options={[
                                { value: 'user', label: 'User' },
                                { value: 'admin', label: 'Admin' },
                            ]}
                            disabled={isLoading}
                        />

                        <Input
                            type="number"
                            label="Hourly Rate"
                            value={formData.hourly_rate}
                            onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.01"
                            disabled={isLoading}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
