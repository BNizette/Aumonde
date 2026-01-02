import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Users, MapPin, Navigation } from 'lucide-react';

const ManualLogEntry = ({ open, onClose, type = 'running' }) => {
  const API = process.env.REACT_APP_BACKEND_URL + '/api';
  const [crew, setCrew] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [gpsLoading, setGpsLoading] = useState({ start: false, end: false });
  const [formData, setFormData] = useState({
    crew_id: '',
    crew_name: '',
    vessel_id: '',
    log_datetime: '',
    category: '',
    activity: '',
    activity_details: '',
    shift_start_datetime: '',
    shift_stop_datetime: '',
    task_performed: '',
    location_start: '',
    location_end: '',
    gps_location_start: '',
    gps_location_end: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const categories = ['Radio', 'Conditions', 'Safety', 'Vessel Operation'];

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [crewRes, vesselsRes] = await Promise.all([
        axios.get(`${API}/crew`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/vessels`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCrew(crewRes.data);
      setVessels(vesselsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill crew name when crew is selected
    if (field === 'crew_id') {
      const selectedCrew = crew.find(c => c.id === value);
      if (selectedCrew) {
        setFormData(prev => ({ ...prev, crew_name: selectedCrew.staff_name }));
      }
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

  const handleSubmit = async () => {
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      if (type === 'running') {
        if (!formData.crew_id || !formData.log_datetime || !formData.activity) {
          setError('Please fill in all required fields');
          return;
        }

        const logData = {
          crew_id: formData.crew_id,
          crew_name: formData.crew_name,
          vessel_id: formData.vessel_id || null,
          log_datetime: new Date(formData.log_datetime).toISOString(),
          category: formData.category || null,
          activity: formData.activity,
          activity_details: formData.activity_details || null
        };

        await axios.post(`${API}/running-logs`, logData, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setMessage('Running log added successfully');
      } else if (type === 'crew') {
        if (!formData.crew_id || !formData.shift_start_datetime) {
          setError('Please fill in all required fields');
          return;
        }

        const logData = {
          crew_id: formData.crew_id,
          crew_name: formData.crew_name,
          shift_start_datetime: new Date(formData.shift_start_datetime).toISOString(),
          shift_stop_datetime: formData.shift_stop_datetime ? new Date(formData.shift_stop_datetime).toISOString() : null,
          task_performed: formData.task_performed || null,
          location_start: formData.location_start || null,
          location_end: formData.location_end || null,
          gps_location_start: formData.gps_location_start || null,
          gps_location_end: formData.gps_location_end || null
        };

        await axios.post(`${API}/trip-logs`, logData, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setMessage('Crew shift log added successfully');
      }

      setTimeout(() => {
        setMessage('');
        onClose();
        // Reset form
        setFormData({
          crew_id: '',
          crew_name: '',
          vessel_id: '',
          log_datetime: '',
          category: '',
          activity: '',
          activity_details: '',
          shift_start_datetime: '',
          shift_stop_datetime: '',
          task_performed: '',
          location_start: '',
          location_end: '',
          gps_location_start: '',
          gps_location_end: ''
        });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving log');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'running' ? <FileText className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            {type === 'running' ? 'Manual Running Log Entry' : 'Manual Crew Shift Log Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Crew Member *</Label>
            <Select value={formData.crew_id} onValueChange={(value) => handleChange('crew_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select crew member" />
              </SelectTrigger>
              <SelectContent>
                {crew.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.staff_name} - {member.default_position || 'Crew'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'running' && (
            <>
              <div className="space-y-2">
                <Label>Vessel (Optional)</Label>
                <Select value={formData.vessel_id} onValueChange={(value) => handleChange('vessel_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vessel (optional)" />
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

              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.log_datetime}
                  onChange={(e) => handleChange('log_datetime', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
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
                <Label>Activity *</Label>
                <Input
                  value={formData.activity}
                  onChange={(e) => handleChange('activity', e.target.value)}
                  placeholder="e.g., Safety inspection, Equipment check"
                />
              </div>

              <div className="space-y-2">
                <Label>Activity Details</Label>
                <Textarea
                  value={formData.activity_details}
                  onChange={(e) => handleChange('activity_details', e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={3}
                />
              </div>
            </>
          )}

          {type === 'crew' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shift Start *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.shift_start_datetime}
                    onChange={(e) => handleChange('shift_start_datetime', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Shift End</Label>
                  <Input
                    type="datetime-local"
                    value={formData.shift_stop_datetime}
                    onChange={(e) => handleChange('shift_stop_datetime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location Start
                  </Label>
                  <Input
                    value={formData.location_start}
                    onChange={(e) => handleChange('location_start', e.target.value)}
                    placeholder="e.g., Cairns Marina"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location End
                  </Label>
                  <Input
                    value={formData.location_end}
                    onChange={(e) => handleChange('location_end', e.target.value)}
                    placeholder="e.g., Port Douglas"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Navigation className="h-4 w-4" />
                    GPS Location Start
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.gps_location_start}
                      onChange={(e) => handleChange('gps_location_start', e.target.value)}
                      placeholder="Lat, Long (e.g., -16.9186, 145.7781)"
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
                  <Label className="flex items-center gap-1">
                    <Navigation className="h-4 w-4" />
                    GPS Location End
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.gps_location_end}
                      onChange={(e) => handleChange('gps_location_end', e.target.value)}
                      placeholder="Lat, Long (e.g., -16.4827, 145.4650)"
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
                <Label>Task Performed</Label>
                <Textarea
                  value={formData.task_performed}
                  onChange={(e) => handleChange('task_performed', e.target.value)}
                  placeholder="Describe tasks performed during shift (optional)"
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Log</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualLogEntry;
