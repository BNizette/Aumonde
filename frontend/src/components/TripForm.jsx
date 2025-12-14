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
      
      const response = await fetch(`${API}/settings/trip/trip_types`, { headers });
      const data = await response.json();
      setTripTypes(data.options || []);
    } catch (err) {
      console.error('Error fetching trip type settings:', err);
      setTripTypes([]);
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
        planned_depart_datetime: trip.planned_depart_datetime ? new Date(trip.planned_depart_datetime).toISOString().slice(0, 16) : (trip.depart_datetime ? new Date(trip.depart_datetime).toISOString().slice(0, 16) : ''),
        planned_arrival_datetime: trip.planned_arrival_datetime ? new Date(trip.planned_arrival_datetime).toISOString().slice(0, 16) : (trip.arrival_datetime ? new Date(trip.arrival_datetime).toISOString().slice(0, 16) : ''),
        actual_depart_datetime: trip.actual_depart_datetime ? new Date(trip.actual_depart_datetime).toISOString().slice(0, 16) : '',
        actual_arrival_datetime: trip.actual_arrival_datetime ? new Date(trip.actual_arrival_datetime).toISOString().slice(0, 16) : '',
        depart_location: trip.depart_location || '',
        arrival_location: trip.arrival_location || '',
        number_of_passengers: trip.number_of_passengers || 0,
        number_of_crew: trip.number_of_crew || 0
      });
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
    }
    setError('');
  }, [trip, mode, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    setError('');

    if (!formData.trip_name) {
      setError('Please enter a trip name');
      return;
    }

    if (!formData.vessel_id) {
      setError('Please select a vessel');
      return;
    }

    if (!formData.planned_depart_datetime) {
      setError('Please enter a planned departure date and time');
      return;
    }

    const submitData = {
      ...formData,
      planned_depart_datetime: new Date(formData.planned_depart_datetime).toISOString(),
      planned_arrival_datetime: formData.planned_arrival_datetime ? new Date(formData.planned_arrival_datetime).toISOString() : null,
      actual_depart_datetime: formData.actual_depart_datetime ? new Date(formData.actual_depart_datetime).toISOString() : null,
      actual_arrival_datetime: formData.actual_arrival_datetime ? new Date(formData.actual_arrival_datetime).toISOString() : null,
      number_of_passengers: parseInt(formData.number_of_passengers) || 0,
      number_of_crew: parseInt(formData.number_of_crew) || 0
    };

    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Trip' : 'Edit Trip'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new trip to the system' : 'Update trip information'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip_name">Trip Name *</Label>
            <Input
              id="trip_name"
              value={formData.trip_name}
              onChange={(e) => handleChange('trip_name', e.target.value)}
              placeholder="e.g., Sydney to Whitsundays"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vessel_id">Vessel *</Label>
            <Select value={formData.vessel_id} onValueChange={(value) => handleChange('vessel_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vessel" />
              </SelectTrigger>
              <SelectContent>
                {vessels.map((vessel) => (
                  <SelectItem key={vessel.id} value={vessel.id}>
                    {vessel.vessel_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trip_type">Trip Type</Label>
              <Input
                id="trip_type"
                value={formData.trip_type}
                onChange={(e) => handleChange('trip_type', e.target.value)}
                placeholder="e.g., Charter, Commercial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operating_area">Operating Area</Label>
              <Input
                id="operating_area"
                value={formData.operating_area}
                onChange={(e) => handleChange('operating_area', e.target.value)}
                placeholder="e.g., Whitsundays"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depart_location">Depart Location</Label>
              <Input
                id="depart_location"
                value={formData.depart_location}
                onChange={(e) => handleChange('depart_location', e.target.value)}
                placeholder="e.g., Sydney Harbor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival_location">Arrival Location</Label>
              <Input
                id="arrival_location"
                value={formData.arrival_location}
                onChange={(e) => handleChange('arrival_location', e.target.value)}
                placeholder="e.g., Whitsundays"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_depart_datetime">Planned Depart Date & Time *</Label>
              <Input
                id="planned_depart_datetime"
                type="datetime-local"
                value={formData.planned_depart_datetime}
                onChange={(e) => handleChange('planned_depart_datetime', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planned_arrival_datetime">Planned Arrival Date & Time</Label>
              <Input
                id="planned_arrival_datetime"
                type="datetime-local"
                value={formData.planned_arrival_datetime}
                onChange={(e) => handleChange('planned_arrival_datetime', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actual_depart_datetime">Actual Depart Date & Time</Label>
              <Input
                id="actual_depart_datetime"
                type="datetime-local"
                value={formData.actual_depart_datetime}
                onChange={(e) => handleChange('actual_depart_datetime', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_arrival_datetime">Actual Arrival Date & Time</Label>
              <Input
                id="actual_arrival_datetime"
                type="datetime-local"
                value={formData.actual_arrival_datetime}
                onChange={(e) => handleChange('actual_arrival_datetime', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number_of_passengers">Number of Passengers</Label>
              <Input
                id="number_of_passengers"
                type="number"
                min="0"
                value={formData.number_of_passengers}
                onChange={(e) => handleChange('number_of_passengers', e.target.value)}
              />
            </div>

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
