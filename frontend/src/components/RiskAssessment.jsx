import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard } from '@/components/ui/summary-card';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, AlertTriangle, Eye, Search, Filter, X, Download, ChevronDown, Info, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import RiskAssessmentForm from './RiskAssessmentForm';
import RiskAssessmentDetails from './RiskAssessmentDetails';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RiskAssessment = () => {
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskLevels, setRiskLevels] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [sortBy, setSortBy] = useState('riskLevel');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [user, setUser] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Use custom hook for advanced filtering
  const {
    filters,
    setFilters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters: clearAllFiltersHook
  } = useAdvancedFilters({
    risk_levels: [],
    statuses: [],
    start_date: '',
    end_date: '',
    overdue: false
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchRisks();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filters, sortBy, risks]);

  const applyFiltersAndSort = () => {
    let filtered = [...risks];
    if (searchQuery) {
      filtered = filtered.filter(risk =>
        risk.activity_task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.hazard?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filters.risk_levels.length > 0) {
      filtered = filtered.filter(risk => filters.risk_levels.includes(risk.risk_level));
    }
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(risk => filters.statuses.includes(risk.status));
    }
    // Filter overdue risks
    if (filters.overdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(risk => {
        const reviewDate = risk.review_date ? new Date(risk.review_date) : null;
        const nextRiskDate = risk.next_risk_date ? new Date(risk.next_risk_date) : null;
        return (reviewDate && reviewDate < today) || (nextRiskDate && nextRiskDate < today);
      });
    }
    if (filters.start_date || filters.end_date) {
      filtered = filtered.filter(risk => {
        if (!risk.assessment_date) return false;
        const riskDate = new Date(risk.assessment_date);
        const startDate = filters.start_date ? new Date(filters.start_date) : null;
        const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59') : null;
        if (startDate && riskDate < startDate) return false;
        if (endDate && riskDate > endDate) return false;
        return true;
      });
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'riskLevel':
          const riskOrder = { 'Critical': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Very Low': 1 };
          return (riskOrder[b.risk_level] || 0) - (riskOrder[a.risk_level] || 0);
        case 'activity': return (a.activity_task || '').localeCompare(b.activity_task || '');
        case 'date': return new Date(b.assessment_date || 0) - new Date(a.assessment_date || 0);
        case 'vessel': return (a.vessel_name || '').localeCompare(b.vessel_name || '');
        default: return 0;
      }
    });
    setFilteredRisks(filtered);
  };

  const clearAllFilters = () => { 
    setSearchQuery(''); 
    clearAllFiltersHook(); 
  };

  const exportToExcel = () => {
    if (filteredRisks.length === 0) { setError('No risks to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Activity/Task', 'Vessel', 'Hazard', 'Risk Level', 'Status', 'Controls', 'Responsible Person', 'Assessment Date', 'Review Date'];
    const data = [headers, ...filteredRisks.map(r => [
      r.activity_task || '-', r.vessel_name || '-', r.hazard || '-', r.risk_level || '-', r.status || '-',
      r.controls || '-', r.responsible_person || '-',
      r.assessment_date ? new Date(r.assessment_date).toLocaleDateString() : '-',
      r.review_date ? new Date(r.review_date).toLocaleDateString() : '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Risk Assessments');
    XLSX.writeFile(wb, `risk_assessment_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredRisks.length} risk assessments to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Import from Excel handler
  const handleImport = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const riskData = {
            title: row['Title'] || row['title'] || '',
            category: row['Category'] || row['category'] || '',
            risk_level: row['Risk Level'] || row['risk_level'] || 'Low',
            status: row['Status'] || row['status'] || 'Active',
            description: row['Description'] || row['description'] || '',
            controls: row['Controls'] || row['controls'] || '',
            likelihood: row['Likelihood'] || row['likelihood'] || 'Unlikely',
            consequence: row['Consequence'] || row['consequence'] || 'Minor',
          };

          if (!riskData.title) continue;

          await axios.post(`${API}/risk-assessments`, riskData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error('Error importing risk:', err);
          errorCount++;
        }
      }

      setMessage(`Import complete: ${successCount} risks added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchRisks();
    } catch (err) {
      setError('Error importing data: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const riskImportColumns = ['Title', 'Category', 'Risk Level', 'Status', 'Description', 'Controls', 'Likelihood', 'Consequence'];
  const riskImportSample = [['Fire Hazard', 'Safety', 'High', 'Active', 'Risk of fire in engine room', 'Fire suppression system installed', 'Possible', 'Major']];

  const clearFilters = () => {
    setSearchQuery('');
    clearAllFilters();
    setSortBy('riskLevel');
  };

  const hasActiveFilters = searchQuery || filters.risk_levels.length > 0 || filters.statuses.length > 0 || filters.start_date || filters.end_date || sortBy !== 'riskLevel';

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/risk-assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRisks(response.data);
      const uniqueLevels = [...new Set(response.data.map(r => r.risk_level).filter(Boolean))];
      const uniqueStatuses = [...new Set(response.data.map(r => r.status).filter(Boolean))];
      setRiskLevels(uniqueLevels);
      setStatuses(uniqueStatuses);
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Risk Assessment</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-blue-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-semibold mb-1">AMSA Marine Order 504 (2024)</p>
                  <p className="text-sm mb-2">
                    Requires a documented Safety Management System (SMS) that identifies, assesses, and manages risks to vessel safety, people, and the environment.
                  </p>
                  <a 
                    href="https://www.amsa.gov.au/about/regulations-and-standards/marine-order-504-certificates-operation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    View AMSA MO504 Regulations →
                  </a>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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

      {/* Statistics Cards - Redesigned: Active, In Progress, Critical, Overdue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          value={risks.filter(r => r.status === 'Active').length}
          label="Active"
          description="Currently monitored"
          color="green"
          onClick={() => setFilters(prev => ({...prev, risk_levels: [], statuses: ['Active'], overdue: false}))}
        />
        <SummaryCard
          value={risks.filter(r => r.status === 'Under Review').length}
          label="In Progress"
          description="Under review"
          color="blue"
          onClick={() => setFilters(prev => ({...prev, risk_levels: [], statuses: ['Under Review'], overdue: false}))}
        />
        <SummaryCard
          value={risks.filter(r => r.risk_level === 'Critical').length}
          label="Critical"
          description="Requires attention"
          color="red"
          onClick={() => setFilters(prev => ({...prev, risk_levels: ['Critical'], statuses: [], overdue: false}))}
        />
        <SummaryCard
          value={(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return risks.filter(r => {
              const reviewDate = r.review_date ? new Date(r.review_date) : null;
              const nextRiskDate = r.next_risk_date ? new Date(r.next_risk_date) : null;
              return (reviewDate && reviewDate < today) || (nextRiskDate && nextRiskDate < today);
            }).length;
          })()}
          label="Overdue"
          description="Past review date"
          color="orange"
          onClick={() => setFilters(prev => ({...prev, risk_levels: [], statuses: [], overdue: true}))}
        />
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
              <Download className="h-4 w-4" />Import from Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <FileSpreadsheet className="h-4 w-4" />Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(filters.risk_levels.length > 0 || filters.statuses.length > 0 || filters.start_date || filters.end_date || searchQuery) && (
              <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={clearAllFilters}><X className="h-4 w-4 mr-2" />Clear All Filters</Button></div>
            )}
            <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by activity, location, vessel, or hazard..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Risk Level</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="truncate">{filters.risk_levels.length === 0 ? 'All Levels' : filters.risk_levels.length === 1 ? filters.risk_levels[0] : `${filters.risk_levels.length} selected`}</span><ChevronDown className="h-4 w-4 ml-2 shrink-0" /></Button></PopoverTrigger><PopoverContent className="w-64 p-0" align="start"><div className="p-2"><div className="flex items-center justify-between px-2 py-1.5 mb-1"><span className="text-sm font-medium">Select Levels</span>{filters.risk_levels.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('risk_levels')} className="h-auto p-1 text-xs">Clear</Button>)}</div>{riskLevels.map(lvl => (<div key={lvl} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('risk_levels', lvl)}><Checkbox checked={filters.risk_levels.includes(lvl)} onCheckedChange={() => toggleFilter('risk_levels', lvl)} /><label className="text-sm flex-1 cursor-pointer">{lvl}</label></div>))}</div></PopoverContent></Popover>
                {filters.risk_levels.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.risk_levels.map(lvl => (<Badge key={lvl} variant="secondary" className="text-xs">{lvl}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('risk_levels', lvl)} /></Badge>))}</div>)}
              </div>
              <div><Label>Status</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="truncate">{filters.statuses.length === 0 ? 'All Status' : filters.statuses.length === 1 ? filters.statuses[0] : `${filters.statuses.length} selected`}</span><ChevronDown className="h-4 w-4 ml-2 shrink-0" /></Button></PopoverTrigger><PopoverContent className="w-64 p-0" align="start"><div className="p-2"><div className="flex items-center justify-between px-2 py-1.5 mb-1"><span className="text-sm font-medium">Select Status</span>{filters.statuses.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('statuses')} className="h-auto p-1 text-xs">Clear</Button>)}</div>{statuses.map(st => (<div key={st} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('statuses', st)}><Checkbox checked={filters.statuses.includes(st)} onCheckedChange={() => toggleFilter('statuses', st)} /><label className="text-sm flex-1 cursor-pointer">{st}</label></div>))}</div></PopoverContent></Popover>
                {filters.statuses.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.statuses.map(st => (<Badge key={st} variant="secondary" className="text-xs">{st}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('statuses', st)} /></Badge>))}</div>)}
              </div>
              <div><Label>Sort By</Label><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="riskLevel">Risk Level (High to Low)</SelectItem><SelectItem value="activity">Activity Name</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="vessel">Vessel</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div><Label htmlFor="start_date">From Date</Label><Input id="start_date" type="date" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} /></div>
              <div><Label htmlFor="end_date">To Date</Label><Input id="end_date" type="date" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} /></div>
              <div>{(filters.start_date || filters.end_date) && (<Button variant="outline" size="sm" onClick={clearDateFilters} className="w-full"><X className="h-4 w-4 mr-2" />Clear Date Range</Button>)}</div>
            </div>
            <div className="text-sm text-gray-500">Showing {filteredRisks.length} of {risks.length} risk assessments</div>
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
