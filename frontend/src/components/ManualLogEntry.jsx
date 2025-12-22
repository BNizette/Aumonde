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
          log_datetime: formData.log_datetime,
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
          shift_start_datetime: formData.shift_start_datetime,
          shift_stop_datetime: formData.shift_stop_datetime || null,
          task_performed: formData.task_performed || null
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
          task_performed: ''
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
