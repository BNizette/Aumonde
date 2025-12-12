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

const TripLogForm = ({ open, onClose, onSave, log, tripId, mode = 'create' }) => {
  const [crew, setCrew] = useState([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    trip_id: tripId || '',
    crew_id: '',
    crew_name: '',
    shift_start_datetime: '',
    shift_stop_datetime: '',
    task_performed: ''
  });

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
        shift_start_datetime: log.shift_start_datetime ? new Date(log.shift_start_datetime).toISOString().slice(0, 16) : '',
        shift_stop_datetime: log.shift_stop_datetime ? new Date(log.shift_stop_datetime).toISOString().slice(0, 16) : '',
        task_performed: log.task_performed || ''
      });
    } else if (mode === 'create') {
      setFormData({
        trip_id: tripId || '',
        crew_id: '',
        crew_name: '',
        shift_start_datetime: '',
        shift_stop_datetime: '',
        task_performed: ''
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
      trip_id: tripId,
      crew_id: formData.crew_id,
      crew_name: formData.crew_name,
      shift_start_datetime: new Date(formData.shift_start_datetime).toISOString(),
      shift_stop_datetime: formData.shift_stop_datetime ? new Date(formData.shift_stop_datetime).toISOString() : null,
      task_performed: formData.task_performed || null
    };

    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Shift Log' : 'Edit Shift Log'}</DialogTitle>
          <DialogDescription>
            Record crew shift details and tasks performed
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shift_start_datetime">Shift Start *</Label>
              <Input
                id="shift_start_datetime"
                type="datetime-local"
                value={formData.shift_start_datetime}
                onChange={(e) => handleChange('shift_start_datetime', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_stop_datetime">Shift Stop</Label>
              <Input
                id="shift_stop_datetime"
                type="datetime-local"
                value={formData.shift_stop_datetime}
                onChange={(e) => handleChange('shift_stop_datetime', e.target.value)}
              />
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
