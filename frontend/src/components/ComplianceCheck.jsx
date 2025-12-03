import { useState, useEffect } from 'react';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clipboard, Plus } from 'lucide-react';
import { toast } from 'sonner';

const mo504Items = [
  { item: 'Risk assessment includes fatigue management (Class 1, 2, 3)', category: 'Fatigue' },
  { item: 'Drug and alcohol policy documented and implemented', category: 'Policy' },
  { item: 'Operational procedures for key vessel operations', category: 'Operations' },
  { item: 'Emergency procedures include loss of propulsion', category: 'Emergency' },
  { item: 'Emergency procedures include oil/fuel spill response', category: 'Emergency' },
  { item: 'Vessel stability risks identified in risk assessment', category: 'Stability' },
  { item: 'Record of modifications affecting vessel stability maintained', category: 'Stability' },
  { item: 'Master responsibility and authority statement', category: 'Responsibilities' },
  { item: 'Designated person responsibility statement', category: 'Responsibilities' },
  { item: 'Crew qualifications documented', category: 'Crew' },
  { item: 'Planned maintenance system in place', category: 'Maintenance' },
];

const ComplianceCheck = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [checkItems, setCheckItems] = useState(mo504Items.map(item => ({ ...item, compliant: false, notes: '' })));

  useEffect(() => { fetchVessels(); }, []);
  useEffect(() => { if (selectedVessel) { fetchChecklists(); } }, [selectedVessel]);

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

  const fetchChecklists = async () => {
    try {
      const response = await axios.get(`${API}/compliance-checklists/vessel/${selectedVessel.id}`);
      setChecklists(response.data);
    } catch (error) {
      console.error('Failed to fetch checklists:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/compliance-checklists`, {
        vessel_id: selectedVessel.id,
        checklist_type: selectedVessel.vessel_class === 'class_4' ? 'mo504_class4' : 'mo504_class1-3',
        items: checkItems
      });
      toast.success('Compliance checklist submitted');
      setOpen(false);
      setCheckItems(mo504Items.map(item => ({ ...item, compliant: false, notes: '' })));
      fetchChecklists();
    } catch (error) {
      toast.error('Failed to submit checklist');
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div></Layout>;
  if (vessels.length === 0) return <Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2><a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Vessels</a></div></Layout>;

  return (
    <Layout>
      <div data-testid="compliance-check" className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Compliance Verification</h1>
            <p className="text-gray-600">Marine Order 504 SMS compliance checklists</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-checklist-button" className="bg-teal-500 hover:bg-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                New Checklist
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-300 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Marine Order 504 Compliance Checklist</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  {checkItems.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-start gap-3">
                        <Checkbox data-testid={`check-${idx}`} checked={item.compliant} onCheckedChange={(checked) => {
                          const newItems = [...checkItems];
                          newItems[idx].compliant = checked;
                          setCheckItems(newItems);
                        }} className="mt-1" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.item}</p>
                          <span className="text-xs text-gray-600 badge badge-info mt-1">{item.category}</span>
                        </div>
                      </div>
                      <Textarea data-testid={`notes-${idx}`} value={item.notes} onChange={(e) => {
                        const newItems = [...checkItems];
                        newItems[idx].notes = e.target.value;
                        setCheckItems(newItems);
                      }} placeholder="Notes..." className="bg-gray-100 border-slate-600 text-sm" rows={2} />
                    </div>
                  ))}
                </div>
                <Button type="submit" data-testid="submit-checklist-button" className="w-full bg-teal-500 hover:bg-teal-600">Submit Checklist</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {vessels.length > 1 && (
          <div className="flex items-center gap-4">
            <Label className="text-gray-700">Select Vessel:</Label>
            <select data-testid="vessel-select-compliance" value={selectedVessel?.id || ''} onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))} className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {vessels.map((vessel) => (<option key={vessel.id} value={vessel.id}>{vessel.name}</option>))}
            </select>
          </div>
        )}

        {checklists.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <Clipboard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Compliance Checklists</h3>
              <p className="text-gray-600">Create a compliance checklist to verify SMS requirements</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {checklists.map((checklist) => {
              const compliantCount = checklist.items.filter(i => i.compliant).length;
              const percentage = Math.round((compliantCount / checklist.items.length) * 100);
              return (
                <Card key={checklist.id} data-testid={`checklist-card-${checklist.id}`} className="bg-white border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-900">
                        Compliance Assessment - {new Date(checklist.assessment_date).toLocaleDateString()}
                      </CardTitle>
                      <span className={`badge ${checklist.overall_status === 'compliant' ? 'badge-success' : checklist.overall_status === 'non_compliant' ? 'badge-danger' : 'badge-warning'}`}>
                        {checklist.overall_status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Compliance: {percentage}%</span>
                        <span>{compliantCount}/{checklist.items.length} items</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${percentage === 100 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {checklist.items.filter(i => !i.compliant).map((item, idx) => (
                        <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm">
                          <p className="text-red-400 font-medium">✗ {item.item}</p>
                          {item.notes && <p className="text-gray-600 mt-1 text-xs">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ComplianceCheck;