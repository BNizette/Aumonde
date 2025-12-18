import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard } from '@/components/ui/summary-card';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Edit, Trash2, MapPin, Ship, Calendar, Users, FileText, Filter, X, AlertTriangle, Download, ChevronDown, Info, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  const exportToExcel = () => {
    if (filteredTrips.length === 0) { setError('No trips to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Trip Name', 'Vessel', 'Trip Type', 'Depart Date', 'Return Date', 'Operating Area', 'Passengers', 'Crew'];
    const data = [headers, ...filteredTrips.map(t => [
      t.trip_name || '-', t.vessel_name || '-', t.trip_type || '-',
      (t.planned_depart_datetime || t.depart_datetime) ? new Date(t.planned_depart_datetime || t.depart_datetime).toLocaleString() : '-',
      t.return_datetime ? new Date(t.return_datetime).toLocaleString() : '-',
      t.operating_area || '-', t.number_of_passengers || '0', t.number_of_crew || '0'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Trips');
    XLSX.writeFile(wb, `trips_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredTrips.length} trips to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => { setSearchQuery(''); clearAllFilters(); setSortBy('date'); };
  const hasActiveFilters = searchQuery || filters.statuses.length > 0 || filters.vessels.length > 0 || filters.start_date || filters.end_date || sortBy !== 'date';

  // Import from Excel handler
  const handleImport = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const tripData = {
            trip_name: row['Trip Name'] || row['trip_name'] || '',
            trip_type: row['Trip Type'] || row['trip_type'] || '',
            vessel_id: row['Vessel ID'] || row['vessel_id'] || '',
            departure_port: row['Departure Port'] || row['departure_port'] || '',
            arrival_port: row['Arrival Port'] || row['arrival_port'] || '',
            departure_date: row['Departure Date'] || row['departure_date'] || '',
            arrival_date: row['Arrival Date'] || row['arrival_date'] || '',
            status: row['Status'] || row['status'] || 'upcoming',
          };

          if (!tripData.trip_name) continue;

          await axios.post(`${API}/trips`, tripData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error('Error importing trip:', err);
          errorCount++;
        }
      }

      setMessage(`Import complete: ${successCount} trips added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchTrips();
    } catch (err) {
      setError('Error importing data: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const tripImportColumns = ['Trip Name', 'Trip Type', 'Vessel ID', 'Departure Port', 'Arrival Port', 'Departure Date', 'Arrival Date', 'Status'];
  const tripImportSample = [['Sydney Charter', 'Charter', '', 'Sydney', 'Newcastle', '2024-01-15', '2024-01-15', 'upcoming']];

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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Trip Management</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-blue-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-semibold mb-1">Marine Order 504 (2024)</p>
                  <p className="text-sm mb-2">
                    Operational procedures must align with assessed risks, including voyage planning, safety of navigation, and crew allocation per SMS requirements.
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
        <SummaryCard
          value={trips.length}
          label="Total Trips"
          description="All trips"
          color="blue"
          onClick={() => { clearAllFilters(); setSortBy('date'); }}
        />
        <SummaryCard
          value={trips.filter(t => t.status === 'active').length}
          label="Active"
          description="In progress"
          color="green"
          onClick={() => updateFilters({ statuses: ['active'], vessels: [], start_date: '', end_date: '' })}
        />
        <SummaryCard
          value={trips.filter(t => t.status === 'upcoming').length}
          label="Upcoming"
          description="Scheduled"
          color="yellow"
          onClick={() => updateFilters({ statuses: ['upcoming'], vessels: [], start_date: '', end_date: '' })}
        />
        <SummaryCard
          value={trips.filter(t => t.status === 'completed').length}
          label="Completed"
          description="Finished trips"
          color="gray"
          onClick={() => updateFilters({ statuses: ['completed'], vessels: [], start_date: '', end_date: '' })}
        />
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
            <FileSpreadsheet className="h-4 w-4" />Export to Excel
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
