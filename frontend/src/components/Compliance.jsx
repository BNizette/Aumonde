import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, Plus, AlertTriangle, CheckCircle, Clock, Search, Filter, X, Download, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Compliance = () => {
  const [certificates, setCertificates] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filter states for Certificates
  const [certSearch, setCertSearch] = useState('');
  const [certSort, setCertSort] = useState('expiry');
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [certTypes, setCertTypes] = useState([]);
  const [certStatuses, setCertStatuses] = useState([]);
  const [certFilters, setCertFilters] = useState({
    types: [],
    statuses: [],
    start_date: '',
    end_date: ''
  });

  // Filter states for Requirements
  const [reqSearch, setReqSearch] = useState('');
  const [reqSort, setReqSort] = useState('category');
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [reqCategories, setReqCategories] = useState([]);
  const [reqStatuses, setReqStatuses] = useState([]);
  const [reqFilters, setReqFilters] = useState({
    categories: [],
    statuses: [],
    start_date: '',
    end_date: ''
  });

  const [certForm, setCertForm] = useState({
    certificate_type: 'Vessel Certificate',
    certificate_name: '',
    certificate_number: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    vessel_id: '',
    vessel_name: '',
    crew_id: '',
    crew_name: '',
    notes: ''
  });

  const [reqForm, setReqForm] = useState({
    requirement_name: '',
    category: 'Safety',
    description: '',
    regulatory_reference: '',
    compliance_status: 'Under Review',
    responsible_person: '',
    notes: ''
  });

  const certTypesOptions = ['Vessel Certificate', 'Crew Certificate', 'Company Certificate'];
  const categories = ['Safety', 'Environmental', 'Operational', 'Administrative'];
  const statusOptions = ['Compliant', 'Non-Compliant', 'Partial', 'Under Review'];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyCertFilters();
  }, [certSearch, certFilters, certSort, certificates]);

  useEffect(() => {
    applyReqFilters();
  }, [reqSearch, reqFilters, reqSort, requirements]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [certsRes, reqsRes, vesselsRes, crewRes] = await Promise.all([
        axios.get(`${API}/compliance/certificates`, { headers }),
        axios.get(`${API}/compliance/requirements`, { headers }),
        axios.get(`${API}/vessels`, { headers }),
        axios.get(`${API}/crew`, { headers })
      ]);

      setCertificates(certsRes.data);
      setRequirements(reqsRes.data);
      setVessels(vesselsRes.data);
      setCrew(crewRes.data);
      
      // Extract unique values for filters
      const uniqueCertTypes = [...new Set(certsRes.data.map(c => c.certificate_type).filter(Boolean))];
      const uniqueCertStatuses = ['valid', 'expiring', 'expired'];
      const uniqueReqCategories = [...new Set(reqsRes.data.map(r => r.category).filter(Boolean))];
      const uniqueReqStatuses = [...new Set(reqsRes.data.map(r => r.compliance_status).filter(Boolean))];
      
      setCertTypes(uniqueCertTypes);
      setCertStatuses(uniqueCertStatuses);
      setReqCategories(uniqueReqCategories);
      setReqStatuses(uniqueReqStatuses);
    } catch (err) {
      setError('Error fetching compliance data');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for Certificates
  const applyCertFilters = () => {
    let filtered = [...certificates];

    if (certSearch) {
      filtered = filtered.filter(cert =>
        cert.certificate_name?.toLowerCase().includes(certSearch.toLowerCase()) ||
        cert.certificate_number?.toLowerCase().includes(certSearch.toLowerCase()) ||
        cert.issuing_authority?.toLowerCase().includes(certSearch.toLowerCase()) ||
        cert.vessel_name?.toLowerCase().includes(certSearch.toLowerCase()) ||
        cert.crew_name?.toLowerCase().includes(certSearch.toLowerCase())
      );
    }

    // Apply multi-select type filter
    if (certFilters.types.length > 0) {
      filtered = filtered.filter(cert => certFilters.types.includes(cert.certificate_type));
    }

    // Apply multi-select status filter
    if (certFilters.statuses.length > 0) {
      const now = new Date();
      filtered = filtered.filter(cert => {
        const expiryDate = cert.expiry_date ? new Date(cert.expiry_date) : null;
        return certFilters.statuses.some(status => {
          if (status === 'expired') {
            return expiryDate && expiryDate < now;
          } else if (status === 'expiring') {
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return expiryDate && expiryDate >= now && expiryDate <= thirtyDaysFromNow;
          } else if (status === 'valid') {
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return expiryDate && expiryDate > thirtyDaysFromNow;
          }
          return false;
        });
      });
    }

    // Apply date range filter (issue date)
    if (certFilters.start_date || certFilters.end_date) {
      filtered = filtered.filter(cert => {
        if (!cert.issue_date) return false;
        const issueDate = new Date(cert.issue_date);
        const startDate = certFilters.start_date ? new Date(certFilters.start_date) : null;
        const endDate = certFilters.end_date ? new Date(certFilters.end_date + 'T23:59:59') : null;

        if (startDate && issueDate < startDate) return false;
        if (endDate && issueDate > endDate) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      switch (certSort) {
        case 'expiry':
          return new Date(a.expiry_date || 0) - new Date(b.expiry_date || 0);
        case 'name':
          return (a.certificate_name || '').localeCompare(b.certificate_name || '');
        case 'type':
          return (a.certificate_type || '').localeCompare(b.certificate_type || '');
        default:
          return 0;
      }
    });

    setFilteredCertificates(filtered);
  };

  // Filter logic for Requirements
  const applyReqFilters = () => {
    let filtered = [...requirements];

    if (reqSearch) {
      filtered = filtered.filter(req =>
        req.requirement_name?.toLowerCase().includes(reqSearch.toLowerCase()) ||
        req.description?.toLowerCase().includes(reqSearch.toLowerCase()) ||
        req.regulatory_reference?.toLowerCase().includes(reqSearch.toLowerCase())
      );
    }

    // Apply multi-select category filter
    if (reqFilters.categories.length > 0) {
      filtered = filtered.filter(req => reqFilters.categories.includes(req.category));
    }

    // Apply multi-select status filter
    if (reqFilters.statuses.length > 0) {
      filtered = filtered.filter(req => reqFilters.statuses.includes(req.compliance_status));
    }

    // Apply date range filter (created_at)
    if (reqFilters.start_date || reqFilters.end_date) {
      filtered = filtered.filter(req => {
        if (!req.created_at) return false;
        const createdDate = new Date(req.created_at);
        const startDate = reqFilters.start_date ? new Date(reqFilters.start_date) : null;
        const endDate = reqFilters.end_date ? new Date(reqFilters.end_date + 'T23:59:59') : null;

        if (startDate && createdDate < startDate) return false;
        if (endDate && createdDate > endDate) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      switch (reqSort) {
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'name':
          return (a.requirement_name || '').localeCompare(b.requirement_name || '');
        case 'status':
          return (a.compliance_status || '').localeCompare(b.compliance_status || '');
        default:
          return 0;
      }
    });

    setFilteredRequirements(filtered);
  };

  // Toggle functions for multi-select filters
  const toggleCertFilter = (filterType, value) => {
    setCertFilters(prev => {
      const currentArray = prev[filterType];
      const isSelected = currentArray.includes(value);
      return {
        ...prev,
        [filterType]: isSelected
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value]
      };
    });
  };

  const toggleReqFilter = (filterType, value) => {
    setReqFilters(prev => {
      const currentArray = prev[filterType];
      const isSelected = currentArray.includes(value);
      return {
        ...prev,
        [filterType]: isSelected
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value]
      };
    });
  };

  const clearCertFilterType = (filterType) => {
    setCertFilters(prev => ({ ...prev, [filterType]: [] }));
  };

  const clearReqFilterType = (filterType) => {
    setReqFilters(prev => ({ ...prev, [filterType]: [] }));
  };

  const exportCertificatesToCSV = () => {
    if (filteredCertificates.length === 0) { setError('No certificates to export'); setTimeout(() => setError(''), 3000); return; }
    const headers = ['ID', 'Certificate Name', 'Certificate Number', 'Type', 'Issuing Authority', 'Issue Date', 'Expiry Date', 'Vessel Name', 'Crew Name', 'Status', 'Created At'];
    const csvRows = [headers.join(','), ...filteredCertificates.map(c => [
      `"${c.id || ''}"`, `"${(c.certificate_name || '').replace(/"/g, '""')}"`, `"${c.certificate_number || ''}"`,
      `"${c.certificate_type || ''}"`, `"${(c.issuing_authority || '').replace(/"/g, '""')}"`,
      `"${c.issue_date ? new Date(c.issue_date).toLocaleDateString() : ''}"`,
      `"${c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : ''}"`,
      `"${(c.vessel_name || '').replace(/"/g, '""')}"`, `"${(c.crew_name || '').replace(/"/g, '""')}"`,
      `"${c.status || ''}"`, `"${c.created_at ? new Date(c.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `certificates_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Exported ${filteredCertificates.length} certificates to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportRequirementsToCSV = () => {
    if (filteredRequirements.length === 0) { setError('No requirements to export'); setTimeout(() => setError(''), 3000); return; }
    const headers = ['ID', 'Requirement Name', 'Category', 'Description', 'Regulatory Reference', 'Compliance Status', 'Responsible Person', 'Notes', 'Created At'];
    const csvRows = [headers.join(','), ...filteredRequirements.map(r => [
      `"${r.id || ''}"`, `"${(r.requirement_name || '').replace(/"/g, '""')}"`, `"${r.category || ''}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`, `"${(r.regulatory_reference || '').replace(/"/g, '""')}"`,
      `"${r.compliance_status || ''}"`, `"${(r.responsible_person || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`, `"${r.created_at ? new Date(r.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `requirements_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Exported ${filteredRequirements.length} requirements to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearCertFilters = () => {
    setCertSearch('');
    setCertFilters({types: [], statuses: [], start_date: '', end_date: ''});
  };

  const clearReqFilters = () => {
    setReqSearch('');
    setReqFilters({categories: [], statuses: [], start_date: '', end_date: ''});
  };

  const hasActiveCertFilters = certSearch || certFilters.types.length > 0 || certFilters.statuses.length > 0 || certFilters.start_date || certFilters.end_date;
  const hasActiveReqFilters = reqSearch || reqFilters.categories.length > 0 || reqFilters.statuses.length > 0 || reqFilters.start_date || reqFilters.end_date;

  const handleCertSubmit = async () => {
    if (!certForm.certificate_name || !certForm.expiry_date) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/compliance/certificates`, certForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Certificate added successfully');
      setCertDialogOpen(false);
      resetCertForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving certificate');
    }
  };

  const handleReqSubmit = async () => {
    if (!reqForm.requirement_name || !reqForm.description) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/compliance/requirements`, reqForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Requirement added successfully');
      setReqDialogOpen(false);
      resetReqForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving requirement');
    }
  };

  const resetCertForm = () => {
    setCertForm({
      certificate_type: 'Vessel Certificate',
      certificate_name: '',
      certificate_number: '',
      issuing_authority: '',
      issue_date: '',
      expiry_date: '',
      vessel_id: '',
      vessel_name: '',
      crew_id: '',
      crew_name: '',
      notes: ''
    });
  };

  const resetReqForm = () => {
    setReqForm({
      requirement_name: '',
      category: 'Safety',
      description: '',
      regulatory_reference: '',
      compliance_status: 'Under Review',
      responsible_person: '',
      notes: ''
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Valid': 'bg-green-100 text-green-800',
      'Expiring Soon': 'bg-yellow-100 text-yellow-800',
      'Expired': 'bg-red-100 text-red-800',
      'Suspended': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getComplianceColor = (status) => {
    const colors = {
      'Compliant': 'bg-green-100 text-green-800',
      'Non-Compliant': 'bg-red-100 text-red-800',
      'Partial': 'bg-yellow-100 text-yellow-800',
      'Under Review': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  // Count statistics
  const validCerts = certificates.filter(c => c.status === 'Valid').length;
  const expiringSoon = certificates.filter(c => c.status === 'Expiring Soon').length;
  const expired = certificates.filter(c => c.status === 'Expired').length;
  const compliant = requirements.filter(r => r.compliance_status === 'Compliant').length;
  const nonCompliant = requirements.filter(r => r.compliance_status === 'Non-Compliant').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Compliance Management</h2>
        <p className="text-gray-500 mt-1">Track certificates and regulatory compliance</p>
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

      {/* Statistics - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setCertFilters({...certFilters, statuses: ['valid']})}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{validCerts}</div>
              <div className="text-sm text-gray-600">Valid</div>
              <p className="text-xs text-gray-400 mt-1">Click to filter</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setCertFilters({...certFilters, statuses: ['expiring']})}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{expiringSoon}</div>
              <div className="text-sm text-gray-600">Expiring Soon</div>
              <p className="text-xs text-gray-400 mt-1">Click to filter</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setCertFilters({...certFilters, statuses: ['expired']})}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{expired}</div>
              <div className="text-sm text-gray-600">Expired</div>
              <p className="text-xs text-gray-400 mt-1">Click to filter</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setReqFilters({...reqFilters, statuses: ['Compliant']})}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{compliant}</div>
              <div className="text-sm text-gray-600">Compliant</div>
              <p className="text-xs text-gray-400 mt-1">Click to filter</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setReqFilters({...reqFilters, statuses: ['Non-Compliant']})}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{nonCompliant}</div>
              <div className="text-sm text-gray-600">Non-Compliant</div>
              <p className="text-xs text-gray-400 mt-1">Click to filter</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="certificates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="certificates">Certificates ({certificates.length})</TabsTrigger>
          <TabsTrigger value="requirements">Requirements ({requirements.length})</TabsTrigger>
        </TabsList>

        {/* CERTIFICATES TAB */}
        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Certificates
                  </CardTitle>
                  <CardDescription>Track certification status and expiry dates</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportCertificatesToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button onClick={() => setCertDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Certificate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                {/* Clear All Filters Button */}
                {hasActiveCertFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearCertFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search certificates by name, number, authority, vessel, or crew..."
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Multi-Select Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Certificate Type Multi-Select */}
                  <div>
                    <Label>Certificate Type</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {certFilters.types.length === 0
                              ? 'All Types'
                              : certFilters.types.length === 1
                              ? certFilters.types[0]
                              : `${certFilters.types.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Types</span>
                            {certFilters.types.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearCertFilterType('types')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {certTypes.map(type => (
                            <div
                              key={type}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleCertFilter('types', type)}
                            >
                              <Checkbox
                                checked={certFilters.types.includes(type)}
                                onCheckedChange={() => toggleCertFilter('types', type)}
                              />
                              <span className="text-sm">{type}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Certificate Status Multi-Select */}
                  <div>
                    <Label>Status</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {certFilters.statuses.length === 0
                              ? 'All Statuses'
                              : certFilters.statuses.length === 1
                              ? certFilters.statuses[0].charAt(0).toUpperCase() + certFilters.statuses[0].slice(1)
                              : `${certFilters.statuses.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Statuses</span>
                            {certFilters.statuses.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearCertFilterType('statuses')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {['valid', 'expiring', 'expired'].map(status => (
                            <div
                              key={status}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleCertFilter('statuses', status)}
                            >
                              <Checkbox
                                checked={certFilters.statuses.includes(status)}
                                onCheckedChange={() => toggleCertFilter('statuses', status)}
                              />
                              <span className="text-sm">
                                {status === 'valid' ? 'Valid (30+ days)' : 
                                 status === 'expiring' ? 'Expiring Soon (30 days)' : 'Expired'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Date Range Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Date From</Label>
                    <Input
                      type="date"
                      value={certFilters.start_date}
                      onChange={(e) => setCertFilters({...certFilters, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Issue Date To</Label>
                    <Input
                      type="date"
                      value={certFilters.end_date}
                      onChange={(e) => setCertFilters({...certFilters, end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredCertificates.length} of {certificates.length} certificates
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {filteredCertificates.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {certificates.length === 0 ? 'No certificates added yet' : 'No certificates match your filters'}
                  </p>
                ) : (
                  filteredCertificates.map((cert) => {
                    const daysUntilExpiry = getDaysUntilExpiry(cert.expiry_date);
                    return (
                      <div key={cert.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{cert.certificate_name}</h3>
                              <Badge className={getStatusColor(cert.status)}>{cert.status}</Badge>
                              {cert.certificate_number && <Badge variant="outline">{cert.certificate_number}</Badge>}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Type:</strong> {cert.certificate_type}</p>
                              <p><strong>Issuing Authority:</strong> {cert.issuing_authority}</p>
                              <p><strong>Issue Date:</strong> {new Date(cert.issue_date).toLocaleDateString()}</p>
                              <p><strong>Expiry Date:</strong> {new Date(cert.expiry_date).toLocaleDateString()}</p>
                              {daysUntilExpiry > 0 ? (
                                <p className={daysUntilExpiry <= 30 ? 'text-orange-600 font-semibold' : 'text-green-600'}>
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {daysUntilExpiry} days until expiry
                                </p>
                              ) : (
                                <p className="text-red-600 font-semibold">
                                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                                  Expired {Math.abs(daysUntilExpiry)} days ago
                                </p>
                              )}
                              {cert.vessel_name && <p><strong>Vessel:</strong> {cert.vessel_name}</p>}
                              {cert.crew_name && <p><strong>Crew:</strong> {cert.crew_name}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REQUIREMENTS TAB */}
        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Compliance Requirements
                  </CardTitle>
                  <CardDescription>Regulatory and operational compliance tracking</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportRequirementsToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button onClick={() => setReqDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Requirement
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                {/* Clear All Filters Button */}
                {hasActiveReqFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearReqFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search requirements by name, description, or reference..."
                    value={reqSearch}
                    onChange={(e) => setReqSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Multi-Select Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Multi-Select */}
                  <div>
                    <Label>Category</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {reqFilters.categories.length === 0
                              ? 'All Categories'
                              : reqFilters.categories.length === 1
                              ? reqFilters.categories[0]
                              : `${reqFilters.categories.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Categories</span>
                            {reqFilters.categories.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearReqFilterType('categories')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {reqCategories.map(category => (
                            <div
                              key={category}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleReqFilter('categories', category)}
                            >
                              <Checkbox
                                checked={reqFilters.categories.includes(category)}
                                onCheckedChange={() => toggleReqFilter('categories', category)}
                              />
                              <span className="text-sm">{category}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Status Multi-Select */}
                  <div>
                    <Label>Compliance Status</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {reqFilters.statuses.length === 0
                              ? 'All Statuses'
                              : reqFilters.statuses.length === 1
                              ? reqFilters.statuses[0]
                              : `${reqFilters.statuses.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Statuses</span>
                            {reqFilters.statuses.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearReqFilterType('statuses')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {reqStatuses.map(status => (
                            <div
                              key={status}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleReqFilter('statuses', status)}
                            >
                              <Checkbox
                                checked={reqFilters.statuses.includes(status)}
                                onCheckedChange={() => toggleReqFilter('statuses', status)}
                              />
                              <span className="text-sm">{status}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Date Range Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Created Date From</Label>
                    <Input
                      type="date"
                      value={reqFilters.start_date}
                      onChange={(e) => setReqFilters({...reqFilters, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Created Date To</Label>
                    <Input
                      type="date"
                      value={reqFilters.end_date}
                      onChange={(e) => setReqFilters({...reqFilters, end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredRequirements.length} of {requirements.length} requirements
                  </p>
                  {hasActiveReqFilters && (
                    <Button variant="outline" size="sm" onClick={clearReqFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {filteredRequirements.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {requirements.length === 0 ? 'No requirements added yet' : 'No requirements match your filters'}
                  </p>
                ) : (
                  filteredRequirements.map((req) => (
                    <div key={req.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{req.requirement_name}</h3>
                        <Badge className={getComplianceColor(req.compliance_status)}>{req.compliance_status}</Badge>
                        <Badge variant="outline">{req.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{req.description}</p>
                      {req.regulatory_reference && (
                        <p className="text-sm text-gray-600"><strong>Reference:</strong> {req.regulatory_reference}</p>
                      )}
                      {req.responsible_person && (
                        <p className="text-sm text-gray-600"><strong>Responsible:</strong> {req.responsible_person}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certificate Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Certificate</DialogTitle>
            <DialogDescription>Add a new compliance certificate</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Certificate Type *</Label>
              <Select value={certForm.certificate_type} onValueChange={(value) => setCertForm({...certForm, certificate_type: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {certTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Certificate Name *</Label>
              <Input value={certForm.certificate_name} onChange={(e) => setCertForm({...certForm, certificate_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Certificate Number</Label>
                <Input value={certForm.certificate_number} onChange={(e) => setCertForm({...certForm, certificate_number: e.target.value})} />
              </div>
              <div>
                <Label>Issuing Authority *</Label>
                <Input value={certForm.issuing_authority} onChange={(e) => setCertForm({...certForm, issuing_authority: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date *</Label>
                <Input type="date" value={certForm.issue_date} onChange={(e) => setCertForm({...certForm, issue_date: e.target.value})} />
              </div>
              <div>
                <Label>Expiry Date *</Label>
                <Input type="date" value={certForm.expiry_date} onChange={(e) => setCertForm({...certForm, expiry_date: e.target.value})} />
              </div>
            </div>
            {certForm.certificate_type === 'Vessel Certificate' && (
              <div>
                <Label>Vessel (Optional)</Label>
                <Select value={certForm.vessel_id} onValueChange={(value) => {
                  const vessel = vessels.find(v => v.id === value);
                  setCertForm({...certForm, vessel_id: value, vessel_name: vessel?.vessel_name || ''});
                }}>
                  <SelectTrigger><SelectValue placeholder="Select vessel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vessels.map(v => <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {certForm.certificate_type === 'Crew Certificate' && (
              <div>
                <Label>Crew Member (Optional)</Label>
                <Select value={certForm.crew_id} onValueChange={(value) => {
                  const crewMember = crew.find(c => c.id === value);
                  setCertForm({...certForm, crew_id: value, crew_name: crewMember?.full_name || ''});
                }}>
                  <SelectTrigger><SelectValue placeholder="Select crew member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {crew.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={certForm.notes} onChange={(e) => setCertForm({...certForm, notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCertSubmit}>Add Certificate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requirement Dialog */}
      <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Compliance Requirement</DialogTitle>
            <DialogDescription>Add a new regulatory requirement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Requirement Name *</Label>
              <Input value={reqForm.requirement_name} onChange={(e) => setReqForm({...reqForm, requirement_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={reqForm.category} onValueChange={(value) => setReqForm({...reqForm, category: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Compliance Status *</Label>
                <Select value={reqForm.compliance_status} onValueChange={(value) => setReqForm({...reqForm, compliance_status: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea rows={4} value={reqForm.description} onChange={(e) => setReqForm({...reqForm, description: e.target.value})} />
            </div>
            <div>
              <Label>Regulatory Reference</Label>
              <Input value={reqForm.regulatory_reference} onChange={(e) => setReqForm({...reqForm, regulatory_reference: e.target.value})} placeholder="e.g., SOLAS Chapter III" />
            </div>
            <div>
              <Label>Responsible Person</Label>
              <Input value={reqForm.responsible_person} onChange={(e) => setReqForm({...reqForm, responsible_person: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReqSubmit}>Add Requirement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compliance;
