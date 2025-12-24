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
  const [allocatedCrew, setAllocatedCrew] = useState([]);
  const [error, setError] = useState('');

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
      
    } catch (err) {
      console.error('Error fetching settings:', err);
      setTripTypes([]);
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

  const fetchAllocatedCrew = async (tripId) => {
    if (!tripId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/allocated-crew?trip_id=${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllocatedCrew(response.data || []);
    } catch (err) {
      console.error('Error fetching allocated crew:', err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchVessels();
      fetchSettings();
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Trip' : 'Edit Trip'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new trip to the system' : 'Update trip details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
  );
};

export default TripForm;
