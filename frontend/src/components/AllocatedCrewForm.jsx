import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AllocatedCrewForm = ({ open, onClose, onSave, crewMember, tripId, mode = 'create' }) => {
  const [error, setError] = useState('');
  const [crewList, setCrewList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    trip_id: tripId || '',
    crew_id: '',
    crew_name: '',
    position: ''
  });

  useEffect(() => {
    if (open) {
      fetchCrewList();
    }
  }, [open]);

  useEffect(() => {
    if (crewMember && mode === 'edit') {
      setFormData({
        trip_id: crewMember.trip_id || tripId || '',
        crew_id: crewMember.crew_id || '',
        crew_name: crewMember.crew_name || '',
        position: crewMember.position || ''
      });
    } else if (mode === 'create') {
      setFormData({
        trip_id: tripId || '',
        crew_id: '',
        crew_name: '',
        position: ''
      });
    }
    setError('');
  }, [crewMember, mode, open, tripId]);

  const fetchCrewList = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/crew`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrewList(response.data);
    } catch (err) {
      console.error('Error fetching crew:', err);
      setError('Error loading crew list');
    } finally {
      setLoading(false);
    }
  };

  const handleCrewSelect = (crewId) => {
    const selectedCrew = crewList.find(c => c.id === crewId);
    if (selectedCrew) {
      setFormData(prev => ({
        ...prev,
        crew_id: selectedCrew.id,
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

    if (!formData.position || formData.position.trim() === '') {
      setError('Please enter a position');
      return;
    }

    const submitData = {
      trip_id: tripId,
      crew_id: formData.crew_id,
      crew_name: formData.crew_name,
      position: formData.position.trim()
    };

    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Allocate Crew to Trip' : 'Edit Allocated Crew'}</DialogTitle>
          <DialogDescription>
            Select a crew member and assign their position for this trip
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Crew Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="crew_id">Crew Member *</Label>
            {mode === 'edit' ? (
              <Input
                value={formData.crew_name}
                disabled
                className="bg-gray-50"
              />
            ) : (
              <Select 
                value={formData.crew_id} 
                onValueChange={handleCrewSelect}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading crew..." : "Select crew member"} />
                </SelectTrigger>
                <SelectContent>
                  {crewList.map((crew) => (
                    <SelectItem key={crew.id} value={crew.id}>
                      {crew.staff_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              type="text"
              placeholder="e.g., Master, Deckhand, Engineer"
              value={formData.position}
              onChange={(e) => handleChange('position', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {mode === 'create' ? 'Allocate Crew' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllocatedCrewForm;
