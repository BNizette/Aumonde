import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Edit, Trash2, MapPin, Ship, Calendar, Users, FileText, Filter, X, AlertTriangle, Download, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import TripForm from './TripForm';
import TripDetailsDialog from './TripDetailsDialog';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripManagement = () => {
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [manualLogOpen, setManualLogOpen] = useState(false);
  const [manualLogType, setManualLogType] = useState('running');

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
    statuses: [],
    vessels: [],
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchTrips();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filters, sortBy, trips]);

  const applyFiltersAndSort = () => {
    let filtered = [...trips];

    if (searchQuery) {
      filtered = filtered.filter(trip =>
        trip.trip_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.trip_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.operating_area?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.statuses.length > 0) {
      const now = new Date();
      filtered = filtered.filter(trip => {
        const departDate = trip.planned_depart_datetime ? new Date(trip.planned_depart_datetime) : (trip.depart_datetime ? new Date(trip.depart_datetime) : null);
        const returnDate = trip.return_datetime ? new Date(trip.return_datetime) : null;
        
        return filters.statuses.some(status => {
          if (status === 'active') return departDate && departDate <= now && (!returnDate || returnDate >= now);
          if (status === 'completed') return returnDate && returnDate < now;
          if (status === 'upcoming') return departDate && departDate > now;
          return false;
        });
      });
    }

    if (filters.vessels.length > 0) {
      filtered = filtered.filter(trip => filters.vessels.includes(trip.vessel_name));
    }

    if (filters.start_date || filters.end_date) {
      filtered = filtered.filter(trip => {
        const tripDate = trip.planned_depart_datetime ? new Date(trip.planned_depart_datetime) : (trip.depart_datetime ? new Date(trip.depart_datetime) : null);
        if (!tripDate) return false;
        const startDate = filters.start_date ? new Date(filters.start_date) : null;
        const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59') : null;
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date': return new Date(b.planned_depart_datetime || b.depart_datetime || 0) - new Date(a.planned_depart_datetime || a.depart_datetime || 0);
        case 'vessel': return (a.vessel_name || '').localeCompare(b.vessel_name || '');
        case 'name': return (a.trip_name || '').localeCompare(b.trip_name || '');
        default: return 0;
      }
    });

    setFilteredTrips(filtered);
  };

  const clearAllFilters = () => { 
    setSearchQuery(''); 
    clearAllFiltersHook(); 
  };

  const exportToCSV = () => {
    if (filteredTrips.length === 0) { setError('No trips to export'); setTimeout(() => setError(''), 3000); return; }
    const headers = ['ID', 'Trip Name', 'Vessel Name', 'Trip Type', 'Depart Date', 'Return Date', 'Operating Area', 'Passengers', 'Crew', 'Master', 'Engineer', 'Deckhand', 'Host', 'Notes', 'Created At'];
    const csvRows = [headers.join(','), ...filteredTrips.map(t => [
      `"${t.id || ''}"`, `"${(t.trip_name || '').replace(/"/g, '""')}"`, `"${(t.vessel_name || '').replace(/"/g, '""')}"`,
      `"${t.trip_type || ''}"`, `"${(t.planned_depart_datetime || t.depart_datetime) ? new Date(t.planned_depart_datetime || t.depart_datetime).toLocaleString() : ''}"`,
      `"${t.return_datetime ? new Date(t.return_datetime).toLocaleString() : ''}"`, `"${(t.operating_area || '').replace(/"/g, '""')}"`,
      `"${t.number_of_passengers || ''}"`, `"${t.number_of_crew || ''}"`, `"${t.master || ''}"`, `"${t.engineer || ''}"`,
      `"${t.deckhand || ''}"`, `"${t.host || ''}"`, `"${(t.notes || '').replace(/"/g, '""')}"`,
      `"${t.created_at ? new Date(t.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `trips_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Exported ${filteredTrips.length} trips to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => { setSearchQuery(''); clearAllFilters(); setSortBy('date'); };
  const hasActiveFilters = searchQuery || filters.statuses.length > 0 || filters.vessels.length > 0 || filters.start_date || filters.end_date || sortBy !== 'date';

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(response.data);
      const uniqueStatuses = ['active', 'completed', 'upcoming'];
      const uniqueVessels = [...new Set(response.data.map(t => t.vessel_name).filter(Boolean))];
      setStatuses(uniqueStatuses);
      setVessels(uniqueVessels);
    } catch (err) {
      setError('Error fetching trips');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTrip(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (trip) => {
    setSelectedTrip(trip);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleView = (trip) => {
    setSelectedTrip(trip);
    setDetailsOpen(true);
  };

  const checkDuplicates = async (tripData) => {
    try {
      const token = localStorage.getItem('token');
      const checkData = {
        ...tripData,
        id: formMode === 'edit' ? selectedTrip.id : null
      };
      
      const response = await axios.post(`${API}/trips/check-duplicate`, checkData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (err) {
      console.error('Error checking duplicates:', err);
      return { has_duplicates: false, duplicates: [] };
    }
  };

  const handleSave = async (tripData) => {
    setPendingFormData(tripData);
    
    // Check for duplicates
    const duplicateCheck = await checkDuplicates(tripData);
    
    if (duplicateCheck.has_duplicates) {
      setDuplicateWarning(duplicateCheck.duplicates);
      setShowDuplicateDialog(true);
      return; // Don't save yet, wait for user confirmation
    }
    
    // No duplicates, proceed with save
    await performSave(tripData);
  };

  const performSave = async (tripData) => {
    try {
      const token = localStorage.getItem('token');
      if (formMode === 'create') {
        await axios.post(`${API}/trips`, tripData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Trip created successfully');
      } else {
        await axios.put(`${API}/trips/${selectedTrip.id}`, tripData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Trip updated successfully');
      }
      setFormOpen(false);
      setShowDuplicateDialog(false);
      setPendingFormData(null);
      fetchTrips();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving trip');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (trip) => {
    if (!window.confirm(`Are you sure you want to delete trip "${trip.trip_name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/trips/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Trip deleted successfully');
      fetchTrips();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting trip');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEdit = user?.access_level === 'Edit' || user?.access_level === 'Full';
  const canDelete = user?.access_level === 'Full';

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trip Management</h1>
          <p className="text-gray-500 mt-1">Manage vessel trips and crew shift logs</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Trip
            </Button>
          )}
        </div>
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
            clearAllFilters();
            setSortBy('date');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Trips</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{trips.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => updateFilters({ statuses: ['active'], vessels: [], start_date: '', end_date: '' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Active</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-600">
              {trips.filter(t => t.status === 'active').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => updateFilters({ statuses: ['upcoming'], vessels: [], start_date: '', end_date: '' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-blue-600">
              {trips.filter(t => t.status === 'upcoming').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => updateFilters({ statuses: ['completed'], vessels: [], start_date: '', end_date: '' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-gray-600">
              {trips.filter(t => t.status === 'completed').length}
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
            <Download className="h-4 w-4" />Export to CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(filters.statuses.length > 0 || filters.vessels.length > 0 || filters.start_date || filters.end_date || searchQuery) && (
              <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={clearAllFilters}><X className="h-4 w-4 mr-2" />Clear All Filters</Button></div>
            )}
            <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by trip name, vessel, type, or area..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Status</Label>
                <Popover><PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between"><span className="truncate">{filters.statuses.length === 0 ? 'All Status' : filters.statuses.length === 1 ? filters.statuses[0] : `${filters.statuses.length} selected`}</span><ChevronDown className="h-4 w-4 ml-2 shrink-0" /></Button>
                </PopoverTrigger><PopoverContent className="w-64 p-0" align="start"><div className="p-2">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1"><span className="text-sm font-medium">Select Status</span>
                    {filters.statuses.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('statuses')} className="h-auto p-1 text-xs">Clear</Button>)}
                  </div>
                  {statuses.map(st => (<div key={st} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('statuses', st)}>
                    <Checkbox checked={filters.statuses.includes(st)} onCheckedChange={() => toggleFilter('statuses', st)} /><label className="text-sm flex-1 cursor-pointer">{st}</label>
                  </div>))}
                </div></PopoverContent></Popover>
                {filters.statuses.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.statuses.map(st => (<Badge key={st} variant="secondary" className="text-xs">{st}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('statuses', st)} /></Badge>))}</div>)}
              </div>
              <div><Label>Vessel</Label>
                <Popover><PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between"><span className="truncate">{filters.vessels.length === 0 ? 'All Vessels' : filters.vessels.length === 1 ? filters.vessels[0] : `${filters.vessels.length} selected`}</span><ChevronDown className="h-4 w-4 ml-2 shrink-0" /></Button>
                </PopoverTrigger><PopoverContent className="w-64 p-0" align="start"><div className="p-2">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1"><span className="text-sm font-medium">Select Vessels</span>
                    {filters.vessels.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('vessels')} className="h-auto p-1 text-xs">Clear</Button>)}
                  </div>
                  {vessels.map(v => (<div key={v} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('vessels', v)}>
                    <Checkbox checked={filters.vessels.includes(v)} onCheckedChange={() => toggleFilter('vessels', v)} /><label className="text-sm flex-1 cursor-pointer">{v}</label>
                  </div>))}
                </div></PopoverContent></Popover>
                {filters.vessels.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.vessels.map(v => (<Badge key={v} variant="secondary" className="text-xs">{v}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('vessels', v)} /></Badge>))}</div>)}
              </div>
              <div><Label>Sort By</Label><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent><SelectItem value="date">Date (Newest)</SelectItem><SelectItem value="vessel">Vessel Name</SelectItem><SelectItem value="name">Trip Name</SelectItem></SelectContent>
              </Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div><Label htmlFor="start_date">From Date</Label><Input id="start_date" type="date" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} /></div>
              <div><Label htmlFor="end_date">To Date</Label><Input id="end_date" type="date" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} /></div>
              <div>{(filters.start_date || filters.end_date) && (<Button variant="outline" size="sm" onClick={clearDateFilters} className="w-full"><X className="h-4 w-4 mr-2" />Clear Date Range</Button>)}</div>
            </div>
            <div className="text-sm text-gray-500">Showing {filteredTrips.length} of {trips.length} trips</div>
          </div>
        </CardContent>
      </Card>

      {filteredTrips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No trips found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || hasActiveFilters ? 'Try adjusting your search or filters' : 'Get started by creating your first trip'}
            </p>
            {canEdit && !searchQuery && !hasActiveFilters && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Trip
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTrips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{trip.trip_name}</h3>
                      {trip.trip_type && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {trip.trip_type}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      {trip.vessel_name && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Ship className="h-4 w-4 text-teal-600" />
                          <span>{trip.vessel_name}</span>
                        </div>
                      )}
                      
                      {trip.operating_area && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4 text-orange-600" />
                          <span>{trip.operating_area}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span>{formatDateTime(trip.planned_depart_datetime || trip.depart_datetime)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4 text-green-600" />
                        <span>
                          {trip.number_of_crew || 0} crew, {trip.number_of_passengers || 0} passengers
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleView(trip)}
                      title="View details and logs"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(trip)}
                        title="Edit trip"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(trip)}
                        title="Delete trip"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      <TripForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        trip={selectedTrip}
        mode={formMode}
      />

      <TripDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        trip={selectedTrip}
        onRefresh={fetchTrips}
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
              The following conflicts were found:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-4">
            {duplicateWarning?.map((dup, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-semibold text-sm text-yellow-800 mb-1">
                  {dup.field === 'trip_name' && '⚠️ Trip Name'}
                  {dup.field === 'date_overlap' && '⚠️ Date Overlap on Same Vessel'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Value:</span> {dup.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Existing Record:</span>{' '}
                  {dup.existing_record.name}
                  {dup.existing_record.depart && ` - Departs: ${new Date(dup.existing_record.depart).toLocaleDateString()}`}
                  {dup.existing_record.return && ` - Returns: ${new Date(dup.existing_record.return).toLocaleDateString()}`}
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

export default TripManagement;
