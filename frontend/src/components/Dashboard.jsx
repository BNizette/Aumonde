import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/App';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle, AlertCircle, Wrench, TrendingUp, Ship } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    if (selectedVessel) {
      fetchStats();
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

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats/${selectedVessel.id}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const statCards = [
    { title: 'Total Crew', value: stats?.total_crew || 0, icon: Users, color: 'from-blue-500 to-blue-600', change: '+2' },
    { title: 'Active Risks', value: stats?.active_risks || 0, icon: AlertTriangle, color: 'from-amber-500 to-amber-600', change: '-1' },
    { title: 'Open Incidents', value: stats?.open_incidents || 0, icon: AlertCircle, color: 'from-red-500 to-red-600', change: '0' },
    { title: 'Overdue Maintenance', value: stats?.overdue_maintenance || 0, icon: Wrench, color: 'from-teal-500 to-teal-600', change: '-3' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </Layout>
    );
  }

  if (vessels.length === 0) {
    return (
      <Layout>
        <div data-testid="no-vessels-message" className="text-center py-12">
          <Ship className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Vessels Registered</h2>
          <p className="text-gray-600 mb-6">Get started by adding your first vessel to the system.</p>
          <a href="/vessels" className="inline-flex items-center px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
            Add Vessel
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="dashboard" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Safety Management System Overview</p>
          </div>
          
          {vessels.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Vessel</label>
              <select
                data-testid="vessel-selector"
                value={selectedVessel?.id || ''}
                onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
              >
                {vessels.map((vessel) => (
                  <option key={vessel.id} value={vessel.id}>
                    {vessel.name} - {vessel.registration_number}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Vessel Info */}
        {selectedVessel && (
          <Card className="border-none text-white" style={{ background: 'linear-gradient(135deg, #1dd1a1 0%, #00bcd4 100%)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Ship className="w-6 h-6" />
                {selectedVessel.name}
              </CardTitle>
              <CardDescription className="text-white opacity-90">
                Registration: {selectedVessel.registration_number} | Class: {selectedVessel.vessel_class.replace('_', ' ').toUpperCase()} | 
                Length: {selectedVessel.length}m | SMS: {selectedVessel.sms_type}
                {selectedVessel.eligible_simplified && ' (Eligible for Simplified SMS)'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} data-testid={`stat-card-${stat.title.toLowerCase().replace(' ', '-')}`} className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">{stat.change}</span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Recent Incidents</CardTitle>
              <CardDescription>Latest safety incidents reported</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recent_incidents?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_incidents.map((incident, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white capitalize">{incident.incident_type.replace('_', ' ')}</span>
                        <span className={`badge badge-${incident.severity === 'critical' ? 'danger' : incident.severity === 'serious' ? 'warning' : 'info'}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{incident.description?.substring(0, 80)}...</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent incidents</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Recent Maintenance</CardTitle>
              <CardDescription>Latest maintenance activities</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recent_maintenance?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_maintenance.map((maint, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">{maint.performed_by}</span>
                        <span className="badge badge-success">Completed</span>
                      </div>
                      <p className="text-xs text-gray-600">{maint.findings?.substring(0, 80)}...</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent maintenance</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;