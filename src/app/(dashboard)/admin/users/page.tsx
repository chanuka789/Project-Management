'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import {
  Plus,
  Search,
  Users,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Save,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react';
import type { User } from '@/types/database';

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    birthday: '',
    role: 'user',
    hourly_rate: '',
  });
  const [newUserForm, setNewUserForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    role: 'user',
    hourly_rate: '',
    password: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createdUserCreds, setCreatedUserCreds] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  // Generate a random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

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
          setCurrentUser(profile);
        }

        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        setUsers(usersData || []);
        setFilteredUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, users]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      location: user.location || '',
      birthday: user.birthday || '',
      role: user.role,
      hourly_rate: user.hourly_rate.toString(),
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          location: formData.location || null,
          birthday: formData.birthday || null,
          role: formData.role,
          hourly_rate: parseFloat(formData.hourly_rate) || 0,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Refresh data
      const { data: updatedUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(updatedUsers || []);
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userToDelete.id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
    setUserToDelete(null);
  };

  const handleOpenAddModal = () => {
    setNewUserForm({
      full_name: '',
      email: '',
      phone: '',
      location: '',
      role: 'user',
      hourly_rate: '',
      password: '',
    });
    setCreatedUserCreds(null);
    setShowAddModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Create auth user using signUp
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: newUserForm.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Create user profile in users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: newUserForm.email,
            full_name: newUserForm.full_name,
            phone: newUserForm.phone || null,
            location: newUserForm.location || null,
            role: newUserForm.role,
            hourly_rate: parseFloat(newUserForm.hourly_rate) || 0,
          });

        if (profileError) throw profileError;

        // Show credentials to admin
        setCreatedUserCreds({
          email: newUserForm.email,
          password: newUserForm.password,
        });

        // Refresh users list
        const { data: updatedUsers } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        setUsers(updatedUsers || []);
      }
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      alert(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setCreatedUserCreds(null);
    setNewUserForm({
      full_name: '',
      email: '',
      phone: '',
      location: '',
      role: 'user',
      hourly_rate: '',
      password: '',
    });
  };

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout user={currentUser} title="Users" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={currentUser} title="Users" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">User Management</h2>
            <p className="text-gray-500 mt-1">
              Manage team members, roles, and hourly rates
            </p>
          </div>
          <Button onClick={handleOpenAddModal}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={roleOptions}
                className="w-full sm:w-40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No users found"
                description={searchTerm || roleFilter !== 'all'
                  ? "Try adjusting your search or filter"
                  : "No users in the system yet"
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={user.full_name} src={user.avatar_url} />
                          <div>
                            <p className="font-medium text-black">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.location ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {user.location}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'primary' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium text-[#0a5082]">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(user.hourly_rate)}/hr
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/users/${user.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteClick(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          title="Edit User"
          size="md"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <Input
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              disabled
              helperText="Email cannot be changed"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
              <Input
                label="Hourly Rate (AED)"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add User Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={handleCloseAddModal}
          title={createdUserCreds ? "User Created Successfully" : "Add New User"}
          size="md"
        >
          {createdUserCreds ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium mb-2">
                  User has been created successfully!
                </p>
                <p className="text-sm text-green-700">
                  Share the following credentials with the new user. They can change their password after logging in.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="font-mono text-sm">{createdUserCreds.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyToClipboard(createdUserCreds.email, 'email')}
                  >
                    {copiedField === 'email' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Temporary Password</p>
                    <p className="font-mono text-sm">{createdUserCreds.password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyToClipboard(createdUserCreds.password, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleCloseAddModal}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label="Full Name"
                value={newUserForm.full_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                placeholder="Enter full name"
                required
              />
              <Input
                label="Email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
                <Input
                  label="Location"
                  value={newUserForm.location}
                  onChange={(e) => setNewUserForm({ ...newUserForm, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Role"
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  options={[
                    { value: 'user', label: 'User' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
                <Input
                  label="Hourly Rate (AED)"
                  type="number"
                  value={newUserForm.hourly_rate}
                  onChange={(e) => setNewUserForm({ ...newUserForm, hourly_rate: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      label="Password"
                      type="text"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      placeholder="Enter password or generate one"
                      required
                    />
                  </div>
                  <div className="mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewUserForm({ ...newUserForm, password: generatePassword() })}
                      title="Generate Password"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  This password will be shown after user creation. Make sure to share it securely.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseAddModal}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isCreating}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Password Confirmation Modal */}
        <PasswordConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setUserToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete User"
          description="This will permanently delete this user and all their associated data including time entries and task assignments."
          itemName={userToDelete?.full_name}
        />
      </div>
    </DashboardLayout>
  );
}
