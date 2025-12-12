import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Edit, Trash2, MapPin, Ship, Calendar, Users, FileText, Filter, X, AlertTriangle } from 'lucide-react';
import TripForm from './TripForm';
import TripDetailsDialog from './TripDetailsDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripManagement = () => {
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('all');
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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchTrips();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, statusFilter, vesselFilter, sortBy, trips]);

  const applyFiltersAndSort = () => {
    let filtered = [...trips];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(trip =>
        trip.trip_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.trip_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.operating_area?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter (based on dates)
    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(trip => {
        const departDate = trip.depart_datetime ? new Date(trip.depart_datetime) : null;
        const returnDate = trip.return_datetime ? new Date(trip.return_datetime) : null;
        
        if (statusFilter === 'active') {
          return departDate && departDate <= now && (!returnDate || returnDate >= now);
        } else if (statusFilter === 'completed') {
          return returnDate && returnDate < now;
        } else if (statusFilter === 'upcoming') {
          return departDate && departDate > now;
        }
        return true;
      });
    }

    // Apply vessel filter
    if (vesselFilter !== 'all') {
      filtered = filtered.filter(trip => 
        trip.vessel_name?.toLowerCase().includes(vesselFilter.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.depart_datetime || 0) - new Date(a.depart_datetime || 0);
        case 'vessel':
          return (a.vessel_name || '').localeCompare(b.vessel_name || '');
        case 'name':
          return (a.trip_name || '').localeCompare(b.trip_name || '');
        default:
          return 0;
      }
    });

    setFilteredTrips(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setVesselFilter('all');
    setSortBy('date');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || vesselFilter !== 'all' || sortBy !== 'date';

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(response.data);
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

  // Get unique vessels for filter
  const uniqueVessels = [...new Set(trips.map(t => t.vessel_name).filter(Boolean))];

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
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Trip
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setVesselFilter('all');
            setSortBy('date');
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trips.length}</div>
            <p className="text-xs text-gray-500 mt-1">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setStatusFilter('active')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {trips.filter(t => t.status === 'active').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setStatusFilter('upcoming')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {trips.filter(t => t.status === 'upcoming').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setStatusFilter('completed')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {trips.filter(t => t.status === 'completed').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Click to filter</p>
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
                  placeholder="Search by trip name, vessel, type, or area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
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
                    <SelectItem value="date">Date (Newest)</SelectItem>
                    <SelectItem value="vessel">Vessel Name</SelectItem>
                    <SelectItem value="name">Trip Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredTrips.length} of {trips.length} trips
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
                        <span>{formatDateTime(trip.depart_datetime)}</span>
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
