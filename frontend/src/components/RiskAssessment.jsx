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
import { AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const RiskAssessment = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    hazard: '',
    likelihood: 3,
    consequence: 3,
    control_measures: ['']
  });

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    if (selectedVessel) {
      fetchRisks();
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

  const fetchRisks = async () => {
    try {
      const response = await axios.get(`${API}/risk-assessments/vessel/${selectedVessel.id}`);
      setRisks(response.data);
    } catch (error) {
      console.error('Failed to fetch risks:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const measures = formData.control_measures.filter(m => m.trim());
      await axios.post(`${API}/risk-assessments`, {
        vessel_id: selectedVessel.id,
        hazard: formData.hazard,
        likelihood: parseInt(formData.likelihood),
        consequence: parseInt(formData.consequence),
        control_measures: measures
      });
      toast.success('Risk assessment added successfully');
      setOpen(false);
      setFormData({ hazard: '', likelihood: 3, consequence: 3, control_measures: [''] });
      fetchRisks();
    } catch (error) {
      toast.error('Failed to add risk assessment');
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div></Layout>;
  if (vessels.length === 0) return <Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2><p className="text-gray-600 mb-6">Please add a vessel first.</p><a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Vessels</a></div></Layout>;

  return (
    <Layout>
      <div data-testid="risk-assessment" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Risk Assessment</h1>
            <p className="text-gray-600">Identify and manage operational risks</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-risk-button" className="bg-teal-500 hover:bg-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Risk Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-300 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Risk Assessment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Hazard Description</Label>
                  <Textarea data-testid="hazard-input" value={formData.hazard} onChange={(e) => setFormData({ ...formData, hazard: e.target.value })} required className="bg-gray-50 border-gray-300" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Likelihood (1-5)</Label>
                    <Input data-testid="likelihood-input" type="number" min="1" max="5" value={formData.likelihood} onChange={(e) => setFormData({ ...formData, likelihood: e.target.value })} className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label>Consequence (1-5)</Label>
                    <Input data-testid="consequence-input" type="number" min="1" max="5" value={formData.consequence} onChange={(e) => setFormData({ ...formData, consequence: e.target.value })} className="bg-gray-50 border-gray-300" />
                  </div>
                </div>
                <div>
                  <Label>Control Measures</Label>
                  {formData.control_measures.map((measure, idx) => (
                    <Input key={idx} data-testid={`control-measure-${idx}`} value={measure} onChange={(e) => {
                      const newMeasures = [...formData.control_measures];
                      newMeasures[idx] = e.target.value;
                      setFormData({ ...formData, control_measures: newMeasures });
                    }} className="bg-gray-50 border-gray-300 mb-2" placeholder="Control measure..." />
                  ))}
                  <Button type="button" onClick={() => setFormData({ ...formData, control_measures: [...formData.control_measures, ''] })} variant="outline" size="sm" className="mt-2">Add Measure</Button>
                </div>
                <Button type="submit" data-testid="submit-risk-button" className="w-full bg-teal-500 hover:bg-teal-600">Add Risk Assessment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {vessels.length > 1 && (
          <div className="flex items-center gap-4">
            <Label className="text-gray-700">Select Vessel:</Label>
            <select data-testid="vessel-select-risk" value={selectedVessel?.id || ''} onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))} className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {vessels.map((vessel) => (<option key={vessel.id} value={vessel.id}>{vessel.name}</option>))}
            </select>
          </div>
        )}

        {risks.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Risk Assessments</h3>
              <p className="text-gray-600">Add risk assessments to identify and manage hazards</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {risks.map((risk) => (
              <Card key={risk.id} data-testid={`risk-card-${risk.id}`} className="bg-white border-gray-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      Risk Assessment
                    </CardTitle>
                    <span className={`badge ${getRiskColor(risk.risk_level)}`}>{risk.risk_level.toUpperCase()}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Hazard:</p>
                    <p className="text-gray-900">{risk.hazard}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Likelihood:</p>
                      <p className="text-white font-semibold">{risk.likelihood}/5</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Consequence:</p>
                      <p className="text-white font-semibold">{risk.consequence}/5</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Control Measures:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {risk.control_measures.map((measure, idx) => (
                        <li key={idx} className="text-sm text-gray-700">{measure}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-xs text-gray-500">Assessed: {new Date(risk.assessment_date).toLocaleDateString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RiskAssessment;