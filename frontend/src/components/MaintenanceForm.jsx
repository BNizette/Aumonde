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
import { Upload, X, FileText, ExternalLink } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MaintenanceForm = ({ open, onClose, onSave, record, mode = 'create' }) => {
  const [error, setError] = useState('');
  const [vessels, setVessels] = useState([]);
  const [crewList, setCrewList] = useState([]);
  const [equipmentSystems, setEquipmentSystems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    maintenance_type: 'Scheduled',
    equipment_system: '',
    vessel_id: '',
    vessel_name: '',
    description: '',
    scheduled_date: '',
    completed_date: '',
    status: 'Scheduled',
    priority: 'Medium',
    responsible_person: '',
    cost: '',
    parts_used: '',
    labor_hours: '',
    completion_notes: '',
    next_service_date: '',
    service_frequency: '',
    notes: '',
    quote_pdf_url: '',
    crew_sign_off_id: '',
    crew_sign_off_name: ''
  });
  const [uploadingQuote, setUploadingQuote] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVessels();
      fetchCrewAndSettings();
    }
  }, [open]);

  const fetchCrewAndSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [crewRes, settingsRes] = await Promise.all([
        axios.get(`${API}/crew`, { headers }),
        fetch(`${API}/settings/maintenance/equipment_systems`, { headers }).then(r => r.json()).catch(() => ({ options: [] }))
      ]);
      setCrewList(crewRes.data || []);
      setEquipmentSystems(settingsRes.options || []);
    } catch (err) {
      console.error('Error fetching crew/settings:', err);
    }
  };

  useEffect(() => {
    if (record && mode === 'edit') {
      setFormData({
        title: record.title || '',
        maintenance_type: record.maintenance_type || 'Scheduled',
        equipment_system: record.equipment_system || '',
        vessel_id: record.vessel_id || '',
        vessel_name: record.vessel_name || '',
        description: record.description || '',
        scheduled_date: record.scheduled_date ? record.scheduled_date.split('T')[0] : '',
        completed_date: record.completed_date ? record.completed_date.split('T')[0] : '',
        status: record.status || 'Scheduled',
        priority: record.priority || 'Medium',
        responsible_person: record.responsible_person || '',
        cost: record.cost || '',
        parts_used: record.parts_used || '',
        labor_hours: record.labor_hours || '',
        completion_notes: record.completion_notes || '',
        next_service_date: record.next_service_date ? record.next_service_date.split('T')[0] : '',
        service_frequency: record.service_frequency || '',
        notes: record.notes || '',
        quote_pdf_url: record.quote_pdf_url || '',
        crew_sign_off_id: record.crew_sign_off_id || '',
        crew_sign_off_name: record.crew_sign_off_name || ''
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        maintenance_type: 'Scheduled',
        equipment_system: '',
        vessel_id: '',
        vessel_name: '',
        description: '',
        scheduled_date: '',
        completed_date: '',
        status: 'Scheduled',
        priority: 'Medium',
        responsible_person: '',
        cost: '',
        parts_used: '',
        labor_hours: '',
        completion_notes: '',
        next_service_date: '',
        service_frequency: '',
        notes: '',
        quote_pdf_url: '',
        crew_sign_off_id: '',
        crew_sign_off_name: ''
      });
    }
    setError('');
  }, [record, mode, open]);

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
  };

  const handleVesselSelect = (vesselId) => {
    if (vesselId === "none") {
      setFormData(prev => ({
        ...prev,
        vessel_id: '',
        vessel_name: ''
      }));
    } else {
      const selectedVessel = vessels.find(v => v.id === vesselId);
      if (selectedVessel) {
        setFormData(prev => ({
          ...prev,
          vessel_id: selectedVessel.id,
          vessel_name: selectedVessel.vessel_name
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          vessel_id: '',
          vessel_name: ''
        }));
      }
    }
  };

  const handleSubmit = () => {
    setError('');

    if (!formData.title || formData.title.trim() === '') {
      setError('Title is required');
      return;
    }

    if (!formData.equipment_system || formData.equipment_system.trim() === '') {
      setError('Equipment/System is required');
      return;
    }

    const submitData = {
      ...formData,
      scheduled_date: formData.scheduled_date || null,
      completed_date: formData.completed_date || null,
      next_service_date: formData.next_service_date || null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : null
    };

    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Maintenance Record' : 'Edit Maintenance Record'}
          </DialogTitle>
          <DialogDescription>
            Track maintenance activities, costs, and schedules
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
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Engine oil change, Hull inspection"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_type">Type</Label>
                  <Select value={formData.maintenance_type} onValueChange={(value) => handleChange('maintenance_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Unscheduled">Unscheduled</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Preventive">Preventive</SelectItem>
                      <SelectItem value="Corrective">Corrective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_system">Equipment/System *</Label>
                  {equipmentSystems.length > 0 ? (
                    <Select value={formData.equipment_system || "custom"} onValueChange={(value) => {
                      if (value === 'custom') {
                        handleChange('equipment_system', '');
                      } else {
                        handleChange('equipment_system', value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment/system" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentSystems.map((eq) => (
                          <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                        ))}
                        <SelectItem value="custom">Other (type below)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="equipment_system"
                      value={formData.equipment_system}
                      onChange={(e) => handleChange('equipment_system', e.target.value)}
                      placeholder="e.g., Main Engine, Navigation System"
                    />
                  )}
                  {equipmentSystems.length > 0 && formData.equipment_system === '' && (
                    <Input
                      className="mt-2"
                      value={formData.equipment_system}
                      onChange={(e) => handleChange('equipment_system', e.target.value)}
                      placeholder="Enter custom equipment/system"
                    />
                  )}
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

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detailed description of maintenance work required"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Schedule & Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Schedule & Status</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleChange('scheduled_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="completed_date">Completed Date</Label>
                  <Input
                    id="completed_date"
                    type="date"
                    value={formData.completed_date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      // Auto-update status to "Completed" when a completion date is set
                      if (newDate && formData.status !== 'Completed') {
                        setFormData(prev => ({
                          ...prev,
                          completed_date: newDate,
                          status: 'Completed'
                        }));
                      } else {
                        handleChange('completed_date', newDate);
                      }
                    }}
                  />
                  {formData.completed_date && formData.status === 'Completed' && (
                    <p className="text-xs text-green-600">✓ Status automatically set to Completed</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible_person">Responsible Person</Label>
                  <Input
                    id="responsible_person"
                    value={formData.responsible_person}
                    onChange={(e) => handleChange('responsible_person', e.target.value)}
                    placeholder="Person assigned to this task"
                  />
                </div>
              </div>
            </div>

            {/* Costs & Resources */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Costs & Resources</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleChange('cost', e.target.value)}
                    placeholder="Total cost"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="labor_hours">Labor Hours</Label>
                  <Input
                    id="labor_hours"
                    type="number"
                    step="0.5"
                    value={formData.labor_hours}
                    onChange={(e) => handleChange('labor_hours', e.target.value)}
                    placeholder="Hours spent"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="parts_used">Parts Used</Label>
                  <Textarea
                    id="parts_used"
                    value={formData.parts_used}
                    onChange={(e) => handleChange('parts_used', e.target.value)}
                    placeholder="List parts and materials used"
                    rows={2}
                  />
                </div>

                {/* Quote PDF Upload */}
                <div className="space-y-2 col-span-2">
                  <Label>Quote (PDF)</Label>
                  {formData.quote_pdf_url ? (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                      <FileText className="h-8 w-8 text-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Quote PDF attached</p>
                        <a 
                          href={formData.quote_pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View PDF
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleChange('quote_pdf_url', '')}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors ${uploadingQuote ? 'opacity-50' : ''}`}
                      onClick={() => !uploadingQuote && document.getElementById('quote-pdf-upload').click()}
                    >
                      <input
                        id="quote-pdf-upload"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={uploadingQuote}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (file.type !== 'application/pdf') {
                            setError('Please upload a PDF file');
                            return;
                          }
                          
                          if (file.size > 10 * 1024 * 1024) {
                            setError('File size must be less than 10MB');
                            return;
                          }
                          
                          setUploadingQuote(true);
                          try {
                            const token = localStorage.getItem('token');
                            const uploadFormData = new FormData();
                            uploadFormData.append('file', file);
                            
                            const response = await axios.post(`${API}/documents/upload`, uploadFormData, {
                              headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'multipart/form-data'
                              }
                            });
                            
                            if (response.data?.file_url) {
                              handleChange('quote_pdf_url', BACKEND_URL + response.data.file_url);
                            }
                          } catch (err) {
                            setError('Failed to upload PDF');
                          } finally {
                            setUploadingQuote(false);
                            e.target.value = '';
                          }
                        }}
                      />
                      {uploadingQuote ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click to upload quote PDF</p>
                          <p className="text-xs text-gray-400">Max 10MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Completion & Future Service */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Completion & Future Service</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="next_service_date">Next Service Date</Label>
                  <Input
                    id="next_service_date"
                    type="date"
                    value={formData.next_service_date}
                    onChange={(e) => handleChange('next_service_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_frequency">Service Frequency</Label>
                  <Input
                    id="service_frequency"
                    value={formData.service_frequency}
                    onChange={(e) => handleChange('service_frequency', e.target.value)}
                    placeholder="e.g., Every 6 months, 500 hours"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="completion_notes">Completion Notes</Label>
                  <Textarea
                    id="completion_notes"
                    value={formData.completion_notes}
                    onChange={(e) => handleChange('completion_notes', e.target.value)}
                    placeholder="Notes about work completed and findings"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Any other relevant information"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Create Record' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceForm;
