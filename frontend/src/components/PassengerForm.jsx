import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, Upload, X, Camera, ChevronDown } from 'lucide-react';
import axios from 'axios';

const PassengerForm = ({ open, onClose, onSave, passenger, mode = 'create' }) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [passengerTypes, setPassengerTypes] = useState(['Primary', 'Guest']);
  const [activeSection, setActiveSection] = useState('details');

  const sections = [
    { value: 'details', label: 'Details' },
    { value: 'medical', label: 'Medical & Dietary' },
    { value: 'preferences', label: 'Preferences' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'photo', label: 'Photo' },
  ];

  const [formData, setFormData] = useState({
    // Section 1: Details
    name: '',
    passenger_type: 'Primary',
    relationship_to_primary: '',
    address: '',
    date_of_birth: '',
    contact_phone: '',
    contact_email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    
    // Tab 2: Medical and Dietary
    allergies: '',
    dislikes: '',
    dietary_restrictions: '',
    medications: '',
    medical_conditions: '',
    special_equipment: '',
    
    // Tab 3: Preference and Provisioning
    dietary_preference: '',
    beverage_preference: '',
    alcohol_allowed: true,
    dining_styles: [],  // Changed to array for multi-select
    
    // Tab 4: Entertainment & Activity Planning
    music_genre: '',
    movie_preferences: '',
    internet_requirement: '',
    desired_experiences: '',
    special_requests: '',
    privacy_level: '',
    
    // Tab 5: Photo
    photo_url: ''
  });

  // Fetch passenger types from settings
  useEffect(() => {
    if (open) {
      fetchPassengerTypes();
    }
  }, [open]);

  const fetchPassengerTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/settings/passenger/passenger_types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const types = (response.data?.options || [])
        .filter(o => o.is_active !== false)
        .map(o => typeof o === 'string' ? o : o.value);
      if (types.length > 0) {
        setPassengerTypes(types);
      }
    } catch (err) {
      console.error('Error fetching passenger types:', err);
      // Keep default types on error
    }
  };

  useEffect(() => {
    if (passenger && mode === 'edit') {
      setFormData({
        name: passenger.name || '',
        passenger_type: passenger.passenger_type || 'Primary',
        relationship_to_primary: passenger.relationship_to_primary || '',
        address: passenger.address || '',
        date_of_birth: passenger.date_of_birth || '',
        contact_phone: passenger.contact_phone || '',
        contact_email: passenger.contact_email || '',
        emergency_contact_name: passenger.emergency_contact_name || '',
        emergency_contact_phone: passenger.emergency_contact_phone || '',
        allergies: passenger.allergies || '',
        dislikes: passenger.dislikes || '',
        dietary_restrictions: passenger.dietary_restrictions || '',
        medications: passenger.medications || '',
        medical_conditions: passenger.medical_conditions || '',
        special_equipment: passenger.special_equipment || '',
        dietary_preference: passenger.dietary_preference || '',
        beverage_preference: passenger.beverage_preference || '',
        alcohol_allowed: passenger.alcohol_allowed !== false,
        dining_styles: passenger.dining_styles || (passenger.dining_style ? [passenger.dining_style] : []),
        music_genre: passenger.music_genre || '',
        movie_preferences: passenger.movie_preferences || '',
        internet_requirement: passenger.internet_requirement || '',
        desired_experiences: passenger.desired_experiences || '',
        special_requests: passenger.special_requests || '',
        privacy_level: passenger.privacy_level || '',
        photo_url: passenger.photo_url || ''
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        passenger_type: 'Primary',
        relationship_to_primary: '',
        address: '',
        date_of_birth: '',
        contact_phone: '',
        contact_email: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
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
        photo_url: ''
      });
    }
  }, [passenger, mode, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }
    onSave(formData);
  };

  // Photo upload handlers
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${BACKEND_URL}/api/upload`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.url) {
        handleChange('photo_url', response.data.url);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Passenger' : 'Add Passenger'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="medical">Med & Diet</TabsTrigger>
            <TabsTrigger value="preferences">Prefs</TabsTrigger>
            <TabsTrigger value="entertainment">Entertain</TabsTrigger>
            <TabsTrigger value="photo">Photo</TabsTrigger>
          </TabsList>

          {/* TAB 1: DETAILS */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passenger_type">Type *</Label>
                <Select
                  value={formData.passenger_type}
                  onValueChange={(value) => handleChange('passenger_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {passengerTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.passenger_type === 'Guest' && (
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship to Primary</Label>
                <Input
                  id="relationship"
                  value={formData.relationship_to_primary}
                  onChange={(e) => handleChange('relationship_to_primary', e.target.value)}
                  placeholder="e.g., Spouse, Child, Friend"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Full address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Name</Label>
                  <Input
                    id="emergency_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Phone</Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                    placeholder="Emergency contact phone"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: MEDICAL AND DIETARY */}
          <TabsContent value="medical" className="space-y-4">
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
                placeholder="Any medical conditions the crew should be aware of"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_equipment">Special Equipment</Label>
              <Textarea
                id="special_equipment"
                value={formData.special_equipment}
                onChange={(e) => handleChange('special_equipment', e.target.value)}
                placeholder="e.g., CPAP machine, wheelchair, baby items, mobility aids"
                rows={2}
              />
            </div>
          </TabsContent>

          {/* TAB 3: PREFERENCES AND PROVISIONING */}
          <TabsContent value="preferences" className="space-y-4">
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
                placeholder="Favorite drinks, coffee preferences, wine preferences, etc."
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
                      {formData.dining_styles.length === 0
                        ? 'Select dining styles'
                        : formData.dining_styles.length === 1
                        ? formData.dining_styles[0].charAt(0).toUpperCase() + formData.dining_styles[0].slice(1)
                        : `${formData.dining_styles.length} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 z-[200]" align="start">
                  <div className="p-2">
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <span className="text-sm font-medium">Select Dining Styles</span>
                      {formData.dining_styles.length > 0 && (
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
                          checked={formData.dining_styles.includes(style.value)}
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
              {formData.dining_styles.length > 0 && (
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
          </TabsContent>

          {/* TAB 4: ENTERTAINMENT & ACTIVITY PLANNING */}
          <TabsContent value="entertainment" className="space-y-4">
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
                placeholder="e.g., Theme nights, water activities, fishing, diving, spa treatments"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requests">Special Requests</Label>
              <Textarea
                id="special_requests"
                value={formData.special_requests}
                onChange={(e) => handleChange('special_requests', e.target.value)}
                placeholder="e.g., Anniversary celebration, birthday party, wellness focus"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacy_level">Privacy Level (Crew Interaction)</Label>
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
                  <SelectItem value="social">Social - Enjoy crew interaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* TAB 5: PHOTO */}
          <TabsContent value="photo" className="space-y-4">
            <div className="flex flex-col items-center">
              {formData.photo_url ? (
                <div className="relative">
                  <img
                    src={formData.photo_url}
                    alt="Passenger"
                    className="h-48 w-48 rounded-full object-cover border-4 border-gray-200"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-0 right-0 rounded-full"
                    onClick={() => handleChange('photo_url', '')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`h-48 w-48 rounded-full border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('photo-input').click()}
                >
                  {uploadingPhoto ? (
                    <div className="text-gray-500">Uploading...</div>
                  ) : (
                    <>
                      <Camera className="h-12 w-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click or drag to upload</span>
                    </>
                  )}
                </div>
              )}
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
              />
              <p className="text-sm text-gray-500 mt-4">
                Recommended: Square image, at least 200x200 pixels
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit}>
            {mode === 'edit' ? 'Save Changes' : 'Add Passenger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PassengerForm;
