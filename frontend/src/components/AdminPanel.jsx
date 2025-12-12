import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Edit, RefreshCw, Key, XCircle, UserPlus, Users as UsersIcon, Download, Upload, Database, AlertCircle, Search, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackupManagement from './BackupManagement';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [crewMembers, setCrewMembers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'Crew',
    access_level: ''
  });
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);

  // Filter states for Users
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userAccessFilter, setUserAccessFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSort, setUserSort] = useState('name');
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Filter states for Activity Logs
  const [activitySearch, setActivitySearch] = useState('');
  const [activityUserFilter, setActivityUserFilter] = useState('all');
  const [activitySort, setActivitySort] = useState('date');
  const [filteredActivityLogs, setFilteredActivityLogs] = useState([]);

  // Filter states for Audit Logs
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditUserFilter, setAuditUserFilter] = useState('all');
  const [auditSort, setAuditSort] = useState('date');
  const [filteredAuditLogs, setFilteredAuditLogs] = useState([]);

  // Filter states for Sessions
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionUserFilter, setSessionUserFilter] = useState('all');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
  const [sessionSort, setSessionSort] = useState('date');
  const [filteredSessions, setFilteredSessions] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyUserFilters();
  }, [userSearch, userRoleFilter, userAccessFilter, userStatusFilter, userSort, users]);

  useEffect(() => {
    applyActivityFilters();
  }, [activitySearch, activityUserFilter, activitySort, activityLogs]);

  useEffect(() => {
    applyAuditFilters();
  }, [auditSearch, auditActionFilter, auditUserFilter, auditSort, auditLogs]);

  useEffect(() => {
    applySessionFilters();
  }, [sessionSearch, sessionUserFilter, sessionStatusFilter, sessionSort, sessions]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, activityRes, auditRes, sessionsRes, crewRes] = await Promise.all([
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/activity-logs`, { headers }),
        axios.get(`${API}/audit-logs`, { headers }),
        axios.get(`${API}/sessions`, { headers }),
        axios.get(`${API}/crew`, { headers })
      ]);

      setUsers(usersRes.data);
      setActivityLogs(activityRes.data);
      setAuditLogs(auditRes.data);
      setSessions(sessionsRes.data);
      setCrewMembers(crewRes.data);
    } catch (err) {
      setError('Error fetching data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for Users
  const applyUserFilters = () => {
    let filtered = [...users];

    if (userSearch) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.role?.toLowerCase().includes(userSearch.toLowerCase())
      );
    }

    if (userRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === userRoleFilter);
    }

    if (userAccessFilter !== 'all') {
      filtered = filtered.filter(user => user.access_level === userAccessFilter);
    }

    if (userStatusFilter !== 'all') {
      filtered = filtered.filter(user => user.account_status === userStatusFilter);
    }

    filtered.sort((a, b) => {
      switch (userSort) {
        case 'name':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'email':
          return (a.email || '').localeCompare(b.email || '');
        case 'role':
          return (a.role || '').localeCompare(b.role || '');
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  // Filter logic for Activity Logs
  const applyActivityFilters = () => {
    let filtered = [...activityLogs];

    if (activitySearch) {
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        log.details?.toLowerCase().includes(activitySearch.toLowerCase())
      );
    }

    if (activityUserFilter !== 'all') {
      filtered = filtered.filter(log => log.user_email === activityUserFilter);
    }

    filtered.sort((a, b) => {
      switch (activitySort) {
        case 'date':
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        case 'user':
          return (a.user_email || '').localeCompare(b.user_email || '');
        case 'action':
          return (a.action || '').localeCompare(b.action || '');
        default:
          return 0;
      }
    });

    setFilteredActivityLogs(filtered);
  };

  // Filter logic for Audit Logs
  const applyAuditFilters = () => {
    let filtered = [...auditLogs];

    if (auditSearch) {
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.resource_type?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.details?.toLowerCase().includes(auditSearch.toLowerCase())
      );
    }

    if (auditActionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === auditActionFilter);
    }

    if (auditUserFilter !== 'all') {
      filtered = filtered.filter(log => log.user_email === auditUserFilter);
    }

    filtered.sort((a, b) => {
      switch (auditSort) {
        case 'date':
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        case 'user':
          return (a.user_email || '').localeCompare(b.user_email || '');
        case 'action':
          return (a.action || '').localeCompare(b.action || '');
        default:
          return 0;
      }
    });

    setFilteredAuditLogs(filtered);
  };

  // Filter logic for Sessions
  const applySessionFilters = () => {
    let filtered = [...sessions];

    if (sessionSearch) {
      filtered = filtered.filter(session =>
        session.user_email?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        session.ip_address?.includes(sessionSearch)
      );
    }

    if (sessionUserFilter !== 'all') {
      filtered = filtered.filter(session => session.user_email === sessionUserFilter);
    }

    if (sessionStatusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(session => {
        const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
        if (sessionStatusFilter === 'active') {
          return expiresAt && expiresAt > now;
        } else if (sessionStatusFilter === 'expired') {
          return expiresAt && expiresAt <= now;
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      switch (sessionSort) {
        case 'date':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'user':
          return (a.user_email || '').localeCompare(b.user_email || '');
        case 'expires':
          return new Date(a.expires_at || 0) - new Date(b.expires_at || 0);
        default:
          return 0;
      }
    });

    setFilteredSessions(filtered);
  };

  const clearUserFilters = () => {
    setUserSearch('');
    setUserRoleFilter('all');
    setUserAccessFilter('all');
    setUserStatusFilter('all');
    setUserSort('name');
  };

  const clearActivityFilters = () => {
    setActivitySearch('');
    setActivityUserFilter('all');
    setActivitySort('date');
  };

  const clearAuditFilters = () => {
    setAuditSearch('');
    setAuditActionFilter('all');
    setAuditUserFilter('all');
    setAuditSort('date');
  };

  const clearSessionFilters = () => {
    setSessionSearch('');
    setSessionUserFilter('all');
    setSessionStatusFilter('all');
    setSessionSort('date');
  };

  const hasActiveUserFilters = userSearch || userRoleFilter !== 'all' || userAccessFilter !== 'all' || userStatusFilter !== 'all' || userSort !== 'name';
  const hasActiveActivityFilters = activitySearch || activityUserFilter !== 'all' || activitySort !== 'date';
  const hasActiveAuditFilters = auditSearch || auditActionFilter !== 'all' || auditUserFilter !== 'all' || auditSort !== 'date';
  const hasActiveSessionFilters = sessionSearch || sessionUserFilter !== 'all' || sessionStatusFilter !== 'all' || sessionSort !== 'date';

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/auth/register`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('User created successfully');
      setCreateDialogOpen(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'Crew',
        access_level: ''
      });
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating user');
    }
  };

  const handleUpdateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/users/${editingUser.id}`, {
        full_name: editingUser.full_name,
        role: editingUser.role,
        access_level: editingUser.access_level,
        account_status: editingUser.account_status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('User updated successfully');
      setEditDialogOpen(false);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error updating user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('User deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting user');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/users/${resetPasswordUser.id}/reset-password`, {
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Password reset successfully');
      setResetPasswordUser(null);
      setNewPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error resetting password');
    }
  };

  const handleForceLogout = async (sessionId) => {
    if (!window.confirm('Force logout this session?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Session terminated successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error terminating session');
    }
  };

  const findCrewByEmail = (email) => {
    return crewMembers.find(crew => crew.email?.toLowerCase() === email.toLowerCase());
  };

  const handleCrewLink = (user) => {
    const crewMember = findCrewByEmail(user.email);
    
    if (crewMember) {
      // Navigate to crew page and trigger edit
      navigate('/crew', { state: { editCrewId: crewMember.id } });
    } else {
      // Navigate to crew page and trigger create with pre-filled email
      navigate('/crew', { state: { createWithEmail: user.email, createWithName: user.full_name } });
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Active': 'bg-green-100 text-green-800',
      'Disabled': 'bg-red-100 text-red-800',
      'Suspended': 'bg-orange-100 text-orange-800'
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  const getAccessBadge = (level) => {
    const variants = {
      'View': 'bg-blue-100 text-blue-800',
      'Edit': 'bg-purple-100 text-purple-800',
      'Full': 'bg-indigo-100 text-indigo-800'
    };
    return <Badge className={variants[level] || ''}>{level}</Badge>;
  };

  const getActionBadge = (action) => {
    const variants = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'password_reset': 'bg-orange-100 text-orange-800',
      'status_change': 'bg-purple-100 text-purple-800'
    };
    return <Badge className={variants[action] || ''}>{action}</Badge>;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Backup & Restore Functions
  const fetchBackupInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/backup/info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackupInfo(response.data);
    } catch (err) {
      setError('Error fetching backup info');
      console.error(err);
    }
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/backup/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `amsa_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage('Database backup exported successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error exporting backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async () => {
    if (!restoreFile) {
      setError('Please select a backup file first');
      return;
    }

    if (!window.confirm('⚠️ WARNING: This will restore data from the backup file. Are you sure you want to continue?')) {
      return;
    }

    setBackupLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', restoreFile);
      
      const response = await axios.post(`${API}/backup/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessage(`Database restored successfully! Restored ${Object.keys(response.data.collections_restored || {}).length} collections.`);
      setRestoreFile(null);
      fetchData();
      fetchBackupInfo();
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error importing backup');
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const canEdit = currentUser.access_level === 'Edit' || currentUser.access_level === 'Full';
  const canDelete = currentUser.access_level === 'Full';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-gray-500 mt-1">Manage users, view activity logs, and monitor sessions</p>
      </div>

      {message && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage all users in the system</CardDescription>
                </div>
                {canEdit && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users by name, email, or role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Role" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                        <SelectItem value="Crew">Crew</SelectItem>
                        <SelectItem value="Designated Person">Designated Person</SelectItem>
                        <SelectItem value="Inspector">Inspector</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={userAccessFilter} onValueChange={setUserAccessFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Access Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Access</SelectItem>
                        <SelectItem value="View">View</SelectItem>
                        <SelectItem value="Edit">Edit</SelectItem>
                        <SelectItem value="Full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Disabled">Disabled</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-40">
                    <Select value={userSort} onValueChange={setUserSort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredUsers.length} of {users.length} users
                  </p>
                  {hasActiveUserFilters && (
                    <Button variant="outline" size="sm" onClick={clearUserFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                          {users.length === 0 ? 'No users found' : 'No users match your filters'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{getAccessBadge(user.access_level)}</TableCell>
                        <TableCell>{getStatusBadge(user.account_status)}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(user.last_login)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {(user.role === 'Owner' || user.role === 'Master' || user.role === 'Crew') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCrewLink(user)}
                                title={findCrewByEmail(user.email) ? 'View crew record' : 'Create crew record'}
                                className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                              >
                                <UsersIcon className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Crew</span>
                              </Button>
                            )}
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setResetPasswordUser(user)}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {canDelete && user.id !== currentUser.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIVITY LOGS TAB */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Track all login/logout activities</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by user, action, or details..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Select value={activityUserFilter} onValueChange={setActivityUserFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="User" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {[...new Set(activityLogs.map(log => log.user_email).filter(Boolean))].map(email => (
                          <SelectItem key={email} value={email}>{email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-40">
                    <Select value={activitySort} onValueChange={setActivitySort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date (Newest)</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {Math.min(filteredActivityLogs.length, 50)} of {activityLogs.length} activity logs (max 50 displayed)
                  </p>
                  {hasActiveActivityFilters && (
                    <Button variant="outline" size="sm" onClick={clearActivityFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          {activityLogs.length === 0 ? 'No activity logs found' : 'No logs match your filters'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivityLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.user_email}</TableCell>
                        <TableCell>
                          <Badge variant={log.action === 'login' ? 'default' : 'secondary'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.ip_address || 'N/A'}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{log.user_agent || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(log.timestamp)}</TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT TRAIL TAB */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Complete log of all administrative actions</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by admin, action, resource type, or details..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Action" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        {[...new Set(auditLogs.map(log => log.action).filter(Boolean))].map(action => (
                          <SelectItem key={action} value={action}>{action}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={auditUserFilter} onValueChange={setAuditUserFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="User" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {[...new Set(auditLogs.map(log => log.user_email).filter(Boolean))].map(email => (
                          <SelectItem key={email} value={email}>{email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-40">
                    <Select value={auditSort} onValueChange={setAuditSort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date (Newest)</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {Math.min(filteredAuditLogs.length, 50)} of {auditLogs.length} audit logs (max 50 displayed)
                  </p>
                  {hasActiveAuditFilters && (
                    <Button variant="outline" size="sm" onClick={clearAuditFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          {auditLogs.length === 0 ? 'No audit logs found' : 'No logs match your filters'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAuditLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.admin_name}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>{log.target_type}</TableCell>
                        <TableCell>{log.target_name}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(log.timestamp)}</TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SESSIONS TAB */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Monitor and manage all active user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by user email or IP address..."
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Select value={sessionUserFilter} onValueChange={setSessionUserFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="User" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {[...new Set(sessions.map(s => s.user_email).filter(Boolean))].map(email => (
                          <SelectItem key={email} value={email}>{email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={sessionStatusFilter} onValueChange={setSessionStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sessions</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-40">
                    <Select value={sessionSort} onValueChange={setSessionSort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Last Active</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="expires">Expires</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredSessions.length} of {sessions.length} sessions
                  </p>
                  {hasActiveSessionFilters && (
                    <Button variant="outline" size="sm" onClick={clearSessionFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          {sessions.length === 0 ? 'No sessions found' : 'No sessions match your filters'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.user_name || 'Unknown'}</TableCell>
                        <TableCell>{session.user_email || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{session.ip_address || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(session.last_active)}</TableCell>
                        <TableCell>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleForceLogout(session.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Force Logout
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BACKUP & RESTORE TAB */}
        <TabsContent value="backup">
          <BackupManagement />
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editingUser.role} onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                    <SelectItem value="Crew">Crew</SelectItem>
                    <SelectItem value="Designated Person">Designated Person</SelectItem>
                    <SelectItem value="Inspector">Inspector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-access">Access Level</Label>
                <Select value={editingUser.access_level} onValueChange={(value) => setEditingUser({ ...editingUser, access_level: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="View">View (Read-only)</SelectItem>
                    <SelectItem value="Edit">Edit (Modify)</SelectItem>
                    <SelectItem value="Full">Full (Delete)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Account Status</Label>
                <Select value={editingUser.account_status} onValueChange={(value) => setEditingUser({ ...editingUser, account_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name *</Label>
              <Input
                id="create-name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password *</Label>
              <Input
                id="create-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Master">Master</SelectItem>
                  <SelectItem value="Crew">Crew</SelectItem>
                  <SelectItem value="Designated Person">Designated Person</SelectItem>
                  <SelectItem value="Inspector">Inspector</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-access">Access Level (Optional)</Label>
              <Select value={newUser.access_level} onValueChange={(value) => setNewUser({ ...newUser, access_level: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-assign based on role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-assign based on role</SelectItem>
                  <SelectItem value="View">View (Read-only)</SelectItem>
                  <SelectItem value="Edit">Edit (Modify)</SelectItem>
                  <SelectItem value="Full">Full (Delete)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setNewUser({
                email: '',
                password: '',
                full_name: '',
                role: 'Crew',
                access_level: ''
              });
            }}>Cancel</Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordUser(null);
              setNewPassword('');
            }}>Cancel</Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
