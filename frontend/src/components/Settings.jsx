import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings as SettingsIcon, Plus, Trash2, Save, X, GripVertical, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedModule, setSelectedModule] = useState('crew');
  const [selectedCategory, setSelectedCategory] = useState('positions');
  const [currentSetting, setCurrentSetting] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newOptions, setNewOptions] = useState([]);

  // Define available modules and categories
  const modules = {
    crew: {
      label: 'Crew Management',
      categories: {
        positions: 'Crew Positions',
        roles: 'Crew Roles'
      }
    },
    vessel: {
      label: 'Vessel Management',
      categories: {
        vessel_types: 'Vessel Types',
        operational_status: 'Operational Status'
      }
    },
    trip: {
      label: 'Trip Management',
      categories: {
        trip_types: 'Trip Types'
      }
    },
    document: {
      label: 'Document Management',
      categories: {
        categories: 'Document Categories'
      }
    },
    incident: {
      label: 'Incident Management',
      categories: {
        incident_types: 'Incident Types',
        severities: 'Severity Levels'
      }
    },
    emergency: {
      label: 'Emergency Response',
      categories: {
        contact_types: 'Contact Types',
        emergency_types: 'Emergency Types',
        drill_types: 'Drill Types'
      }
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      // Auto-select first category when module changes
      const firstCategory = Object.keys(modules[selectedModule].categories)[0];
      setSelectedCategory(firstCategory);
    }
  }, [selectedModule]);

  useEffect(() => {
    if (selectedModule && selectedCategory) {
      fetchSetting();
    }
  }, [selectedModule, selectedCategory]);

  const fetchAllSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetting = async () => {
    try {
      setEditMode(false);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/settings/${selectedModule}/${selectedCategory}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentSetting(response.data);
      setNewOptions(response.data.options || []);
    } catch (err) {
      setError('Error fetching setting');
      console.error('Error:', err);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const updateData = {
        label: currentSetting?.label || modules[selectedModule].categories[selectedCategory],
        options: newOptions.map((opt, index) => ({
          value: opt.value,
          is_active: opt.is_active !== false,
          order: index
        }))
      };

      await axios.put(
        `${API}/settings/${selectedModule}/${selectedCategory}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('Settings saved successfully');
      setEditMode(false);
      fetchSetting();
      fetchAllSettings();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving settings');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddOption = () => {
    setNewOptions([...newOptions, {
      id: `temp-${Date.now()}`,
      value: '',
      is_active: true,
      order: newOptions.length
    }]);
  };

  const handleRemoveOption = (index) => {
    const updated = newOptions.filter((_, i) => i !== index);
    setNewOptions(updated);
  };

  const handleOptionChange = (index, field, value) => {
    const updated = [...newOptions];
    updated[index] = { ...updated[index], [field]: value };
    setNewOptions(updated);
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    
    if (dragIndex === dropIndex) return;
    
    const updated = [...newOptions];
    const [draggedItem] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    
    setNewOptions(updated);
  };

  const handlePopulateFromExisting = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/settings/${selectedModule}/${selectedCategory}/populate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage(response.data.message || 'Populated successfully');
      fetchSetting();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error populating settings');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setNewOptions(currentSetting?.options || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-500 mt-1">Manage dropdown options and system configurations</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module and Category Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Select Module
            </CardTitle>
            <CardDescription>Choose a module and category to configure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(modules).map(([key, mod]) => (
                    <SelectItem key={key} value={key}>
                      {mod.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedModule && Object.entries(modules[selectedModule].categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Currently Configuring:</strong>
              </p>
              <Badge variant="outline" className="text-sm">
                {selectedModule && selectedCategory && 
                  modules[selectedModule].categories[selectedCategory]}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Options Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {currentSetting?.label || (selectedModule && selectedCategory && 
                    modules[selectedModule].categories[selectedCategory])}
                </CardTitle>
                <CardDescription>
                  Manage dropdown options for this setting
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!editMode ? (
                  <Button onClick={() => setEditMode(true)}>
                    Edit Options
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!editMode ? (
              /* View Mode */
              <div className="space-y-2">
                {currentSetting?.options && currentSetting.options.length > 0 ? (
                  currentSetting.options.map((option, index) => (
                    <div
                      key={option.id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-sm">#{index + 1}</span>
                        <span className="font-medium">{option.value}</span>
                      </div>
                      <Badge variant={option.is_active ? "default" : "secondary"}>
                        {option.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No options configured yet. Click "Edit Options" to add some.
                  </div>
                )}
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="space-y-2">
                  {newOptions.map((option, index) => (
                    <div 
                      key={option.id || index} 
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                      <Input
                        value={option.value}
                        onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                        placeholder="Enter option value"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={handleAddOption} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    💡 <strong>Tip:</strong> These options will appear in dropdown menus throughout the system.
                    Changes take effect immediately after saving.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Settings Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Crew Positions</strong> and <strong>Roles</strong> are used in crew member forms and filters</p>
            <p>• Changes to settings affect dropdown menus across the entire application</p>
            <p>• You can reorder options by editing them (drag and drop coming soon)</p>
            <p>• Only users with Full access level can modify system settings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
