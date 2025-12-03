import { useState, useEffect } from 'react';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Plus } from 'lucide-react';
import { toast } from 'sonner';

const EmergencyProcedures = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    procedure_type: 'fire',
    steps: [''],
    emergency_contacts: [{ name: '', role: '', phone: '' }]
  });

  useEffect(() => { fetchVessels(); }, []);
  useEffect(() => { if (selectedVessel) { fetchProcedures(); } }, [selectedVessel]);

  const fetchVessels = async () => {
    try {
      const response = await axios.get(`${API}/vessels`);
      setVessels(response.data);
      if (response.data.length > 0) { setSelectedVessel(response.data[0]); }
    } catch (error) {
      toast.error('Failed to fetch vessels');
    } finally {
      setLoading(false);
    }
  };

  const fetchProcedures = async () => {
    try {
      const response = await axios.get(`${API}/emergency-procedures/vessel/${selectedVessel.id}`);
      setProcedures(response.data);
    } catch (error) {
      console.error('Failed to fetch procedures:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const steps = formData.steps.filter(s => s.trim());
      const contacts = formData.emergency_contacts.filter(c => c.name.trim());
      await axios.post(`${API}/emergency-procedures`, {
        vessel_id: selectedVessel.id,
        procedure_type: formData.procedure_type,
        steps,
        emergency_contacts: contacts
      });
      toast.success('Emergency procedure added');
      setOpen(false);
      setFormData({ procedure_type: 'fire', steps: [''], emergency_contacts: [{ name: '', role: '', phone: '' }] });
      fetchProcedures();
    } catch (error) {
      toast.error('Failed to add procedure');
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div></Layout>;
  if (vessels.length === 0) return <Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2><a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Vessels</a></div></Layout>;

  return (
    <Layout>
      <div data-testid="emergency-procedures" className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Emergency Procedures</h1>
            <p className="text-gray-600">Manage emergency response procedures and drills</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-procedure-button" className="bg-teal-500 hover:bg-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Procedure
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-300 text-white max-w-2xl w-full mx-4">
              <DialogHeader><DialogTitle>Add Emergency Procedure</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Procedure Type</Label>
                  <select data-testid="procedure-type-select" value={formData.procedure_type} onChange={(e) => setFormData({ ...formData, procedure_type: e.target.value })} className="w-full p-2 rounded-md bg-gray-50 border-gray-300 text-white border">
                    <option value="fire">Fire</option>
                    <option value="abandon_ship">Abandon Ship</option>
                    <option value="man_overboard">Man Overboard</option>
                    <option value="loss_propulsion">Loss of Propulsion</option>
                    <option value="oil_spill">Oil/Fuel Spill</option>
                  </select>
                </div>
                <div>
                  <Label>Procedure Steps</Label>
                  {formData.steps.map((step, idx) => (
                    <Input key={idx} data-testid={`step-${idx}`} value={step} onChange={(e) => {
                      const newSteps = [...formData.steps];
                      newSteps[idx] = e.target.value;
                      setFormData({ ...formData, steps: newSteps });
                    }} className="bg-gray-50 border-gray-300 mb-2" placeholder={`Step ${idx + 1}...`} />
                  ))}
                  <Button type="button" onClick={() => setFormData({ ...formData, steps: [...formData.steps, ''] })} variant="outline" size="sm">Add Step</Button>
                </div>
                <div>
                  <Label>Emergency Contacts</Label>
                  {formData.emergency_contacts.map((contact, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                      <Input data-testid={`contact-name-${idx}`} value={contact.name} onChange={(e) => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts[idx].name = e.target.value;
                        setFormData({ ...formData, emergency_contacts: newContacts });
                      }} placeholder="Name" className="bg-gray-50 border-gray-300" />
                      <Input data-testid={`contact-role-${idx}`} value={contact.role} onChange={(e) => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts[idx].role = e.target.value;
                        setFormData({ ...formData, emergency_contacts: newContacts });
                      }} placeholder="Role" className="bg-gray-50 border-gray-300" />
                      <Input data-testid={`contact-phone-${idx}`} value={contact.phone} onChange={(e) => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts[idx].phone = e.target.value;
                        setFormData({ ...formData, emergency_contacts: newContacts });
                      }} placeholder="Phone" className="bg-gray-50 border-gray-300" />
                    </div>
                  ))}
                  <Button type="button" onClick={() => setFormData({ ...formData, emergency_contacts: [...formData.emergency_contacts, { name: '', role: '', phone: '' }] })} variant="outline" size="sm">Add Contact</Button>
                </div>
                <Button type="submit" data-testid="submit-procedure-button" className="w-full bg-teal-500 hover:bg-teal-600">Add Procedure</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {vessels.length > 1 && (
          <div className="flex items-center gap-4">
            <Label className="text-gray-700">Select Vessel:</Label>
            <select data-testid="vessel-select-emergency" value={selectedVessel?.id || ''} onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))} className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {vessels.map((vessel) => (<option key={vessel.id} value={vessel.id}>{vessel.name}</option>))}
            </select>
          </div>
        )}

        {procedures.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Emergency Procedures</h3>
              <p className="text-gray-600">Add emergency procedures for vessel safety</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {procedures.map((proc) => (
              <Card key={proc.id} data-testid={`procedure-card-${proc.id}`} className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    <span className="capitalize">{proc.procedure_type.replace('_', ' ')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Procedure Steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {proc.steps.map((step, idx) => (
                        <li key={idx} className="text-sm text-gray-700">{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Emergency Contacts:</p>
                    <div className="space-y-2">
                      {proc.emergency_contacts.map((contact, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-900">{contact.name} ({contact.role})</span>
                          <span className="text-blue-400">{contact.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmergencyProcedures;