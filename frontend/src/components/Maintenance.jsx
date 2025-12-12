import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Wrench, Eye, Calendar, Search, Filter, X, Download, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import MaintenanceForm from './MaintenanceForm';
import MaintenanceDetails from './MaintenanceDetails';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Maintenance = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [sortBy, setSortBy] = useState('priority');
  const [filters, setFilters] = useState({
    statuses: [],
    priorities: [],
    start_date: '',
    end_date: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchMaintenanceRecords();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filters, sortBy, maintenanceRecords]);

  const applyFiltersAndSort = () => {
    let filtered = [...maintenanceRecords];
    if (searchQuery) {
      filtered = filtered.filter(record =>
        record.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.equipment_system?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.responsible_person?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(record => filters.statuses.includes(record.status));
    }
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(record => filters.priorities.includes(record.priority));
    }
    if (filters.start_date || filters.end_date) {
      filtered = filtered.filter(record => {
        if (!record.scheduled_date) return false;
        const recDate = new Date(record.scheduled_date);
        const startDate = filters.start_date ? new Date(filters.start_date) : null;
        const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59') : null;
        if (startDate && recDate < startDate) return false;
        if (endDate && recDate > endDate) return false;
        return true;
      });
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case 'dueDate': return new Date(a.scheduled_date || '9999-12-31') - new Date(b.scheduled_date || '9999-12-31');
        case 'equipment': return (a.equipment_system || '').localeCompare(b.equipment_system || '');
        case 'status': return (a.status || '').localeCompare(b.status || '');
        default: return 0;
      }
    });
    setFilteredRecords(filtered);
  };

  const toggleFilter = (filterType, value) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const isSelected = currentArray.includes(value);
      return {...prev, [filterType]: isSelected ? currentArray.filter(item => item !== value) : [...currentArray, value]};
    });
  };

  const clearFilter = (filterType) => { setFilters(prev => ({...prev, [filterType]: []})); };
  const clearDateFilters = () => { setFilters(prev => ({...prev, start_date: '', end_date: ''})); };
  const clearAllFilters = () => { setSearchQuery(''); setFilters({statuses: [], priorities: [], start_date: '', end_date: ''}); };

  const exportToCSV = () => {
    if (filteredRecords.length === 0) { setError('No maintenance records to export'); setTimeout(() => setError(''), 3000); return; }
    const headers = ['ID', 'Title', 'Equipment/System', 'Vessel', 'Type', 'Status', 'Priority', 'Scheduled Date', 'Completed Date', 'Responsible Person', 'Description', 'Created At'];
    const csvRows = [headers.join(','), ...filteredRecords.map(r => [
      `"${r.id || ''}"`, `"${(r.title || '').replace(/"/g, '""')}"`, `"${(r.equipment_system || '').replace(/"/g, '""')}"`,
      `"${(r.vessel_name || '').replace(/"/g, '""')}"`, `"${r.maintenance_type || ''}"`, `"${r.status || ''}"`,
      `"${r.priority || ''}"`, `"${r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : ''}"`,
      `"${r.completed_date ? new Date(r.completed_date).toLocaleDateString() : ''}"`,
      `"${(r.responsible_person || '').replace(/"/g, '""')}"`, `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${r.created_at ? new Date(r.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `maintenance_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Exported ${filteredRecords.length} maintenance records to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => { setSearchQuery(''); clearAllFilters(); setSortBy('priority'); };
  const hasActiveFilters = searchQuery || filters.statuses.length > 0 || filters.priorities.length > 0 || filters.start_date || filters.end_date || sortBy !== 'priority';

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/maintenance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaintenanceRecords(response.data);
    } catch (err) {
      setError('Failed to fetch maintenance records');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedRecord(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  const handleSave = async (maintenanceData) => {
    try {
      const token = localStorage.getItem('token');
      if (formMode === 'create') {
        await axios.post(`${API}/maintenance`, maintenanceData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Maintenance record created successfully');
      } else {
        await axios.put(`${API}/maintenance/${selectedRecord.id}`, maintenanceData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Maintenance record updated successfully');
      }
      setFormOpen(false);
      fetchMaintenanceRecords();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving maintenance record');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete maintenance record: ${record.title}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/maintenance/${record.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Maintenance record deleted successfully');
      fetchMaintenanceRecords();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting maintenance record');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Scheduled': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Overdue': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
      'Planned': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-600 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-white',
      'Low': 'bg-green-500 text-white'
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  const canEdit = user?.access_level === 'Edit' || user?.access_level === 'Full';
  const canDelete = user?.access_level === 'Full';

  // Get unique vessels for filter
  const uniqueVessels = [...new Set(maintenanceRecords.map(r => r.vessel_name).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading maintenance records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-gray-500 mt-1">Track and manage vessel maintenance activities</p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            New Maintenance
          </Button>
        )}
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

      {/* Statistics Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setPriorityFilter('all');
            setTypeFilter('all');
            setVesselFilter('all');
            setSortBy('dueDate');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Records</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{maintenanceRecords.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setStatusFilter('Scheduled')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Scheduled</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-blue-600">
              {maintenanceRecords.filter(r => r.status === 'Scheduled').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setStatusFilter('In Progress')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-yellow-600">
              {maintenanceRecords.filter(r => r.status === 'In Progress').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setStatusFilter('Overdue')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-red-600">
              {maintenanceRecords.filter(r => r.status === 'Overdue').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setStatusFilter('Completed')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-600">
              {maintenanceRecords.filter(r => r.status === 'Completed').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title, equipment, vessel, or person..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="w-full md:w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-40">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-44">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-44">
                <Select value={vesselFilter} onValueChange={setVesselFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vessel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vessels</SelectItem>
                    {uniqueVessels.map(vessel => (
                      <SelectItem key={vessel} value={vessel}>{vessel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Priority (High to Low)</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredRecords.length} of {maintenanceRecords.length} maintenance records
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Records List */}
      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Maintenance Records</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || hasActiveFilters ? 'Try adjusting your search or filters' : 'Get started by creating your first maintenance record'}
              </p>
              {canEdit && !searchQuery && !hasActiveFilters && (
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Maintenance Record
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{record.title}</CardTitle>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                      <Badge className={getPriorityColor(record.priority)}>
                        {record.priority}
                      </Badge>
                    </div>
                    <CardDescription>
                      {record.equipment_system && `Equipment: ${record.equipment_system}`}
                      {record.vessel_name && ` • Vessel: ${record.vessel_name}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleView(record)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(record)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <p className="text-gray-600 mt-1">{record.maintenance_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Scheduled Date:</span>
                    <p className="text-gray-600 mt-1">
                      {record.scheduled_date ? new Date(record.scheduled_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Responsible:</span>
                    <p className="text-gray-600 mt-1">{record.responsible_person || 'Not assigned'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Cost:</span>
                    <p className="text-gray-600 mt-1">{record.cost ? `$${record.cost}` : 'TBD'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MaintenanceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        record={selectedRecord}
        mode={formMode}
      />

      <MaintenanceDetails
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        record={selectedRecord}
      />
    </div>
  );
};

export default Maintenance;
