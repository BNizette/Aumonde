import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripForm = ({ open, onClose, onSave, trip, mode = 'create' }) => {
  const [vessels, setVessels] = useState([]);
  const [tripTypes, setTripTypes] = useState([]);
  const [tripPassengers, setTripPassengers] = useState([]);
  const [error, setError] = useState('');
  
  // Passenger form state
  const [passengerFormOpen, setPassengerFormOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState(null);
  
  // Allocate passenger state
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState([]);  // Changed to array for multi-select
  const [selectedStatus, setSelectedStatus] = useState('');
  const [allocateSearch, setAllocateSearch] = useState('');

  const [formData, setFormData] = useState({
    trip_name: '',
    vessel_id: '',
    trip_type: '',
    operating_area: '',
    planned_depart_datetime: '',
    planned_arrival_datetime: '',
    actual_depart_datetime: '',
    actual_arrival_datetime: '',
    depart_location: '',
    arrival_location: '',
    number_of_passengers: 0,
    number_of_crew: 0
  });

  const fetchVessels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vessels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVessels(response.data);
    } catch (err) {
      console.error('Error fetching vessels:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch trip types
      const tripTypesRes = await fetch(`${API}/settings/trip/trip_types`, { headers });
      const tripTypesData = await tripTypesRes.json();
      setTripTypes(tripTypesData.options || []);
      
      // Fetch passenger types
      const passengerTypesRes = await fetch(`${API}/settings/passenger/passenger_types`, { headers });
      const passengerTypesData = await passengerTypesRes.json();
      const types = (passengerTypesData.options || []).filter(o => o.is_active !== false).map(o => typeof o === 'string' ? o : o.value);
      setPassengerTypes(types.length > 0 ? types : ['Primary', 'Guest']);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setTripTypes([]);
      setPassengerTypes(['Primary', 'Guest']);
    }
  };

  const fetchAllPassengers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/passengers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllPassengers(response.data || []);
    } catch (err) {
      console.error('Error fetching passengers:', err);
    }
  };

  const fetchTripPassengers = async (tripId) => {
    if (!tripId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/trip-passengers?trip_id=${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTripPassengers(response.data || []);
    } catch (err) {
      console.error('Error fetching trip passengers:', err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchVessels();
      fetchSettings();
      fetchAllPassengers();
    }
  }, [open]);

  useEffect(() => {
    if (trip && mode === 'edit') {
      setFormData({
        trip_name: trip.trip_name || '',
        vessel_id: trip.vessel_id || '',
        trip_type: trip.trip_type || '',
        operating_area: trip.operating_area || '',
        planned_depart_datetime: trip.planned_depart_datetime || '',
        planned_arrival_datetime: trip.planned_arrival_datetime || '',
        actual_depart_datetime: trip.actual_depart_datetime || '',
        actual_arrival_datetime: trip.actual_arrival_datetime || '',
        depart_location: trip.depart_location || '',
        arrival_location: trip.arrival_location || '',
        number_of_passengers: trip.number_of_passengers || 0,
        number_of_crew: trip.number_of_crew || 0
      });
      fetchTripPassengers(trip.id);
    } else if (mode === 'create') {
      setFormData({
        trip_name: '',
        vessel_id: '',
        trip_type: '',
        operating_area: '',
        planned_depart_datetime: '',
        planned_arrival_datetime: '',
        actual_depart_datetime: '',
        actual_arrival_datetime: '',
        depart_location: '',
        arrival_location: '',
        number_of_passengers: 0,
        number_of_crew: 0
      });
      setTripPassengers([]);
    }
  }, [trip, mode, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.trip_name.trim()) {
      setError('Trip name is required');
      return;
    }
    if (!formData.vessel_id) {
      setError('Please select a vessel');
      return;
    }
    setError('');
    
    // Update passenger count based on trip passengers
    const updatedFormData = {
      ...formData,
      number_of_passengers: tripPassengers.length
    };
    
    onSave(updatedFormData);
  };

  // Add new passenger (opens PassengerForm)
  const handleAddNewPassenger = () => {
    setEditingPassenger(null);
    setPassengerFormOpen(true);
  };

  // Save passenger from PassengerForm and add to trip
  const handleSaveNewPassenger = async (passengerData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Create the passenger in the Passenger collection
      const response = await axios.post(`${API}/passengers`, passengerData, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        }
      });
      
      const newPassenger = response.data;
      
      // If we have a trip ID (edit mode), add to trip passengers
      if (trip?.id) {
        await axios.post(`${API}/trip-passengers`, {
          trip_id: trip.id,
          passenger_id: newPassenger.id,
          name: newPassenger.name,
          status: passengerData.passenger_type || passengerTypes[0] || 'Primary'
        }, {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          }
        });
        
        fetchTripPassengers(trip.id);
      } else {
        // For create mode, add to local state (will be saved when trip is created)
        setTripPassengers(prev => [...prev, {
          id: `temp-${Date.now()}`,
          passenger_id: newPassenger.id,
          name: newPassenger.name,
          status: passengerData.passenger_type || passengerTypes[0] || 'Primary'
        }]);
      }
      
      // Refresh all passengers list
      fetchAllPassengers();
      setPassengerFormOpen(false);
    } catch (err) {
      console.error('Error saving passenger:', err);
      alert('Failed to save passenger');
    }
  };

  // Allocate existing passengers to trip (supports multiple)
  const handleAllocatePassengers = async () => {
    if (selectedPassengerIds.length === 0 || !selectedStatus) {
      alert('Please select at least one passenger and a status');
      return;
    }
    
    // Filter out already allocated passengers
    const alreadyAllocatedIds = tripPassengers.map(tp => tp.passenger_id);
    const newPassengerIds = selectedPassengerIds.filter(id => !alreadyAllocatedIds.includes(id));
    
    if (newPassengerIds.length === 0) {
      alert('All selected passengers are already allocated to this trip');
      return;
    }
    
    const passengersToAllocate = allPassengers.filter(p => newPassengerIds.includes(p.id));
    
    try {
      const token = localStorage.getItem('token');
      
      if (trip?.id) {
        // Save to backend for edit mode
        for (const passenger of passengersToAllocate) {
          await axios.post(`${API}/trip-passengers`, {
            trip_id: trip.id,
            passenger_id: passenger.id,
            name: passenger.name,
            status: selectedStatus
          }, {
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            }
          });
        }
        fetchTripPassengers(trip.id);
      } else {
        // Add to local state for create mode
        const newTripPassengers = passengersToAllocate.map(passenger => ({
          id: `temp-${Date.now()}-${passenger.id}`,
          passenger_id: passenger.id,
          name: passenger.name,
          status: selectedStatus
        }));
        setTripPassengers(prev => [...prev, ...newTripPassengers]);
      }
      
      setAllocateOpen(false);
      setSelectedPassengerIds([]);
      setSelectedStatus('');
      setAllocateSearch('');
    } catch (err) {
      console.error('Error allocating passengers:', err);
      alert('Failed to allocate passengers');
    }
  };

  // Toggle passenger selection in multi-select
  const togglePassengerSelection = (passengerId) => {
    setSelectedPassengerIds(prev => 
      prev.includes(passengerId) 
        ? prev.filter(id => id !== passengerId)
        : [...prev, passengerId]
    );
  };

  // Remove passenger from trip
  const handleRemovePassenger = async (passengerId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (trip?.id && !passengerId.startsWith('temp-')) {
        await axios.delete(`${API}/trip-passengers/${passengerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchTripPassengers(trip.id);
      } else {
        setTripPassengers(prev => prev.filter(p => p.id !== passengerId));
      }
    } catch (err) {
      console.error('Error removing passenger:', err);
    }
  };

  // Filter passengers for allocation dropdown
  const filteredPassengers = allPassengers.filter(p => {
    const searchLower = allocateSearch.toLowerCase();
    return p.name?.toLowerCase().includes(searchLower) ||
           p.contact_email?.toLowerCase().includes(searchLower);
  });

  // Export passengers
  const handleExportPassengers = () => {
    if (tripPassengers.length === 0) {
      alert('No passengers to export');
      return;
    }
    
    const headers = ['Name', 'Status', 'Comment'];
    const rows = tripPassengers.map(p => [p.name, p.status, p.comment || '']);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-passengers-${formData.trip_name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create New Trip' : 'Edit Trip'}</DialogTitle>
            <DialogDescription>
              {mode === 'create' ? 'Add a new trip to the system' : 'Update trip details'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Trip Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trip_name">Trip Name *</Label>
                  <Input
                    id="trip_name"
                    value={formData.trip_name}
                    onChange={(e) => handleChange('trip_name', e.target.value)}
                    placeholder="Enter trip name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vessel_id">Vessel *</Label>
                  <Select value={formData.vessel_id} onValueChange={(value) => handleChange('vessel_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      {vessels.map(vessel => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.vessel_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trip_type">Trip Type</Label>
                  <Select value={formData.trip_type} onValueChange={(value) => handleChange('trip_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trip type" />
                    </SelectTrigger>
                    <SelectContent>
                      {tripTypes.map((type, idx) => (
                        <SelectItem key={idx} value={typeof type === 'string' ? type : type.value}>
                          {typeof type === 'string' ? type : type.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operating_area">Operating Area</Label>
                  <Input
                    id="operating_area"
                    value={formData.operating_area}
                    onChange={(e) => handleChange('operating_area', e.target.value)}
                    placeholder="Enter operating area"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depart_location">Departure Location</Label>
                  <Input
                    id="depart_location"
                    value={formData.depart_location}
                    onChange={(e) => handleChange('depart_location', e.target.value)}
                    placeholder="Enter departure location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrival_location">Arrival Location</Label>
                  <Input
                    id="arrival_location"
                    value={formData.arrival_location}
                    onChange={(e) => handleChange('arrival_location', e.target.value)}
                    placeholder="Enter arrival location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planned_depart">Planned Departure</Label>
                  <Input
                    id="planned_depart"
                    type="datetime-local"
                    value={formData.planned_depart_datetime}
                    onChange={(e) => handleChange('planned_depart_datetime', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planned_arrival">Planned Arrival</Label>
                  <Input
                    id="planned_arrival"
                    type="datetime-local"
                    value={formData.planned_arrival_datetime}
                    onChange={(e) => handleChange('planned_arrival_datetime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actual_depart">Actual Departure</Label>
                  <Input
                    id="actual_depart"
                    type="datetime-local"
                    value={formData.actual_depart_datetime}
                    onChange={(e) => handleChange('actual_depart_datetime', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actual_arrival">Actual Arrival</Label>
                  <Input
                    id="actual_arrival"
                    type="datetime-local"
                    value={formData.actual_arrival_datetime}
                    onChange={(e) => handleChange('actual_arrival_datetime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number_of_crew">Number of Crew</Label>
                  <Input
                    id="number_of_crew"
                    type="number"
                    min="0"
                    value={formData.number_of_crew}
                    onChange={(e) => handleChange('number_of_crew', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passengers</Label>
                  <div className="text-2xl font-bold text-blue-600">{tripPassengers.length}</div>
                  <p className="text-xs text-gray-500">Manage in Trip Details view</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {mode === 'create' ? 'Create Trip' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passenger Form Dialog */}
      <PassengerForm
        open={passengerFormOpen}
        onClose={() => setPassengerFormOpen(false)}
        onSave={handleSaveNewPassenger}
        passenger={editingPassenger}
        mode="create"
      />
    </>
  );
};

export default TripForm;
