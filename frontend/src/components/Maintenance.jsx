import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard } from '@/components/ui/summary-card';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Wrench, Eye, Calendar, Search, Filter, X, Download, ChevronDown, Info, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MaintenanceForm from './MaintenanceForm';
import MaintenanceDetails from './MaintenanceDetails';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [user, setUser] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Use custom hook for advanced filtering
  const {
    filters,
    setFilters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters: clearAllFiltersHook,
    setFilterValue
  } = useAdvancedFilters({
    statuses: [],
    priorities: [],
    start_date: '',
    end_date: ''
  });

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

  const clearAllFilters = () => { 
    setSearchQuery(''); 
    clearAllFiltersHook(); 
  };

  const exportToExcel = () => {
    if (filteredRecords.length === 0) { setError('No maintenance records to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Title', 'Equipment/System', 'Vessel', 'Type', 'Status', 'Priority', 'Scheduled Date', 'Completed Date', 'Responsible Person'];
    const data = [headers, ...filteredRecords.map(r => [
      r.title || '-', r.equipment_system || '-', r.vessel_name || '-', r.maintenance_type || '-',
      r.status || '-', r.priority || '-',
      r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '-',
      r.completed_date ? new Date(r.completed_date).toLocaleDateString() : '-',
      r.responsible_person || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance');
    XLSX.writeFile(wb, `maintenance_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredRecords.length} maintenance records to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Import from Excel handler
  const handleImport = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const maintenanceData = {
            title: row['Title'] || row['title'] || '',
            equipment_system: row['Equipment/System'] || row['equipment_system'] || '',
            vessel_name: row['Vessel'] || row['vessel_name'] || '',
            maintenance_type: row['Type'] || row['maintenance_type'] || 'Preventive',
            status: row['Status'] || row['status'] || 'Scheduled',
            priority: row['Priority'] || row['priority'] || 'Medium',
            scheduled_date: row['Scheduled Date'] || row['scheduled_date'] || '',
            completed_date: row['Completed Date'] || row['completed_date'] || '',
            responsible_person: row['Responsible Person'] || row['responsible_person'] || '',
          };

          if (!maintenanceData.title) continue;

          await axios.post(`${API}/maintenance`, maintenanceData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error('Error importing maintenance:', err);
          errorCount++;
        }
      }

      setMessage(`Import complete: ${successCount} records added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchMaintenanceRecords();
    } catch (err) {
      setError('Error importing data: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Import template columns matching export format exactly
  const maintenanceImportColumns = ['Title', 'Equipment/System', 'Vessel', 'Type', 'Status', 'Priority', 'Scheduled Date', 'Completed Date', 'Responsible Person'];
  const maintenanceImportSample = [['Engine Oil Change', 'Main Engine', 'MV Coral Queen', 'Preventive', 'Scheduled', 'Medium', '2024-01-20', '', 'John Smith']];

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
      const uniqueStatuses = [...new Set(response.data.map(r => r.status).filter(Boolean))];
      const uniquePriorities = [...new Set(response.data.map(r => r.priority).filter(Boolean))];
      setStatuses(uniqueStatuses);
      setPriorities(uniquePriorities);
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Maintenance Management</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-blue-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-semibold mb-1">Marine Order 504 (2024)</p>
                  <p className="text-sm mb-2">
                    Requires documented maintenance procedures, records of alterations affecting vessel systems, and risk management for vessel integrity and equipment reliability.
                  </p>
                  <a 
                    href="https://www.amsa.gov.au/about/regulations-and-standards/marine-order-504-certificates-operation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    View AMSA MO504 Regulations →
                  </a>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard
          value={maintenanceRecords.length}
          label="Total"
          description="All records"
          color="blue"
          onClick={() => {
            setSearchQuery('');
            setFilters({ statuses: [], priorities: [], start_date: '', end_date: '' });
            setSortBy('priority');
          }}
        />
        <SummaryCard
          value={maintenanceRecords.filter(r => r.status === 'Scheduled').length}
          label="Scheduled"
          description="Planned work"
          color="cyan"
          onClick={() => setFilters(prev => ({ ...prev, statuses: ['Scheduled'] }))}
        />
        <SummaryCard
          value={maintenanceRecords.filter(r => r.status === 'In Progress').length}
          label="In Progress"
          description="Ongoing work"
          color="yellow"
          onClick={() => setFilters(prev => ({ ...prev, statuses: ['In Progress'] }))}
        />
        <SummaryCard
          value={maintenanceRecords.filter(r => r.status === 'Overdue').length}
          label="Overdue"
          description="Requires action"
          color="red"
          onClick={() => setFilters(prev => ({ ...prev, statuses: ['Overdue'] }))}
        />
        <SummaryCard
          value={maintenanceRecords.filter(r => r.status === 'Completed').length}
          label="Completed"
          description="Finished work"
          color="green"
          onClick={() => setFilters(prev => ({ ...prev, statuses: ['Completed'] }))}
        />
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
              <Download className="h-4 w-4" />Import from Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <FileSpreadsheet className="h-4 w-4" />Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(filters.statuses.length > 0 || filters.priorities.length > 0 || filters.start_date || filters.end_date || searchQuery) && (
              <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={clearAllFilters}><X className="h-4 w-4 mr-2" />Clear All</Button></div>
            )}
            <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by title, equipment, vessel, or person..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Status</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="truncate">{filters.statuses.length === 0 ? 'All Status' : filters.statuses.length === 1 ? filters.statuses[0] : `${filters.statuses.length} selected`}</span><ChevronDown className="h-4 w-4 ml-2 shrink-0" /></Button></PopoverTrigger><PopoverContent className="w-64 p-0" align="start"><div className="p-2"><div className="flex items-center justify-between px-2 py-1.5 mb-1"><span className="text-sm font-medium">Select Status</span>{filters.statuses.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('statuses')} className="h-auto p-1 text-xs">Clear</Button>)}</div>{statuses.map(st => (<div key={st} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('statuses', st)}><Checkbox checked={filters.statuses.includes(st)} onCheckedChange={() => toggleFilter('statuses', st)} /><label className="text-sm flex-1 cursor-pointer">{st}</label></div>))}</div></PopoverContent></Popover>
                {filters.statuses.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.statuses.map(st => (<Badge key={st} variant="secondary" className="text-xs">{st}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('statuses', st)} /></Badge>))}</div>)}
              </div>
              <div><Label>Priority</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="truncate">{filters.priorities.length === 0 ? 'All Priority' : filters.priorities.length === 1 ? filters.priorities[0] : `${filters.priorities.length} selected`}</span><ChevronDown className="h-4 w-4 ml-2 shrink-0" /></Button></PopoverTrigger><PopoverContent className="w-64 p-0" align="start"><div className="p-2"><div className="flex items-center justify-between px-2 py-1.5 mb-1"><span className="text-sm font-medium">Select Priority</span>{filters.priorities.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('priorities')} className="h-auto p-1 text-xs">Clear</Button>)}</div>{priorities.map(pr => (<div key={pr} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('priorities', pr)}><Checkbox checked={filters.priorities.includes(pr)} onCheckedChange={() => toggleFilter('priorities', pr)} /><label className="text-sm flex-1 cursor-pointer">{pr}</label></div>))}</div></PopoverContent></Popover>
                {filters.priorities.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.priorities.map(pr => (<Badge key={pr} variant="secondary" className="text-xs">{pr}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('priorities', pr)} /></Badge>))}</div>)}
              </div>
              <div><Label>Sort By</Label><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="priority">Priority (High to Low)</SelectItem><SelectItem value="dueDate">Due Date</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="status">Status</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div><Label htmlFor="start_date">From Date</Label><Input id="start_date" type="date" value={filters.start_date} onChange={(e) => setFilterValue('start_date', e.target.value)} /></div>
              <div><Label htmlFor="end_date">To Date</Label><Input id="end_date" type="date" value={filters.end_date} onChange={(e) => setFilterValue('end_date', e.target.value)} /></div>
              <div>{(filters.start_date || filters.end_date) && (<Button variant="outline" size="sm" onClick={clearDateFilters} className="w-full"><X className="h-4 w-4 mr-2" />Clear Date Range</Button>)}</div>
            </div>
            <div className="text-sm text-gray-500">Showing {filteredRecords.length} of {maintenanceRecords.length} maintenance records</div>
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

      {/* Import Excel Dialog */}
      <ImportExcelDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Import Maintenance Records"
        description="Upload an Excel file to import maintenance records. Download the template for the correct format."
        templateColumns={maintenanceImportColumns}
        templateSampleData={maintenanceImportSample}
        onImport={handleImport}
        templateFileName="maintenance_import_template.xlsx"
      />
    </div>
  );
};

export default Maintenance;
