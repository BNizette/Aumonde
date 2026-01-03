import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Upload, X, Image, ChevronDown } from 'lucide-react';

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
  
  // Section navigation (dropdown instead of tabs)
  const [activeSection, setActiveSection] = useState('details');
  
  // Training tab selected vessel
  const [selectedTrainingVessel, setSelectedTrainingVessel] = useState('');
  // Induction tab selected vessel
  const [selectedInductionVessel, setSelectedInductionVessel] = useState('');
  
  // Induction records from API (keyed by vessel_id)
  const [inductionRecords, setInductionRecords] = useState({});
  const [savingInduction, setSavingInduction] = useState(false);
  
  const sections = [
    { value: 'details', label: 'Details' },
    { value: 'qualifications', label: 'Qualifications' },
    { value: 'training', label: 'Training' },
    { value: 'induction', label: 'Induction' },
    { value: 'medical', label: 'Medical & Dietary' },
    { value: 'preferences', label: 'Preferences' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'photo', label: 'Photo' },
  ];
  
  const [formData, setFormData] = useState({
    // Section 1: Crew Details
    staff_name: '',
    date_of_birth: '',
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
    
    // Section 2: Qualifications
    qualifications: [],
    qualifications_comment: '',
    experience: '',
    cv_url: '',
    master_class5_proof: false,
    license_number: '',
    license_expiry: '',
    medical_cert_expiry: '',
    
    // Section 3: Training Record (per vessel)
    training_by_vessel: {},
    
    // Legacy training arrays (keep for backwards compatibility)
    briefings_observed: [],
    briefings_delivered: [],
    practical_experience: [],
    
    // Section 4: Induction (per vessel)
    induction_by_vessel: {},
    
    // Section 5: Medical and Dietary
    allergies: '',
    dislikes: '',
    dietary_restrictions: '',
    medications: '',
    medical_conditions: '',
    special_equipment: '',
    
    // Section 6: Preferences and Provisioning
    dietary_preference: '',
    beverage_preference: '',
    alcohol_allowed: true,
    dining_styles: [],
    
    // Section 7: Entertainment & Activity Planning
    music_genre: '',
    movie_preferences: '',
    internet_requirement: '',
    desired_experiences: '',
    special_requests: '',
    privacy_level: '',
    
    // Section 8: Photo
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
      
      // Fetch induction tasks from vessel settings
      const inductionRes = await fetch(`${API}/settings/vessel/induction_tasks`, { headers });
      const inductionData = await inductionRes.json();
      setInductionTasks((inductionData.options || []).filter(t => t.is_active !== false).map(t => t.value));
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Fallback to defaults if settings not available
      setPositions([]);
      setRoles([{ value: 'Crew' }, { value: 'Host' }, { value: 'Both' }]);
      setInductionTasks([]);
    }
  };

  // Fetch induction records for this crew member
  const fetchInductionRecords = async (crewId) => {
    if (!crewId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/vessel-induction?crew_id=${crewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const records = await response.json();
      
      // Convert array to object keyed by vessel_id
      const recordsByVessel = {};
      for (const record of records) {
        recordsByVessel[record.vessel_id] = record;
      }
      setInductionRecords(recordsByVessel);
    } catch (err) {
      console.error('Error fetching induction records:', err);
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
        training_by_vessel: crew.training_by_vessel || {},
        induction_by_vessel: crew.induction_by_vessel || {},
        crew_photo_url: crew.crew_photo_url || '',
        // Medical fields
        allergies: crew.allergies || '',
        dislikes: crew.dislikes || '',
        dietary_restrictions: crew.dietary_restrictions || '',
        medications: crew.medications || '',
        medical_conditions: crew.medical_conditions || '',
        special_equipment: crew.special_equipment || '',
        // Preferences fields
        dietary_preference: crew.dietary_preference || '',
        beverage_preference: crew.beverage_preference || '',
        alcohol_allowed: crew.alcohol_allowed !== false,
        dining_styles: crew.dining_styles || [],
        // Entertainment fields
        music_genre: crew.music_genre || '',
        movie_preferences: crew.movie_preferences || '',
        internet_requirement: crew.internet_requirement || '',
        desired_experiences: crew.desired_experiences || '',
        special_requests: crew.special_requests || '',
        privacy_level: crew.privacy_level || '',
      });
      setSelectedTrainingVessel('');
      setSelectedInductionVessel('');
      setActiveSection('details');
      // Fetch induction records for this crew
      fetchInductionRecords(crew.id);
    } else if (mode === 'create' && prefilledData) {
      setFormData({
        staff_name: prefilledData.staff_name || '',
        date_of_birth: '',
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
        training_by_vessel: {},
        induction_by_vessel: {},
        crew_photo_url: '',
        allergies: '',
        dislikes: '',
        dietary_restrictions: '',
        medications: '',
        medical_conditions: '',
        special_equipment: '',
        dietary_preference: '',
        beverage_preference: '',
        alcohol_allowed: true,
        dining_styles: [],
        music_genre: '',
        movie_preferences: '',
        internet_requirement: '',
        desired_experiences: '',
        special_requests: '',
        privacy_level: '',
      });
      setSelectedTrainingVessel('');
      setSelectedInductionVessel('');
      setActiveSection('details');
    } else if (mode === 'create') {
      setFormData({
        staff_name: '',
        date_of_birth: '',
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
        training_by_vessel: {},
        induction_by_vessel: {},
        crew_photo_url: '',
        allergies: '',
        dislikes: '',
        dietary_restrictions: '',
        medications: '',
        medical_conditions: '',
        special_equipment: '',
        dietary_preference: '',
        beverage_preference: '',
        alcohol_allowed: true,
        dining_styles: [],
        music_genre: '',
        movie_preferences: '',
        internet_requirement: '',
        desired_experiences: '',
        special_requests: '',
        privacy_level: '',
      });
      setSelectedTrainingVessel('');
      setSelectedInductionVessel('');
      setActiveSection('details');
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

  // Get vessel owner name from selected vessel
  const getVesselOwnerName = (vesselId) => {
    const vessel = vessels.find(v => v.id === vesselId);
    return vessel?.owner_name || '';
  };

  // Training by vessel functions
  const initializeTrainingForVessel = (vesselId) => {
    if (!vesselId) return;
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;
    
    setFormData(prev => {
      if (prev.training_by_vessel[vesselId]) return prev; // Already exists
      return {
        ...prev,
        training_by_vessel: {
          ...prev.training_by_vessel,
          [vesselId]: {
            vessel_name: vessel.vessel_name,
            records: [],
            authorising_staff: '',
            date_signed_off: '',
            vessel_owner: vessel.owner_name || '',
            date_signed_owner: ''
          }
        }
      };
    });
  };

  const addVesselTrainingRecord = (vesselId, type) => {
    if (!vesselId) return;
    setFormData(prev => {
      const vesselData = prev.training_by_vessel[vesselId] || { records: [] };
      const currentRecords = vesselData.records || [];
      const typeRecords = currentRecords.filter(r => r.type === type);
      const nextNumber = typeRecords.length + 1;
      
      return {
        ...prev,
        training_by_vessel: {
          ...prev.training_by_vessel,
          [vesselId]: {
            ...vesselData,
            records: [...currentRecords, { 
              id: Date.now().toString(),
              type,
              number: nextNumber.toString(), 
              date: '', 
              supervisor: '', 
              comments: '' 
            }]
          }
        }
      };
    });
  };

  const updateVesselTrainingRecord = (vesselId, recordId, field, value) => {
    setFormData(prev => {
      const vesselData = prev.training_by_vessel[vesselId];
      if (!vesselData) return prev;
      
      const updatedRecords = vesselData.records.map(r => 
        r.id === recordId ? { ...r, [field]: value } : r
      );
      
      return {
        ...prev,
        training_by_vessel: {
          ...prev.training_by_vessel,
          [vesselId]: {
            ...vesselData,
            records: updatedRecords
          }
        }
      };
    });
  };

  const removeVesselTrainingRecord = (vesselId, recordId) => {
    setFormData(prev => {
      const vesselData = prev.training_by_vessel[vesselId];
      if (!vesselData) return prev;
      
      const filtered = vesselData.records.filter(r => r.id !== recordId);
      // Re-number by type
      const types = [...new Set(filtered.map(r => r.type))];
      const renumbered = filtered.map(r => {
        const typeRecords = filtered.filter(fr => fr.type === r.type);
        const idx = typeRecords.findIndex(tr => tr.id === r.id);
        return { ...r, number: (idx + 1).toString() };
      });
      
      return {
        ...prev,
        training_by_vessel: {
          ...prev.training_by_vessel,
          [vesselId]: {
            ...vesselData,
            records: renumbered
          }
        }
      };
    });
  };

  const updateVesselTrainingSignoff = (vesselId, field, value) => {
    setFormData(prev => {
      const vesselData = prev.training_by_vessel[vesselId] || {};
      return {
        ...prev,
        training_by_vessel: {
          ...prev.training_by_vessel,
          [vesselId]: {
            ...vesselData,
            [field]: value
          }
        }
      };
    });
  };

  // Induction by vessel functions - using API
  const initializeInductionForVessel = (vesselId) => {
    if (!vesselId) return;
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;
    
    // Initialize local state if not already exists
    if (!inductionRecords[vesselId]) {
      setInductionRecords(prev => ({
        ...prev,
        [vesselId]: {
          vessel_id: vesselId,
          vessel_name: vessel.vessel_name,
          crew_id: crew?.id || '',
          crew_name: formData.staff_name || crew?.staff_name || '',
          completed_tasks: [],
          authorising_staff: '',
          date_signed: '',
          vessel_owner: vessel.owner_name || '',
          date_signed_owner: ''
        }
      }));
    }
  };

  // Save induction record to API
  const saveInductionRecord = async (vesselId, recordData) => {
    if (!crew?.id || mode === 'create') return; // Can only save for existing crew
    
    setSavingInduction(true);
    try {
      const token = localStorage.getItem('token');
      const vessel = vessels.find(v => v.id === vesselId);
      
      const payload = {
        vessel_id: vesselId,
        vessel_name: vessel?.vessel_name || recordData.vessel_name || '',
        crew_id: crew.id,
        crew_name: formData.staff_name || crew.staff_name,
        completed_tasks: recordData.completed_tasks || [],
        authorising_staff: recordData.authorising_staff || '',
        date_signed: recordData.date_signed || '',
        vessel_owner: recordData.vessel_owner || '',
        date_signed_owner: recordData.date_signed_owner || ''
      };
      
      await fetch(`${API}/vessel-induction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Error saving induction record:', err);
    } finally {
      setSavingInduction(false);
    }
  };

  const toggleInductionTask = async (vesselId, taskName) => {
    const currentRecord = inductionRecords[vesselId] || { completed_tasks: [] };
    const completed = currentRecord.completed_tasks || [];
    const isCompleted = completed.includes(taskName);
    
    const newCompletedTasks = isCompleted 
      ? completed.filter(t => t !== taskName)
      : [...completed, taskName];
    
    const updatedRecord = {
      ...currentRecord,
      completed_tasks: newCompletedTasks
    };
    
    // Update local state immediately
    setInductionRecords(prev => ({
      ...prev,
      [vesselId]: updatedRecord
    }));
    
    // Save to API
    await saveInductionRecord(vesselId, updatedRecord);
  };

  const updateInductionSignoff = async (vesselId, field, value) => {
    const currentRecord = inductionRecords[vesselId] || {};
    
    const updatedRecord = {
      ...currentRecord,
      [field]: value
    };
    
    // Update local state immediately
    setInductionRecords(prev => ({
      ...prev,
      [vesselId]: updatedRecord
    }));
    
    // Save to API
    await saveInductionRecord(vesselId, updatedRecord);
  };

  // Handle vessel selection for training tab
  const handleTrainingVesselChange = (vesselId) => {
    setSelectedTrainingVessel(vesselId);
    if (vesselId) {
      initializeTrainingForVessel(vesselId);
    }
  };

  // Handle vessel selection for induction tab
  const handleInductionVesselChange = (vesselId) => {
    setSelectedInductionVessel(vesselId);
    if (vesselId) {
      initializeInductionForVessel(vesselId);
    }
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
            {mode === 'create' ? 'Enter crew member details' : 'Update crew member information'}
          </DialogDescription>
        </DialogHeader>

        {/* Section Dropdown Navigation */}
        <div className="mb-4">
          <Select value={activeSection} onValueChange={setActiveSection}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px] w-full pr-4">
          {/* SECTION 1: CREW DETAILS */}
          {activeSection === 'details' && (
            <div className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
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
            </div>
          )}

          {/* SECTION 2: QUALIFICATIONS */}
          {activeSection === 'qualifications' && (
            <div className="space-y-4">
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
            </div>
          )}

          {/* SECTION 3: TRAINING RECORD */}
          {activeSection === 'training' && (
            <div className="space-y-6">
              {/* Vessel Selection at Top */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label className="text-base font-semibold text-blue-800 mb-2 block">Select Vessel for Training Records</Label>
                <Select value={selectedTrainingVessel} onValueChange={handleTrainingVesselChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a vessel to manage training records" />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {Object.keys(formData.training_by_vessel || {}).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-blue-600">Vessels with training:</span>
                    {Object.entries(formData.training_by_vessel || {}).map(([vId, vData]) => (
                      <Badge key={vId} variant="secondary" className="bg-blue-100 text-blue-800">
                        {vData.vessel_name} ({(vData.records || []).length} records)
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {selectedTrainingVessel ? (
                <>
                  {/* Safety Briefings Observed */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">10 Safety Briefings Observed</Label>
                      <Button type="button" size="sm" onClick={() => addVesselTrainingRecord(selectedTrainingVessel, 'briefings_observed')}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {((formData.training_by_vessel[selectedTrainingVessel]?.records || [])
                      .filter(r => r.type === 'briefings_observed')).map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
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
                            onChange={(e) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'date', e.target.value)}
                          />
                          <Select
                            value={item.supervisor || ''}
                            onValueChange={(value) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'supervisor', value)}
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
                            onClick={() => removeVesselTrainingRecord(selectedTrainingVessel, item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Comments (optional)"
                          value={item.comments || ''}
                          onChange={(e) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'comments', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Safety Briefings Delivered */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">5 Safety Briefings Delivered</Label>
                      <Button type="button" size="sm" onClick={() => addVesselTrainingRecord(selectedTrainingVessel, 'briefings_delivered')}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {((formData.training_by_vessel[selectedTrainingVessel]?.records || [])
                      .filter(r => r.type === 'briefings_delivered')).map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
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
                            onChange={(e) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'date', e.target.value)}
                          />
                          <Select
                            value={item.supervisor || ''}
                            onValueChange={(value) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'supervisor', value)}
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
                            onClick={() => removeVesselTrainingRecord(selectedTrainingVessel, item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Comments (optional)"
                          value={item.comments || ''}
                          onChange={(e) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'comments', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Practical Experience */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Acted as Guide / Practical Experience</Label>
                      <Button type="button" size="sm" onClick={() => addVesselTrainingRecord(selectedTrainingVessel, 'practical_experience')}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {((formData.training_by_vessel[selectedTrainingVessel]?.records || [])
                      .filter(r => r.type === 'practical_experience')).map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
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
                            onChange={(e) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'date', e.target.value)}
                          />
                          <Select
                            value={item.supervisor || ''}
                            onValueChange={(value) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'supervisor', value)}
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
                            onClick={() => removeVesselTrainingRecord(selectedTrainingVessel, item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Comments (optional)"
                          value={item.comments || ''}
                          onChange={(e) => updateVesselTrainingRecord(selectedTrainingVessel, item.id, 'comments', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Sign-off Section */}
                  <div className="border-t pt-4 mt-6 space-y-4">
                    <h3 className="font-semibold text-lg">Training Sign-off</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Authorising Staff Member</Label>
                        <Select
                          value={formData.training_by_vessel[selectedTrainingVessel]?.authorising_staff || ''}
                          onValueChange={(value) => updateVesselTrainingSignoff(selectedTrainingVessel, 'authorising_staff', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {crewList.map(c => (
                              <SelectItem key={c.id} value={c.staff_name}>{c.staff_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date Signed Off</Label>
                        <Input
                          type="date"
                          value={formData.training_by_vessel[selectedTrainingVessel]?.date_signed_off || ''}
                          onChange={(e) => updateVesselTrainingSignoff(selectedTrainingVessel, 'date_signed_off', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Vessel Owner</Label>
                        <Input
                          value={formData.training_by_vessel[selectedTrainingVessel]?.vessel_owner || ''}
                          onChange={(e) => updateVesselTrainingSignoff(selectedTrainingVessel, 'vessel_owner', e.target.value)}
                          placeholder="Vessel owner name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date Signed (Owner)</Label>
                        <Input
                          type="date"
                          value={formData.training_by_vessel[selectedTrainingVessel]?.date_signed_owner || ''}
                          onChange={(e) => updateVesselTrainingSignoff(selectedTrainingVessel, 'date_signed_owner', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Please select a vessel above to manage training records</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: INDUCTION */}
          {activeSection === 'induction' && (
            <div className="space-y-6">
              {/* Vessel Selection at Top */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <Label className="text-base font-semibold text-green-800 mb-2 block">Select Vessel for Induction Checklist</Label>
                <Select value={selectedInductionVessel} onValueChange={handleInductionVesselChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a vessel to manage induction" />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {Object.keys(inductionRecords || {}).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-green-600">Vessels with induction:</span>
                    {Object.entries(inductionRecords || {}).map(([vId, vData]) => (
                      <Badge key={vId} variant="secondary" className="bg-green-100 text-green-800">
                        {vData.vessel_name || vessels.find(v => v.id === vId)?.vessel_name} ({(vData.completed_tasks || []).length}/{inductionTasks.length} tasks)
                      </Badge>
                    ))}
                  </div>
                )}
                {mode === 'create' && (
                  <p className="text-sm text-amber-600 mt-2">Note: Induction records will be saved after creating the crew member.</p>
                )}
              </div>

              {selectedInductionVessel ? (
                <>
                  {/* Safety Induction Checklist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Safety Induction Tasks</Label>
                      {savingInduction && <span className="text-sm text-blue-600">Saving...</span>}
                    </div>
                    {inductionTasks.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 border rounded-lg">
                        <p>No induction tasks configured.</p>
                        <p className="text-sm">Add tasks in Admin Panel → Settings → Vessel Management → Safety Induction Tasks</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg divide-y">
                        {inductionTasks.map((task, index) => {
                          const isCompleted = (inductionRecords[selectedInductionVessel]?.completed_tasks || []).includes(task);
                          return (
                            <div
                              key={index}
                              className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 ${isCompleted ? 'bg-green-50' : ''} ${mode === 'create' ? 'opacity-50 pointer-events-none' : ''}`}
                              onClick={() => mode !== 'create' && toggleInductionTask(selectedInductionVessel, task)}
                            >
                              <Checkbox
                                checked={isCompleted}
                                disabled={mode === 'create'}
                                onCheckedChange={() => mode !== 'create' && toggleInductionTask(selectedInductionVessel, task)}
                              />
                              <label className={`flex-1 cursor-pointer ${isCompleted ? 'text-green-700 line-through' : ''}`}>
                                {task}
                              </label>
                              {isCompleted && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">Completed</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {(inductionRecords[selectedInductionVessel]?.completed_tasks || []).length} of {inductionTasks.length} tasks completed
                    </div>
                  </div>

                  {/* Sign-off Section */}
                  <div className="border-t pt-4 mt-6 space-y-4">
                    <h3 className="font-semibold text-lg">Induction Sign-off</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Authorising Staff Member</Label>
                        <Select
                          value={inductionRecords[selectedInductionVessel]?.authorising_staff || ''}
                          onValueChange={(value) => updateInductionSignoff(selectedInductionVessel, 'authorising_staff', value)}
                          disabled={mode === 'create'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {crewList.map(c => (
                              <SelectItem key={c.id} value={c.staff_name}>{c.staff_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date Signed</Label>
                        <Input
                          type="date"
                          value={inductionRecords[selectedInductionVessel]?.date_signed || ''}
                          onChange={(e) => updateInductionSignoff(selectedInductionVessel, 'date_signed', e.target.value)}
                          disabled={mode === 'create'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Vessel Owner</Label>
                        <Input
                          value={inductionRecords[selectedInductionVessel]?.vessel_owner || ''}
                          onChange={(e) => updateInductionSignoff(selectedInductionVessel, 'vessel_owner', e.target.value)}
                          placeholder="Vessel owner name"
                          disabled={mode === 'create'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date Signed (Owner)</Label>
                        <Input
                          type="date"
                          value={inductionRecords[selectedInductionVessel]?.date_signed_owner || ''}
                          onChange={(e) => updateInductionSignoff(selectedInductionVessel, 'date_signed_owner', e.target.value)}
                          disabled={mode === 'create'}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Please select a vessel above to manage induction checklist</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: MEDICAL AND DIETARY */}
          {activeSection === 'medical' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  placeholder="List any allergies (food, medication, environmental)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dislikes">Dislikes</Label>
                <Textarea
                  id="dislikes"
                  value={formData.dislikes}
                  onChange={(e) => handleChange('dislikes', e.target.value)}
                  placeholder="Food or activity dislikes"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
                <Textarea
                  id="dietary_restrictions"
                  value={formData.dietary_restrictions}
                  onChange={(e) => handleChange('dietary_restrictions', e.target.value)}
                  placeholder="e.g., Vegetarian, Vegan, Gluten-free, Kosher, Halal"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => handleChange('medications', e.target.value)}
                  placeholder="Current medications and dosages"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={(e) => handleChange('medical_conditions', e.target.value)}
                  placeholder="Any medical conditions that should be known"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_equipment">Special Equipment</Label>
                <Textarea
                  id="special_equipment"
                  value={formData.special_equipment}
                  onChange={(e) => handleChange('special_equipment', e.target.value)}
                  placeholder="e.g., CPAP machine, wheelchair, mobility aids"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* SECTION 6: PREFERENCES AND PROVISIONING */}
          {activeSection === 'preferences' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dietary_preference">Dietary Preference</Label>
                <Textarea
                  id="dietary_preference"
                  value={formData.dietary_preference}
                  onChange={(e) => handleChange('dietary_preference', e.target.value)}
                  placeholder="Favorite foods, cuisines, or specific preferences"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="beverage_preference">Beverage Preference</Label>
                <Textarea
                  id="beverage_preference"
                  value={formData.beverage_preference}
                  onChange={(e) => handleChange('beverage_preference', e.target.value)}
                  placeholder="Favorite drinks, coffee preferences, etc."
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="alcohol_allowed"
                  checked={formData.alcohol_allowed}
                  onCheckedChange={(checked) => handleChange('alcohol_allowed', checked)}
                />
                <Label htmlFor="alcohol_allowed" className="cursor-pointer">
                  Alcohol Allowed
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Dining Style</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {formData.dining_styles?.length === 0
                          ? 'Select dining styles'
                          : formData.dining_styles?.length === 1
                          ? formData.dining_styles[0].charAt(0).toUpperCase() + formData.dining_styles[0].slice(1)
                          : `${formData.dining_styles?.length || 0} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 z-[200]" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Dining Styles</span>
                        {formData.dining_styles?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleChange('dining_styles', [])}
                            className="h-auto p-1 text-xs"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      {[
                        { value: 'casual', label: 'Casual' },
                        { value: 'buffet', label: 'Buffet' },
                        { value: 'family', label: 'Family Style' },
                        { value: 'formal', label: 'Formal' }
                      ].map(style => (
                        <div
                          key={style.value}
                          className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => {
                            const current = formData.dining_styles || [];
                            const newStyles = current.includes(style.value)
                              ? current.filter(s => s !== style.value)
                              : [...current, style.value];
                            handleChange('dining_styles', newStyles);
                          }}
                        >
                          <Checkbox
                            checked={formData.dining_styles?.includes(style.value)}
                            onCheckedChange={() => {
                              const current = formData.dining_styles || [];
                              const newStyles = current.includes(style.value)
                                ? current.filter(s => s !== style.value)
                                : [...current, style.value];
                              handleChange('dining_styles', newStyles);
                            }}
                          />
                          <span className="text-sm">{style.label}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {formData.dining_styles?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.dining_styles.map(style => (
                      <Badge key={style} variant="secondary" className="text-xs">
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => handleChange('dining_styles', formData.dining_styles.filter(s => s !== style))}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 7: ENTERTAINMENT & ACTIVITY PLANNING */}
          {activeSection === 'entertainment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="music_genre">Music Genre</Label>
                  <Input
                    id="music_genre"
                    value={formData.music_genre}
                    onChange={(e) => handleChange('music_genre', e.target.value)}
                    placeholder="e.g., Jazz, Classical, Pop, Rock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movie_preferences">Movie Preferences</Label>
                  <Input
                    id="movie_preferences"
                    value={formData.movie_preferences}
                    onChange={(e) => handleChange('movie_preferences', e.target.value)}
                    placeholder="e.g., Comedy, Drama, Action"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="internet_requirement">Internet Requirement</Label>
                <Select
                  value={formData.internet_requirement}
                  onValueChange={(value) => handleChange('internet_requirement', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select internet requirement" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="none">None / Minimal</SelectItem>
                    <SelectItem value="basic">Basic (Email/Messaging)</SelectItem>
                    <SelectItem value="moderate">Moderate (Web Browsing)</SelectItem>
                    <SelectItem value="high">High (Video Calls/Streaming)</SelectItem>
                    <SelectItem value="business">Business Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desired_experiences">Desired Experiences</Label>
                <Textarea
                  id="desired_experiences"
                  value={formData.desired_experiences}
                  onChange={(e) => handleChange('desired_experiences', e.target.value)}
                  placeholder="e.g., Theme nights, water activities, fishing, diving"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_requests">Special Requests</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => handleChange('special_requests', e.target.value)}
                  placeholder="e.g., Anniversary celebration, wellness focus"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy_level">Privacy Level (Interaction Preference)</Label>
                <Select
                  value={formData.privacy_level}
                  onValueChange={(value) => handleChange('privacy_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select privacy level" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="formal">Formal - Minimal interaction</SelectItem>
                    <SelectItem value="balanced">Balanced - Professional but friendly</SelectItem>
                    <SelectItem value="social">Social - Enjoy interaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* SECTION 8: PHOTO */}
          {activeSection === 'photo' && (
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
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
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
          )}
        </ScrollArea>

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
