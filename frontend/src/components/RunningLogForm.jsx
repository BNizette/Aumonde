import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { Navigation, MapPin, Ship, Anchor } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RunningLogForm = ({ open, onClose, onSave, log, tripId, vesselId, vesselName, mode = 'create' }) => {
  const [crew, setCrew] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [formData, setFormData] = useState({
    trip_id: tripId || '',
    vessel_id: vesselId || '',
    vessel_name: vesselName || '',
    crew_id: '',
    crew_name: '',
    log_datetime: '',
    utc_offset: '',
    category: '',
    activity: '',
    activity_details: '',
    gps_location: ''
  });

  // Helper function to calculate UTC offset from a date
  const calculateUtcOffset = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    return `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  };

  const categories = ['Radio', 'Conditions', 'Safety', 'Vessel Operation'];

  const fetchCrew = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/crew`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrew(response.data);
    } catch (err) {
      console.error('Error fetching crew:', err);
    }
  };

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

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort by departure date descending to show recent trips first
      const sortedTrips = response.data.sort((a, b) => 
        new Date(b.departure_datetime || 0) - new Date(a.departure_datetime || 0)
      );
      setTrips(sortedTrips);
    } catch (err) {
      console.error('Error fetching trips:', err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCrew();
      fetchVessels();
      fetchTrips();
    }
  }, [open]);

  useEffect(() => {
    if (log && mode === 'edit') {
      const utcOffset = log.log_datetime ? calculateUtcOffset(log.log_datetime) : '';
      setFormData({
        trip_id: log.trip_id || tripId || '',
        vessel_id: log.vessel_id || vesselId || '',
        vessel_name: log.vessel_name || vesselName || '',
        crew_id: log.crew_id || '',
        crew_name: log.crew_name || '',
        log_datetime: log.log_datetime ? new Date(log.log_datetime).toISOString().slice(0, 16) : '',
        utc_offset: log.utc_offset || utcOffset,
        category: log.category || '',
        activity: log.activity || '',
        activity_details: log.activity_details || '',
        gps_location: log.gps_location || ''
      });
    } else if (mode === 'create') {
      // Default to passed props (from trip context) but allow override
      setFormData({
        trip_id: tripId || '',
        vessel_id: vesselId || '',
        vessel_name: vesselName || '',
        crew_id: '',
        crew_name: '',
        log_datetime: '',
        utc_offset: '',
        category: '',
        activity: '',
        activity_details: '',
        gps_location: ''
      });
    }
    setError('');
    setMessage('');
  }, [log, mode, open, tripId, vesselId, vesselName]);

  const handleVesselSelect = (vesselIdValue) => {
    if (vesselIdValue === 'none') {
      setFormData(prev => ({
        ...prev,
        vessel_id: '',
        vessel_name: ''
      }));
    } else {
      const selectedVessel = vessels.find(v => v.id === vesselIdValue);
      if (selectedVessel) {
        setFormData(prev => ({
          ...prev,
          vessel_id: vesselIdValue,
          vessel_name: selectedVessel.vessel_name
        }));
      }
    }
  };

  const handleTripSelect = (tripIdValue) => {
    if (tripIdValue === 'none') {
      setFormData(prev => ({
        ...prev,
        trip_id: ''
      }));
    } else {
      const selectedTrip = trips.find(t => t.id === tripIdValue);
      if (selectedTrip) {
        setFormData(prev => ({
          ...prev,
          trip_id: tripIdValue,
          // Auto-fill vessel from trip if vessel not already selected
          ...((!prev.vessel_id && selectedTrip.vessel_id) ? {
            vessel_id: selectedTrip.vessel_id,
            vessel_name: selectedTrip.vessel_name
          } : {})
        }));
      }
    }
  };

  const handleCrewSelect = (crewId) => {
    const selectedCrew = crew.find(c => c.id === crewId);
    if (selectedCrew) {
      setFormData(prev => ({
        ...prev,
        crew_id: crewId,
        crew_name: selectedCrew.staff_name
      }));
    }
  };

  const handleChange = (field, value) => {
    // Auto-calculate UTC offset when datetime field changes
    if (field === 'log_datetime') {
      const utcOffset = calculateUtcOffset(value);
      setFormData(prev => ({ ...prev, [field]: value, utc_offset: utcOffset }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // GPS Location lookup function
  const getGPSLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setGpsLoading(true);

    // Check permission status first if available
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permissionStatus.state === 'denied') {
          setGpsLoading(false);
          setError('Location access is blocked. Please click the lock/site settings icon in your browser\'s address bar and allow location access, then try again.');
          setTimeout(() => setError(''), 6000);
          return;
        }
      } catch (e) {
        // Permissions API not fully supported, continue with geolocation request
        console.log('Permissions API check failed, proceeding with geolocation request');
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setFormData(prev => ({ ...prev, gps_location: coords }));
        setGpsLoading(false);
        setMessage(`GPS location captured: ${coords}`);
        setTimeout(() => setMessage(''), 3000);
      },
      (err) => {
        setGpsLoading(false);
        let errorMessage = 'Unable to retrieve location';
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location access denied. Click the lock/site settings icon in your browser\'s address bar, set Location to "Allow", then refresh and try again.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information unavailable. Please check your device\'s location services are enabled.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = `Location error: ${err.message || 'Unknown error'}`;
        }
        setError(errorMessage);
        setTimeout(() => setError(''), 6000);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  };

  const handleSubmit = () => {
    setError('');

    // Vessel is compulsory for Running Logs
    if (!formData.vessel_id || !formData.vessel_name) {
      setError('Please select a vessel (boat)');
      return;
    }

    if (!formData.crew_id || !formData.crew_name) {
      setError('Please select a crew member');
      return;
    }

    if (!formData.log_datetime) {
      setError('Please enter date and time');
      return;
    }

    if (!formData.activity) {
      setError('Please enter activity');
      return;
    }

    const submitData = {
      trip_id: formData.trip_id || null,  // Optional
      vessel_id: formData.vessel_id,
      vessel_name: formData.vessel_name,
      crew_id: formData.crew_id,
      crew_name: formData.crew_name,
      log_datetime: new Date(formData.log_datetime).toISOString(),
      utc_offset: formData.utc_offset || null,
      category: formData.category || null,
      activity: formData.activity,
      activity_details: formData.activity_details || null,
      gps_location: formData.gps_location || null
    };

    onSave(submitData);
  };

  // Filter trips for the selected vessel (if vessel is selected)
  const filteredTrips = formData.vessel_id 
    ? trips.filter(t => t.vessel_id === formData.vessel_id)
    : trips;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Running Log' : 'Edit Running Log'}</DialogTitle>
          <DialogDescription>
            Record vessel running activities and operations
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Vessel and Trip Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vessel_id" className="flex items-center gap-1">
                <Ship className="h-4 w-4" />
                Vessel (Boat) *
              </Label>
              <Select value={formData.vessel_id || 'none'} onValueChange={handleVesselSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select vessel</SelectItem>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.vessel_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trip_id" className="flex items-center gap-1">
                <Anchor className="h-4 w-4" />
                Trip (Optional)
              </Label>
              <Select value={formData.trip_id || 'none'} onValueChange={handleTripSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trip (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Trip</SelectItem>
                  {filteredTrips.map((tripItem) => (
                    <SelectItem key={tripItem.id} value={tripItem.id}>
                      {tripItem.trip_name || tripItem.id.slice(0, 8)} - {tripItem.departure_datetime ? new Date(tripItem.departure_datetime).toLocaleDateString() : 'No date'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.vessel_id && filteredTrips.length === 0 && (
                <p className="text-xs text-gray-500">No trips for this vessel</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crew_id">Crew Member *</Label>
            <Select value={formData.crew_id} onValueChange={handleCrewSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select crew member" />
              </SelectTrigger>
              <SelectContent>
                {crew.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.staff_name} - {member.default_position || 'Crew'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="log_datetime">Date & Time *</Label>
              <DateTimeInput
                id="log_datetime"
                value={formData.log_datetime}
                onChange={(value) => handleChange('log_datetime', value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utc_offset">UTC Offset</Label>
              <Input
                id="utc_offset"
                value={formData.utc_offset}
                onChange={(e) => handleChange('utc_offset', e.target.value)}
                placeholder="+00:00"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Auto-calculated from date</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity">Activity *</Label>
            <Input
              id="activity"
              value={formData.activity}
              onChange={(e) => handleChange('activity', e.target.value)}
              placeholder="e.g., Engine start, Navigation commenced, Anchoring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity_details">Activity Details</Label>
            <Textarea
              id="activity_details"
              value={formData.activity_details}
              onChange={(e) => handleChange('activity_details', e.target.value)}
              placeholder="Add additional details about the activity (optional)"
              rows={4}
            />
          </div>

          {/* GPS Location Field */}
          <div className="space-y-2">
            <Label htmlFor="gps_location" className="flex items-center gap-1">
              <Navigation className="h-4 w-4" />
              GPS Location
            </Label>
            <div className="flex gap-2">
              <Input
                id="gps_location"
                value={formData.gps_location}
                onChange={(e) => handleChange('gps_location', e.target.value)}
                placeholder="Lat, Long"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={getGPSLocation}
                disabled={gpsLoading}
                className="whitespace-nowrap"
              >
                {gpsLoading ? (
                  <span className="animate-pulse">Getting...</span>
                ) : (
                  <>📍 Get GPS</>
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Add Log Entry' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RunningLogForm;
