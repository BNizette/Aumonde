import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, X, Image } from 'lucide-react';

const CrewForm = ({ open, onClose, onSave, crew, mode = 'create', prefilledData = null }) => {
  const API = process.env.REACT_APP_BACKEND_URL + '/api';
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [positions, setPositions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [crewList, setCrewList] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [inductionTasks, setInductionTasks] = useState([]);
  
  // Training tab selected vessel
  const [selectedTrainingVessel, setSelectedTrainingVessel] = useState('');
  // Induction tab selected vessel
  const [selectedInductionVessel, setSelectedInductionVessel] = useState('');
  
  const [formData, setFormData] = useState({
    // Tab 1: Crew Details
    staff_name: '',
    email: '',
    address: '',
    telephone: '',
    mobile: '',
    contact_details: '',
    next_of_kin: '',
    kin_contact: '',
    date_commenced: '',
    date_joined_vessel: '',
    date_left_vessel: '',
    default_position: '',
    role: 'Crew',
    
    // Tab 2: Qualifications
    qualifications: [],
    qualifications_comment: '',
    experience: '',
    cv_url: '',
    master_class5_proof: false,
    license_number: '',
    license_expiry: '',
    medical_cert_expiry: '',
    
    // Tab 3: Training Record (per vessel)
    // Structure: { vessel_id: { vessel_name, records: [...], authorising_staff, date_signed_off, vessel_owner, date_signed_owner } }
    training_by_vessel: {},
    
    // Legacy training arrays (keep for backwards compatibility)
    briefings_observed: [],
    briefings_delivered: [],
    practical_experience: [],
    
    // Tab 4: Induction (per vessel)
    // Structure: { vessel_id: { vessel_name, completed_tasks: [...], authorising_staff, date_signed, vessel_owner, date_signed_owner } }
    induction_by_vessel: {},
    
    // Tab 5: Photo
    crew_photo_url: '',
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch positions
      const positionsRes = await fetch(`${API}/settings/crew/positions`, { headers });
      const positionsData = await positionsRes.json();
      setPositions(positionsData.options || []);
      
      // Fetch roles
      const rolesRes = await fetch(`${API}/settings/crew/roles`, { headers });
      const rolesData = await rolesRes.json();
      setRoles(rolesData.options || []);
      
      // Fetch crew list for supervisor dropdown
      const crewRes = await fetch(`${API}/crew`, { headers });
      const crewData = await crewRes.json();
      setCrewList(crewData || []);
      
      // Fetch vessels for vessel dropdown
      const vesselsRes = await fetch(`${API}/vessels`, { headers });
      const vesselsData = await vesselsRes.json();
      setVessels(vesselsData || []);
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Fallback to defaults if settings not available
      setPositions([]);
      setRoles([{ value: 'Crew' }, { value: 'Host' }, { value: 'Both' }]);
    }
  };

  useEffect(() => {
    if (crew && mode === 'edit') {
      setFormData({
        ...crew,
        qualifications: crew.qualifications || [],
        briefings_observed: crew.briefings_observed || [],
        briefings_delivered: crew.briefings_delivered || [],
        practical_experience: crew.practical_experience || [],
        crew_photo_url: crew.crew_photo_url || '',
      });
    } else if (mode === 'create' && prefilledData) {
      setFormData({
        staff_name: prefilledData.staff_name || '',
        email: prefilledData.email || '',
        address: '',
        telephone: '',
        mobile: '',
        contact_details: '',
        next_of_kin: '',
        kin_contact: '',
        date_commenced: '',
        date_joined_vessel: '',
        date_left_vessel: '',
        default_position: '',
        role: 'Crew',
        qualifications: [],
        qualifications_comment: '',
        experience: '',
        cv_url: '',
        master_class5_proof: false,
        license_number: '',
        license_expiry: '',
        medical_cert_expiry: '',
        briefings_observed: [],
        briefings_delivered: [],
        practical_experience: [],
        owner_name: '',
        owner_signature: '',
        owner_date: '',
        staff_signature: '',
        staff_date: '',
        crew_photo_url: '',
      });
    } else if (mode === 'create') {
      setFormData({
        staff_name: '',
        email: '',
        address: '',
        telephone: '',
        mobile: '',
        contact_details: '',
        next_of_kin: '',
        kin_contact: '',
        date_commenced: '',
        date_joined_vessel: '',
        date_left_vessel: '',
        default_position: '',
        role: 'Crew',
        qualifications: [],
        qualifications_comment: '',
        experience: '',
        cv_url: '',
        master_class5_proof: false,
        license_number: '',
        license_expiry: '',
        medical_cert_expiry: '',
        briefings_observed: [],
        briefings_delivered: [],
        practical_experience: [],
        owner_name: '',
        owner_signature: '',
        owner_date: '',
        staff_signature: '',
        staff_date: '',
        crew_photo_url: '',
      });
    }
  }, [crew, mode, open, prefilledData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Drag and drop handlers for photo upload
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handlePhotoSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoUpload(e.target.files[0]);
    }
  };

  const handlePhotoUpload = async (file) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${API}/documents/upload`, formDataUpload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.file_url) {
        // Store only the relative URL (will be prefixed with BACKEND_URL when displaying)
        handleChange('crew_photo_url', response.data.file_url);
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    handleChange('crew_photo_url', '');
  };

  // Qualification functions
  const addQualification = () => {
    setFormData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, { name: '', date: '' }]
    }));
  };

  const updateQualification = (index, field, value) => {
    const updated = [...formData.qualifications];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, qualifications: updated }));
  };

  const removeQualification = (index) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const calculateYears = (dateStr) => {
    if (!dateStr) return null;
    const qualDate = new Date(dateStr);
    const now = new Date();
    const years = (now - qualDate) / (365.25 * 24 * 60 * 60 * 1000);
    return years.toFixed(2);
  };

  // Training record functions
  const addTrainingItem = (type) => {
    const currentItems = formData[type] || [];
    const nextNumber = currentItems.length + 1;
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { number: nextNumber.toString(), date: '', supervisor: '', vessel_id: '', comments: '' }]
    }));
  };

  const updateTrainingItem = (type, index, field, value) => {
    const updated = [...formData[type]];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, [type]: updated }));
  };

  const removeTrainingItem = (type, index) => {
    setFormData(prev => {
      const filtered = prev[type].filter((_, i) => i !== index);
      // Re-number remaining items
      const renumbered = filtered.map((item, i) => ({ ...item, number: (i + 1).toString() }));
      return { ...prev, [type]: renumbered };
    });
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Crew Member' : 'Edit Crew Member'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Enter crew member details across all tabs' : 'Update crew member information'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="signoff">Sign-off</TabsTrigger>
            <TabsTrigger value="photo">Photo</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] w-full pr-4">
            {/* TAB 1: CREW DETAILS */}
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="staff_name">Staff Member Name *</Label>
                  <Input
                    id="staff_name"
                    value={formData.staff_name}
                    onChange={(e) => handleChange('staff_name', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Residential address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Telephone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    placeholder="Home phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    placeholder="Mobile number"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="contact_details">Contact Details</Label>
                  <Input
                    id="contact_details"
                    value={formData.contact_details}
                    onChange={(e) => handleChange('contact_details', e.target.value)}
                    placeholder="Additional contact information"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_of_kin">Next of Kin</Label>
                  <Input
                    id="next_of_kin"
                    value={formData.next_of_kin}
                    onChange={(e) => handleChange('next_of_kin', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kin_contact">Kin Contact</Label>
                  <Input
                    id="kin_contact"
                    value={formData.kin_contact}
                    onChange={(e) => handleChange('kin_contact', e.target.value)}
                    placeholder="Emergency contact number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_commenced">Date Commenced Employment</Label>
                  <Input
                    id="date_commenced"
                    type="date"
                    value={formData.date_commenced}
                    onChange={(e) => handleChange('date_commenced', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_position">Default Position</Label>
                  {positions.length > 0 ? (
                    <Select value={formData.default_position} onValueChange={(value) => handleChange('default_position', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.filter(p => p.is_active !== false).map((position) => (
                          <SelectItem key={position.id} value={position.value}>
                            {position.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="default_position"
                      value={formData.default_position}
                      onChange={(e) => handleChange('default_position', e.target.value)}
                      placeholder="e.g., Master, Deckhand, Engineer"
                    />
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.length > 0 ? (
                        roles.filter(r => r.is_active !== false).map((role) => (
                          <SelectItem key={role.id} value={role.value}>
                            {role.value}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Crew">Crew</SelectItem>
                          <SelectItem value="Host">Host</SelectItem>
                          <SelectItem value="Both">Both</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: QUALIFICATIONS */}
            <TabsContent value="qualifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Qualifications</Label>
                  <Button type="button" size="sm" onClick={addQualification}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Qualification
                  </Button>
                </div>

                {formData.qualifications.map((qual, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-sm">Qualification Name</Label>
                        <Input
                          value={qual.name}
                          onChange={(e) => updateQualification(index, 'name', e.target.value)}
                          placeholder="e.g., Coxswain Certificate"
                          className="mt-1"
                        />
                      </div>
                      <div className="w-40">
                        <Label className="text-sm">Date Obtained</Label>
                        <Input
                          type="date"
                          value={qual.date}
                          onChange={(e) => updateQualification(index, 'date', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-sm">Years</Label>
                        <div className="h-10 flex items-center mt-1">
                          {qual.date ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 whitespace-nowrap">
                              Years: {calculateYears(qual.date)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeQualification(index)}
                        className="mb-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="qualifications_comment">Qualifications Comment</Label>
                  <Textarea
                    id="qualifications_comment"
                    value={formData.qualifications_comment}
                    onChange={(e) => handleChange('qualifications_comment', e.target.value)}
                    placeholder="Additional notes about qualifications"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience</Label>
                  <Textarea
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => handleChange('experience', e.target.value)}
                    placeholder="Relevant work experience"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cv_url">CV/Resume URL</Label>
                  <Input
                    id="cv_url"
                    value={formData.cv_url}
                    onChange={(e) => handleChange('cv_url', e.target.value)}
                    placeholder="https://example.com/cv.pdf"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="master_class5_proof"
                      checked={formData.master_class5_proof}
                      onCheckedChange={(checked) => handleChange('master_class5_proof', checked)}
                    />
                    <Label htmlFor="master_class5_proof" className="cursor-pointer">Master Class 5 Proof</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license_number">License Number</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => handleChange('license_number', e.target.value)}
                      placeholder="License ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_expiry">License Expiry</Label>
                    <Input
                      id="license_expiry"
                      type="date"
                      value={formData.license_expiry}
                      onChange={(e) => handleChange('license_expiry', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="medical_cert_expiry">Medical Certificate Expiry</Label>
                    <Input
                      id="medical_cert_expiry"
                      type="date"
                      value={formData.medical_cert_expiry}
                      onChange={(e) => handleChange('medical_cert_expiry', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: TRAINING RECORD */}
            <TabsContent value="training" className="space-y-6">
              {/* Safety Briefings Observed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">10 Safety Briefings Observed</Label>
                  <Button type="button" size="sm" onClick={() => addTrainingItem('briefings_observed')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {formData.briefings_observed.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        type="number"
                        placeholder="Number"
                        value={item.number}
                        readOnly
                        className="bg-gray-50"
                      />
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateTrainingItem('briefings_observed', index, 'date', e.target.value)}
                      />
                      <Select
                        value={item.supervisor || ''}
                        onValueChange={(value) => updateTrainingItem('briefings_observed', index, 'supervisor', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {crewList.map(c => (
                            <SelectItem key={c.id} value={c.staff_name}>{c.staff_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTrainingItem('briefings_observed', index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={item.vessel_id || 'none'}
                        onValueChange={(value) => updateTrainingItem('briefings_observed', index, 'vessel_id', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Vessel (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Vessel</SelectItem>
                          {vessels.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Comments (optional)"
                        value={item.comments || ''}
                        onChange={(e) => updateTrainingItem('briefings_observed', index, 'comments', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Safety Briefings Delivered */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">5 Safety Briefings Delivered</Label>
                  <Button type="button" size="sm" onClick={() => addTrainingItem('briefings_delivered')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {formData.briefings_delivered.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        type="number"
                        placeholder="Number"
                        value={item.number}
                        readOnly
                        className="bg-gray-50"
                      />
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateTrainingItem('briefings_delivered', index, 'date', e.target.value)}
                      />
                      <Select
                        value={item.supervisor || ''}
                        onValueChange={(value) => updateTrainingItem('briefings_delivered', index, 'supervisor', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {crewList.map(c => (
                            <SelectItem key={c.id} value={c.staff_name}>{c.staff_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTrainingItem('briefings_delivered', index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={item.vessel_id || 'none'}
                        onValueChange={(value) => updateTrainingItem('briefings_delivered', index, 'vessel_id', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Vessel (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Vessel</SelectItem>
                          {vessels.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Comments (optional)"
                        value={item.comments || ''}
                        onChange={(e) => updateTrainingItem('briefings_delivered', index, 'comments', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Practical Experience */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Acted as Guide / Practical Experience</Label>
                  <Button type="button" size="sm" onClick={() => addTrainingItem('practical_experience')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {formData.practical_experience.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        type="number"
                        placeholder="Number"
                        value={item.number}
                        readOnly
                        className="bg-gray-50"
                      />
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateTrainingItem('practical_experience', index, 'date', e.target.value)}
                      />
                      <Select
                        value={item.supervisor || ''}
                        onValueChange={(value) => updateTrainingItem('practical_experience', index, 'supervisor', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {crewList.map(c => (
                            <SelectItem key={c.id} value={c.staff_name}>{c.staff_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTrainingItem('practical_experience', index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={item.vessel_id || 'none'}
                        onValueChange={(value) => updateTrainingItem('practical_experience', index, 'vessel_id', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Vessel (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Vessel</SelectItem>
                          {vessels.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Comments (optional)"
                        value={item.comments || ''}
                        onChange={(e) => updateTrainingItem('practical_experience', index, 'comments', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: SIGN-OFF */}
            <TabsContent value="signoff" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Vessel Owner</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">Name</Label>
                    <Input
                      id="owner_name"
                      value={formData.owner_name}
                      onChange={(e) => handleChange('owner_name', e.target.value)}
                      placeholder="Owner name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner_date">Date</Label>
                    <Input
                      id="owner_date"
                      type="date"
                      value={formData.owner_date}
                      onChange={(e) => handleChange('owner_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="owner_signature">Signature</Label>
                    <Input
                      id="owner_signature"
                      value={formData.owner_signature}
                      onChange={(e) => handleChange('owner_signature', e.target.value)}
                      placeholder="Signature or typed name"
                    />
                  </div>
                </div>

                <h3 className="font-semibold text-lg pt-4">Staff Member</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff_date">Date</Label>
                    <Input
                      id="staff_date"
                      type="date"
                      value={formData.staff_date}
                      onChange={(e) => handleChange('staff_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="staff_signature">Signature</Label>
                    <Input
                      id="staff_signature"
                      value={formData.staff_signature}
                      onChange={(e) => handleChange('staff_signature', e.target.value)}
                      placeholder="Signature or typed name"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: PHOTO */}
            <TabsContent value="photo" className="space-y-4">
              <div className="space-y-4">
                <Label>Crew Member Photo</Label>
                
                {/* Show current photo or drag-drop zone */}
                {formData.crew_photo_url ? (
                  <div className="space-y-4">
                    <div className="relative border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-center">
                        <img 
                          src={formData.crew_photo_url.startsWith('http') ? formData.crew_photo_url : `${BACKEND_URL}${formData.crew_photo_url}`} 
                          alt="Crew Member" 
                          className="max-w-full h-auto max-h-64 object-contain rounded-lg shadow-md"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div className="hidden flex-col items-center justify-center text-gray-500 py-8">
                          <Image className="h-12 w-12 mb-2 opacity-50" />
                          <p className="text-sm">Unable to load image</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removePhoto}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Click Remove to upload a different photo
                    </p>
                  </div>
                ) : (
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    } ${uploadingPhoto ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !uploadingPhoto && document.getElementById('crew-photo-upload-input').click()}
                  >
                    <input
                      id="crew-photo-upload-input"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handlePhotoSelect}
                      disabled={uploadingPhoto}
                    />
                    
                    <div className="flex flex-col items-center gap-3">
                      {uploadingPhoto ? (
                        <>
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                          <p className="text-sm font-medium text-gray-600">Uploading photo...</p>
                        </>
                      ) : (
                        <>
                          <div className="p-4 bg-gray-100 rounded-full">
                            <Upload className="h-8 w-8 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Drag and drop crew member photo here
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              or click to browse
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">
                            Supports: JPEG, PNG, WebP, GIF (Max 10MB)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Create Crew Member' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrewForm;
