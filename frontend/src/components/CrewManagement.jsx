import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, Search, Filter, X, Eye, AlertTriangle, FileText, Download, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CrewForm from './CrewForm';
import ManualLogEntry from './ManualLogEntry';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CrewManagement = () => {
  const location = useLocation();
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
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedCrewForLogs, setSelectedCrewForLogs] = useState(null);
  const [crewTrips, setCrewTrips] = useState([]);
  const [crewShifts, setCrewShifts] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [manualCrewLogOpen, setManualCrewLogOpen] = useState(false);

  // Use custom hook for advanced filtering
  const {
    filters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters: clearAllFiltersHook
  } = useAdvancedFilters({
    positions: [],
    roles: [],
    start_date: '',
    end_date: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = currentUser.access_level === 'Edit' || currentUser.access_level === 'Full';
  const canDelete = currentUser.access_level === 'Full';

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
  const exportCrewShiftsToCSV = () => {
    if (crewShifts.length === 0) {
      setError('No crew shifts data to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = [
      'Date & Time',
      'Activity',
      'Details',
      'Trip ID',
      'Crew Name',
      'Log ID'
    ];

    const csvRows = [headers.join(','), ...crewShifts.map(shift => [
      `"${new Date(shift.log_datetime).toLocaleString()}"`,
      `"${shift.activity || 'N/A'}"`,
      `"${shift.activity_details || '-'}"`,
      `"${shift.trip_id || 'N/A'}"`,
      `"${selectedCrew?.staff_name || 'N/A'}"`,
      `"${shift.id || 'N/A'}"`
    ].join(','))];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crew_shifts_${selectedCrew?.staff_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setMessage('Crew shifts exported to CSV successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportToCSV = () => {
    if (filteredCrew.length === 0) {
      setError('No crew to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = [
      'ID', 'Staff Name', 'Date of Birth', 'Gender', 'Address', 'Mobile', 'Telephone', 'Email',
      'Next of Kin', 'Next of Kin Contact', 'Default Position', 'Role', 'Qualifications',
      'Certificates', 'Date Commenced', 'Date Ceased', 'Status', 'Created At'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredCrew.map(c => [
        `"${c.id || ''}"`,
        `"${(c.staff_name || '').replace(/"/g, '""')}"`,
        `"${c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString() : ''}"`,
        `"${c.gender || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.mobile || ''}"`,
        `"${c.telephone || ''}"`,
        `"${c.email || ''}"`,
        `"${(c.next_of_kin || '').replace(/"/g, '""')}"`,
        `"${c.next_of_kin_contact || ''}"`,
        `"${c.default_position || ''}"`,
        `"${c.role || ''}"`,
        `"${(c.qualifications || '').replace(/"/g, '""')}"`,
        `"${(c.certificates || '').replace(/"/g, '""')}"`,
        `"${c.date_commenced ? new Date(c.date_commenced).toLocaleDateString() : ''}"`,
        `"${c.date_ceased ? new Date(c.date_ceased).toLocaleDateString() : ''}"`,
        `"${c.status || ''}"`,
        `"${c.created_at ? new Date(c.created_at).toLocaleString() : ''}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `crew_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage(`Exported ${filteredCrew.length} crew members to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    clearAllFilters();
    setSortBy('name');
  };

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

  const handleViewLogs = async (crew) => {
    setSelectedCrewForLogs(crew);
    setLogsDialogOpen(true);
    setLoadingLogs(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Fetch allocated trips for this crew
      const allocatedResponse = await axios.get(`${API}/allocated-crew`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const crewAllocations = allocatedResponse.data.filter(a => a.crew_id === crew.id);
      
      // Get trip details for each allocation
      const tripPromises = crewAllocations.map(async (allocation) => {
        try {
          const tripResponse = await axios.get(`${API}/trips/${allocation.trip_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return {
            ...allocation,
            trip: tripResponse.data
          };
        } catch (err) {
          console.error('Error fetching trip:', err);
          return allocation;
        }
      });
      
      const tripsData = await Promise.all(tripPromises);
      setCrewTrips(tripsData);
      
      // Fetch running logs (shifts) for this crew
      const logsResponse = await axios.get(`${API}/running-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const crewLogs = logsResponse.data.filter(log => log.crew_id === crew.id);
      setCrewShifts(crewLogs);
      
    } catch (err) {
      console.error('Error fetching crew logs:', err);
      setError('Error loading crew logs');
    } finally {
      setLoadingLogs(false);
    }
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
    
    // Check for duplicates
    const duplicateCheck = await checkDuplicates(formData);
    
    if (duplicateCheck.has_duplicates) {
      setDuplicateWarning(duplicateCheck.duplicates);
      setShowDuplicateDialog(true);
      return; // Don't save yet, wait for user confirmation
    }
    
    // No duplicates, proceed with save
    await performSave(formData);
  };

  const performSave = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      if (formMode === 'create') {
        await axios.post(`${API}/crew`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Crew member created successfully');
      } else {
        await axios.put(`${API}/crew/${selectedCrew.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Crew member updated successfully');
      }
      
      setFormOpen(false);
      setShowDuplicateDialog(false);
      setPendingFormData(null);
      fetchCrew();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving crew member');
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
          <h2 className="text-3xl font-bold text-gray-900">Crew Management</h2>
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
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('');
            setFilters({
              positions: [],
              roles: [],
              start_date: '',
              end_date: ''
            });
            setSortBy('name');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Crew</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{crewList.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('');
            setFilters({
              positions: ['Master'],
              roles: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Masters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-blue-600">
              {crewList.filter(c => c.default_position === 'Master').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('');
            setFilters({
              positions: ['Engineer'],
              roles: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Engineers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-600">
              {crewList.filter(c => c.default_position?.includes('Engineer')).length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('');
            setFilters({
              positions: ['Crew', 'Deckhand'],
              roles: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Crew Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-purple-600">
              {crewList.filter(c => c.default_position === 'Crew' || c.default_position === 'Deckhand').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
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
      {filteredCrew.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No crew members found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || hasActiveFilters ? 'Try adjusting your search criteria' : 'Get started by adding your first crew member'}
            </p>
            {canEdit && !searchQuery && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Crew Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredCrew.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>

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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleView(member)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewLogs(member)}
                      title="View logs"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4" />
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingCrew?.staff_name}</DialogTitle>
            <DialogDescription>Crew member details and qualifications</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {viewingCrew && (
              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Position:</span> {viewingCrew.default_position || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span> {viewingCrew.role || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Mobile:</span> {viewingCrew.mobile || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Telephone:</span> {viewingCrew.telephone || 'N/A'}
                    </div>
                    {viewingCrew.address && (
                      <div className="col-span-2">
                        <span className="font-medium">Address:</span> {viewingCrew.address}
                      </div>
                    )}
                  </div>
                </div>

                {/* Qualifications */}
                {viewingCrew.qualifications && viewingCrew.qualifications.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Qualifications</h3>
                    <div className="space-y-2">
                      {viewingCrew.qualifications.map((qual, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-medium">{qual.name}</div>
                          {qual.date && (
                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <span>Date: {new Date(qual.date).toLocaleDateString()}</span>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Years: {calculateYears(qual.date)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {viewingCrew.experience && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Experience</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingCrew.experience}</p>
                  </div>
                )}

                {/* Certifications */}
                {(viewingCrew.license_number || viewingCrew.medical_cert_expiry) && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Certifications</h3>
                    <div className="space-y-2 text-sm">
                      {viewingCrew.license_number && (
                        <div>
                          <span className="font-medium">License:</span> {viewingCrew.license_number}
                          {viewingCrew.license_expiry && ` (Expires: ${new Date(viewingCrew.license_expiry).toLocaleDateString()})`}
                        </div>
                      )}
                      {viewingCrew.medical_cert_expiry && (
                        <div>
                          <span className="font-medium">Medical Certificate Expiry:</span> {new Date(viewingCrew.medical_cert_expiry).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Crew Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Crew Logs - {selectedCrewForLogs?.staff_name}
            </DialogTitle>
            <DialogDescription>
              View allocated ships and shift logs for this crew member
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[600px] pr-4">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading logs...</div>
              </div>
            ) : (
              <Tabs defaultValue="trips" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="trips">Allocated Ships ({crewTrips.length})</TabsTrigger>
                  <TabsTrigger value="shifts">Crew Shifts ({crewShifts.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="trips" className="mt-4">
                  {crewTrips.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No trip allocations found for this crew member
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-4">
                        <Button 
                          onClick={exportAllocatedShipsToCSV}
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export to CSV
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Trip Name</TableHead>
                            <TableHead>Vessel</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Departure</TableHead>
                            <TableHead>Return</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {crewTrips.map((allocation, index) => (
                            <TableRow key={allocation.id || index}>
                              <TableCell className="font-medium">
                                {allocation.trip?.trip_name || 'N/A'}
                              </TableCell>
                              <TableCell>
                                {allocation.trip?.vessel_name || 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{allocation.position}</Badge>
                              </TableCell>
                              <TableCell>
                                {allocation.trip?.depart_datetime 
                                  ? new Date(allocation.trip.depart_datetime).toLocaleDateString()
                                  : 'N/A'
                                }
                              </TableCell>
                              <TableCell>
                                {allocation.trip?.return_datetime 
                                  ? new Date(allocation.trip.return_datetime).toLocaleDateString()
                                  : 'N/A'
                                }
                              </TableCell>
                              <TableCell>
                                {allocation.trip?.status ? (
                                  <Badge 
                                    variant={
                                      allocation.trip.status === 'Completed' ? 'default' :
                                      allocation.trip.status === 'Active' ? 'default' :
                                      'secondary'
                                    }
                                    className={
                                      allocation.trip.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                      allocation.trip.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                                      ''
                                    }
                                  >
                                    {allocation.trip.status}
                                  </Badge>
                                ) : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="shifts" className="mt-4">
                  {crewShifts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No shift logs found for this crew member
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-4">
                        <Button 
                          onClick={exportCrewShiftsToCSV}
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export to CSV
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Activity</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Trip ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {crewShifts.map((shift) => (
                            <TableRow key={shift.id}>
                              <TableCell className="font-medium">
                                {new Date(shift.log_datetime).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  {shift.activity}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {shift.activity_details || '-'}
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {shift.trip_id?.substring(0, 8)}...
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Potential Duplicate Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following fields match existing records:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-4">
            {duplicateWarning?.map((dup, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-semibold text-sm text-yellow-800 mb-1">
                  {dup.field === 'email' && '⚠️ Email Address'}
                  {dup.field === 'phone' && '⚠️ Phone Number'}
                  {dup.field === 'name' && '⚠️ Staff Name'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Value:</span> {dup.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Existing Record:</span>{' '}
                  {dup.existing_record.name} ({dup.existing_record.position})
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
              onClick={() => performSave(pendingFormData)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Override and Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CrewManagement;
