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
import { Wrench, Plus } from 'lucide-react';
import { toast } from 'sonner';

const MaintenanceManagement = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openLog, setOpenLog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    equipment: '',
    maintenance_type: 'routine',
    frequency: 'monthly',
    next_due: ''
  });
  const [logForm, setLogForm] = useState({
    schedule_id: '',
    completed_date: '',
    performed_by: '',
    findings: '',
    action_taken: ''
  });

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    if (selectedVessel) {
      fetchSchedules();
      fetchLogs();
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

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/maintenance-schedules/vessel/${selectedVessel.id}`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/maintenance-logs/vessel/${selectedVessel.id}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/maintenance-schedules`, {
        vessel_id: selectedVessel.id,
        ...scheduleForm
      });
      toast.success('Maintenance schedule added');
      setOpenSchedule(false);
      setScheduleForm({ equipment: '', maintenance_type: 'routine', frequency: 'monthly', next_due: '' });
      fetchSchedules();
    } catch (error) {
      toast.error('Failed to add schedule');
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/maintenance-logs`, {
        vessel_id: selectedVessel.id,
        ...logForm
      });
      toast.success('Maintenance log added');
      setOpenLog(false);
      setLogForm({ schedule_id: '', completed_date: '', performed_by: '', findings: '', action_taken: '' });
      fetchLogs();
      fetchSchedules();
    } catch (error) {
      toast.error('Failed to add log');
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div></Layout>;
  if (vessels.length === 0) return <Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2><a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Vessels</a></div></Layout>;

  return (
    <Layout>
      <div data-testid="maintenance-management" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Maintenance Management</h1>
            <p className="text-gray-600">Planned maintenance schedules and maintenance logs</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
              <DialogTrigger asChild>
                <Button data-testid="add-schedule-button" className="bg-teal-500 hover:bg-teal-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-300 text-gray-900">
                <DialogHeader><DialogTitle>Add Maintenance Schedule</DialogTitle></DialogHeader>
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div>
                    <Label>Equipment</Label>
                    <Input data-testid="equipment-input" value={scheduleForm.equipment} onChange={(e) => setScheduleForm({ ...scheduleForm, equipment: e.target.value })} required className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label>Maintenance Type</Label>
                    <select data-testid="maintenance-type-select" value={scheduleForm.maintenance_type} onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_type: e.target.value })} className="w-full p-2 rounded-md bg-gray-50 border-gray-300 text-white border">
                      <option value="routine">Routine</option>
                      <option value="inspection">Inspection</option>
                      <option value="repair">Repair</option>
                    </select>
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <select data-testid="frequency-select" value={scheduleForm.frequency} onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })} className="w-full p-2 rounded-md bg-gray-50 border-gray-300 text-white border">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div>
                    <Label>Next Due Date</Label>
                    <Input data-testid="next-due-input" type="date" value={scheduleForm.next_due} onChange={(e) => setScheduleForm({ ...scheduleForm, next_due: e.target.value })} required className="bg-gray-50 border-gray-300" />
                  </div>
                  <Button type="submit" data-testid="submit-schedule-button" className="w-full bg-teal-500 hover:bg-teal-600">Add Schedule</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={openLog} onOpenChange={setOpenLog}>
              <DialogTrigger asChild>
                <Button data-testid="add-log-button" className="bg-cyan-500 hover:bg-cyan-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Maintenance
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-300 text-white max-w-2xl">
                <DialogHeader><DialogTitle>Log Maintenance Activity</DialogTitle></DialogHeader>
                <form onSubmit={handleLogSubmit} className="space-y-4">
                  <div>
                    <Label>Schedule</Label>
                    <select data-testid="schedule-select" value={logForm.schedule_id} onChange={(e) => setLogForm({ ...logForm, schedule_id: e.target.value })} required className="w-full p-2 rounded-md bg-gray-50 border-gray-300 text-white border">
                      <option value="">Select schedule</option>
                      {schedules.map(s => <option key={s.id} value={s.id}>{s.equipment} - {s.maintenance_type}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Completed Date</Label>
                    <Input data-testid="completed-date-input" type="date" value={logForm.completed_date} onChange={(e) => setLogForm({ ...logForm, completed_date: e.target.value })} required className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label>Performed By</Label>
                    <Input data-testid="performed-by-input" value={logForm.performed_by} onChange={(e) => setLogForm({ ...logForm, performed_by: e.target.value })} required className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label>Findings</Label>
                    <Textarea data-testid="findings-input" value={logForm.findings} onChange={(e) => setLogForm({ ...logForm, findings: e.target.value })} required className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label>Action Taken</Label>
                    <Textarea data-testid="action-taken-input" value={logForm.action_taken} onChange={(e) => setLogForm({ ...logForm, action_taken: e.target.value })} required className="bg-gray-50 border-gray-300" />
                  </div>
                  <Button type="submit" data-testid="submit-log-button" className="w-full bg-cyan-500 hover:bg-cyan-600">Log Maintenance</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {vessels.length > 1 && (
          <div className="flex items-center gap-4">
            <Label className="text-gray-700">Select Vessel:</Label>
            <select data-testid="vessel-select-maintenance" value={selectedVessel?.id || ''} onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))} className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {vessels.map((vessel) => (<option key={vessel.id} value={vessel.id}>{vessel.name}</option>))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Maintenance Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">No schedules</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map(schedule => (
                    <div key={schedule.id} data-testid={`schedule-${schedule.id}`} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">{schedule.equipment}</span>
                        <span className={`badge ${schedule.status === 'completed' ? 'badge-success' : schedule.status === 'overdue' ? 'badge-danger' : 'badge-info'}`}>{schedule.status}</span>
                      </div>
                      <p className="text-xs text-gray-600 capitalize">{schedule.maintenance_type} - {schedule.frequency}</p>
                      <p className="text-xs text-gray-500 mt-1">Due: {new Date(schedule.next_due).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Recent Maintenance Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No maintenance logs</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 10).map(log => (
                    <div key={log.id} data-testid={`log-${log.id}`} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">{log.performed_by}</span>
                        <span className="text-xs text-gray-500">{new Date(log.completed_date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-600">{log.findings.substring(0, 80)}...</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default MaintenanceManagement;
