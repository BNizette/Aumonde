import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, AlertTriangle, Eye, Search, Filter, X } from 'lucide-react';
import RiskAssessmentForm from './RiskAssessmentForm';
import RiskAssessmentDetails from './RiskAssessmentDetails';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RiskAssessment = () => {
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('all');
  const [sortBy, setSortBy] = useState('riskLevel');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchRisks();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, riskLevelFilter, statusFilter, vesselFilter, sortBy, risks]);

  const applyFiltersAndSort = () => {
    let filtered = [...risks];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(risk =>
        risk.activity_task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.hazard?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply risk level filter
    if (riskLevelFilter !== 'all') {
      filtered = filtered.filter(risk => 
        risk.risk_level?.toLowerCase() === riskLevelFilter.toLowerCase()
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(risk => 
        risk.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply vessel filter
    if (vesselFilter !== 'all') {
      filtered = filtered.filter(risk => 
        risk.vessel_name?.toLowerCase().includes(vesselFilter.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'riskLevel':
          const riskOrder = { 'Critical': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Very Low': 1 };
          return (riskOrder[b.risk_level] || 0) - (riskOrder[a.risk_level] || 0);
        case 'activity':
          return (a.activity_task || '').localeCompare(b.activity_task || '');
        case 'date':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'vessel':
          return (a.vessel_name || '').localeCompare(b.vessel_name || '');
        default:
          return 0;
      }
    });

    setFilteredRisks(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRiskLevelFilter('all');
    setStatusFilter('all');
    setVesselFilter('all');
    setSortBy('riskLevel');
  };

  const hasActiveFilters = searchQuery || riskLevelFilter !== 'all' || statusFilter !== 'all' || vesselFilter !== 'all' || sortBy !== 'riskLevel';

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/risk-assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRisks(response.data);
    } catch (err) {
      setError('Failed to fetch risk assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedRisk(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (risk) => {
    setSelectedRisk(risk);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleView = (risk) => {
    setSelectedRisk(risk);
    setDetailsOpen(true);
  };

  const handleSave = async (riskData) => {
    try {
      const token = localStorage.getItem('token');
      if (formMode === 'create') {
        await axios.post(`${API}/risk-assessments`, riskData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Risk assessment created successfully');
      } else {
        await axios.put(`${API}/risk-assessments/${selectedRisk.id}`, riskData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Risk assessment updated successfully');
      }
      setFormOpen(false);
      fetchRisks();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving risk assessment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (risk) => {
    if (!window.confirm(`Delete risk assessment: ${risk.activity_task}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/risk-assessments/${risk.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Risk assessment deleted successfully');
      fetchRisks();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting risk assessment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      'Critical': 'bg-red-600 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-white',
      'Low': 'bg-green-500 text-white',
      'Very Low': 'bg-blue-500 text-white'
    };
    return colors[level] || 'bg-gray-500 text-white';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800',
      'Under Review': 'bg-yellow-100 text-yellow-800',
      'Archived': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const canEdit = user?.access_level === 'Edit' || user?.access_level === 'Full';
  const canDelete = user?.access_level === 'Full';

  // Get unique vessels for filter
  const uniqueVessels = [...new Set(risks.map(r => r.vessel_name).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading risk assessments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Assessment</h1>
          <p className="text-gray-500 mt-1">Identify, assess, and manage operational risks</p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            New Risk Assessment
          </Button>
        )}
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
          onClick={() => {
            clearFilters();
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Risks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{risks.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => {
            setRiskLevelFilter('Critical');
            setStatusFilter('all');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Critical</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-red-600">
              {risks.filter(r => r.risk_level === 'Critical').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => {
            setRiskLevelFilter('High');
            setStatusFilter('all');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">High</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-orange-600">
              {risks.filter(r => r.risk_level === 'High').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => {
            setRiskLevelFilter('all');
            setStatusFilter('Active');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Active</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-600">
              {risks.filter(r => r.status === 'Active').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by activity, location, vessel, or hazard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="w-full md:w-48">
                <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Risk Level" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under review">Under Review</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-44">
                <Select value={vesselFilter} onValueChange={setVesselFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vessel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vessels</SelectItem>
                    {uniqueVessels.map(vessel => (
                      <SelectItem key={vessel} value={vessel}>{vessel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="riskLevel">Risk Level (High to Low)</SelectItem>
                    <SelectItem value="activity">Activity Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="vessel">Vessel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredRisks.length} of {risks.length} risk assessments
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessments List */}
      {filteredRisks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Risk Assessments</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || hasActiveFilters ? 'Try adjusting your search or filters' : 'Get started by creating your first risk assessment'}
              </p>
              {canEdit && !searchQuery && !hasActiveFilters && (
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Risk Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRisks.map((risk) => (
            <Card key={risk.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{risk.activity_task}</CardTitle>
                      <Badge className={getRiskLevelColor(risk.risk_level)}>
                        {risk.risk_level}
                      </Badge>
                      <Badge className={getStatusColor(risk.status)}>
                        {risk.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {risk.location && `Location: ${risk.location}`}
                      {risk.vessel_name && ` • Vessel: ${risk.vessel_name}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleView(risk)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(risk)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(risk)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Hazard:</span>
                    <p className="text-gray-600 mt-1">{risk.hazard || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Risk Rating:</span>
                    <p className="text-gray-600 mt-1">
                      Likelihood: {risk.likelihood || 'N/A'} • Consequence: {risk.consequence || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Review Date:</span>
                    <p className="text-gray-600 mt-1">
                      {risk.review_date ? new Date(risk.review_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
                {risk.control_measures && (
                  <div className="mt-3">
                    <span className="font-medium text-gray-700 text-sm">Control Measures:</span>
                    <p className="text-gray-600 text-sm mt-1">{risk.control_measures}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RiskAssessmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        risk={selectedRisk}
        mode={formMode}
      />

      <RiskAssessmentDetails
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        risk={selectedRisk}
      />
    </div>
  );
};

export default RiskAssessment;
