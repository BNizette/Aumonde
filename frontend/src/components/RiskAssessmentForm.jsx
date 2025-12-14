import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RiskAssessmentForm = ({ open, onClose, onSave, risk, mode = 'create' }) => {
  const [error, setError] = useState('');
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    activity_task: '',
    location: '',
    vessel_id: '',
    vessel_name: '',
    hazard: '',
    risk_description: '',
    likelihood: '',
    consequence: '',
    risk_level: '',
    risk_rating: '',
    control_measures: '',
    residual_likelihood: '',
    residual_consequence: '',
    residual_risk_level: '',
    residual_risk_rating: '',
    responsible_person: '',
    review_date: '',
    status: 'Active',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchVessels();
    }
  }, [open]);

  useEffect(() => {
    if (risk && mode === 'edit') {
      setFormData({
        activity_task: risk.activity_task || '',
        location: risk.location || '',
        vessel_id: risk.vessel_id || '',
        vessel_name: risk.vessel_name || '',
        hazard: risk.hazard || '',
        risk_description: risk.risk_description || '',
        likelihood: risk.likelihood || '',
        consequence: risk.consequence || '',
        risk_level: risk.risk_level || '',
        risk_rating: risk.risk_rating || '',
        control_measures: risk.control_measures || '',
        residual_likelihood: risk.residual_likelihood || '',
        residual_consequence: risk.residual_consequence || '',
        residual_risk_level: risk.residual_risk_level || '',
        residual_risk_rating: risk.residual_risk_rating || '',
        responsible_person: risk.responsible_person || '',
        review_date: risk.review_date ? risk.review_date.split('T')[0] : '',
        status: risk.status || 'Active',
        notes: risk.notes || ''
      });
    } else if (mode === 'create') {
      setFormData({
        activity_task: '',
        location: '',
        vessel_id: '',
        vessel_name: '',
        hazard: '',
        risk_description: '',
        likelihood: '',
        consequence: '',
        risk_level: '',
        risk_rating: '',
        control_measures: '',
        residual_likelihood: '',
        residual_consequence: '',
        residual_risk_level: '',
        residual_risk_rating: '',
        responsible_person: '',
        review_date: '',
        status: 'Active',
        notes: ''
      });
    }
    setError('');
  }, [risk, mode, open]);

  const fetchVessels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vessels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVessels(response.data);
    } catch (err) {
      console.error('Error fetching vessels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate risk level when likelihood or consequence changes
    if (field === 'likelihood' || field === 'consequence') {
      const updatedData = { ...formData, [field]: value };
      if (updatedData.likelihood && updatedData.consequence) {
        const riskLevel = calculateRiskLevel(updatedData.likelihood, updatedData.consequence);
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          risk_level: riskLevel,
          risk_rating: getRiskRating(updatedData.likelihood, updatedData.consequence)
        }));
      }
    }
    
    // Auto-calculate residual risk level
    if (field === 'residual_likelihood' || field === 'residual_consequence') {
      const updatedData = { ...formData, [field]: value };
      if (updatedData.residual_likelihood && updatedData.residual_consequence) {
        const riskLevel = calculateRiskLevel(updatedData.residual_likelihood, updatedData.residual_consequence);
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          residual_risk_level: riskLevel,
          residual_risk_rating: getRiskRating(updatedData.residual_likelihood, updatedData.residual_consequence)
        }));
      }
    }
  };

  const handleVesselSelect = (vesselId) => {
    const selectedVessel = vessels.find(v => v.id === vesselId);
    if (selectedVessel) {
      setFormData(prev => ({
        ...prev,
        vessel_id: selectedVessel.id,
        vessel_name: selectedVessel.vessel_name
      }));
    }
  };

  const calculateRiskLevel = (likelihood, consequence) => {
    const rating = parseInt(likelihood) * parseInt(consequence);
    if (rating >= 20) return 'Critical';
    if (rating >= 15) return 'High';
    if (rating >= 10) return 'Medium';
    if (rating >= 5) return 'Low';
    return 'Very Low';
  };

  const getRiskRating = (likelihood, consequence) => {
    return (parseInt(likelihood) * parseInt(consequence)).toString();
  };

  const handleSubmit = () => {
    setError('');

    if (!formData.activity_task || formData.activity_task.trim() === '') {
      setError('Activity/Task is required');
      return;
    }

    if (!formData.hazard || formData.hazard.trim() === '') {
      setError('Hazard is required');
      return;
    }

    if (!formData.likelihood || !formData.consequence) {
      setError('Likelihood and Consequence are required');
      return;
    }

    const submitData = {
      ...formData,
      review_date: formData.review_date || null
    };

    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Risk Assessment' : 'Edit Risk Assessment'}
          </DialogTitle>
          <DialogDescription>
            Identify hazards, assess risks, and document control measures
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="activity_task">Activity/Task *</Label>
                  <Input
                    id="activity_task"
                    value={formData.activity_task}
                    onChange={(e) => handleChange('activity_task', e.target.value)}
                    placeholder="e.g., Passenger embarkation, Engine maintenance"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="e.g., Main deck, Engine room"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vessel_id">Vessel</Label>
                  <Select value={formData.vessel_id || "none"} onValueChange={handleVesselSelect} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading vessels..." : "Select vessel (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (General)</SelectItem>
                      {vessels.map((vessel) => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.vessel_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Hazard Identification */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Hazard Identification</h3>
              
              <div className="space-y-2">
                <Label htmlFor="hazard">Hazard *</Label>
                <Input
                  id="hazard"
                  value={formData.hazard}
                  onChange={(e) => handleChange('hazard', e.target.value)}
                  placeholder="e.g., Slippery deck, Moving machinery"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk_description">Risk Description</Label>
                <Textarea
                  id="risk_description"
                  value={formData.risk_description}
                  onChange={(e) => handleChange('risk_description', e.target.value)}
                  placeholder="Describe the risk and potential consequences"
                  rows={3}
                />
              </div>
            </div>

            {/* Initial Risk Assessment */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Initial Risk Assessment</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="likelihood">Likelihood *</Label>
                  <Select value={formData.likelihood} onValueChange={(value) => handleChange('likelihood', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Rare</SelectItem>
                      <SelectItem value="2">2 - Unlikely</SelectItem>
                      <SelectItem value="3">3 - Possible</SelectItem>
                      <SelectItem value="4">4 - Likely</SelectItem>
                      <SelectItem value="5">5 - Almost Certain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consequence">Consequence *</Label>
                  <Select value={formData.consequence} onValueChange={(value) => handleChange('consequence', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Insignificant</SelectItem>
                      <SelectItem value="2">2 - Minor</SelectItem>
                      <SelectItem value="3">3 - Moderate</SelectItem>
                      <SelectItem value="4">4 - Major</SelectItem>
                      <SelectItem value="5">5 - Catastrophic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Risk Level (Auto)</Label>
                  <div className={`h-10 flex items-center justify-center rounded-md font-semibold ${
                    formData.risk_level === 'Critical' ? 'bg-red-600 text-white' :
                    formData.risk_level === 'High' ? 'bg-orange-500 text-white' :
                    formData.risk_level === 'Medium' ? 'bg-yellow-500 text-white' :
                    formData.risk_level === 'Low' ? 'bg-green-500 text-white' :
                    formData.risk_level === 'Very Low' ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {formData.risk_level || 'N/A'}
                    {formData.risk_rating && ` (${formData.risk_rating})`}
                  </div>
                </div>
              </div>
            </div>

            {/* Control Measures */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Control Measures</h3>
              
              <div className="space-y-2">
                <Label htmlFor="control_measures">Control Measures</Label>
                <Textarea
                  id="control_measures"
                  value={formData.control_measures}
                  onChange={(e) => handleChange('control_measures', e.target.value)}
                  placeholder="List the controls in place to mitigate the risk"
                  rows={4}
                />
              </div>
            </div>

            {/* Residual Risk Assessment */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Residual Risk Assessment (After Controls)</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="residual_likelihood">Likelihood</Label>
                  <Select value={formData.residual_likelihood} onValueChange={(value) => handleChange('residual_likelihood', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Rare</SelectItem>
                      <SelectItem value="2">2 - Unlikely</SelectItem>
                      <SelectItem value="3">3 - Possible</SelectItem>
                      <SelectItem value="4">4 - Likely</SelectItem>
                      <SelectItem value="5">5 - Almost Certain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residual_consequence">Consequence</Label>
                  <Select value={formData.residual_consequence} onValueChange={(value) => handleChange('residual_consequence', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Insignificant</SelectItem>
                      <SelectItem value="2">2 - Minor</SelectItem>
                      <SelectItem value="3">3 - Moderate</SelectItem>
                      <SelectItem value="4">4 - Major</SelectItem>
                      <SelectItem value="5">5 - Catastrophic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Risk Level (Auto)</Label>
                  <div className={`h-10 flex items-center justify-center rounded-md font-semibold ${
                    formData.residual_risk_level === 'Critical' ? 'bg-red-600 text-white' :
                    formData.residual_risk_level === 'High' ? 'bg-orange-500 text-white' :
                    formData.residual_risk_level === 'Medium' ? 'bg-yellow-500 text-white' :
                    formData.residual_risk_level === 'Low' ? 'bg-green-500 text-white' :
                    formData.residual_risk_level === 'Very Low' ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {formData.residual_risk_level || 'N/A'}
                    {formData.residual_risk_rating && ` (${formData.residual_risk_rating})`}
                  </div>
                </div>
              </div>
            </div>

            {/* Management */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Management</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsible_person">Responsible Person</Label>
                  <Input
                    id="responsible_person"
                    value={formData.responsible_person}
                    onChange={(e) => handleChange('responsible_person', e.target.value)}
                    placeholder="Person responsible for managing this risk"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review_date">Review Date</Label>
                  <Input
                    id="review_date"
                    type="date"
                    value={formData.review_date}
                    onChange={(e) => handleChange('review_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional information or comments"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Create Assessment' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RiskAssessmentForm;
