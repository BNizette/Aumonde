import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard } from '@/components/ui/summary-card';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, Search, Filter, X, Eye, AlertTriangle, FileText, Download, ChevronDown, Info, Activity, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import CrewDetailsDialog from './CrewDetailsDialog';
import TripDetailsDialog from './TripDetailsDialog';
import TripForm from './TripForm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveListCard } from '@/components/ui/responsive-list-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import HelpDialog from './HelpDialog';
import CrewForm from './CrewForm';
import ManualLogEntry from './ManualLogEntry';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CrewManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [crewList, setCrewList] = useState([]);
  const [filteredCrew, setFilteredCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [positions, setPositions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [prefilledData, setPrefilledData] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingCrew, setViewingCrew] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [manualCrewLogOpen, setManualCrewLogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Trip editing state
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  // Trip details (log view) state
  const [tripDetailsOpen, setTripDetailsOpen] = useState(false);
  const [selectedTripForDetails, setSelectedTripForDetails] = useState(null);

  // Use custom hook for advanced filtering
  const {
    filters,
    setFilters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters: clearAllFiltersHook,
    updateFilters
  } = useAdvancedFilters({
    positions: [],
    roles: [],
    start_date: '',
    end_date: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = currentUser.access_level === 'Edit' || currentUser.access_level === 'Full' || currentUser.access_level === 'Admin';
  const canDelete = currentUser.access_level === 'Full' || currentUser.access_level === 'Admin';
  const isAdmin = currentUser.access_level === 'Admin';

  useEffect(() => {
    fetchCrew();
  }, []);

  // Handle navigation from Admin Panel
  useEffect(() => {
    if (location.state?.editCrewId && crewList.length > 0) {
      const crew = crewList.find(c => c.id === location.state.editCrewId);
      if (crew) {
        handleEdit(crew);
      }
      // Clear state
      window.history.replaceState({}, document.title);
    } else if (location.state?.createWithEmail) {
      setPrefilledData({
        email: location.state.createWithEmail,
        staff_name: location.state.createWithName || ''
      });
      setFormMode('create');
      setSelectedCrew(null);
      setFormOpen(true);
      // Clear state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, crewList]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filters, sortBy, crewList]);

  const applyFiltersAndSort = () => {
    let filtered = [...crewList];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(member =>
        member.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.default_position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.telephone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply multi-select position filter
    if (filters.positions.length > 0) {
      filtered = filtered.filter(member => 
        filters.positions.some(pos => member.default_position?.toLowerCase().includes(pos.toLowerCase()))
      );
    }

    // Apply multi-select role filter
    if (filters.roles.length > 0) {
      filtered = filtered.filter(member => 
        filters.roles.includes(member.role)
      );
    }

    // Apply date range filter
    if (filters.start_date || filters.end_date) {
      filtered = filtered.filter(member => {
        if (!member.date_commenced) return false;
        
        const memberDate = new Date(member.date_commenced);
        const startDate = filters.start_date ? new Date(filters.start_date) : null;
        const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59') : null;

        if (startDate && memberDate < startDate) return false;
        if (endDate && memberDate > endDate) return false;
        
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.staff_name || '').localeCompare(b.staff_name || '');
        case 'position':
          return (a.default_position || '').localeCompare(b.default_position || '');
        case 'role':
          return (a.role || '').localeCompare(b.role || '');
        case 'date':
          return (b.date_commenced || '').localeCompare(a.date_commenced || '');
        default:
          return 0;
      }
    });

    setFilteredCrew(filtered);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    clearAllFiltersHook();
  };

  // Export Allocated Ships to CSV
  const exportAllocatedShipsToCSV = () => {
    if (crewTrips.length === 0) {
      setError('No allocated ships data to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = [
      'Trip Name',
      'Vessel',
      'Position',
      'Departure Date',
      'Return Date',
      'Status',
      'Trip ID'
    ];

    const csvRows = [headers.join(','), ...crewTrips.map(allocation => [
      `"${allocation.trip?.trip_name || 'N/A'}"`,
      `"${allocation.trip?.vessel_name || 'N/A'}"`,
      `"${allocation.position || 'N/A'}"`,
      `"${allocation.trip?.depart_datetime ? new Date(allocation.trip.depart_datetime).toLocaleDateString() : 'N/A'}"`,
      `"${allocation.trip?.return_datetime ? new Date(allocation.trip.return_datetime).toLocaleDateString() : 'N/A'}"`,
      `"${allocation.trip?.status || 'N/A'}"`,
      `"${allocation.trip_id || 'N/A'}"`
    ].join(','))];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allocated_ships_${selectedCrew?.staff_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setMessage('Allocated ships exported to CSV successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  // Export Crew Shifts to CSV
  const exportCrewShiftsToExcel = () => {
    if (crewShifts.length === 0) { setError('No crew shifts data to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Shift Start', 'Shift End', 'Vessel', 'Task Performed', 'Total Hours', 'Trip ID'];
    const data = [headers, ...crewShifts.map(shift => [
      shift.shift_start_datetime ? new Date(shift.shift_start_datetime).toLocaleString() : '-',
      shift.shift_stop_datetime ? new Date(shift.shift_stop_datetime).toLocaleString() : '-',
      shift.vessel_name || '-', shift.task_performed || '-',
      shift.total_hours ? `${shift.total_hours}h` : '-', shift.trip_id ? shift.trip_id.substring(0, 8) + '...' : 'Manual'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Crew Shifts');
    XLSX.writeFile(wb, `crew_shifts_${selectedCrew?.staff_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Crew shifts exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportToExcel = () => {
    if (filteredCrew.length === 0) { setError('No crew to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Staff Name', 'Position', 'Role', 'Mobile', 'Email', 'Status', 'Date Commenced', 'Next of Kin', 'Next of Kin Contact'];
    const data = [headers, ...filteredCrew.map(c => [
      c.staff_name || '-', c.default_position || '-', c.role || '-', c.mobile || '-', c.email || '-',
      c.status || '-', c.date_commenced ? new Date(c.date_commenced).toLocaleDateString() : '-',
      c.next_of_kin || '-', c.next_of_kin_contact || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Crew');
    XLSX.writeFile(wb, `crew_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredCrew.length} crew members to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    clearAllFilters();
    setSortBy('name');
  };

  // Import from Excel handler
  const handleImport = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const crewData = {
            staff_name: row['Staff Name'] || row['staff_name'] || '',
            default_position: row['Position'] || row['default_position'] || '',
            role: row['Role'] || row['role'] || 'crew',
            mobile: row['Mobile'] || row['mobile'] || '',
            email: row['Email'] || row['email'] || '',
            status: row['Status'] || row['status'] || 'Active',
            date_commenced: row['Date Commenced'] || row['date_commenced'] || '',
            next_of_kin: row['Next of Kin'] || row['next_of_kin'] || '',
            next_of_kin_contact: row['Next of Kin Contact'] || row['next_of_kin_contact'] || '',
          };

          if (!crewData.staff_name || !crewData.email) continue;

          await axios.post(`${API}/crew`, crewData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error('Error importing crew:', err);
          errorCount++;
        }
      }

      setMessage(`Import complete: ${successCount} crew added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchCrew();
    } catch (err) {
      setError('Error importing data: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Import template columns matching export format exactly
  const crewImportColumns = ['Staff Name', 'Position', 'Role', 'Mobile', 'Email', 'Status', 'Date Commenced', 'Next of Kin', 'Next of Kin Contact'];
  const crewImportSample = [['John Smith', 'Master', 'crew', '+61400000000', 'john@example.com', 'Active', '2024-01-01', 'Jane Smith', '+61400000001']];

  const hasActiveFilters = searchQuery || filters.positions.length > 0 || filters.roles.length > 0 || filters.start_date || filters.end_date || sortBy !== 'name';

  const fetchCrew = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/crew`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrewList(response.data);
      setFilteredCrew(response.data);
      
      // Extract unique values for filters
      const uniquePositions = [...new Set(response.data.map(c => c.default_position).filter(Boolean))];
      const uniqueRoles = [...new Set(response.data.map(c => c.role).filter(Boolean))];
      setPositions(uniquePositions);
      setRoles(uniqueRoles);
    } catch (err) {
      setError('Error fetching crew');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedCrew(null);
    setFormOpen(true);
  };

  const handleEdit = (crew) => {
    setFormMode('edit');
    setSelectedCrew(crew);
    setFormOpen(true);
  };

  const handleView = (crew) => {
    setViewingCrew(crew);
    setViewDialogOpen(true);
  };

  const checkDuplicates = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const checkData = {
        ...formData,
        id: formMode === 'edit' ? selectedCrew.id : null
      };
      
      const response = await axios.post(`${API}/crew/check-duplicate`, checkData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (err) {
      console.error('Error checking duplicates:', err);
      return { has_duplicates: false, duplicates: [] };
    }
  };

  const handleSave = async (formData) => {
    setPendingFormData(formData);
    
    // Try to save directly - backend will return warnings if there are soft duplicates
    await performSave(formData, false);
  };

  const performSave = async (formData, force = false) => {
    try {
      const token = localStorage.getItem('token');
      let response;
      
      if (formMode === 'create') {
        response = await axios.post(`${API}/crew${force ? '?force=true' : ''}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.put(`${API}/crew/${selectedCrew.id}${force ? '?force=true' : ''}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Check if response contains warnings (soft duplicate detection for name/DOB)
      if (response.data.status === 'warning' && response.data.warnings) {
        setDuplicateWarning(response.data.warnings);
        setShowDuplicateDialog(true);
        return; // Wait for user to confirm
      }
      
      // Success - crew was saved
      setMessage(formMode === 'create' ? 'Crew member created successfully' : 'Crew member updated successfully');
      setFormOpen(false);
      setShowDuplicateDialog(false);
      setPendingFormData(null);
      setDuplicateWarning(null);
      fetchCrew();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      // Hard error - e.g., duplicate email (blocked)
      setError(err.response?.data?.detail || 'Error saving crew member');
      setShowDuplicateDialog(false);
    }
  };

  // Handle editing a trip from CrewDetailsDialog
  const handleEditTrip = (trip) => {
    setSelectedTrip(trip);
    setTripFormOpen(true);
  };

  // Handle saving trip changes
  const handleTripSave = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/trips/${selectedTrip.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Trip updated successfully');
      setTripFormOpen(false);
      setSelectedTrip(null);
      // Refresh crew details to show updated data
      if (viewDialogOpen && viewingCrew) {
        const currentCrew = viewingCrew;
        setViewDialogOpen(false);
        setTimeout(() => {
          setViewingCrew(currentCrew);
          setViewDialogOpen(true);
        }, 100);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error updating trip');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (crewId, crewName) => {
    if (!window.confirm(`Are you sure you want to delete ${crewName}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/crew/${crewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Crew member deleted successfully');
      fetchCrew();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting crew member');
    }
  };

  const calculateYears = (dateStr) => {
    if (!dateStr) return null;
    const qualDate = new Date(dateStr);
    const now = new Date();
    const years = (now - qualDate) / (365.25 * 24 * 60 * 60 * 1000);
    return years.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading crew...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Crew Management</h2>
            <HelpDialog 
              moduleKey="crew_management"
              title="MO504 - Schedule 1 Clause 6(4)"
              defaultContent="Requires crewing evaluation, fatigue risk management, crew certificates of competency, and documented SMS including crew training and responsibilities."
              defaultLink="https://www.amsa.gov.au/vessels-operators/domestic-commercial-vessels/crewing-guidance-domestic-commercial-vessels"
              defaultLinkText="View AMSA Crewing Guidance →"
              isAdmin={isAdmin}
            />
          </div>
          <p className="text-gray-500 mt-1">Manage crew members and their qualifications</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setManualCrewLogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Add Crew Log
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Crew Member
            </Button>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard
          value={crewList.length}
          label="Total Crew"
          description="All crew members"
          color="blue"
          onClick={() => {
            setSearchQuery('');
            updateFilters({ positions: [], roles: [], start_date: '', end_date: '' });
            setSortBy('name');
          }}
        />
        <SummaryCard
          value={crewList.filter(c => c.default_position === 'Master').length}
          label="Masters"
          description="Vessel commanders"
          color="indigo"
          onClick={() => {
            setSearchQuery('');
            updateFilters({ positions: ['Master'], roles: [], start_date: '', end_date: '' });
          }}
        />
        <SummaryCard
          value={crewList.filter(c => c.default_position?.includes('Engineer')).length}
          label="Engineers"
          description="Technical crew"
          color="green"
          onClick={() => {
            setSearchQuery('');
            updateFilters({ positions: ['Engineer'], roles: [], start_date: '', end_date: '' });
          }}
        />
        <SummaryCard
          value={crewList.filter(c => c.default_position === 'Crew' || c.default_position === 'Deckhand').length}
          label="Crew Members"
          description="Deckhands & crew"
          color="purple"
          onClick={() => {
            setSearchQuery('');
            updateFilters({ positions: ['Crew', 'Deckhand'], roles: [], start_date: '', end_date: '' });
          }}
        />
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
              <Download className="h-4 w-4" />
              Import from Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(filters.positions.length > 0 || filters.roles.length > 0 || filters.start_date || filters.end_date || searchQuery) && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, contact, or position..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Position</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">{filters.positions.length === 0 ? 'All Positions' : filters.positions.length === 1 ? filters.positions[0] : `${filters.positions.length} selected`}</span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Positions</span>
                        {filters.positions.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('positions')} className="h-auto p-1 text-xs">Clear</Button>)}
                      </div>
                      {positions.map(pos => (<div key={pos} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('positions', pos)}>
                        <Checkbox checked={filters.positions.includes(pos)} onCheckedChange={() => toggleFilter('positions', pos)} />
                        <label className="text-sm flex-1 cursor-pointer">{pos}</label>
                      </div>))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.positions.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.positions.map(pos => (<Badge key={pos} variant="secondary" className="text-xs">{pos}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('positions', pos)} /></Badge>))}</div>)}
              </div>
              <div>
                <Label>Role</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">{filters.roles.length === 0 ? 'All Roles' : filters.roles.length === 1 ? filters.roles[0] : `${filters.roles.length} selected`}</span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Roles</span>
                        {filters.roles.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('roles')} className="h-auto p-1 text-xs">Clear</Button>)}
                      </div>
                      {roles.map(role => (<div key={role} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('roles', role)}>
                        <Checkbox checked={filters.roles.includes(role)} onCheckedChange={() => toggleFilter('roles', role)} />
                        <label className="text-sm flex-1 cursor-pointer">{role}</label>
                      </div>))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.roles.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.roles.map(role => (<Badge key={role} variant="secondary" className="text-xs">{role}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('roles', role)} /></Badge>))}</div>)}
              </div>
              <div>
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="date">Date Commenced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div><Label htmlFor="start_date">From Date</Label><Input id="start_date" type="date" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} /></div>
              <div><Label htmlFor="end_date">To Date</Label><Input id="end_date" type="date" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} /></div>
              <div>{(filters.start_date || filters.end_date) && (<Button variant="outline" size="sm" onClick={clearDateFilters} className="w-full"><X className="h-4 w-4 mr-2" />Clear Date Range</Button>)}</div>
            </div>
            <div className="text-sm text-gray-500">Showing {filteredCrew.length} of {crewList.length} crew members</div>
          </div>
        </CardContent>
      </Card>

      {/* Crew List */}
      <ResponsiveListCard
        items={filteredCrew}
        renderIcon={(member) => <Users className="h-5 w-5 text-orange-600" />}
        renderContent={(member) => (
          <>
            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {member.staff_name}
              </div>
            </div>

            {/* Position */}
            <div className="hidden sm:block w-32 flex-shrink-0">
              <span className="text-sm text-gray-600">
                {member.default_position || '-'}
              </span>
            </div>

            {/* Role Badge */}
            <div className="hidden md:block flex-shrink-0">
              <Badge variant="outline" className="whitespace-nowrap">
                {member.role || 'Crew'}
              </Badge>
            </div>

            {/* Mobile */}
            <div className="hidden lg:block w-36 flex-shrink-0">
              <span className="text-sm text-gray-600">
                {member.mobile || '-'}
              </span>
            </div>

            {/* Qualifications Count */}
            <div className="hidden xl:block w-24 flex-shrink-0 text-center">
              <span className="text-sm text-gray-600">
                {member.qualifications && member.qualifications.length > 0 
                  ? `${member.qualifications.length} quals`
                  : '-'}
              </span>
            </div>
          </>
        )}
        renderActions={(member) => (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleView(member)}
              title="View details & logs"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(member)}
                title="Edit crew member"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(member.id, member.staff_name)}
                title="Delete crew member"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        emptyState={{
          icon: Users,
          title: 'No crew members found',
          message: (searchQuery || hasActiveFilters) ? 'Try adjusting your search criteria' : 'Get started by adding your first crew member',
          action: canEdit && !searchQuery ? {
            label: 'Add Crew Member',
            onClick: handleCreate,
            icon: Plus
          } : undefined
        }}
      />

      {/* Crew Form Dialog */}
      <CrewForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setPrefilledData(null);
        }}
        onSave={handleSave}
        crew={selectedCrew}
        mode={formMode}
        prefilledData={prefilledData}
      />


      {/* Crew Details Dialog */}
      <CrewDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        crew={viewingCrew}
        onMessage={(msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); }}
        onEditTrip={handleEditTrip}
        onViewTripLog={(trip) => {
          setSelectedTripForDetails(trip);
          setTripDetailsOpen(true);
        }}
        onViewDrill={(drillId) => navigate(`/emergency?view=drills&edit_id=${drillId}`)}
        onEditCrewTraining={(crewId, section) => {
          setViewDialogOpen(false);
          navigate(`/crew?edit_id=${crewId}&section=${section}`);
        }}
      />

      {/* Trip Details/Log Dialog */}
      <TripDetailsDialog
        open={tripDetailsOpen}
        onClose={() => {
          setTripDetailsOpen(false);
          setSelectedTripForDetails(null);
        }}
        trip={selectedTripForDetails}
        onRefresh={() => {}}
        onEditCrew={(crewId) => navigate(`/crew?edit_id=${crewId}`)}
        onEditPassenger={(passengerId) => navigate(`/passengers?edit_id=${passengerId}`)}
        onViewIncident={(incidentId) => navigate(`/incidents?edit_id=${incidentId}`)}
      />

      {/* Trip Edit Dialog */}
      {tripFormOpen && selectedTrip && (
        <TripForm
          open={tripFormOpen}
          onClose={() => {
            setTripFormOpen(false);
            setSelectedTrip(null);
          }}
          onSave={handleTripSave}
          trip={selectedTrip}
          mode="edit"
        />
      )}



      {/* Duplicate Warning Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Potential Duplicate Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following fields match existing crew records. You can continue if this is intentional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-4">
            {duplicateWarning?.map((dup, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-semibold text-sm text-yellow-800 mb-1">
                  {dup.field === 'email' && '🚫 Email Address (Blocked)'}
                  {dup.field === 'phone' && '⚠️ Phone Number'}
                  {dup.field === 'name' && '⚠️ Staff Name'}
                  {dup.field === 'date_of_birth' && '⚠️ Date of Birth'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Value:</span> {dup.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Existing Record:</span>{' '}
                  {dup.existing_record.name} ({dup.existing_record.position})
                  {dup.existing_record.date_of_birth && dup.existing_record.date_of_birth !== 'N/A' && (
                    <span className="ml-1">- DOB: {dup.existing_record.date_of_birth}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDuplicateDialog(false);
              setPendingFormData(null);
              setDuplicateWarning(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => performSave(pendingFormData, true)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual Crew Log Entry Dialog */}
      <ManualLogEntry
        open={manualCrewLogOpen}
        onClose={() => setManualCrewLogOpen(false)}
        type="crew"
      />

      {/* Import Excel Dialog */}
      <ImportExcelDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Import Crew Members"
        description="Upload an Excel file to import crew members. Download the template for the correct format."
        templateColumns={crewImportColumns}
        templateSampleData={crewImportSample}
        onImport={handleImport}
        templateFileName="crew_import_template.xlsx"
      />
    </div>
  );
};

export default CrewManagement;
