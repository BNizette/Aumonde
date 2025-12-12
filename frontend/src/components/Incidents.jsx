import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Plus, Edit, Trash2, Eye, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [viewingIncident, setViewingIncident] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    incident_type: 'all',
    severity: 'all',
    status: 'all',
    start_date: '',
    end_date: ''
  });

  const [formData, setFormData] = useState({
    incident_type: 'Near Miss',
    severity: 'Minor',
    title: '',
    description: '',
    incident_date: new Date().toISOString().slice(0, 16),
    location: '',
    vessel_id: '',
    vessel_name: '',
    injuries: false,
    injury_details: '',
    witnesses: '',
    immediate_actions: '',
    investigation_status: 'Reported',
    root_cause: '',
    corrective_actions: '',
    preventive_actions: '',
    responsible_person: '',
    target_completion_date: ''
  });

  const incidentTypes = ['Injury', 'Near Miss', 'Equipment Failure', 'Environmental', 'Security', 'Other'];
  const severityLevels = ['Minor', 'Moderate', 'Serious', 'Critical'];
  const statuses = ['Reported', 'Under Investigation', 'Completed', 'Closed'];

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (filters.incident_type && filters.incident_type !== 'all') params.append('incident_type', filters.incident_type);
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);

      const [incidentsRes, vesselsRes] = await Promise.all([
        axios.get(`${API}/incidents?${params}`, { headers }),
        axios.get(`${API}/vessels`, { headers })
      ]);

      setIncidents(incidentsRes.data);
      setVessels(vesselsRes.data);
    } catch (err) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (incidents.length === 0) {
      setError('No incidents to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Define all possible fields from incident records
    const headers = [
      'ID',
      'Title',
      'Incident Type',
      'Severity',
      'Status',
      'Description',
      'Incident Date',
      'Location',
      'Vessel ID',
      'Vessel Name',
      'Injuries',
      'Injury Details',
      'Witnesses',
      'Immediate Actions',
      'Investigation Status',
      'Root Cause',
      'Corrective Actions',
      'Preventive Actions',
      'Responsible Person',
      'Target Completion Date',
      'Created At',
      'Created By'
    ];

    // Convert incidents to CSV rows with ALL fields
    const csvRows = [
      headers.join(','),
      ...incidents.map(incident => [
        `"${incident.id || ''}"`,
        `"${(incident.title || '').replace(/"/g, '""')}"`,
        `"${incident.incident_type || ''}"`,
        `"${incident.severity || ''}"`,
        `"${incident.investigation_status || ''}"`,
        `"${(incident.description || '').replace(/"/g, '""')}"`,
        `"${incident.incident_date ? new Date(incident.incident_date).toLocaleString() : ''}"`,
        `"${(incident.location || '').replace(/"/g, '""')}"`,
        `"${incident.vessel_id || ''}"`,
        `"${(incident.vessel_name || '').replace(/"/g, '""')}"`,
        `"${incident.injuries ? 'Yes' : 'No'}"`,
        `"${(incident.injury_details || '').replace(/"/g, '""')}"`,
        `"${(incident.witnesses || '').replace(/"/g, '""')}"`,
        `"${(incident.immediate_actions || '').replace(/"/g, '""')}"`,
        `"${incident.investigation_status || ''}"`,
        `"${(incident.root_cause || '').replace(/"/g, '""')}"`,
        `"${(incident.corrective_actions || '').replace(/"/g, '""')}"`,
        `"${(incident.preventive_actions || '').replace(/"/g, '""')}"`,
        `"${(incident.responsible_person || '').replace(/"/g, '""')}"`,
        `"${incident.target_completion_date ? new Date(incident.target_completion_date).toLocaleDateString() : ''}"`,
        `"${incident.created_at ? new Date(incident.created_at).toLocaleString() : ''}"`,
        `"${incident.created_by || ''}"`,
      ].join(','))
    ];

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `incidents_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage(`Exported ${incidents.length} incidents to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingIncident) {
        await axios.put(`${API}/incidents/${editingIncident.id}`, formData, { headers });
        setMessage('Incident updated successfully');
      } else {
        await axios.post(`${API}/incidents`, formData, { headers });
        setMessage('Incident reported successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving incident');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/incidents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Incident deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting incident');
    }
  };

  const handleEdit = (incident) => {
    setEditingIncident(incident);
    setFormData({
      ...incident,
      incident_date: incident.incident_date ? new Date(incident.incident_date).toISOString().slice(0, 16) : '',
      target_completion_date: incident.target_completion_date ? new Date(incident.target_completion_date).toISOString().slice(0, 16) : ''
    });
    setDialogOpen(true);
  };

  const handleView = async (incident) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/incidents/${incident.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewingIncident(response.data);
      setViewDialogOpen(true);
    } catch (err) {
      setError('Error loading incident details');
    }
  };

  const resetForm = () => {
    setFormData({
      incident_type: 'Near Miss',
      severity: 'Minor',
      title: '',
      description: '',
      incident_date: new Date().toISOString().slice(0, 16),
      location: '',
      vessel_id: '',
      vessel_name: '',
      injuries: false,
      injury_details: '',
      witnesses: '',
      immediate_actions: '',
      investigation_status: 'Reported',
      root_cause: '',
      corrective_actions: '',
      preventive_actions: '',
      responsible_person: '',
      target_completion_date: ''
    });
    setEditingIncident(null);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'Minor': 'bg-blue-100 text-blue-800',
      'Moderate': 'bg-yellow-100 text-yellow-800',
      'Serious': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Reported': 'bg-blue-100 text-blue-800',
      'Under Investigation': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Incident Management</h2>
          <p className="text-gray-500 mt-1">Track and manage safety incidents</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Report Incident
        </Button>
      </div>

      {message && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilters({ incident_type: 'all', severity: 'all', status: 'all' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{incidents.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilters({ ...filters, severity: 'Critical' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Critical</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-red-600">
              {incidents.filter(i => i.severity === 'Critical').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilters({ ...filters, severity: 'Serious' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Serious</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-orange-600">
              {incidents.filter(i => i.severity === 'Serious').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilters({ ...filters, status: 'Under Investigation' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Under Investigation</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-yellow-600">
              {incidents.filter(i => i.investigation_status === 'Under Investigation').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Incident Type</Label>
              <Select value={filters.incident_type} onValueChange={(value) => setFilters({...filters, incident_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {incidentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={filters.severity} onValueChange={(value) => setFilters({...filters, severity: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {severityLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="grid grid-cols-1 gap-4">
        {incidents.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No incidents reported</p>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="mt-4">
                Report First Incident
              </Button>
            </CardContent>
          </Card>
        ) : (
          incidents.map((incident) => (
            <Card key={incident.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{incident.title}</h3>
                      <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                      <Badge className={getStatusColor(incident.investigation_status)}>
                        {incident.investigation_status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Incident #:</strong> {incident.incident_number}</p>
                      <p><strong>Type:</strong> {incident.incident_type}</p>
                      <p><strong>Date:</strong> {new Date(incident.incident_date).toLocaleString()}</p>
                      <p><strong>Location:</strong> {incident.location}</p>
                      {incident.vessel_name && <p><strong>Vessel:</strong> {incident.vessel_name}</p>}
                      {incident.injuries && <p className="text-red-600"><strong>⚠️ Injuries Reported</strong></p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(incident)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(incident)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(incident.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIncident ? 'Edit Incident' : 'Report New Incident'}</DialogTitle>
            <DialogDescription>Fill in the incident details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Incident Type *</Label>
                <Select value={formData.incident_type} onValueChange={(value) => setFormData({...formData, incident_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity *</Label>
                <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severityLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Brief incident description"
              />
            </div>

            <div>
              <Label>Detailed Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                placeholder="Describe what happened..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Incident Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Where did this occur?"
                />
              </div>
            </div>

            <div>
              <Label>Vessel (Optional)</Label>
              <Select value={formData.vessel_id} onValueChange={(value) => {
                const vessel = vessels.find(v => v.id === value);
                setFormData({...formData, vessel_id: value, vessel_name: vessel?.vessel_name || ''});
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vessels.map(v => <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="injuries"
                checked={formData.injuries}
                onChange={(e) => setFormData({...formData, injuries: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="injuries">Were there any injuries?</Label>
            </div>

            {formData.injuries && (
              <div>
                <Label>Injury Details</Label>
                <Textarea
                  value={formData.injury_details}
                  onChange={(e) => setFormData({...formData, injury_details: e.target.value})}
                  rows={2}
                  placeholder="Describe injuries..."
                />
              </div>
            )}

            <div>
              <Label>Witnesses</Label>
              <Textarea
                value={formData.witnesses}
                onChange={(e) => setFormData({...formData, witnesses: e.target.value})}
                rows={2}
                placeholder="Names and contact info of witnesses"
              />
            </div>

            <div>
              <Label>Immediate Actions Taken</Label>
              <Textarea
                value={formData.immediate_actions}
                onChange={(e) => setFormData({...formData, immediate_actions: e.target.value})}
                rows={2}
                placeholder="What actions were taken immediately?"
              />
            </div>

            <div>
              <Label>Investigation Status</Label>
              <Select value={formData.investigation_status} onValueChange={(value) => setFormData({...formData, investigation_status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {formData.investigation_status !== 'Reported' && (
              <>
                <div>
                  <Label>Root Cause</Label>
                  <Textarea
                    value={formData.root_cause}
                    onChange={(e) => setFormData({...formData, root_cause: e.target.value})}
                    rows={2}
                    placeholder="Identified root cause"
                  />
                </div>

                <div>
                  <Label>Corrective Actions</Label>
                  <Textarea
                    value={formData.corrective_actions}
                    onChange={(e) => setFormData({...formData, corrective_actions: e.target.value})}
                    rows={2}
                    placeholder="Actions to correct this specific issue"
                  />
                </div>

                <div>
                  <Label>Preventive Actions</Label>
                  <Textarea
                    value={formData.preventive_actions}
                    onChange={(e) => setFormData({...formData, preventive_actions: e.target.value})}
                    rows={2}
                    placeholder="Actions to prevent recurrence"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Responsible Person</Label>
                    <Input
                      value={formData.responsible_person}
                      onChange={(e) => setFormData({...formData, responsible_person: e.target.value})}
                      placeholder="Who is responsible for follow-up?"
                    />
                  </div>
                  <div>
                    <Label>Target Completion Date</Label>
                    <Input
                      type="datetime-local"
                      value={formData.target_completion_date}
                      onChange={(e) => setFormData({...formData, target_completion_date: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingIncident ? 'Update' : 'Report'} Incident</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {viewingIncident && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getSeverityColor(viewingIncident.severity)}>{viewingIncident.severity}</Badge>
                <Badge className={getStatusColor(viewingIncident.investigation_status)}>
                  {viewingIncident.investigation_status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Incident #:</strong> {viewingIncident.incident_number}</div>
                <div><strong>Type:</strong> {viewingIncident.incident_type}</div>
                <div><strong>Date:</strong> {new Date(viewingIncident.incident_date).toLocaleString()}</div>
                <div><strong>Location:</strong> {viewingIncident.location}</div>
                {viewingIncident.vessel_name && <div><strong>Vessel:</strong> {viewingIncident.vessel_name}</div>}
                <div><strong>Reported By:</strong> {viewingIncident.reported_by_name}</div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-gray-700">{viewingIncident.description}</p>
              </div>

              {viewingIncident.injuries && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">⚠️ Injury Details</h4>
                  <p className="text-sm text-red-800">{viewingIncident.injury_details}</p>
                </div>
              )}

              {viewingIncident.immediate_actions && (
                <div>
                  <h4 className="font-semibold mb-2">Immediate Actions</h4>
                  <p className="text-sm text-gray-700">{viewingIncident.immediate_actions}</p>
                </div>
              )}

              {viewingIncident.root_cause && (
                <div>
                  <h4 className="font-semibold mb-2">Root Cause</h4>
                  <p className="text-sm text-gray-700">{viewingIncident.root_cause}</p>
                </div>
              )}

              {viewingIncident.corrective_actions && (
                <div>
                  <h4 className="font-semibold mb-2">Corrective Actions</h4>
                  <p className="text-sm text-gray-700">{viewingIncident.corrective_actions}</p>
                </div>
              )}

              {viewingIncident.preventive_actions && (
                <div>
                  <h4 className="font-semibold mb-2">Preventive Actions</h4>
                  <p className="text-sm text-gray-700">{viewingIncident.preventive_actions}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Incidents;