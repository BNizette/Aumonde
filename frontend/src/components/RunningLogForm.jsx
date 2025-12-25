import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navigation, MapPin } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RunningLogForm = ({ open, onClose, onSave, log, tripId, mode = 'create' }) => {
  const [crew, setCrew] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [formData, setFormData] = useState({
    trip_id: tripId || '',
    crew_id: '',
    crew_name: '',
    log_datetime: '',
    category: '',
    activity: '',
    activity_details: '',
    gps_location: ''
  });

  const categories = ['Radio', 'Conditions', 'Safety', 'Vessel Operation'];

  useEffect(() => {
    if (open) {
      fetchCrew();
    }
  }, [open]);

  useEffect(() => {
    if (log && mode === 'edit') {
      setFormData({
        trip_id: log.trip_id || tripId || '',
        crew_id: log.crew_id || '',
        crew_name: log.crew_name || '',
        log_datetime: log.log_datetime ? new Date(log.log_datetime).toISOString().slice(0, 16) : '',
        category: log.category || '',
        activity: log.activity || '',
        activity_details: log.activity_details || ''
      });
    } else if (mode === 'create') {
      setFormData({
        trip_id: tripId || '',
        crew_id: '',
        crew_name: '',
        log_datetime: '',
        category: '',
        activity: '',
        activity_details: ''
      });
    }
    setError('');
  }, [log, mode, open, tripId]);

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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    setError('');

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
      trip_id: tripId,
      crew_id: formData.crew_id,
      crew_name: formData.crew_name,
      log_datetime: new Date(formData.log_datetime).toISOString(),
      activity: formData.activity,
      activity_details: formData.activity_details || null
    };

    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
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

        <div className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="log_datetime">Date & Time *</Label>
            <Input
              id="log_datetime"
              type="datetime-local"
              value={formData.log_datetime}
              onChange={(e) => handleChange('log_datetime', e.target.value)}
            />
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
