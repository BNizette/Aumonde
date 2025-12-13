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

  useEffect(() => {
    if (open) {
      fetchVessels();
    }
  }, [open]);

  useEffect(() => {
    if (trip && mode === 'edit') {
      setFormData({
        trip_name: trip.trip_name || '',
        vessel_id: trip.vessel_id || '',
        trip_type: trip.trip_type || '',
        operating_area: trip.operating_area || '',
        depart_datetime: trip.depart_datetime ? new Date(trip.depart_datetime).toISOString().slice(0, 16) : '',
        arrival_datetime: trip.arrival_datetime ? new Date(trip.arrival_datetime).toISOString().slice(0, 16) : '',
        number_of_passengers: trip.number_of_passengers || 0,
        number_of_crew: trip.number_of_crew || 0
      });
    } else if (mode === 'create') {
      setFormData({
        trip_name: '',
        vessel_id: '',
        trip_type: '',
        operating_area: '',
        depart_datetime: '',
        arrival_datetime: '',
        number_of_passengers: 0,
        number_of_crew: 0
      });
    }
    setError('');
  }, [trip, mode, open]);

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

    if (!formData.depart_datetime) {
      setError('Please enter a departure date and time');
      return;
    }

    const submitData = {
      ...formData,
      depart_datetime: new Date(formData.depart_datetime).toISOString(),
      arrival_datetime: formData.arrival_datetime ? new Date(formData.arrival_datetime).toISOString() : null,
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
              <Label htmlFor="depart_datetime">Depart Date & Time *</Label>
              <Input
                id="depart_datetime"
                type="datetime-local"
                value={formData.depart_datetime}
                onChange={(e) => handleChange('depart_datetime', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival_datetime">Arrival Date & Time</Label>
              <Input
                id="arrival_datetime"
                type="datetime-local"
                value={formData.arrival_datetime}
                onChange={(e) => handleChange('arrival_datetime', e.target.value)}
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
