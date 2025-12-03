import { useState, useEffect } from 'react';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CrewManagement = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    qualifications: [''],
    license_number: '',
    license_expiry: '',
    medical_expiry: ''
  });

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    if (selectedVessel) {
      fetchCrew();
    }
  }, [selectedVessel]);

  const fetchVessels = async () => {
    try {
      const response = await axios.get(`${API}/vessels`);
      setVessels(response.data);
      if (response.data.length > 0) {
        setSelectedVessel(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch vessels');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrew = async () => {
    try {
      const response = await axios.get(`${API}/crew/vessel/${selectedVessel.id}`);
      setCrew(response.data);
    } catch (error) {
      console.error('Failed to fetch crew:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const quals = formData.qualifications.filter(q => q.trim());
      await axios.post(`${API}/crew`, {
        vessel_id: selectedVessel.id,
        full_name: formData.full_name,
        position: formData.position,
        qualifications: quals,
        license_number: formData.license_number || null,
        license_expiry: formData.license_expiry || null,
        medical_expiry: formData.medical_expiry || null
      });
      toast.success('Crew member added successfully');
      setOpen(false);
      setFormData({ full_name: '', position: '', qualifications: [''], license_number: '', license_expiry: '', medical_expiry: '' });
      fetchCrew();
    } catch (error) {
      toast.error('Failed to add crew member');
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div></Layout>;
  if (vessels.length === 0) return <Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2><a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Vessels</a></div></Layout>;

  return (
    <Layout>
      <div data-testid="crew-management" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Crew Management</h1>
            <p className="text-slate-400">Manage crew members, qualifications, and fatigue tracking</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-crew-button" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Crew Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Crew Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input data-testid="crew-name-input" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required className="bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <Label>Position</Label>
                  <Input data-testid="crew-position-input" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} required className="bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <Label>Qualifications</Label>
                  {formData.qualifications.map((qual, idx) => (
                    <Input key={idx} data-testid={`qualification-${idx}`} value={qual} onChange={(e) => {
                      const newQuals = [...formData.qualifications];
                      newQuals[idx] = e.target.value;
                      setFormData({ ...formData, qualifications: newQuals });
                    }} className="bg-slate-800 border-slate-700 mb-2" placeholder="Qualification..." />
                  ))}
                  <Button type="button" onClick={() => setFormData({ ...formData, qualifications: [...formData.qualifications, ''] })} variant="outline" size="sm">Add Qualification</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>License Number</Label>
                    <Input data-testid="license-number-input" value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} className="bg-slate-800 border-slate-700" />
                  </div>
                  <div>
                    <Label>License Expiry</Label>
                    <Input data-testid="license-expiry-input" type="date" value={formData.license_expiry} onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })} className="bg-slate-800 border-slate-700" />
                  </div>
                </div>
                <div>
                  <Label>Medical Expiry</Label>
                  <Input data-testid="medical-expiry-input" type="date" value={formData.medical_expiry} onChange={(e) => setFormData({ ...formData, medical_expiry: e.target.value })} className="bg-slate-800 border-slate-700" />
                </div>
                <Button type="submit" data-testid="submit-crew-button" className="w-full bg-blue-600 hover:bg-blue-700">Add Crew Member</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {vessels.length > 1 && (
          <div className="flex items-center gap-4">
            <Label className="text-slate-300">Select Vessel:</Label>
            <select data-testid="vessel-select-crew" value={selectedVessel?.id || ''} onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              {vessels.map((vessel) => (<option key={vessel.id} value={vessel.id}>{vessel.name}</option>))}
            </select>
          </div>
        )}

        {crew.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Crew Members</h3>
              <p className="text-slate-400">Add crew members to manage qualifications and fatigue</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {crew.map((member) => (
              <Card key={member.id} data-testid={`crew-card-${member.id}`} className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    {member.full_name}
                  </CardTitle>
                  <p className="text-sm text-slate-400">{member.position}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Qualifications:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {member.qualifications.map((qual, idx) => (
                        <li key={idx} className="text-sm text-slate-300">{qual}</li>
                      ))}
                    </ul>
                  </div>
                  {member.license_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">License:</span>
                      <span className="text-white">{member.license_number}</span>
                    </div>
                  )}
                  {member.license_expiry && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">License Expiry:</span>
                      <span className="text-white">{new Date(member.license_expiry).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CrewManagement;
