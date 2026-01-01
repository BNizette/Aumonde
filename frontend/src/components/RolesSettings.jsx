import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Shield, Users, AlertCircle, Lock } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MODULES = [
  { key: 'vessels', label: 'Vessels' },
  { key: 'crew', label: 'Crew' },
  { key: 'trips', label: 'Trips' },
  { key: 'passengers', label: 'Passengers' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'drills', label: 'Drills' },
  { key: 'documents', label: 'Documents' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'risk_assessment', label: 'Risk Assessment' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'admin_panel', label: 'Admin Panel' },
];

const ACCESS_LEVELS = ['Hide', 'View', 'Edit', 'Full', 'Admin'];

const RolesSettings = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {},
    attached_records_only: false
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(response.data);
    } catch (err) {
      setError('Failed to fetch roles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: { ...role.permissions },
        attached_records_only: role.attached_records_only || false
      });
    } else {
      setEditingRole(null);
      const defaultPermissions = {};
      MODULES.forEach(m => { defaultPermissions[m.key] = 'View'; });
      setFormData({
        name: '',
        description: '',
        permissions: defaultPermissions,
        attached_records_only: false
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setError('');
  };

  const handlePermissionChange = (module, level) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: level
      }
    }));
  };

  const handleSetAllPermissions = (level) => {
    const newPermissions = {};
    MODULES.forEach(m => { newPermissions[m.key] = level; });
    setFormData(prev => ({
      ...prev,
      permissions: newPermissions
    }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (editingRole) {
        await axios.put(`${API}/roles/${editingRole.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Role updated successfully');
      } else {
        await axios.post(`${API}/roles`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Role created successfully');
      }
      
      handleCloseDialog();
      fetchRoles();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save role');
    }
  };

  const handleDelete = async (role) => {
    if (role.is_system) {
      setError('System roles cannot be deleted');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/roles/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Role deleted successfully');
      fetchRoles();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete role');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getAccessLevelColor = (level) => {
    switch (level) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'Full': return 'bg-green-100 text-green-800';
      case 'Edit': return 'bg-blue-100 text-blue-800';
      case 'View': return 'bg-gray-100 text-gray-800';
      case 'Hide': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading roles...</div>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Configure user roles and permissions for each module
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Attached Records Only</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {role.is_system && <Lock className="h-4 w-4 text-gray-400" />}
                      {role.name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                  <TableCell>
                    {role.attached_records_only ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Yes - Limited
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50">
                        No - Full Access
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.is_system ? "secondary" : "outline"}>
                      {role.is_system ? "System" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!role.is_system && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(role)}
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
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              Configure role permissions for each module
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Senior Crew"
                  disabled={editingRole?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role"
                />
              </div>
            </div>

            {/* Attached Records Only Checkbox */}
            <div className="flex items-center space-x-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Checkbox
                id="attached_records_only"
                checked={formData.attached_records_only}
                onCheckedChange={(checked) => setFormData({ ...formData, attached_records_only: checked })}
              />
              <div>
                <Label htmlFor="attached_records_only" className="font-medium cursor-pointer">
                  Restrict to Attached Records Only
                </Label>
                <p className="text-sm text-gray-600">
                  When enabled, users with this role can only view/edit records they are directly attached to 
                  (e.g., crew can only see vessels they're assigned to, guests can only see their trips)
                </p>
              </div>
            </div>

            {/* Quick Set Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Quick Set All:</span>
              {ACCESS_LEVELS.map((level) => (
                <Button
                  key={level}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetAllPermissions(level)}
                  className={getAccessLevelColor(level)}
                >
                  {level}
                </Button>
              ))}
            </div>

            {/* Permissions Grid */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Module</TableHead>
                    {ACCESS_LEVELS.map((level) => (
                      <TableHead key={level} className="text-center font-semibold w-24">
                        {level}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map((module) => (
                    <TableRow key={module.key}>
                      <TableCell className="font-medium">{module.label}</TableCell>
                      {ACCESS_LEVELS.map((level) => (
                        <TableCell key={level} className="text-center">
                          <input
                            type="radio"
                            name={`permission-${module.key}`}
                            checked={formData.permissions[module.key] === level}
                            onChange={() => handlePermissionChange(module.key, level)}
                            className="h-4 w-4 text-blue-600 cursor-pointer"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Permission Level Legend */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Permission Levels:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><Badge className={getAccessLevelColor('Hide')}>Hide</Badge> - Module is completely hidden from user</div>
                <div><Badge className={getAccessLevelColor('View')}>View</Badge> - Can view records only</div>
                <div><Badge className={getAccessLevelColor('Edit')}>Edit</Badge> - Can view and modify records</div>
                <div><Badge className={getAccessLevelColor('Full')}>Full</Badge> - Can view, modify, and delete records</div>
                <div className="col-span-2"><Badge className={getAccessLevelColor('Admin')}>Admin</Badge> - Full access including admin functions</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesSettings;
