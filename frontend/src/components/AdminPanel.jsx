import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/App';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Trash2, KeyRound, UserCog } from 'lucide-react';
import { toast } from 'sonner';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    organization: ''
  });

  useEffect(() => {
    if (user && (user.role === 'owner' || user.role === 'inspector')) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await axios.post(`${API}/admin/users/${selectedUser.id}/reset-password?new_password=${encodeURIComponent(newPassword)}`);
      toast.success('Password reset successfully');
      setResetDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
        </div>
      </Layout>
    );
  }

  if (!user || (user.role !== 'owner' && user.role !== 'inspector')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <UserCog className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="admin-panel" className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-sm md:text-base text-gray-600">Manage users and system settings</p>
        </div>

        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Organization</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{u.full_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded" style={{ 
                            backgroundColor: u.role === 'owner' ? '#d1fae5' : u.role === 'inspector' ? '#dbeafe' : '#fef3c7',
                            color: u.role === 'owner' ? '#065f46' : u.role === 'inspector' ? '#1e40af' : '#92400e'
                          }}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.organization || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog open={resetDialogOpen && selectedUser?.id === u.id} onOpenChange={(open) => {
                              setResetDialogOpen(open);
                              if (!open) {
                                setSelectedUser(null);
                                setNewPassword('');
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid={`reset-password-${u.id}`}
                                  onClick={() => setSelectedUser(u)}
                                  className="text-teal-600 border-teal-600 hover:bg-teal-50"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white border-gray-200 text-gray-900">
                                <DialogHeader>
                                  <DialogTitle>Reset Password for {u.full_name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                      id="newPassword"
                                      type="password"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      placeholder="Enter new password"
                                      className="bg-white border-gray-300"
                                    />
                                  </div>
                                  <Button
                                    onClick={handleResetPassword}
                                    className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                                  >
                                    Reset Password
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {u.id !== user.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                data-testid={`delete-user-${u.id}`}
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">System Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-teal-50 rounded-lg">
                <p className="text-sm text-teal-700 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-teal-900">{users.length}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Owners</p>
                <p className="text-2xl font-bold text-blue-900">{users.filter(u => u.role === 'owner').length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700 font-medium">Masters</p>
                <p className="text-2xl font-bold text-purple-900">{users.filter(u => u.role === 'master').length}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700 font-medium">Crew</p>
                <p className="text-2xl font-bold text-amber-900">{users.filter(u => u.role === 'crew').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPanel;
