import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Ship, Plus, Edit, Trash2, Search, Calendar, Filter, X, AlertTriangle, Download, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VesselForm from './VesselForm';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VesselManagement = () => {
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vesselTypes, setVesselTypes] = useState([]);
  const [statusTypes, setStatusTypes] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

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
    vessel_types: [],
    statuses: [],
    start_date: '',
    end_date: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = currentUser.access_level === 'Edit' || currentUser.access_level === 'Full';
  const canDelete = currentUser.access_level === 'Full';

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filters, sortBy, vessels]);

  const applyFiltersAndSort = () => {
    let filtered = [...vessels];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(vessel =>
        vessel.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.vessel_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply multi-select vessel type filter
    if (filters.vessel_types.length > 0) {
      filtered = filtered.filter(vessel => 
        filters.vessel_types.includes(vessel.vessel_type)
      );
    }

    // Apply multi-select status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(vessel => 
        filters.statuses.includes(vessel.operational_status)
      );
    }

    // Apply date range filter
    if (filters.start_date || filters.end_date) {
      filtered = filtered.filter(vessel => {
        if (!vessel.created_at) return false;
        
        const vesselDate = new Date(vessel.created_at);
        const startDate = filters.start_date ? new Date(filters.start_date) : null;
        const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59') : null;

        if (startDate && vesselDate < startDate) return false;
        if (endDate && vesselDate > endDate) return false;
        
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.vessel_name || '').localeCompare(b.vessel_name || '');
        case 'type':
          return (a.vessel_type || '').localeCompare(b.vessel_type || '');
        case 'year':
          return (b.year_built || 0) - (a.year_built || 0);
        case 'registration':
          return (a.registration_number || '').localeCompare(b.registration_number || '');
        default:
          return 0;
      }
    });

    setFilteredVessels(filtered);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    clearAllFiltersHook();
    setSortBy('name');
  };

  const exportToCSV = () => {
    if (filteredVessels.length === 0) {
      setError('No vessels to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = [
      'ID', 'Vessel Name', 'Registration Number', 'Vessel Type', 'Year Built',
      'Length (m)', 'Beam (m)', 'Draft (m)', 'Gross Tonnage', 'Net Tonnage',
      'Passenger Capacity', 'Crew Capacity', 'Flag State', 'Port of Registry',
      'IMO Number', 'MMSI Number', 'Call Sign', 'Owner Name', 'Owner Contact',
      'Operator Name', 'Operator Contact', 'Classification Society',
      'Class Notation', 'Hull Material', 'Propulsion Type', 'Engine Manufacturer',
      'Engine Model', 'Engine Power (kW)', 'Operational Status', 'Last Survey Date',
      'Next Survey Due', 'Insurance Expiry', 'Created At'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredVessels.map(v => [
        `"${v.id || ''}"`,
        `"${(v.vessel_name || '').replace(/"/g, '""')}"`,
        `"${v.registration_number || ''}"`,
        `"${v.vessel_type || ''}"`,
        `"${v.year_built || ''}"`,
        `"${v.length || ''}"`,
        `"${v.beam || ''}"`,
        `"${v.draft || ''}"`,
        `"${v.gross_tonnage || ''}"`,
        `"${v.net_tonnage || ''}"`,
        `"${v.passenger_capacity || ''}"`,
        `"${v.crew_capacity || ''}"`,
        `"${v.flag_state || ''}"`,
        `"${v.port_of_registry || ''}"`,
        `"${v.imo_number || ''}"`,
        `"${v.mmsi_number || ''}"`,
        `"${v.call_sign || ''}"`,
        `"${(v.owner_name || '').replace(/"/g, '""')}"`,
        `"${v.owner_contact || ''}"`,
        `"${(v.operator_name || '').replace(/"/g, '""')}"`,
        `"${v.operator_contact || ''}"`,
        `"${v.classification_society || ''}"`,
        `"${v.class_notation || ''}"`,
        `"${v.hull_material || ''}"`,
        `"${v.propulsion_type || ''}"`,
        `"${v.engine_manufacturer || ''}"`,
        `"${v.engine_model || ''}"`,
        `"${v.engine_power || ''}"`,
        `"${v.operational_status || ''}"`,
        `"${v.last_survey_date ? new Date(v.last_survey_date).toLocaleDateString() : ''}"`,
        `"${v.next_survey_due ? new Date(v.next_survey_due).toLocaleDateString() : ''}"`,
        `"${v.insurance_expiry ? new Date(v.insurance_expiry).toLocaleDateString() : ''}"`,
        `"${v.created_at ? new Date(v.created_at).toLocaleString() : ''}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vessels_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage(`Exported ${filteredVessels.length} vessels to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    clearAllFilters();
    setSortBy('name');
  };

  const hasActiveFilters = searchQuery || filters.vessel_types.length > 0 || filters.statuses.length > 0 || filters.start_date || filters.end_date || sortBy !== 'name';

  const fetchVessels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vessels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVessels(response.data);
      setFilteredVessels(response.data);
      
      // Extract unique values for filters
      const uniqueTypes = [...new Set(response.data.map(v => v.vessel_type).filter(Boolean))];
      const uniqueStatuses = [...new Set(response.data.map(v => v.operational_status).filter(Boolean))];
      setVesselTypes(uniqueTypes);
      setStatusTypes(uniqueStatuses);
    } catch (err) {
      setError('Error fetching vessels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedVessel(null);
    setFormOpen(true);
  };

  const handleEdit = (vessel) => {
    setFormMode('edit');
    setSelectedVessel(vessel);
    setFormOpen(true);
  };

  const checkDuplicates = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const checkData = {
        ...formData,
        id: formMode === 'edit' ? selectedVessel.id : null
      };
      
      const response = await axios.post(`${API}/vessels/check-duplicate`, checkData, {
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
        await axios.post(`${API}/vessels`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Vessel created successfully');
      } else {
        await axios.put(`${API}/vessels/${selectedVessel.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Vessel updated successfully');
      }
      
      setFormOpen(false);
      setShowDuplicateDialog(false);
      setPendingFormData(null);
      fetchVessels();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving vessel');
    }
  };

  const handleDelete = async (vesselId, vesselName) => {
    if (!window.confirm(`Are you sure you want to delete ${vesselName}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/vessels/${vesselId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Vessel deleted successfully');
      fetchVessels();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting vessel');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading vessels...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Vessel Management</h2>
          <p className="text-gray-500 mt-1">Manage your fleet of vessels and their certificates</p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vessel
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => clearFilters()}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Vessels</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{vessels.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('Passenger');
            setFilters({
              vessel_types: [],
              statuses: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Passenger Vessels</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-blue-600">
              {vessels.filter(v => v.vessel_type?.includes('Passenger')).length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('Operational');
            setFilters({
              vessel_types: [],
              statuses: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Active Fleet</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-600">
              {vessels.filter(v => v.operational_status === 'Operational').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => clearFilters()}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-purple-600">
              {vessels.reduce((sum, v) => sum + (parseInt(v.max_passengers) || 0), 0)} pax
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Total passenger capacity</p>
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
            {/* Clear All Button */}
            {(filters.vessel_types.length > 0 || filters.statuses.length > 0 || filters.start_date || filters.end_date || searchQuery) && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, registration, type, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Multi-Select Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Vessel Type Multi-Select */}
              <div>
                <Label>Vessel Type</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {filters.vessel_types.length === 0 ? 'All Types' :
                         filters.vessel_types.length === 1 ? filters.vessel_types[0] :
                         `${filters.vessel_types.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Types</span>
                        {filters.vessel_types.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => clearFilter('vessel_types')} className="h-auto p-1 text-xs">
                            Clear
                          </Button>
                        )}
                      </div>
                      {vesselTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleFilter('vessel_types', type)}>
                          <Checkbox checked={filters.vessel_types.includes(type)} onCheckedChange={() => toggleFilter('vessel_types', type)} />
                          <label className="text-sm flex-1 cursor-pointer">{type}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.vessel_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.vessel_types.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                        <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('vessel_types', type)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Multi-Select */}
              <div>
                <Label>Status</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {filters.statuses.length === 0 ? 'All Statuses' :
                         filters.statuses.length === 1 ? filters.statuses[0] :
                         `${filters.statuses.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Statuses</span>
                        {filters.statuses.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => clearFilter('statuses')} className="h-auto p-1 text-xs">
                            Clear
                          </Button>
                        )}
                      </div>
                      {statusTypes.map(status => (
                        <div key={status} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleFilter('statuses', status)}>
                          <Checkbox checked={filters.statuses.includes(status)} onCheckedChange={() => toggleFilter('statuses', status)} />
                          <label className="text-sm flex-1 cursor-pointer">{status}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.statuses.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.statuses.map(status => (
                      <Badge key={status} variant="secondary" className="text-xs">
                        {status}
                        <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('statuses', status)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort By */}
              <div>
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="type">Vessel Type</SelectItem>
                    <SelectItem value="year">Year Built (Newest)</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="start_date">From Date</Label>
                <Input id="start_date" type="date" value={filters.start_date}
                  onChange={(e) => setFilterValue('start_date', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="end_date">To Date</Label>
                <Input id="end_date" type="date" value={filters.end_date}
                  onChange={(e) => setFilterValue('end_date', e.target.value)} />
              </div>
              <div>
                {(filters.start_date || filters.end_date) && (
                  <Button variant="outline" size="sm" onClick={clearDateFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear Date Range
                  </Button>
                )}
              </div>
            </div>

            {/* Results Counter */}
            <div className="text-sm text-gray-500">
              Showing {filteredVessels.length} of {vessels.length} vessels
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vessels List - Responsive Card Layout */}
      {filteredVessels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ship className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No vessels found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first vessel'}
            </p>
            {canEdit && !searchQuery && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Vessel
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredVessels.map((vessel) => (
                <div
                  key={vessel.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <Ship className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* Vessel Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {vessel.vessel_name}
                    </div>
                    <div className="text-sm text-gray-500 truncate sm:hidden">
                      {vessel.vessel_type || 'N/A'}
                    </div>
                  </div>

                  {/* Registration */}
                  <div className="hidden sm:block w-32 flex-shrink-0">
                    <span className="text-sm text-gray-600">
                      {vessel.registration_number || '-'}
                    </span>
                  </div>

                  {/* Type Badge */}
                  <div className="hidden sm:block flex-shrink-0">
                    <Badge variant="outline" className="whitespace-nowrap text-xs">
                      {vessel.vessel_type || 'N/A'}
                    </Badge>
                  </div>

                  {/* Owner */}
                  <div className="hidden md:block w-36 flex-shrink-0">
                    <span className="text-sm text-gray-600 truncate block">
                      {vessel.owner_name || '-'}
                    </span>
                  </div>

                  {/* Specifications */}
                  <div className="hidden lg:block w-28 flex-shrink-0 text-center">
                    <span className="text-sm text-gray-600">
                      {vessel.length_overall ? `${vessel.length_overall}m × ${vessel.beam}m` : '-'}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="hidden xl:block flex-shrink-0">
                    <Badge 
                      variant={vessel.operational_status === 'Operational' ? 'default' : 'secondary'}
                      className="text-xs whitespace-nowrap"
                    >
                      {vessel.operational_status || 'Unknown'}
                    </Badge>
                  </div>

                  {/* Survey Expiry */}
                  <div className="hidden xl:block w-28 flex-shrink-0">
                    <span className="text-sm text-gray-600">
                      {vessel.cert_survey_expiry ? formatDate(vessel.cert_survey_expiry) : '-'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(vessel)}
                        title="Edit vessel"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(vessel.id, vessel.vessel_name)}
                        title="Delete vessel"
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

      {/* Vessel Form Dialog */}
      <VesselForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        vessel={selectedVessel}
        mode={formMode}
      />

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
                  {dup.field === 'registration_number' && '⚠️ Registration Number'}
                  {dup.field === 'vessel_name' && '⚠️ Vessel Name'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Value:</span> {dup.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Existing Record:</span>{' '}
                  {dup.existing_record.name} ({dup.existing_record.type || dup.existing_record.registration})
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

export default VesselManagement;
