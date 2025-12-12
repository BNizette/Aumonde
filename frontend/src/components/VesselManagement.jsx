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
  const [filters, setFilters] = useState({
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

  const toggleFilter = (filterType, value) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const isSelected = currentArray.includes(value);
      
      return {
        ...prev,
        [filterType]: isSelected
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value]
      };
    });
  };

  const clearFilter = (filterType) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: []
    }));
  };

  const clearDateFilters = () => {
    setFilters(prev => ({
      ...prev,
      start_date: '',
      end_date: ''
    }));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters({
      vessel_types: [],
      statuses: [],
      start_date: '',
      end_date: ''
    });
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
          onClick={() => {
            setSearchQuery('');
            setVesselTypeFilter('all');
            setSortBy('name');
          }}
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
            setVesselTypeFilter('all');
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
          onClick={() => {
            setSearchQuery('');
            setVesselTypeFilter('all');
            setSortBy('name');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-purple-600">
              {vessels.reduce((sum, v) => sum + (parseInt(v.passenger_capacity) || 0), 0)}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">View all vessels</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, registration, type, or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Vessel Type Filter */}
              <div className="w-full md:w-48">
                <Select value={vesselTypeFilter} onValueChange={setVesselTypeFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Vessel Type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {vesselTypes.filter(type => type !== 'all').map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="w-full md:w-48">
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

            {/* Results and Clear Filters */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredVessels.length} of {vessels.length} vessels
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

      {/* Vessels Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVessels.map((vessel) => (
            <Card key={vessel.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Ship className="h-5 w-5 text-blue-600" />
                      {vessel.vessel_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {vessel.registration_number || 'No registration'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{vessel.vessel_type || 'N/A'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Owner:</span>
                    <span className="text-gray-600 ml-2">{vessel.owner_name || 'N/A'}</span>
                  </div>
                  
                  {vessel.length_overall && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Specifications:</span>
                      <span className="text-gray-600 ml-2">
                        {vessel.length_overall}m × {vessel.beam}m
                      </span>
                    </div>
                  )}

                  {vessel.year_built && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Year Built:</span>
                      <span className="text-gray-600 ml-2">{vessel.year_built}</span>
                    </div>
                  )}

                  {vessel.max_passengers && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Capacity:</span>
                      <span className="text-gray-600 ml-2">
                        {vessel.max_passengers} passengers, {vessel.max_crew} crew
                      </span>
                    </div>
                  )}

                  {/* Certificate Status */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {vessel.cert_survey_expiry ? (
                        <span>Survey expires: {formatDate(vessel.cert_survey_expiry)}</span>
                      ) : (
                        <span>No certificate dates</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleEdit(vessel)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(vessel.id, vessel.vessel_name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
