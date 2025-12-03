import { useState, useEffect } from 'react';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const IncidentReporting = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    incident_type: 'accident',
    severity: 'minor',
    date: '',
    location: '',
    description: '',
    persons_involved: [''],
    immediate_action: ''
  });

  useEffect(() => { fetchVessels(); }, []);
  useEffect(() => { if (selectedVessel) { fetchIncidents(); } }, [selectedVessel]);

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

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(`${API}/incidents/vessel/${selectedVessel.id}`);
      setIncidents(response.data);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const persons = formData.persons_involved.filter(p => p.trim());
      await axios.post(`${API}/incidents`, {
        vessel_id: selectedVessel.id,
        ...formData,
        persons_involved: persons
      });
      toast.success('Incident reported successfully');
      setOpen(false);
      setFormData({ incident_type: 'accident', severity: 'minor', date: '', location: '', description: '', persons_involved: [''], immediate_action: '' });
      fetchIncidents();
    } catch (error) {
      toast.error('Failed to report incident');
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div></Layout>;
  if (vessels.length === 0) return <Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2><a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Vessels</a></div></Layout>;

  return (
    <Layout>
      <div data-testid="incident-reporting" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Incident Reporting</h1>
            <p className="text-slate-400">Report and track safety incidents</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="report-incident-button" className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
              <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Incident Type</Label>
                    <select data-testid="incident-type-select" value={formData.incident_type} onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })} className="w-full p-2 rounded-md bg-slate-800 border-slate-700 text-white border">
                      <option value="accident">Accident</option>
                      <option value="near_miss">Near Miss</option>
                      <option value="pollution">Pollution</option>
                      <option value="equipment_failure">Equipment Failure</option>
                    </select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <select data-testid="severity-select" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="w-full p-2 rounded-md bg-slate-800 border-slate-700 text-white border">
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="serious">Serious</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date & Time</Label>
                    <Input data-testid="incident-date-input" type="datetime-local" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="bg-slate-800 border-slate-700" />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input data-testid="incident-location-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required className="bg-slate-800 border-slate-700" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea data-testid="incident-description-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className="bg-slate-800 border-slate-700" rows={4} />
                </div>
                <div>
                  <Label>Persons Involved</Label>
                  {formData.persons_involved.map((person, idx) => (
                    <Input key={idx} data-testid={`person-${idx}`} value={person} onChange={(e) => {
                      const newPersons = [...formData.persons_involved];
                      newPersons[idx] = e.target.value;
                      setFormData({ ...formData, persons_involved: newPersons });
                    }} className="bg-slate-800 border-slate-700 mb-2" placeholder="Name..." />
                  ))}
                  <Button type="button" onClick={() => setFormData({ ...formData, persons_involved: [...formData.persons_involved, ''] })} variant="outline" size="sm">Add Person</Button>
                </div>
                <div>
                  <Label>Immediate Action Taken</Label>
                  <Textarea data-testid="immediate-action-input" value={formData.immediate_action} onChange={(e) => setFormData({ ...formData, immediate_action: e.target.value })} required className="bg-slate-800 border-slate-700" rows={3} />
                </div>
                <Button type="submit" data-testid="submit-incident-button" className="w-full bg-red-600 hover:bg-red-700">Submit Report</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {vessels.length > 1 && (
          <div className="flex items-center gap-4">
            <Label className="text-slate-300">Select Vessel:</Label>
            <select data-testid="vessel-select-incidents" value={selectedVessel?.id || ''} onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              {vessels.map((vessel) => (<option key={vessel.id} value={vessel.id}>{vessel.name}</option>))}
            </select>
          </div>
        )}

        {incidents.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Incidents Reported</h3>
              <p className="text-slate-400">Good safety record!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <Card key={incident.id} data-testid={`incident-card-${incident.id}`} className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize">{incident.incident_type.replace('_', ' ')}</h3>
                      <p className="text-sm text-slate-400">{incident.location} • {new Date(incident.date).toLocaleString()}</p>
                    </div>
                    <span className={`badge ${incident.severity === 'critical' ? 'badge-danger' : incident.severity === 'serious' ? 'badge-warning' : 'badge-info'}`}>{incident.severity}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Description:</p>
                      <p className="text-white">{incident.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Immediate Action:</p>
                      <p className="text-white">{incident.immediate_action}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${incident.investigation_status === 'closed' ? 'badge-success' : 'badge-warning'}`}>
                        {incident.investigation_status}
                      </span>
                      <span className="text-xs text-slate-500">
                        Reported by: {incident.reported_by}
                      </span>
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

export default IncidentReporting;
