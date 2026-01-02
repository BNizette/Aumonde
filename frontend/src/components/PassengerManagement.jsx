import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Eye, Users, UserPlus, User, Ship, Calendar, ArrowUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { SummaryCard } from '@/components/ui/summary-card';
import { Label } from '@/components/ui/label';
import PassengerForm from './PassengerForm';
import TripForm from './TripForm';
import TripDetailsDialog from './TripDetailsDialog';
import axios from 'axios';

const PassengerManagement = () => {
  const navigate = useNavigate();
  const API = process.env.REACT_APP_BACKEND_URL + '/api';
  const [passengers, setPassengers] = useState([]);
  const [filteredPassengers, setFilteredPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [activeTab, setActiveTab] = useState('all');
  const [passengerTypes, setPassengerTypes] = useState(['Primary', 'Guest']);
  
  // Trip associations for each passenger
  const [passengerTrips, setPassengerTrips] = useState({});
  
  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passengerToDelete, setPassengerToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPassenger, setViewingPassenger] = useState(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [logsPassenger, setLogsPassenger] = useState(null);
  const [passengerTripLogs, setPassengerTripLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Trip editing state
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetailsOpen, setTripDetailsOpen] = useState(false);
  const [selectedTripForDetails, setSelectedTripForDetails] = useState(null);

  useEffect(() => {
    fetchPassengers();
    fetchPassengerTypes();
  }, []);

  useEffect(() => {
    filterPassengers();
  }, [search, typeFilter, sortBy, activeTab, passengers, passengerTrips]);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [passengersRes, tripPassengersRes, tripsRes] = await Promise.all([
        fetch(`${API}/passengers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/trip-passengers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/trips`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const passengersData = await passengersRes.json();
      const tripPassengersData = await tripPassengersRes.json();
      const tripsData = await tripsRes.json();
      
      // Build a map of passenger_id -> trip associations with dates
      const tripMap = {};
      (tripPassengersData || []).forEach(tp => {
        const trip = (tripsData || []).find(t => t.id === tp.trip_id);
        if (trip && tp.passenger_id) {
          if (!tripMap[tp.passenger_id]) {
            tripMap[tp.passenger_id] = [];
          }
          tripMap[tp.passenger_id].push({
            trip_id: trip.id,
            trip_name: trip.trip_name,
            vessel_name: trip.vessel_name,
            depart_datetime: trip.planned_depart_datetime || trip.depart_datetime,
            arrival_datetime: trip.planned_arrival_datetime || trip.arrival_datetime,
            status: tp.status
          });
        }
      });
      
      // Sort trips by departure date (most recent first) and get last trip for each passenger
      Object.keys(tripMap).forEach(passengerId => {
        tripMap[passengerId].sort((a, b) => {
          const dateA = new Date(a.depart_datetime || 0);
          const dateB = new Date(b.depart_datetime || 0);
          return dateB - dateA;
        });
      });
      
      setPassengerTrips(tripMap);
      setPassengers(passengersData || []);
    } catch (error) {
      console.error('Error fetching passengers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPassengerTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/settings/passenger/passenger_types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const types = (response.data?.options || [])
        .filter(o => o.is_active !== false)
        .map(o => typeof o === 'string' ? o : o.value);
      if (types.length > 0) {
        setPassengerTypes(types);
      }
    } catch (err) {
      console.error('Error fetching passenger types:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getLastTrip = (passengerId) => {
    const trips = passengerTrips[passengerId];
    return trips && trips.length > 0 ? trips[0] : null;
  };

  // Check if passenger is currently on a trip (has departure but no arrival yet)
  const isCurrentlyOnTrip = (passengerId) => {
    const lastTrip = getLastTrip(passengerId);
    if (!lastTrip) return false;
    
    const now = new Date();
    const departDate = lastTrip.depart_datetime ? new Date(lastTrip.depart_datetime) : null;
    const arrivalDate = lastTrip.arrival_datetime ? new Date(lastTrip.arrival_datetime) : null;
    
    // Currently on trip if: departure is in past (or today) AND (no arrival date OR arrival is in future)
    return departDate && departDate <= now && (!arrivalDate || arrivalDate > now);
  };

  const filterPassengers = () => {
    let filtered = [...passengers];
    
    // Apply tab filter
    if (activeTab === 'current_primary') {
      filtered = filtered.filter(p => {
        const isPrimary = p.passenger_type === 'Primary' || p.passenger_type?.toLowerCase() === 'primary';
        return isPrimary && isCurrentlyOnTrip(p.id);
      });
    } else if (activeTab === 'current_additional') {
      filtered = filtered.filter(p => {
        const isPrimary = p.passenger_type === 'Primary' || p.passenger_type?.toLowerCase() === 'primary';
        return !isPrimary && isCurrentlyOnTrip(p.id);
      });
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.contact_email?.toLowerCase().includes(searchLower) ||
        p.contact_phone?.includes(search)
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.passenger_type === typeFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'type':
          return (a.passenger_type || '').localeCompare(b.passenger_type || '');
        case 'departure':
          const tripA = getLastTrip(a.id);
          const tripB = getLastTrip(b.id);
          const dateA = tripA?.depart_datetime ? new Date(tripA.depart_datetime) : new Date(0);
          const dateB = tripB?.depart_datetime ? new Date(tripB.depart_datetime) : new Date(0);
          return dateB - dateA; // Most recent first
        default:
          return 0;
      }
    });
    
    setFilteredPassengers(filtered);
  };

  const handleAdd = () => {
    setSelectedPassenger(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (passenger) => {
    setSelectedPassenger(passenger);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleView = (passenger) => {
    setViewingPassenger(passenger);
    setViewDialogOpen(true);
  };

  const handleViewLogs = async (passenger) => {
    setLogsPassenger(passenger);
    setLogsDialogOpen(true);
    setLoadingLogs(true);
    
    // Get trip logs for this passenger
    const trips = passengerTrips[passenger.id] || [];
    setPassengerTripLogs(trips);
    setLoadingLogs(false);
  };

  const handleDelete = (passenger) => {
    setPassengerToDelete(passenger);
    setDeleteDialogOpen(true);
  };

  // Handle editing a trip
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
      setTripFormOpen(false);
      setSelectedTrip(null);
      fetchPassengers(); // Refresh to show updated trip info
    } catch (err) {
      console.error('Error updating trip:', err);
    }
  };

  const confirmDelete = async () => {
    if (!passengerToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/passengers/${passengerToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPassengers();
      setDeleteDialogOpen(false);
      setPassengerToDelete(null);
    } catch (error) {
      console.error('Error deleting passenger:', error);
    }
  };

  const handleSave = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const url = formMode === 'edit' 
        ? `${API}/passengers/${selectedPassenger.id}`
        : `${API}/passengers`;
      
      await fetch(url, {
        method: formMode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      fetchPassengers();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving passenger:', error);
    }
  };

  // Statistics
  const totalPassengers = passengers.length;
  const currentPrimaryGuests = passengers.filter(p => {
    const isPrimary = p.passenger_type === 'Primary' || p.passenger_type?.toLowerCase() === 'primary';
    return isPrimary && isCurrentlyOnTrip(p.id);
  }).length;
  const currentAdditionalGuests = passengers.filter(p => {
    const isPrimary = p.passenger_type === 'Primary' || p.passenger_type?.toLowerCase() === 'primary';
    return !isPrimary && isCurrentlyOnTrip(p.id);
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading passengers...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Passenger Management
          </h1>
          <p className="text-gray-500">Manage passenger profiles, preferences, and requirements</p>
        </div>
        <Button onClick={handleAdd}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Passenger
        </Button>
      </div>

      {/* Statistics Cards - Clickable Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          value={totalPassengers}
          label="Total Passengers"
          description={activeTab === 'all' ? 'Currently viewing' : 'Click to view'}
          color={activeTab === 'all' ? 'blue' : 'gray'}
          onClick={() => setActiveTab('all')}
          className={activeTab === 'all' ? 'ring-2 ring-blue-500' : ''}
        />
        <SummaryCard
          value={currentPrimaryGuests}
          label="Current Primary Guests"
          description={activeTab === 'current_primary' ? 'Currently viewing' : 'Click to filter'}
          color={activeTab === 'current_primary' ? 'green' : 'gray'}
          onClick={() => setActiveTab('current_primary')}
          className={activeTab === 'current_primary' ? 'ring-2 ring-green-500' : ''}
        />
        <SummaryCard
          value={currentAdditionalGuests}
          label="Current Additional Guests"
          description={activeTab === 'current_additional' ? 'Currently viewing' : 'Click to filter'}
          color={activeTab === 'current_additional' ? 'purple' : 'gray'}
          onClick={() => setActiveTab('current_additional')}
          className={activeTab === 'current_additional' ? 'ring-2 ring-purple-500' : ''}
        />
      </div>

      {/* Search, Filters, and Sort */}
      <Card>
        <CardHeader>
          <CardTitle>Passengers</CardTitle>
          <CardDescription>
            {activeTab === 'all' && 'View and manage all passenger profiles'}
            {activeTab === 'current_primary' && 'Primary guests currently on trips (departed but not arrived)'}
            {activeTab === 'current_additional' && 'Additional guests currently on trips (departed but not arrived)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Type Filter */}
            <div className="w-[180px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {passengerTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Sort */}
            <div className="w-[180px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="departure">Sort by Departure Date</SelectItem>
                  <SelectItem value="type">Sort by Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Passenger Table */}
          {filteredPassengers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {passengers.length === 0 ? 'No passengers added yet' : 'No passengers match your filters'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trip Name</TableHead>
                  <TableHead>Departure Date</TableHead>
                  <TableHead>Dietary</TableHead>
                  <TableHead>Medical Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPassengers.map((passenger) => {
                  const lastTrip = getLastTrip(passenger.id);
                  return (
                    <TableRow key={passenger.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {passenger.photo_url ? (
                            <img 
                              src={passenger.photo_url} 
                              alt={passenger.name} 
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{passenger.name}</div>
                            {passenger.relationship_to_primary && (
                              <div className="text-xs text-gray-500">{passenger.relationship_to_primary}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={passenger.passenger_type === 'Primary' ? 'default' : 'secondary'}>
                          {passenger.passenger_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lastTrip ? (
                          <button
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left text-sm"
                            onClick={() => handleEditTrip(lastTrip)}
                          >
                            {lastTrip.trip_name || 'View Trip'}
                          </button>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lastTrip ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              {formatDate(lastTrip.depart_datetime)}
                            </div>
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs truncate">
                          {[passenger.dietary_restrictions, passenger.dietary_preference].filter(Boolean).join(', ') || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs truncate">
                          {[passenger.allergies, passenger.medical_conditions].filter(Boolean).join(', ') || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleViewLogs(passenger)} title="View Logs">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(passenger)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(passenger)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      <PassengerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        passenger={selectedPassenger}
        mode={formMode}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Passenger</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {passengerToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog - Trip Associations */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Trip History - {logsPassenger?.name}
            </DialogTitle>
            <DialogDescription>
              Trips associated with this passenger
            </DialogDescription>
          </DialogHeader>
          
          {loadingLogs ? (
            <div className="text-center py-8 text-gray-500">Loading trip history...</div>
          ) : passengerTripLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Ship className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No trips associated with this passenger</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Passenger Details Card */}
              {logsPassenger && (
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Passenger Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Name:</strong> {logsPassenger.name}</div>
                      <div><strong>Type:</strong> <Badge variant="outline">{logsPassenger.passenger_type || 'N/A'}</Badge></div>
                      {logsPassenger.contact_details?.email && (
                        <div><strong>Email:</strong> {logsPassenger.contact_details.email}</div>
                      )}
                      {logsPassenger.contact_details?.phone && (
                        <div><strong>Phone:</strong> {logsPassenger.contact_details.phone}</div>
                      )}
                      {logsPassenger.medical_info?.conditions && (
                        <div className="col-span-2"><strong>Medical:</strong> {logsPassenger.medical_info.conditions}</div>
                      )}
                      {logsPassenger.preferences?.dietary_requirements && (
                        <div className="col-span-2"><strong>Dietary:</strong> {logsPassenger.preferences.dietary_requirements}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Last Trip Summary */}
              {passengerTripLogs.length > 0 && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Last Associated Trip</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-medium">{passengerTripLogs[0].trip_name}</div>
                    <div className="text-sm text-gray-500">{passengerTripLogs[0].vessel_name}</div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Departure:</span> {formatDate(passengerTripLogs[0].depart_datetime)}
                      </div>
                      <div>
                        <span className="text-gray-500">Arrival:</span> {formatDate(passengerTripLogs[0].arrival_datetime)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* All Trips Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip Name</TableHead>
                    <TableHead>Vessel</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengerTripLogs.map((trip, index) => (
                    <TableRow key={`${trip.trip_id}-${index}`}>
                      <TableCell className="font-medium">
                        <button
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                          onClick={() => {
                            setSelectedTripForDetails({ id: trip.trip_id, trip_name: trip.trip_name, vessel_id: trip.vessel_id, vessel_name: trip.vessel_name });
                            setTripDetailsOpen(true);
                          }}
                        >
                          {trip.trip_name}
                        </button>
                      </TableCell>
                      <TableCell>{trip.vessel_name || '-'}</TableCell>
                      <TableCell>{formatDate(trip.depart_datetime)}</TableCell>
                      <TableCell>{formatDate(trip.arrival_datetime)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{trip.status || 'N/A'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingPassenger?.photo_url ? (
                <img 
                  src={viewingPassenger.photo_url} 
                  alt={viewingPassenger?.name} 
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div>
                <div>{viewingPassenger?.name}</div>
                <Badge variant={viewingPassenger?.passenger_type === 'Primary' ? 'default' : 'secondary'}>
                  {viewingPassenger?.passenger_type}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewingPassenger && (
            <div className="space-y-6">
              {/* Last Trip Info */}
              {getLastTrip(viewingPassenger.id) && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h3 className="font-semibold mb-2 text-blue-800">Last Trip</h3>
                  <div className="text-sm">
                    <div><span className="text-gray-600">Trip:</span> {getLastTrip(viewingPassenger.id).trip_name}</div>
                    <div><span className="text-gray-600">Departure:</span> {formatDate(getLastTrip(viewingPassenger.id).depart_datetime)}</div>
                    <div><span className="text-gray-600">Arrival:</span> {formatDate(getLastTrip(viewingPassenger.id).arrival_datetime)}</div>
                  </div>
                </div>
              )}
              
              {/* Details */}
              <div>
                <h3 className="font-semibold mb-2">Contact Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Email:</span> {viewingPassenger.contact_email || '-'}</div>
                  <div><span className="text-gray-500">Phone:</span> {viewingPassenger.contact_phone || '-'}</div>
                  <div><span className="text-gray-500">DOB:</span> {viewingPassenger.date_of_birth || '-'}</div>
                  <div><span className="text-gray-500">Address:</span> {viewingPassenger.address || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Emergency:</span> {viewingPassenger.emergency_contact_name} - {viewingPassenger.emergency_contact_phone}</div>
                </div>
              </div>

              {/* Medical */}
              <div>
                <h3 className="font-semibold mb-2">Medical & Dietary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Allergies:</span> {viewingPassenger.allergies || '-'}</div>
                  <div><span className="text-gray-500">Medications:</span> {viewingPassenger.medications || '-'}</div>
                  <div><span className="text-gray-500">Medical Conditions:</span> {viewingPassenger.medical_conditions || '-'}</div>
                  <div><span className="text-gray-500">Special Equipment:</span> {viewingPassenger.special_equipment || '-'}</div>
                  <div><span className="text-gray-500">Dietary Restrictions:</span> {viewingPassenger.dietary_restrictions || '-'}</div>
                  <div><span className="text-gray-500">Dislikes:</span> {viewingPassenger.dislikes || '-'}</div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className="font-semibold mb-2">Preferences & Provisioning</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Dietary Preference:</span> {viewingPassenger.dietary_preference || '-'}</div>
                  <div><span className="text-gray-500">Beverage Preference:</span> {viewingPassenger.beverage_preference || '-'}</div>
                  <div><span className="text-gray-500">Alcohol Allowed:</span> {viewingPassenger.alcohol_allowed ? 'Yes' : 'No'}</div>
                  <div><span className="text-gray-500">Dining Style:</span> {viewingPassenger.dining_styles?.length > 0 ? viewingPassenger.dining_styles.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : (viewingPassenger.dining_style || '-')}</div>
                </div>
              </div>

              {/* Entertainment */}
              <div>
                <h3 className="font-semibold mb-2">Entertainment & Activities</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Music Genre:</span> {viewingPassenger.music_genre || '-'}</div>
                  <div><span className="text-gray-500">Movie Preferences:</span> {viewingPassenger.movie_preferences || '-'}</div>
                  <div><span className="text-gray-500">Internet Requirement:</span> {viewingPassenger.internet_requirement || '-'}</div>
                  <div><span className="text-gray-500">Privacy Level:</span> {viewingPassenger.privacy_level || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Desired Experiences:</span> {viewingPassenger.desired_experiences || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Special Requests:</span> {viewingPassenger.special_requests || '-'}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setViewDialogOpen(false); handleEdit(viewingPassenger); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default PassengerManagement;
