import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2 } from 'lucide-react';

const CrewForm = ({ initialData = {}, onSubmit, onCancel, loading, isEdit = false }) => {
  const [formData, setFormData] = useState({
    // Crew Details
    full_name: initialData.full_name || '',
    address: initialData.address || '',
    contact_details: initialData.contact_details || '',
    telephone: initialData.telephone || '',
    mobile: initialData.mobile || '',
    next_of_kin: initialData.next_of_kin || '',
    next_of_kin_contact: initialData.next_of_kin_contact || '',
    date_joined_vessel: initialData.date_joined_vessel || '',
    date_left_vessel: initialData.date_left_vessel || '',
    date_commenced_employment: initialData.date_commenced_employment || '',
    
    // Position and Role
    position: initialData.position || '',
    role: initialData.role || 'briefer',
    
    // Qualifications
    qualifications: initialData.qualifications || [{ name: '', date: '' }],
    qualifications_text: initialData.qualifications_text || '',
    experience: initialData.experience || '',
    master_class5_proof: initialData.master_class5_proof || false,
    license_number: initialData.license_number || '',
    license_expiry: initialData.license_expiry || '',
    medical_expiry: initialData.medical_expiry || '',
    
    // Training Record
    briefings_observed: initialData.briefings_observed || [],
    briefings_delivered: initialData.briefings_delivered || [],
    guide_experience: initialData.guide_experience || [],
    
    // Sign-off
    vessel_owner_name: initialData.vessel_owner_name || '',
    vessel_owner_signature: initialData.vessel_owner_signature || '',
    vessel_owner_date: initialData.vessel_owner_date || '',
    staff_member_name: initialData.staff_member_name || '',
    staff_member_signature: initialData.staff_member_signature || '',
    staff_member_date: initialData.staff_member_date || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter out empty qualifications
    const cleanedData = {
      ...formData,
      qualifications: formData.qualifications.filter(q => q.name && q.name.trim() !== '')
    };
    
    onSubmit(cleanedData);
  };

  const addQualification = () => {
    setFormData({
      ...formData,
      qualifications: [...formData.qualifications, { name: '', date: '' }]
    });
  };

  const removeQualification = (index) => {
    setFormData({
      ...formData,
      qualifications: formData.qualifications.filter((_, i) => i !== index)
    });
  };

  const updateQualification = (index, field, value) => {
    const updated = [...formData.qualifications];
    updated[index][field] = value;
    setFormData({ ...formData, qualifications: updated });
  };

  const addBriefing = (type) => {
    const newBriefing = { number: '', date: '', supervisor_name: '' };
    setFormData({
      ...formData,
      [type]: [...formData[type], newBriefing]
    });
  };

  const removeBriefing = (type, index) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_, i) => i !== index)
    });
  };

  const updateBriefing = (type, index, field, value) => {
    const updated = [...formData[type]];
    updated[index][field] = value;
    setFormData({ ...formData, [type]: updated });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="details">Crew Details</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="training">Training Record</TabsTrigger>
          <TabsTrigger value="signoff">Sign-off</TabsTrigger>
        </TabsList>

        {/* Crew Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="full_name">Staff Member&apos;s Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="bg-white border-gray-300"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="contact_details">Contact Details (General)</Label>
              <Input
                id="contact_details"
                value={formData.contact_details}
                onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="next_of_kin">Next of Kin</Label>
              <Input
                id="next_of_kin"
                value={formData.next_of_kin}
                onChange={(e) => setFormData({ ...formData, next_of_kin: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="next_of_kin_contact">Next of Kin Contact</Label>
              <Input
                id="next_of_kin_contact"
                value={formData.next_of_kin_contact}
                onChange={(e) => setFormData({ ...formData, next_of_kin_contact: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="date_commenced_employment">Date of Commencement of Employment</Label>
              <Input
                id="date_commenced_employment"
                type="date"
                value={formData.date_commenced_employment}
                onChange={(e) => setFormData({ ...formData, date_commenced_employment: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="date_joined_vessel">Date Joined Vessel</Label>
              <Input
                id="date_joined_vessel"
                type="date"
                value={formData.date_joined_vessel}
                onChange={(e) => setFormData({ ...formData, date_joined_vessel: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="date_left_vessel">Date Left Vessel</Label>
              <Input
                id="date_left_vessel"
                type="date"
                value={formData.date_left_vessel}
                onChange={(e) => setFormData({ ...formData, date_left_vessel: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="position">Default Position *</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                className="bg-white border-gray-300"
                placeholder="e.g., Master, Crew, Engineer"
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2 rounded-md bg-white border-gray-300 text-gray-900 border"
              >
                <option value="crew">Crew</option>
                <option value="host">Host</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <Label>Qualifications</Label>
              <div className="space-y-2">
                {formData.qualifications.map((qual, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <Input
                      value={qual.name}
                      onChange={(e) => updateQualification(index, 'name', e.target.value)}
                      placeholder="Enter qualification"
                      className="bg-white border-gray-300 md:col-span-7"
                    />
                    <Input
                      type="date"
                      value={qual.date}
                      onChange={(e) => updateQualification(index, 'date', e.target.value)}
                      placeholder="Date"
                      className="bg-white border-gray-300 md:col-span-4"
                    />
                    {formData.qualifications.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeQualification(index)}
                        className="text-red-600 md:col-span-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQualification}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Qualification
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="qualifications_text">Qualifications Comment</Label>
              <Textarea
                id="qualifications_text"
                value={formData.qualifications_text}
                onChange={(e) => setFormData({ ...formData, qualifications_text: e.target.value })}
                rows={3}
                className="bg-white border-gray-300"
                placeholder="Additional comments about qualifications"
              />
            </div>

            <div>
              <Label htmlFor="experience">Experience</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                rows={3}
                className="bg-white border-gray-300"
                placeholder="Describe relevant experience"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="master_class5_proof"
                checked={formData.master_class5_proof}
                onChange={(e) => setFormData({ ...formData, master_class5_proof: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="master_class5_proof" className="cursor-pointer">
                Has provided proof of at least one year experience as a master of a sailing vessel over 12 metres since gaining Master class 5 qualification?
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>

              <div>
                <Label htmlFor="license_expiry">License Expiry</Label>
                <Input
                  id="license_expiry"
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>

              <div>
                <Label htmlFor="medical_expiry">Medical Certificate Expiry</Label>
                <Input
                  id="medical_expiry"
                  type="date"
                  value={formData.medical_expiry}
                  onChange={(e) => setFormData({ ...formData, medical_expiry: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Training Record Tab */}
        <TabsContent value="training" className="space-y-6 mt-4 max-h-[60vh] overflow-y-auto">
          {/* Safety Briefings Observed */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">10 Safety Briefings Observed</h3>
            <div className="space-y-2">
              {formData.briefings_observed.map((briefing, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border border-gray-200 rounded">
                  <Input
                    placeholder="Number"
                    value={briefing.number}
                    onChange={(e) => updateBriefing('briefings_observed', index, 'number', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Input
                    type="date"
                    placeholder="Date"
                    value={briefing.date}
                    onChange={(e) => updateBriefing('briefings_observed', index, 'date', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Input
                    placeholder="Supervisor's Name"
                    value={briefing.supervisor_name}
                    onChange={(e) => updateBriefing('briefings_observed', index, 'supervisor_name', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBriefing('briefings_observed', index)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBriefing('briefings_observed')}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Briefing Observed
              </Button>
            </div>
          </div>

          {/* Safety Briefings Delivered */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">5 Safety Briefings Delivered</h3>
            <div className="space-y-2">
              {formData.briefings_delivered.map((briefing, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border border-gray-200 rounded">
                  <Input
                    placeholder="Number"
                    value={briefing.number}
                    onChange={(e) => updateBriefing('briefings_delivered', index, 'number', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Input
                    type="date"
                    placeholder="Date"
                    value={briefing.date}
                    onChange={(e) => updateBriefing('briefings_delivered', index, 'date', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Input
                    placeholder="Supervisor's Name"
                    value={briefing.supervisor_name}
                    onChange={(e) => updateBriefing('briefings_delivered', index, 'supervisor_name', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBriefing('briefings_delivered', index)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBriefing('briefings_delivered')}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Briefing Delivered
              </Button>
            </div>
          </div>

          {/* Guide Experience */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Acted as Guide / Practical Experience</h3>
            <div className="space-y-2">
              {formData.guide_experience.map((guide, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border border-gray-200 rounded">
                  <Input
                    placeholder="Number"
                    value={guide.number}
                    onChange={(e) => updateBriefing('guide_experience', index, 'number', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Input
                    type="date"
                    placeholder="Date"
                    value={guide.date}
                    onChange={(e) => updateBriefing('guide_experience', index, 'date', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Input
                    placeholder="Supervisor's Name"
                    value={guide.supervisor_name}
                    onChange={(e) => updateBriefing('guide_experience', index, 'supervisor_name', e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBriefing('guide_experience', index)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBriefing('guide_experience')}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Guide Experience
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Sign-off Tab */}
        <TabsContent value="signoff" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
          <h3 className="font-semibold text-lg text-gray-900">Vessel Owner and Staff Member Sign Off</h3>
          
          <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900">Vessel Owner</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vessel_owner_name">Name</Label>
                <Input
                  id="vessel_owner_name"
                  value={formData.vessel_owner_name}
                  onChange={(e) => setFormData({ ...formData, vessel_owner_name: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="vessel_owner_signature">Signature</Label>
                <Input
                  id="vessel_owner_signature"
                  value={formData.vessel_owner_signature}
                  onChange={(e) => setFormData({ ...formData, vessel_owner_signature: e.target.value })}
                  className="bg-white border-gray-300"
                  placeholder="Type name or upload signature"
                />
              </div>
              <div>
                <Label htmlFor="vessel_owner_date">Date</Label>
                <Input
                  id="vessel_owner_date"
                  type="date"
                  value={formData.vessel_owner_date}
                  onChange={(e) => setFormData({ ...formData, vessel_owner_date: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900">Staff Member</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="staff_member_name">Name</Label>
                <Input
                  id="staff_member_name"
                  value={formData.staff_member_name}
                  onChange={(e) => setFormData({ ...formData, staff_member_name: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="staff_member_signature">Signature</Label>
                <Input
                  id="staff_member_signature"
                  value={formData.staff_member_signature}
                  onChange={(e) => setFormData({ ...formData, staff_member_signature: e.target.value })}
                  className="bg-white border-gray-300"
                  placeholder="Type name or upload signature"
                />
              </div>
              <div>
                <Label htmlFor="staff_member_date">Date</Label>
                <Input
                  id="staff_member_date"
                  type="date"
                  value={formData.staff_member_date}
                  onChange={(e) => setFormData({ ...formData, staff_member_date: e.target.value })}
                  className="bg-white border-gray-300"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit" className="flex-1 bg-teal-500 hover:bg-teal-600 text-white" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Crew Member' : 'Add Crew Member'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default CrewForm;
