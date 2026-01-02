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
import { MapPin, Navigation, Ship, Anchor } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripLogForm = ({ open, onClose, onSave, log, tripId, vesselId, vesselName, mode = 'create' }) => {
  const [crew, setCrew] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [gpsLoading, setGpsLoading] = useState({ start: false, end: false });

  const [formData, setFormData] = useState({
    trip_id: tripId || '',
    vessel_id: vesselId || '',
    vessel_name: vesselName || '',
    crew_id: '',
    crew_name: '',
    shift_start_datetime: '',
    shift_start_utc_offset: '',
    shift_stop_datetime: '',
    shift_stop_utc_offset: '',
    task_performed: '',
    location_start: '',
    location_end: '',
    gps_location_start: '',
    gps_location_end: ''
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
      const startOffset = log.shift_start_datetime ? calculateUtcOffset(log.shift_start_datetime) : '';
      const stopOffset = log.shift_stop_datetime ? calculateUtcOffset(log.shift_stop_datetime) : '';
      setFormData({
        trip_id: log.trip_id || tripId || '',
        vessel_id: log.vessel_id || vesselId || '',
        vessel_name: log.vessel_name || vesselName || '',
        crew_id: log.crew_id || '',
        crew_name: log.crew_name || '',
        shift_start_datetime: log.shift_start_datetime ? new Date(log.shift_start_datetime).toISOString().slice(0, 16) : '',
        shift_start_utc_offset: log.shift_start_utc_offset || startOffset,
        shift_stop_datetime: log.shift_stop_datetime ? new Date(log.shift_stop_datetime).toISOString().slice(0, 16) : '',
        shift_stop_utc_offset: log.shift_stop_utc_offset || stopOffset,
        task_performed: log.task_performed || '',
        location_start: log.location_start || '',
        location_end: log.location_end || '',
        gps_location_start: log.gps_location_start || '',
        gps_location_end: log.gps_location_end || ''
      });
    } else if (mode === 'create') {
      // Default to passed props (from trip context) but allow override
      setFormData({
        trip_id: tripId || '',
        vessel_id: vesselId || '',
        vessel_name: vesselName || '',
        crew_id: '',
        crew_name: '',
        shift_start_datetime: '',
        shift_start_utc_offset: '',
        shift_stop_datetime: '',
        shift_stop_utc_offset: '',
        task_performed: '',
        location_start: '',
        location_end: '',
        gps_location_start: '',
        gps_location_end: ''
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
          // Optionally auto-fill vessel from trip if vessel not already selected
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
    // Auto-calculate UTC offset when datetime fields change
    if (field === 'shift_start_datetime') {
      const utcOffset = calculateUtcOffset(value);
      setFormData(prev => ({ ...prev, [field]: value, shift_start_utc_offset: utcOffset }));
    } else if (field === 'shift_stop_datetime') {
      const utcOffset = calculateUtcOffset(value);
      setFormData(prev => ({ ...prev, [field]: value, shift_stop_utc_offset: utcOffset }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getGPSLocation = async (field) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const loadingKey = field === 'gps_location_start' ? 'start' : 'end';
    setGpsLoading(prev => ({ ...prev, [loadingKey]: true }));

    // Check permission status first if available
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permissionStatus.state === 'denied') {
          setGpsLoading(prev => ({ ...prev, [loadingKey]: false }));
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
        setFormData(prev => ({ ...prev, [field]: coords }));
        setGpsLoading(prev => ({ ...prev, [loadingKey]: false }));
        setMessage(`GPS location captured: ${coords}`);
        setTimeout(() => setMessage(''), 2000);
      },
      (err) => {
        setGpsLoading(prev => ({ ...prev, [loadingKey]: false }));
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

    // Both vessel and trip are optional for Crew Shifts

    if (!formData.crew_id || !formData.crew_name) {
      setError('Please select a crew member');
      return;
    }

    if (!formData.shift_start_datetime) {
      setError('Please enter shift start date and time');
      return;
    }

    // Validate stop time only if provided
    if (formData.shift_stop_datetime) {
      const startDate = new Date(formData.shift_start_datetime);
      const stopDate = new Date(formData.shift_stop_datetime);

      if (stopDate <= startDate) {
        setError('Shift stop time must be after start time');
        return;
      }
    }

    const submitData = {
      trip_id: formData.trip_id || null,  // Optional
      vessel_id: formData.vessel_id || null,  // Optional
      vessel_name: formData.vessel_name || null,  // Optional
      crew_id: formData.crew_id,
      crew_name: formData.crew_name,
      shift_start_datetime: new Date(formData.shift_start_datetime).toISOString(),
      shift_start_utc_offset: formData.shift_start_utc_offset || null,
      shift_stop_datetime: formData.shift_stop_datetime ? new Date(formData.shift_stop_datetime).toISOString() : null,
      shift_stop_utc_offset: formData.shift_stop_utc_offset || null,
      task_performed: formData.task_performed || null,
      location_start: formData.location_start || null,
      location_end: formData.location_end || null,
      gps_location_start: formData.gps_location_start || null,
      gps_location_end: formData.gps_location_end || null
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
          <DialogTitle>{mode === 'create' ? 'Add Shift Log' : 'Edit Shift Log'}</DialogTitle>
          <DialogDescription>
            Record crew shift details, locations, and tasks performed
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
                Vessel (Boat)
              </Label>
              <Select value={formData.vessel_id || 'none'} onValueChange={handleVesselSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Vessel</SelectItem>
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
                Trip
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

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shift_start_datetime">Shift Start *</Label>
              <DateTimeInput
                id="shift_start_datetime"
                value={formData.shift_start_datetime}
                onChange={(value) => handleChange('shift_start_datetime', value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_start_utc_offset">UTC Offset</Label>
              <Input
                id="shift_start_utc_offset"
                value={formData.shift_start_utc_offset}
                onChange={(e) => handleChange('shift_start_utc_offset', e.target.value)}
                placeholder="+00:00"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Auto-calculated</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_stop_datetime">Shift Stop</Label>
              <DateTimeInput
                id="shift_stop_datetime"
                value={formData.shift_stop_datetime}
                onChange={(value) => handleChange('shift_stop_datetime', value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_stop_utc_offset">UTC Offset</Label>
              <Input
                id="shift_stop_utc_offset"
                value={formData.shift_stop_utc_offset}
                onChange={(e) => handleChange('shift_stop_utc_offset', e.target.value)}
                placeholder="+00:00"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Auto-calculated</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location_start" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location Start
              </Label>
              <Input
                id="location_start"
                value={formData.location_start}
                onChange={(e) => handleChange('location_start', e.target.value)}
                placeholder="e.g., Cairns Marina"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_end" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location End
              </Label>
              <Input
                id="location_end"
                value={formData.location_end}
                onChange={(e) => handleChange('location_end', e.target.value)}
                placeholder="e.g., Port Douglas"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gps_location_start" className="flex items-center gap-1">
                <Navigation className="h-4 w-4" />
                GPS Location Start
              </Label>
              <div className="flex gap-2">
                <Input
                  id="gps_location_start"
                  value={formData.gps_location_start}
                  onChange={(e) => handleChange('gps_location_start', e.target.value)}
                  placeholder="Lat, Long"
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => getGPSLocation('gps_location_start')}
                  disabled={gpsLoading.start}
                  className="whitespace-nowrap"
                >
                  {gpsLoading.start ? (
                    <span className="animate-pulse">Getting...</span>
                  ) : (
                    <>📍 Get GPS</>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps_location_end" className="flex items-center gap-1">
                <Navigation className="h-4 w-4" />
                GPS Location End
              </Label>
              <div className="flex gap-2">
                <Input
                  id="gps_location_end"
                  value={formData.gps_location_end}
                  onChange={(e) => handleChange('gps_location_end', e.target.value)}
                  placeholder="Lat, Long"
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => getGPSLocation('gps_location_end')}
                  disabled={gpsLoading.end}
                  className="whitespace-nowrap"
                >
                  {gpsLoading.end ? (
                    <span className="animate-pulse">Getting...</span>
                  ) : (
                    <>📍 Get GPS</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_performed">Task Performed</Label>
            <Textarea
              id="task_performed"
              value={formData.task_performed}
              onChange={(e) => handleChange('task_performed', e.target.value)}
              placeholder="Describe the tasks and duties performed during this shift (optional)"
              rows={4}
            />
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

export default TripLogForm;
