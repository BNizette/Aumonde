import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const VesselForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    // Basic Details
    name: initialData.name || '',
    vessel_class: initialData.vessel_class || 'class_1',
    registration_number: initialData.registration_number || '',
    length: initialData.length || '',
    sms_type: initialData.sms_type || 'standard',
    
    // Extended Vessel Details
    unique_identifier: initialData.unique_identifier || '',
    vessel_type: initialData.vessel_type || '',
    year_of_build: initialData.year_of_build || '',
    vessel_draught: initialData.vessel_draught || '',
    hull_material: initialData.hull_material || '',
    service_category: initialData.service_category || '',
    propulsion_power: initialData.propulsion_power || '',
    main_engine_make: initialData.main_engine_make || '',
    main_engine_kw: initialData.main_engine_kw || '',
    auxiliary_engine_make: initialData.auxiliary_engine_make || '',
    auxiliary_engine_kw: initialData.auxiliary_engine_kw || '',
    serial_numbers: initialData.serial_numbers || '',
    passengers_berthed: initialData.passengers_berthed || '',
    passengers_unberthed: initialData.passengers_unberthed || '',
    special_persons: initialData.special_persons || '',
    special_conditions: initialData.special_conditions || '',
    classification_society: initialData.classification_society || '',
    licence_details: initialData.licence_details || '',
    
    // Vessel Complement
    certified_crew_number: initialData.certified_crew_number || '',
    uncertified_crew_number: initialData.uncertified_crew_number || '',
    master_engineer_count: initialData.master_engineer_count || '',
    gph_count: initialData.gph_count || '',
    deckhand_count: initialData.deckhand_count || '',
    
    // Operation Summary
    operating_area: initialData.operating_area || '',
    activity: initialData.activity || '',
    voyage_duration: initialData.voyage_duration || '',
    
    // Contact Details
    company_name: initialData.company_name || '',
    company_abn: initialData.company_abn || '',
    company_address: initialData.company_address || '',
    company_phone: initialData.company_phone || '',
    company_email: initialData.company_email || '',
    owner_name: initialData.owner_name || '',
    owner_contact: initialData.owner_contact || '',
    designated_person_name: initialData.designated_person_name || '',
    designated_person_contact: initialData.designated_person_contact || '',
    master_name: initialData.master_name || '',
    master_contact: initialData.master_contact || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert numeric fields
    const submitData = {
      ...formData,
      length: parseFloat(formData.length) || 0,
      year_of_build: formData.year_of_build ? parseInt(formData.year_of_build) : null,
      vessel_draught: formData.vessel_draught ? parseFloat(formData.vessel_draught) : null,
      main_engine_kw: formData.main_engine_kw ? parseFloat(formData.main_engine_kw) : null,
      auxiliary_engine_kw: formData.auxiliary_engine_kw ? parseFloat(formData.auxiliary_engine_kw) : null,
      passengers_berthed: formData.passengers_berthed ? parseInt(formData.passengers_berthed) : null,
      passengers_unberthed: formData.passengers_unberthed ? parseInt(formData.passengers_unberthed) : null,
      special_persons: formData.special_persons ? parseInt(formData.special_persons) : null,
      certified_crew_number: formData.certified_crew_number ? parseInt(formData.certified_crew_number) : null,
      uncertified_crew_number: formData.uncertified_crew_number ? parseInt(formData.uncertified_crew_number) : null,
      master_engineer_count: formData.master_engineer_count ? parseInt(formData.master_engineer_count) : null,
      gph_count: formData.gph_count ? parseInt(formData.gph_count) : null,
      deckhand_count: formData.deckhand_count ? parseInt(formData.deckhand_count) : null,
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details">Vessel Details</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Vessel Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="unique_identifier">Unique Identifier Number</Label>
              <Input
                id="unique_identifier"
                value={formData.unique_identifier}
                onChange={(e) => setFormData({ ...formData, unique_identifier: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="registration_number">Registration Number *</Label>
              <Input
                id="registration_number"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                required
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="vessel_class">Vessel Class *</Label>
              <select
                id="vessel_class"
                value={formData.vessel_class}
                onChange={(e) => setFormData({ ...formData, vessel_class: e.target.value })}
                className="w-full p-2 rounded-md bg-white border-gray-300 text-gray-900 border"
              >
                <option value="class_1">Class 1 (Passenger)</option>
                <option value="class_2">Class 2 (Non-passenger)</option>
                <option value="class_3">Class 3 (Fishing)</option>
                <option value="class_4">Class 4 (Hire and Drive)</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="vessel_type">Vessel Type</Label>
              <Input
                id="vessel_type"
                value={formData.vessel_type}
                onChange={(e) => setFormData({ ...formData, vessel_type: e.target.value })}
                placeholder="e.g., Catamaran, Monohull"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="length">Length (meters) *</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                required
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="sms_type">SMS Type *</Label>
              <select
                id="sms_type"
                value={formData.sms_type}
                onChange={(e) => setFormData({ ...formData, sms_type: e.target.value })}
                className="w-full p-2 rounded-md bg-white border-gray-300 text-gray-900 border"
              >
                <option value="standard">Standard SMS</option>
                <option value="simplified">Simplified SMS</option>
              </select>
            </div>
          </div>
        </TabsContent>

        {/* Vessel Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year_of_build">Year of Build</Label>
              <Input
                id="year_of_build"
                type="number"
                value={formData.year_of_build}
                onChange={(e) => setFormData({ ...formData, year_of_build: e.target.value })}
                placeholder="e.g., 2020"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="vessel_draught">Vessel Draught (meters)</Label>
              <Input
                id="vessel_draught"
                type="number"
                step="0.1"
                value={formData.vessel_draught}
                onChange={(e) => setFormData({ ...formData, vessel_draught: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="hull_material">Hull Material</Label>
              <Input
                id="hull_material"
                value={formData.hull_material}
                onChange={(e) => setFormData({ ...formData, hull_material: e.target.value })}
                placeholder="e.g., Fiberglass, Steel"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="service_category">Service Category</Label>
              <Input
                id="service_category"
                value={formData.service_category}
                onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="propulsion_power">Propulsion Power</Label>
              <Input
                id="propulsion_power"
                value={formData.propulsion_power}
                onChange={(e) => setFormData({ ...formData, propulsion_power: e.target.value })}
                placeholder="e.g., Twin engines"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="main_engine_make">Main Engine Make</Label>
              <Input
                id="main_engine_make"
                value={formData.main_engine_make}
                onChange={(e) => setFormData({ ...formData, main_engine_make: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="main_engine_kw">Main Engine kW</Label>
              <Input
                id="main_engine_kw"
                type="number"
                step="0.1"
                value={formData.main_engine_kw}
                onChange={(e) => setFormData({ ...formData, main_engine_kw: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="auxiliary_engine_make">Auxiliary Engine Make</Label>
              <Input
                id="auxiliary_engine_make"
                value={formData.auxiliary_engine_make}
                onChange={(e) => setFormData({ ...formData, auxiliary_engine_make: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="auxiliary_engine_kw">Auxiliary Engine kW</Label>
              <Input
                id="auxiliary_engine_kw"
                type="number"
                step="0.1"
                value={formData.auxiliary_engine_kw}
                onChange={(e) => setFormData({ ...formData, auxiliary_engine_kw: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="serial_numbers">Serial Numbers</Label>
              <Input
                id="serial_numbers"
                value={formData.serial_numbers}
                onChange={(e) => setFormData({ ...formData, serial_numbers: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="passengers_berthed">Passengers (Berthed)</Label>
              <Input
                id="passengers_berthed"
                type="number"
                value={formData.passengers_berthed}
                onChange={(e) => setFormData({ ...formData, passengers_berthed: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="passengers_unberthed">Passengers (Unberthed)</Label>
              <Input
                id="passengers_unberthed"
                type="number"
                value={formData.passengers_unberthed}
                onChange={(e) => setFormData({ ...formData, passengers_unberthed: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="special_persons">Special Persons</Label>
              <Input
                id="special_persons"
                type="number"
                value={formData.special_persons}
                onChange={(e) => setFormData({ ...formData, special_persons: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="classification_society">Classification Society (if applicable)</Label>
              <Input
                id="classification_society"
                value={formData.classification_society}
                onChange={(e) => setFormData({ ...formData, classification_society: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="special_conditions">Special Conditions, Exemptions</Label>
              <Textarea
                id="special_conditions"
                value={formData.special_conditions}
                onChange={(e) => setFormData({ ...formData, special_conditions: e.target.value })}
                rows={3}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="licence_details">Licence Details</Label>
              <Textarea
                id="licence_details"
                value={formData.licence_details}
                onChange={(e) => setFormData({ ...formData, licence_details: e.target.value })}
                rows={2}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4 mt-4">
          <h3 className="font-semibold text-lg text-gray-900">Vessel Complement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="certified_crew_number">Certified Crew Number</Label>
              <Input
                id="certified_crew_number"
                type="number"
                value={formData.certified_crew_number}
                onChange={(e) => setFormData({ ...formData, certified_crew_number: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="uncertified_crew_number">Uncertified Number</Label>
              <Input
                id="uncertified_crew_number"
                type="number"
                value={formData.uncertified_crew_number}
                onChange={(e) => setFormData({ ...formData, uncertified_crew_number: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="master_engineer_count">Master Engineer Count</Label>
              <Input
                id="master_engineer_count"
                type="number"
                value={formData.master_engineer_count}
                onChange={(e) => setFormData({ ...formData, master_engineer_count: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="gph_count">GPH Count</Label>
              <Input
                id="gph_count"
                type="number"
                value={formData.gph_count}
                onChange={(e) => setFormData({ ...formData, gph_count: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="deckhand_count">Deckhand Count</Label>
              <Input
                id="deckhand_count"
                type="number"
                value={formData.deckhand_count}
                onChange={(e) => setFormData({ ...formData, deckhand_count: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
          
          <h3 className="font-semibold text-lg text-gray-900 mt-6">Operation Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="operating_area">Operating Area</Label>
              <Input
                id="operating_area"
                value={formData.operating_area}
                onChange={(e) => setFormData({ ...formData, operating_area: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="voyage_duration">Voyage Duration</Label>
              <Input
                id="voyage_duration"
                value={formData.voyage_duration}
                onChange={(e) => setFormData({ ...formData, voyage_duration: e.target.value })}
                placeholder="e.g., 2 days, 8 hours"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="activity">Activity</Label>
              <Textarea
                id="activity"
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                rows={3}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
          <h3 className="font-semibold text-lg text-gray-900">Company Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="company_abn">ABN/CAN</Label>
              <Input
                id="company_abn"
                value={formData.company_abn}
                onChange={(e) => setFormData({ ...formData, company_abn: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="company_address">Address</Label>
              <Textarea
                id="company_address"
                value={formData.company_address}
                onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                rows={2}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="company_phone">Telephone (24hrs)</Label>
              <Input
                id="company_phone"
                value={formData.company_phone}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="company_email">Email</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
          
          <h3 className="font-semibold text-lg text-gray-900 mt-6">Key Personnel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="owner_name">Vessel Owner Name</Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="owner_contact">Owner Contact</Label>
              <Input
                id="owner_contact"
                value={formData.owner_contact}
                onChange={(e) => setFormData({ ...formData, owner_contact: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="designated_person_name">Designated Person Name</Label>
              <Input
                id="designated_person_name"
                value={formData.designated_person_name}
                onChange={(e) => setFormData({ ...formData, designated_person_name: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="designated_person_contact">Designated Person Contact</Label>
              <Input
                id="designated_person_contact"
                value={formData.designated_person_contact}
                onChange={(e) => setFormData({ ...formData, designated_person_contact: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="master_name">Master/Skipper Name</Label>
              <Input
                id="master_name"
                value={formData.master_name}
                onChange={(e) => setFormData({ ...formData, master_name: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            
            <div>
              <Label htmlFor="master_contact">Master/Skipper Contact</Label>
              <Input
                id="master_contact"
                value={formData.master_contact}
                onChange={(e) => setFormData({ ...formData, master_contact: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit" className="flex-1 bg-teal-500 hover:bg-teal-600 text-white" disabled={loading}>
          {loading ? 'Saving...' : initialData.id ? 'Update Vessel' : 'Add Vessel'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default VesselForm;
