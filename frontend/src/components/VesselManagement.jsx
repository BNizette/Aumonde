import { useState, useEffect } from 'react';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ship, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const VesselManagement = () => {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    vessel_class: 'class_1',
    registration_number: '',
    length: '',
    sms_type: 'standard'
  });

  useEffect(() => {
    fetchVessels();
  }, []);

  const fetchVessels = async () => {
    try {
      const response = await axios.get(`${API}/vessels`);
      setVessels(response.data);
    } catch (error) {
      toast.error('Failed to fetch vessels');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/vessels`, {
        ...formData,
        length: parseFloat(formData.length)
      });
      toast.success('Vessel added successfully');
      setOpen(false);
      setFormData({ name: '', vessel_class: 'class_1', registration_number: '', length: '', sms_type: 'standard' });
      fetchVessels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add vessel');
    }
  };

  return (
    <Layout>
      <div data-testid="vessel-management" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Vessel Management</h1>
            <p className="text-slate-400">Manage your commercial vessels and their SMS configurations</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-vessel-button" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Vessel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Add New Vessel</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Vessel Name</Label>
                  <Input
                    id="name"
                    data-testid="vessel-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                
                <div>
                  <Label htmlFor="registration_number">Registration Number</Label>
                  <Input
                    id="registration_number"
                    data-testid="registration-number-input"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    required
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                
                <div>
                  <Label htmlFor="vessel_class">Vessel Class</Label>
                  <select
                    id="vessel_class"
                    data-testid="vessel-class-select"
                    value={formData.vessel_class}
                    onChange={(e) => setFormData({ ...formData, vessel_class: e.target.value })}
                    className="w-full p-2 rounded-md bg-slate-800 border-slate-700 text-white border"
                  >
                    <option value="class_1">Class 1 (Passenger)</option>
                    <option value="class_2">Class 2 (Non-passenger)</option>
                    <option value="class_3">Class 3 (Fishing)</option>
                    <option value="class_4">Class 4 (Hire and Drive)</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="length">Length (meters)</Label>
                  <Input
                    id="length"
                    data-testid="vessel-length-input"
                    type="number"
                    step="0.1"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    required
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sms_type">SMS Type</Label>
                  <select
                    id="sms_type"
                    data-testid="sms-type-select"
                    value={formData.sms_type}
                    onChange={(e) => setFormData({ ...formData, sms_type: e.target.value })}
                    className="w-full p-2 rounded-md bg-slate-800 border-slate-700 text-white border"
                  >
                    <option value="standard">Standard SMS</option>
                    <option value="simplified">Simplified SMS</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Vessels under 7.5m in Class 2, 3, or 4 are eligible for simplified SMS
                  </p>
                </div>
                
                <Button type="submit" data-testid="submit-vessel-button" className="w-full bg-blue-600 hover:bg-blue-700">
                  Add Vessel
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        ) : vessels.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <Ship className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Vessels Added</h3>
              <p className="text-slate-400">Add your first vessel to get started with the SMS</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vessels.map((vessel) => (
              <Card key={vessel.id} data-testid={`vessel-card-${vessel.id}`} className="bg-slate-900 border-slate-800 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Ship className="w-5 h-5 text-blue-400" />
                        {vessel.name}
                      </CardTitle>
                      <p className="text-sm text-slate-400 mt-1">{vessel.registration_number}</p>
                    </div>
                    {vessel.eligible_simplified && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" title="Eligible for Simplified SMS" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Class:</span>
                    <span className="text-white font-medium">{vessel.vessel_class.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Length:</span>
                    <span className="text-white font-medium">{vessel.length}m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">SMS Type:</span>
                    <span className="text-white font-medium capitalize">{vessel.sms_type}</span>
                  </div>
                  {vessel.eligible_simplified && (
                    <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                      Eligible for Simplified SMS
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

export default VesselManagement;