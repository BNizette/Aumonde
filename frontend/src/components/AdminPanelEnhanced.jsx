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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Trash2, KeyRound, Edit, Activity, FileText, Monitor, Power, Ban, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminPanelEnhanced = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityLogsDialogOpen, setActivityLogsDialogOpen] = useState(false);
  const [userActivityLogs, setUserActivityLogs] = useState([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    organization: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user.role === 'owner') {
        await Promise.all([
          fetchUsers(),
          fetchAuditLogs(),
          fetchSessions()
        ]);
      } else {
        setUsers([user]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await axios.get(`${API}/admin/audit-logs?limit=50`);
      setAuditLogs(response.data.logs || []);
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/admin/sessions`);
      setSessions(response.data);
    } catch (error) {
      toast.error('Failed to fetch sessions');
    }
  };

  const fetchUserActivityLogs = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}/activity-logs`);
      setUserActivityLogs(response.data);
    } catch (error) {
      toast.error('Failed to fetch activity logs');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/users/${userId}`);
      toast.success('User deleted successfully');
      fetchData();
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

  const handleEditUser = async () => {
    try {
      const updateData = user.role === 'owner' 
        ? editFormData 
        : { full_name: editFormData.full_name, email: editFormData.email };
      
      await axios.put(`${API}/admin/users/${selectedUser.id}`, updateData);
      toast.success('Profile updated successfully');
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    }
  };

  const handleChangeStatus = async (userId, newStatus) => {
    try {
      await axios.post(`${API}/admin/users/${userId}/status`, {
        status: newStatus,
        reason: statusReason || undefined
      });
      toast.success(`User account ${newStatus === 'active' ? 'activated' : newStatus}`);
      setStatusDialogOpen(false);
      setStatusReason('');
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change status');
    }
  };

  const handleForceLogout = async (sessionId) => {
    if (!window.confirm('Force logout this session?')) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/sessions/${sessionId}`);
      toast.success('Session terminated successfully');
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to terminate session');
    }
  };

  const openEditDialog = (u) => {
    setSelectedUser(u);
    setEditFormData({
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      organization: u.organization || ''
    });
    setEditDialogOpen(true);
  };

  const openActivityLogsDialog = async (u) => {
    setSelectedUser(u);
    setActivityLogsDialogOpen(true);
    await fetchUserActivityLogs(u.id);
  };

  const openStatusDialog = (u, status) => {
    setSelectedUser(u);
    setSelectedStatus(status);
    setStatusDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'disabled':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><XCircle className="w-3 h-3 mr-1" />Disabled</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300"><AlertCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getActionColor = (action) => {
    if (action.includes('delete')) return 'text-red-600';
    if (action.includes('create') || action.includes('active')) return 'text-green-600';
    if (action.includes('suspend') || action.includes('disable')) return 'text-orange-600';
    return 'text-blue-600';
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

  const isOwner = user?.role === 'owner';
  const pageTitle = isOwner ? 'Admin Panel' : 'My Profile';
  const pageDescription = isOwner ? 'Manage users, view audit logs, and monitor active sessions' : 'View and update your profile information';

  return (
    <Layout>
      <div data-testid="admin-panel" className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
          <p className="text-sm md:text-base text-gray-600">{pageDescription}</p>
        </div>

        {isOwner ? (
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Audit Trail</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">Sessions</span>
              </TabsTrigger>
            </TabsList>

            {/* USERS TAB */}
            <TabsContent value="users" className="space-y-4">
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
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Last Login</th>
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
                              <td className="py-3 px-4">
                                {getStatusBadge(u.account_status || 'active')}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatDateTime(u.last_login)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* View Activity */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openActivityLogsDialog(u)}
                                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                    title="View Activity"
                                  >
                                    <Activity className="w-4 h-4" />
                                  </Button>

                                  {/* Edit User */}
                                  <Dialog open={editDialogOpen && selectedUser?.id === u.id} onOpenChange={(open) => {
                                    setEditDialogOpen(open);
                                    if (!open) setSelectedUser(null);
                                  }}>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditDialog(u)}
                                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                        title="Edit User"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Edit User: {u.full_name}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="edit-full-name">Full Name</Label>
                                          <Input
                                            id="edit-full-name"
                                            value={editFormData.full_name}
                                            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                            className="bg-white border-gray-300"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-email">Email</Label>
                                          <Input
                                            id="edit-email"
                                            type="email"
                                            value={editFormData.email}
                                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                            className="bg-white border-gray-300"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-role">Role</Label>
                                          <select
                                            id="edit-role"
                                            value={editFormData.role}
                                            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                            className="w-full p-2 rounded-md bg-white border-gray-300 text-gray-900 border"
                                          >
                                            <option value="owner">Owner/Operator</option>
                                            <option value="master">Master</option>
                                            <option value="crew">Crew</option>
                                            <option value="designated_person">Designated Person</option>
                                            <option value="inspector">AMSA Inspector</option>
                                          </select>
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-organization">Organization</Label>
                                          <Input
                                            id="edit-organization"
                                            value={editFormData.organization}
                                            onChange={(e) => setEditFormData({ ...editFormData, organization: e.target.value })}
                                            className="bg-white border-gray-300"
                                          />
                                        </div>
                                        <Button
                                          onClick={handleEditUser}
                                          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                                        >
                                          Update User
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  {/* Account Status */}
                                  {u.id !== user.id && (
                                    <>
                                      {(u.account_status === 'disabled' || u.account_status === 'suspended') ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openStatusDialog(u, 'active')}
                                          className="text-green-600 border-green-600 hover:bg-green-50"
                                          title="Activate Account"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openStatusDialog(u, 'suspended')}
                                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                            title="Suspend Account"
                                          >
                                            <Ban className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openStatusDialog(u, 'disabled')}
                                            className="text-red-600 border-red-600 hover:bg-red-50"
                                            title="Disable Account"
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </>
                                  )}

                                  {/* Reset Password */}
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
                                        onClick={() => setSelectedUser(u)}
                                        className="text-teal-600 border-teal-600 hover:bg-teal-50"
                                        title="Reset Password"
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
                                  
                                  {/* Delete User */}
                                  {u.id !== user.id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                      title="Delete User"
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

              {/* Statistics */}
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
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">Active Users</p>
                      <p className="text-2xl font-bold text-green-900">{users.filter(u => u.account_status === 'active' || !u.account_status).length}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-700 font-medium">Suspended</p>
                      <p className="text-2xl font-bold text-orange-900">{users.filter(u => u.account_status === 'suspended').length}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">Disabled</p>
                      <p className="text-2xl font-bold text-red-900">{users.filter(u => u.account_status === 'disabled').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVITY TAB - Placeholder for now */}
            <TabsContent value="activity" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" />
                    User Activity Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Select a user from the Users tab to view their activity logs.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AUDIT TRAIL TAB */}
            <TabsContent value="audit" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Audit Trail
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchAuditLogs}
                      className="ml-auto"
                    >
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">No audit logs found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-semibold ${getActionColor(log.action)}`}>
                                  {log.action.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-sm text-gray-600">{log.admin_name}</span>
                              </div>
                              <p className="text-sm text-gray-700">
                                Target: <span className="font-medium">{log.target_name || 'N/A'}</span>
                                {log.target_type && <span className="text-gray-500"> ({log.target_type})</span>}
                              </p>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 text-right ml-4">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatDateTime(log.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SESSIONS TAB */}
            <TabsContent value="sessions" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-cyan-500" />
                    Active Sessions
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchSessions}
                      className="ml-auto"
                    >
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8">
                      <Monitor className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">No active sessions</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">IP Address</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Last Active</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Expires</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((session) => (
                            <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {session.user?.full_name || 'Unknown'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {session.user?.email || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {session.ip_address || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatDateTime(session.last_active)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatDateTime(session.expires_at)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {session.user_id !== user.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleForceLogout(session.id)}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    title="Force Logout"
                                  >
                                    <Power className="w-4 h-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          // Non-owner view - just their profile
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700">Full Name</Label>
                  <p className="text-gray-900 font-medium">{user.full_name}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Email</Label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Role</Label>
                  <p className="text-gray-900">{user.role.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Organization</Label>
                  <p className="text-gray-900">{user.organization || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Logs Dialog */}
        <Dialog open={activityLogsDialogOpen} onOpenChange={setActivityLogsDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[600px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Activity Logs - {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {userActivityLogs.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No activity logs found</p>
              ) : (
                userActivityLogs.map((log) => (
                  <div key={log.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-900">{log.activity_type.toUpperCase()}</span>
                        {log.details && <span className="text-sm text-gray-600 ml-2">{log.details}</span>}
                      </div>
                      <span className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</span>
                    </div>
                    {log.ip_address && (
                      <p className="text-xs text-gray-500 mt-1">IP: {log.ip_address}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Change Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900">
            <DialogHeader>
              <DialogTitle>Change Account Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Change <span className="font-semibold">{selectedUser?.full_name}</span>'s account status to <span className="font-semibold">{selectedStatus}</span>?
              </p>
              <div>
                <Label htmlFor="status-reason">Reason (Optional)</Label>
                <Input
                  id="status-reason"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Enter reason for status change"
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleChangeStatus(selectedUser?.id, selectedStatus)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Confirm
                </Button>
                <Button
                  onClick={() => setStatusDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminPanelEnhanced;
