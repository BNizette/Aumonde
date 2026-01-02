import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Download, Upload, Database, AlertCircle, Clock, Calendar, Trash2, PlayCircle, PauseCircle, Plus, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BackupManagement = () => {
  const [backupHistory, setBackupHistory] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [restoreFile, setRestoreFile] = useState(null);
  const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    frequency: 'daily',
    cron_expression: '',
    retention_days: 30
  });
  // Module selection for selective export
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);

  useEffect(() => {
    fetchData();
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/backup/modules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableModules(response.data.modules || []);
    } catch (err) {
      console.error('Error fetching backup modules:', err);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [historyRes, schedulesRes] = await Promise.all([
        axios.get(`${API}/backup/history`, { headers }),
        axios.get(`${API}/backup/schedules`, { headers })
      ]);

      setBackupHistory(historyRes.data);
      setSchedules(schedulesRes.data);
    } catch (err) {
      console.error('Error fetching backup data:', err);
    }
  };

  const handleCreateBackupNow = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/backup/create-now`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`Backup created successfully! ${response.data.backup.filename} (${(response.data.backup.file_size / 1024).toFixed(2)} KB)`);
      fetchData();
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId, filename) => {
    try {
      const token = localStorage.getItem('token');
      
      // Method 1: Try using fetch with proper blob handling
      const response = await fetch(`${API}/backup/download/${backupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create object URL
      const url = window.URL.createObjectURL(blob);
      
      // Create link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Force download by clicking the link
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage(`✅ Downloaded: ${filename}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Download error:', err);
      
      // Fallback: Try opening in new window
      try {
        const token = localStorage.getItem('token');
        const downloadUrl = `${API}/backup/download/${backupId}?token=${token}`;
        window.open(downloadUrl, '_blank');
        setMessage('Download started in new window');
        setTimeout(() => setMessage(''), 3000);
      } catch (fallbackErr) {
        setError('Download failed. Please try "Export & Download Directly" button.');
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/backup/${backupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('Backup deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting backup');
    }
  };

  const handleOpenExportDialog = () => {
    setSelectedModules([]);
    setExportDialogOpen(true);
  };

  const handleToggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSelectAllModules = () => {
    if (selectedModules.length === availableModules.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(availableModules.map(m => m.id));
    }
  };

  const handleSelectiveExport = async () => {
    if (selectedModules.length === 0) {
      setError('Please select at least one module to export');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API}/backup/export-selective`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modules: selectedModules })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get blob
      const blob = await response.blob();
      
      // Create download
      const url = window.URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const moduleList = selectedModules.slice(0, 3).join('_');
      const filename = `amsa_backup_${moduleList}${selectedModules.length > 3 ? '_etc' : ''}_${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      setMessage(`✅ Backup exported: ${filename}`);
      setExportDialogOpen(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError('Export failed. Please check console or try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadViaExport = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Use fetch for better control
      const response = await fetch(`${API}/backup/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get blob
      const blob = await response.blob();
      
      // Create download
      const url = window.URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `amsa_backup_export_${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      setMessage(`✅ Backup exported: ${filename}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError('Export failed. Please check console or try creating a backup instead.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCommand = async (backupId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const downloadUrl = `${API}/backup/download/${backupId}`;
      const command = `curl -H "Authorization: Bearer ${token}" "${downloadUrl}" -o ${filename}`;
      
      // Try modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(command);
        setMessage('✅ Download command copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        // Fallback: Create a temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = command;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
          document.execCommand('copy');
          setMessage('✅ Download command copied to clipboard!');
          setTimeout(() => setMessage(''), 3000);
        } catch (err) {
          // If all else fails, show the command
          setMessage(`Copy this command: ${command}`);
          setTimeout(() => setMessage(''), 10000);
        }
        
        document.body.removeChild(textarea);
      }
    } catch (err) {
      console.error('Copy error:', err);
      // Show the command as a fallback
      const token = localStorage.getItem('token');
      const downloadUrl = `${API}/backup/download/${backupId}`;
      setError(`Could not copy. Use this command: curl -H "Authorization: Bearer ${token}" "${downloadUrl}" -o ${filename}`);
      setTimeout(() => setError(''), 15000);
    }
  };

  const handleImportBackup = async () => {
    if (!restoreFile) {
      setError('Please select a backup file first');
      return;
    }

    setLoading(true);
    setError('');
    
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

      setMessage(`Database restored successfully! Restored ${Object.keys(response.data.collections_restored).length} collections.`);
      setRestoreFile(null);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error importing backup');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.name) {
      setError('Please enter a schedule name');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/backup/schedules`, newSchedule, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Backup schedule created successfully');
      setCreateScheduleOpen(false);
      setNewSchedule({
        name: '',
        frequency: 'daily',
        cron_expression: '',
        retention_days: 30
      });
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = async (scheduleId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/backup/schedules/${scheduleId}`, { enabled: !currentStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage(`Schedule ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error updating schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/backup/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Schedule deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting schedule');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Manual Download Instructions */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Alternative Download Method:</strong> If the download buttons don't save files to your computer, 
          click the 📋 button next to any backup to copy a curl command, then paste it in your terminal to download directly.
        </AlertDescription>
      </Alert>

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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Quick Backup Actions
          </CardTitle>
          <CardDescription>Create immediate backups or restore from file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Create & Download Backup
              </h4>
              <p className="text-sm text-gray-600">
                Create an immediate backup and save to server or download directly to your computer.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={handleCreateBackupNow}
                  disabled={loading}
                  className="w-full"
                  data-testid="create-backup-now-btn"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {loading ? 'Creating Backup...' : 'Create Backup Now'}
                </Button>
                <Button 
                  onClick={handleDownloadViaExport}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                  data-testid="export-download-btn"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export & Download Directly
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Restore from File
              </h4>
              <p className="text-sm text-gray-600">
                Upload and restore database from a backup file.
              </p>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files[0])}
                  disabled={loading}
                />
                {restoreFile && (
                  <p className="text-xs text-gray-600">
                    {restoreFile.name} ({formatBytes(restoreFile.size)})
                  </p>
                )}
                <Button 
                  onClick={handleImportBackup}
                  disabled={!restoreFile || loading}
                  variant="outline"
                  className="w-full"
                  data-testid="restore-backup-btn"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {loading ? 'Restoring...' : 'Restore Backup'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Backups
              </CardTitle>
              <CardDescription>Automate backups with scheduled tasks</CardDescription>
            </div>
            <Dialog open={createScheduleOpen} onOpenChange={setCreateScheduleOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="create-schedule-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Backup Schedule</DialogTitle>
                  <DialogDescription>Set up an automated backup schedule</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-name">Schedule Name</Label>
                    <Input
                      id="schedule-name"
                      placeholder="e.g., Daily Backup"
                      value={newSchedule.name}
                      onChange={(e) => setNewSchedule({...newSchedule, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select 
                      value={newSchedule.frequency}
                      onValueChange={(value) => setNewSchedule({...newSchedule, frequency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily (2 AM)</SelectItem>
                        <SelectItem value="weekly">Weekly (Sunday 2 AM)</SelectItem>
                        <SelectItem value="monthly">Monthly (1st day, 2 AM)</SelectItem>
                        <SelectItem value="custom">Custom Cron Expression</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newSchedule.frequency === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="cron">Cron Expression</Label>
                      <Input
                        id="cron"
                        placeholder="0 2 * * *"
                        value={newSchedule.cron_expression}
                        onChange={(e) => setNewSchedule({...newSchedule, cron_expression: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        Format: minute hour day month day-of-week
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="retention">Retention (days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      min="1"
                      max="365"
                      value={newSchedule.retention_days}
                      onChange={(e) => setNewSchedule({...newSchedule, retention_days: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-gray-500">
                      Backups older than this will be automatically deleted
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateScheduleOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSchedule} disabled={loading}>
                    Create Schedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No backup schedules configured</p>
              <p className="text-sm">Create a schedule to automate backups</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{schedule.frequency}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {schedule.next_run ? formatDate(schedule.next_run) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {schedule.last_run ? formatDate(schedule.last_run) : 'Never'}
                    </TableCell>
                    <TableCell>{schedule.retention_days} days</TableCell>
                    <TableCell>
                      <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                        {schedule.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleSchedule(schedule.id, schedule.enabled)}
                        >
                          {schedule.enabled ? (
                            <PauseCircle className="h-4 w-4" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Backup History
              </CardTitle>
              <CardDescription>View and manage previous backups</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {backupHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No backups found</p>
              <p className="text-sm">Create your first backup to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backupHistory.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">{backup.filename}</TableCell>
                    <TableCell>
                      <Badge variant={backup.backup_type === 'manual' ? 'default' : 'secondary'}>
                        {backup.backup_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatBytes(backup.file_size)}</TableCell>
                    <TableCell>{backup.record_count}</TableCell>
                    <TableCell className="text-sm">{formatDate(backup.created_at)}</TableCell>
                    <TableCell className="text-sm">{backup.created_by_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadBackup(backup.id, backup.filename)}
                          data-testid={`download-backup-${backup.id}`}
                          title="Download backup file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyCommand(backup.id, backup.filename)}
                          title="Copy download command"
                        >
                          📋
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBackup(backup.id)}
                          data-testid={`delete-backup-${backup.id}`}
                          title="Delete backup"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Schedule regular automated backups (daily or weekly recommended)</li>
            <li>• Download important backups to external storage</li>
            <li>• Test backup restoration periodically to ensure data integrity</li>
            <li>• Keep at least 30 days of backup history</li>
            <li>• Create a manual backup before major system changes</li>
            <li>• Store backups securely - they contain sensitive data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;
