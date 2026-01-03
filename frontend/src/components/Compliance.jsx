import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { Shield, Plus, AlertTriangle, CheckCircle, Clock, Search, Filter, X, Download, ChevronDown, Edit, Trash2, Info, FileSpreadsheet, FileText, ExternalLink, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import HelpDialog from './HelpDialog';
import { SummaryCard } from '@/components/ui/summary-card';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
import FileUploadZone from './ui/file-upload-zone';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Compliance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.access_level === 'Admin' || currentUser.access_level === 'Full';
  const [certificates, setCertificates] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [crew, setCrew] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [certEditMode, setCertEditMode] = useState(false);
  const [reqEditMode, setReqEditMode] = useState(false);
  const [editingCertId, setEditingCertId] = useState(null);
  const [editingReqId, setEditingReqId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewDocumentDialogOpen, setViewDocumentDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [importCertDialogOpen, setImportCertDialogOpen] = useState(false);
  const [importReqDialogOpen, setImportReqDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('certificates');

  // Filter states for Certificates
  const [certSearch, setCertSearch] = useState('');
  const [certSort, setCertSort] = useState('expiry');
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [certTypes, setCertTypes] = useState([]);
  const [certStatuses, setCertStatuses] = useState([]);

  // Use custom hook for Certificate filters
  const {
    filters: certFilters,
    setFilters: setCertFilters,
    toggleFilter: toggleCertFilter,
    clearFilter: clearCertFilterType,
    clearAllFilters: clearAllCertFilters,
    setFilterValue: setCertFilterValue,
    updateFilters: updateCertFilters
  } = useAdvancedFilters({
    types: [],
    statuses: [],
    vessels: []
  });

  // Filter states for Requirements
  const [reqSearch, setReqSearch] = useState('');
  const [reqSort, setReqSort] = useState('category');
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [reqCategories, setReqCategories] = useState([]);
  const [reqStatuses, setReqStatuses] = useState([]);

  // Use custom hook for Requirement filters
  const {
    filters: reqFilters,
    setFilters: setReqFilters,
    toggleFilter: toggleReqFilter,
    clearFilter: clearReqFilterType,
    clearAllFilters: clearAllReqFilters,
    setFilterValue: setReqFilterValue,
    updateFilters: updateReqFilters
  } = useAdvancedFilters({
    categories: [],
    statuses: [],
    vessels: []
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
    notes: '',
    pdf_url: ''
  });
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [reqForm, setReqForm] = useState({
    requirement_name: '',
    category: 'Safety',
    description: '',
    regulatory_reference: '',
    linked_document_id: '',
    linked_document_name: '',
    vessel_ids: [],
    vessel_names: [],
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

  // Handle URL parameters for pre-filtering (e.g., from vessel details dialog)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vesselId = params.get('vessel_id');
    const vesselName = params.get('vessel_name');
    const tab = params.get('tab');
    
    // Set active tab if specified
    if (tab === 'certificates' || tab === 'requirements') {
      setActiveTab(tab);
    }
    
    // Apply vessel filter if specified
    if (vesselName && vessels.length > 0) {
      const decodedVesselName = decodeURIComponent(vesselName);
      setCertFilters(prev => ({
        ...prev,
        vessels: [decodedVesselName]
      }));
    } else if (vesselId && vessels.length > 0) {
      // Fallback to finding vessel by ID
      const vessel = vessels.find(v => v.id === vesselId);
      if (vessel) {
        setCertFilters(prev => ({
          ...prev,
          vessels: [vessel.vessel_name]
        }));
      }
    }
  }, [location.search, vessels]);

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

      const [certsRes, reqsRes, vesselsRes, crewRes, docsRes] = await Promise.all([
        axios.get(`${API}/compliance/certificates`, { headers }),
        axios.get(`${API}/compliance/requirements`, { headers }),
        axios.get(`${API}/vessels`, { headers }),
        axios.get(`${API}/crew`, { headers }),
        axios.get(`${API}/documents`, { headers })
      ]);

      setCertificates(certsRes.data);
      setRequirements(reqsRes.data);
      setVessels(vesselsRes.data);
      setCrew(crewRes.data);
      setDocuments(docsRes.data);
      
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

    // Apply vessel filter
    if (certFilters.vessels.length > 0) {
      filtered = filtered.filter(cert => certFilters.vessels.includes(cert.vessel_name));
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

    // Apply multi-select vessel filter
    if (reqFilters.vessels.length > 0) {
      filtered = filtered.filter(req => reqFilters.vessels.includes(req.vessel_name) || reqFilters.vessels.includes(req.vessel_id));
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

  // Import template columns matching export formats
  const certImportColumns = ['Certificate Name', 'Number', 'Type', 'Issuing Authority', 'Issue Date', 'Expiry Date', 'Vessel', 'Crew', 'Status'];
  const certImportSample = [['Safety Certificate', 'CERT-001', 'Safety', 'AMSA', '2024-01-01', '2025-01-01', 'MV Coral Queen', '', 'Valid']];

  const reqImportColumns = ['Requirement', 'Category', 'Regulator', 'Compliance Status', 'Last Review', 'Next Review', 'Notes'];
  const reqImportSample = [['Annual Survey', 'Safety', 'AMSA', 'Compliant', '2024-01-01', '2025-01-01', 'Required annually']];

  // Import handlers
  const handleImportCertificates = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0, errorCount = 0;
      for (const row of data) {
        try {
          const certData = {
            certificate_name: row['Certificate Name'] || '',
            certificate_number: row['Number'] || '',
            certificate_type: row['Type'] || '',
            issuing_authority: row['Issuing Authority'] || '',
            issue_date: row['Issue Date'] || '',
            expiry_date: row['Expiry Date'] || '',
            vessel_name: row['Vessel'] || '',
            crew_name: row['Crew'] || '',
            status: row['Status'] || 'Valid',
          };
          if (!certData.certificate_name) continue;
          await axios.post(`${API}/compliance/certificates`, certData, { headers: { Authorization: `Bearer ${token}` } });
          successCount++;
        } catch (err) { errorCount++; }
      }
      setMessage(`Import complete: ${successCount} certificates added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchCertificates();
    } catch (err) { setError('Error importing: ' + err.message); setTimeout(() => setError(''), 5000); }
  };

  const handleImportRequirements = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0, errorCount = 0;
      for (const row of data) {
        try {
          const reqData = {
            requirement: row['Requirement'] || '',
            category: row['Category'] || '',
            regulator: row['Regulator'] || '',
            compliance_status: row['Compliance Status'] || '',
            last_review: row['Last Review'] || '',
            next_review: row['Next Review'] || '',
            notes: row['Notes'] || '',
          };
          if (!reqData.requirement) continue;
          await axios.post(`${API}/compliance/requirements`, reqData, { headers: { Authorization: `Bearer ${token}` } });
          successCount++;
        } catch (err) { errorCount++; }
      }
      setMessage(`Import complete: ${successCount} requirements added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchRequirements();
    } catch (err) { setError('Error importing: ' + err.message); setTimeout(() => setError(''), 5000); }
  };

  const exportCertificatesToExcel = () => {
    if (filteredCertificates.length === 0) { setError('No certificates to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Certificate Name', 'Number', 'Type', 'Issuing Authority', 'Issue Date', 'Expiry Date', 'Vessel', 'Crew', 'Status'];
    const data = [headers, ...filteredCertificates.map(c => [
      c.certificate_name || '-', c.certificate_number || '-', c.certificate_type || '-', c.issuing_authority || '-',
      c.issue_date ? new Date(c.issue_date).toLocaleDateString() : '-',
      c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : '-',
      c.vessel_name || '-', c.crew_name || '-', c.status || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Certificates');
    XLSX.writeFile(wb, `certificates_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredCertificates.length} certificates to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportRequirementsToExcel = () => {
    if (filteredRequirements.length === 0) { setError('No requirements to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Requirement Name', 'Category', 'Description', 'Regulatory Reference', 'Compliance Status', 'Responsible Person', 'Notes'];
    const data = [headers, ...filteredRequirements.map(r => [
      r.requirement_name || '-', r.category || '-', r.description || '-', r.regulatory_reference || '-',
      r.compliance_status || '-', r.responsible_person || '-', r.notes || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Requirements');
    XLSX.writeFile(wb, `requirements_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredRequirements.length} requirements to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearCertFilters = () => {
    setCertSearch('');
    clearAllCertFilters();
  };

  const clearReqFilters = () => {
    setReqSearch('');
    clearAllReqFilters();
  };

  const hasActiveCertFilters = certSearch || certFilters.types.length > 0 || certFilters.statuses.length > 0 || certFilters.vessels.length > 0;
  const hasActiveReqFilters = reqSearch || reqFilters.categories.length > 0 || reqFilters.statuses.length > 0 || reqFilters.vessels.length > 0;

  const handleCertSubmit = async () => {
    if (!certForm.certificate_name || !certForm.expiry_date) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (certEditMode) {
        await axios.put(`${API}/compliance/certificates/${editingCertId}`, certForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Certificate updated successfully');
      } else {
        await axios.post(`${API}/compliance/certificates`, certForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Certificate added successfully');
      }
      setCertDialogOpen(false);
      setCertEditMode(false);
      setEditingCertId(null);
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
      if (reqEditMode) {
        await axios.put(`${API}/compliance/requirements/${editingReqId}`, reqForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Requirement updated successfully');
      } else {
        await axios.post(`${API}/compliance/requirements`, reqForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Requirement added successfully');
      }
      setReqDialogOpen(false);
      setReqEditMode(false);
      setEditingReqId(null);
      resetReqForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving requirement');
    }
  };

  // Edit handlers
  const handleEditCert = (cert) => {
    setCertForm({
      certificate_type: cert.certificate_type || 'Vessel Certificate',
      certificate_name: cert.certificate_name || '',
      certificate_number: cert.certificate_number || '',
      issuing_authority: cert.issuing_authority || '',
      issue_date: cert.issue_date ? new Date(cert.issue_date).toISOString().split('T')[0] : '',
      expiry_date: cert.expiry_date ? new Date(cert.expiry_date).toISOString().split('T')[0] : '',
      vessel_id: cert.vessel_id || '',
      vessel_name: cert.vessel_name || '',
      crew_id: cert.crew_id || '',
      crew_name: cert.crew_name || '',
      notes: cert.notes || '',
      pdf_url: cert.pdf_url || ''
    });
    setEditingCertId(cert.id);
    setCertEditMode(true);
    setCertDialogOpen(true);
  };

  const handleEditReq = (req) => {
    setReqForm({
      requirement_name: req.requirement_name || '',
      category: req.category || 'Safety',
      description: req.description || '',
      regulatory_reference: req.regulatory_reference || '',
      linked_document_id: req.linked_document_id || '',
      linked_document_name: req.linked_document_name || '',
      vessel_ids: req.vessel_ids || [],
      vessel_names: req.vessel_names || [],
      compliance_status: req.compliance_status || 'Under Review',
      responsible_person: req.responsible_person || '',
      notes: req.notes || ''
    });
    setEditingReqId(req.id);
    setReqEditMode(true);
    setReqDialogOpen(true);
  };

  // Delete handlers
  const handleDeleteCert = async (certId, certName) => {
    if (!window.confirm(`Are you sure you want to delete certificate "${certName}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/compliance/certificates/${certId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Certificate deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting certificate');
    }
  };

  const handleDeleteReq = async (reqId, reqName) => {
    if (!window.confirm(`Are you sure you want to delete requirement "${reqName}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/compliance/requirements/${reqId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Requirement deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting requirement');
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
      notes: '',
      pdf_url: ''
    });
    setCertEditMode(false);
    setEditingCertId(null);
  };

  const resetReqForm = () => {
    setReqForm({
      requirement_name: '',
      category: 'Safety',
      description: '',
      regulatory_reference: '',
      linked_document_id: '',
      linked_document_name: '',
      vessel_ids: [],
      vessel_names: [],
      compliance_status: 'Under Review',
      responsible_person: '',
      notes: ''
    });
    setReqEditMode(false);
    setEditingReqId(null);
  };

  const handleViewDocument = (docId) => {
    if (!docId) {
      setError('No document linked');
      return;
    }
    const doc = documents.find(d => d.id === docId || d._id === docId);
    if (doc) {
      setViewingDocument(doc);
      setViewDocumentDialogOpen(true);
    } else {
      setError('Document not found. It may have been deleted or the link is broken.');
      setTimeout(() => setError(''), 5000);
    }
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

  // Count statistics for Certificates tab (using same date-based logic as filter)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const validCerts = certificates.filter(c => {
    const expiryDate = c.expiry_date ? new Date(c.expiry_date) : null;
    return expiryDate && expiryDate > thirtyDaysFromNow;
  }).length;
  const expiringSoon = certificates.filter(c => {
    const expiryDate = c.expiry_date ? new Date(c.expiry_date) : null;
    return expiryDate && expiryDate >= now && expiryDate <= thirtyDaysFromNow;
  }).length;
  const expired = certificates.filter(c => {
    const expiryDate = c.expiry_date ? new Date(c.expiry_date) : null;
    return expiryDate && expiryDate < now;
  }).length;
  
  // Count certificate types
  const vesselCerts = certificates.filter(c => c.certificate_type === 'Vessel Certificate').length;
  const crewCerts = certificates.filter(c => c.certificate_type === 'Crew Certificate').length;
  const safetyEquipCerts = certificates.filter(c => c.certificate_type === 'Safety Equipment').length;
  const insuranceCerts = certificates.filter(c => c.certificate_type === 'Insurance').length;
  const otherCerts = certificates.filter(c => 
    c.certificate_type && 
    !['Vessel Certificate', 'Crew Certificate', 'Safety Equipment', 'Insurance'].includes(c.certificate_type)
  ).length;
  
  // Count statistics for Requirements tab
  const compliant = requirements.filter(r => r.compliance_status === 'Compliant').length;
  const nonCompliant = requirements.filter(r => r.compliance_status === 'Non-Compliant').length;
  const underReview = requirements.filter(r => r.compliance_status === 'Under Review').length;
  const partial = requirements.filter(r => r.compliance_status === 'Partial').length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold text-gray-900">Compliance Management</h2>
          <HelpDialog 
            moduleKey="compliance_management"
            title="Marine Order 504 (2024)"
            defaultContent="Ensures SMS compliance, certificate validity, documented procedures, and regulatory adherence for vessel operations and crew qualifications."
            defaultLink="https://www.amsa.gov.au/about/regulations-and-standards/marine-order-504-certificates-operation"
            defaultLinkText="View AMSA MO504 Regulations →"
            isAdmin={isAdmin}
          />
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="certificates">Certificates ({certificates.length})</TabsTrigger>
          <TabsTrigger value="requirements">Requirements ({requirements.length})</TabsTrigger>
        </TabsList>

        {/* CERTIFICATES TAB */}
        <TabsContent value="certificates">
          {/* Certificate Status Summary Cards - Total, Valid, Expiring Soon, Expired */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SummaryCard
              value={certificates.length}
              label="Total"
              description="All certificates"
              color="blue"
              onClick={() => updateCertFilters({ types: [], statuses: [], vessels: [], start_date: '', end_date: '' })}
            />
            <SummaryCard
              value={validCerts}
              label="Valid"
              description="30+ days remaining"
              color="green"
              onClick={() => updateCertFilters({ types: [], statuses: ['valid'], vessels: [], start_date: '', end_date: '' })}
            />
            <SummaryCard
              value={expiringSoon}
              label="Expiring Soon"
              description="Within 30 days"
              color="yellow"
              onClick={() => updateCertFilters({ types: [], statuses: ['expiring'], vessels: [], start_date: '', end_date: '' })}
            />
            <SummaryCard
              value={expired}
              label="Expired"
              description="Requires renewal"
              color="red"
              onClick={() => updateCertFilters({ types: [], statuses: ['expired'], vessels: [], start_date: '', end_date: '' })}
            />
          </div>

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
                  <Button variant="outline" onClick={() => setImportCertDialogOpen(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                    <Download className="mr-2 h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Button variant="outline" onClick={exportCertificatesToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export to Excel
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  {/* Vessel Multi-Select */}
                  <div>
                    <Label>Vessel</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {certFilters.vessels.length === 0
                              ? 'All Vessels'
                              : certFilters.vessels.length === 1
                              ? certFilters.vessels[0]
                              : `${certFilters.vessels.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Vessels</span>
                            {certFilters.vessels.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearCertFilterType('vessels')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {vessels.map(vessel => (
                            <div
                              key={vessel.id}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleCertFilter('vessels', vessel.vessel_name)}
                            >
                              <Checkbox
                                checked={certFilters.vessels.includes(vessel.vessel_name)}
                                onCheckedChange={() => toggleCertFilter('vessels', vessel.vessel_name)}
                              />
                              <span className="text-sm">{vessel.vessel_name}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {certFilters.vessels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {certFilters.vessels.map(vesselName => (
                          <Badge key={vesselName} variant="secondary" className="text-xs">
                            {vesselName}
                            <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleCertFilter('vessels', vesselName)} />
                          </Badge>
                        ))}
                      </div>
                    )}
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
                          <div className="flex gap-2 ml-4">
                            {cert.pdf_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                title="View Certificate"
                              >
                                <a 
                                  href={cert.pdf_url.startsWith('http') ? cert.pdf_url : `${BACKEND_URL}${cert.pdf_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleEditCert(cert)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteCert(cert.id, cert.certificate_name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
          {/* Compliance Status Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => updateReqFilters({ statuses: [], categories: [], start_date: '', end_date: '' })}
            >
              <CardContent className="pt-3 pb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{requirements.length}</div>
                  <div className="text-sm text-gray-600">Total</div>
                  <p className="text-xs text-gray-400 mt-1">All requirements</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                clearReqFilterType('statuses');
                toggleReqFilter('statuses', 'Compliant');
              }}
            >
              <CardContent className="pt-3 pb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{compliant}</div>
                  <div className="text-sm text-gray-600">Compliant</div>
                  <p className="text-xs text-gray-400 mt-1">Click to filter</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                clearReqFilterType('statuses');
                toggleReqFilter('statuses', 'Non-Compliant');
              }}
            >
              <CardContent className="pt-3 pb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{nonCompliant}</div>
                  <div className="text-sm text-gray-600">Non-Compliant</div>
                  <p className="text-xs text-gray-400 mt-1">Click to filter</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                clearReqFilterType('statuses');
                toggleReqFilter('statuses', 'Under Review');
              }}
            >
              <CardContent className="pt-3 pb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{underReview}</div>
                  <div className="text-sm text-gray-600">Under Review</div>
                  <p className="text-xs text-gray-400 mt-1">Click to filter</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                clearReqFilterType('statuses');
                toggleReqFilter('statuses', 'Partial');
              }}
            >
              <CardContent className="pt-3 pb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{partial}</div>
                  <div className="text-sm text-gray-600">Partial</div>
                  <p className="text-xs text-gray-400 mt-1">Click to filter</p>
                </div>
              </CardContent>
            </Card>
          </div>

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
                  <Button variant="outline" onClick={() => setImportReqDialogOpen(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                    <Download className="mr-2 h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Button variant="outline" onClick={exportRequirementsToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export to Excel
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

                  {/* Vessel Multi-Select */}
                  <div>
                    <Label>Vessel</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {reqFilters.vessels.length === 0
                              ? 'All Vessels'
                              : reqFilters.vessels.length === 1
                              ? vessels.find(v => v.id === reqFilters.vessels[0])?.vessel_name || reqFilters.vessels[0]
                              : `${reqFilters.vessels.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Vessels</span>
                            {reqFilters.vessels.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearReqFilterType('vessels')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {vessels.map(vessel => (
                            <div
                              key={vessel.id}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleReqFilter('vessels', vessel.vessel_name)}
                            >
                              <Checkbox
                                checked={reqFilters.vessels.includes(vessel.vessel_name)}
                                onCheckedChange={() => toggleReqFilter('vessels', vessel.vessel_name)}
                              />
                              <span className="text-sm">{vessel.vessel_name}</span>
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
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
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => handleEditReq(req)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteReq(req.id, req.requirement_name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certificate Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={(open) => {
        setCertDialogOpen(open);
        if (!open) resetCertForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{certEditMode ? 'Edit Certificate' : 'Add Certificate'}</DialogTitle>
            <DialogDescription>
              {certEditMode ? 'Update certificate information' : 'Add a new compliance certificate'}
            </DialogDescription>
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

            {/* Certificate PDF Upload */}
            <div>
              <Label>Certificate Document (PDF)</Label>
              <div className="mt-2">
                <FileUploadZone
                  value={certForm.pdf_url}
                  onChange={(url) => setCertForm({...certForm, pdf_url: url})}
                  accept=".pdf"
                  label="Click or drag to upload certificate PDF"
                  description="Max 10MB"
                  onError={(msg) => setError(msg)}
                  onSuccess={() => {}}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCertSubmit}>{certEditMode ? 'Update Certificate' : 'Add Certificate'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requirement Dialog */}
      <Dialog open={reqDialogOpen} onOpenChange={(open) => {
        setReqDialogOpen(open);
        if (!open) resetReqForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reqEditMode ? 'Edit Compliance Requirement' : 'Add Compliance Requirement'}</DialogTitle>
            <DialogDescription>
              {reqEditMode ? 'Update requirement information' : 'Add a new regulatory requirement'}
            </DialogDescription>
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
              <Label>Linked Document</Label>
              <div className="flex gap-2">
                <Select 
                  value={reqForm.linked_document_id || "none"} 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setReqForm({...reqForm, linked_document_id: '', linked_document_name: ''});
                    } else {
                      const doc = documents.find(d => d.id === value);
                      setReqForm({...reqForm, linked_document_id: value, linked_document_name: doc?.document_name || ''});
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No document linked --</SelectItem>
                    {documents.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.document_name} {doc.category ? `(${doc.category})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reqForm.linked_document_id && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleViewDocument(reqForm.linked_document_id)}
                    title="View Document"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Applicable Vessels (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {reqForm.vessel_ids.length === 0 
                        ? 'All vessels / Not specified' 
                        : `${reqForm.vessel_ids.length} vessel${reqForm.vessel_ids.length !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <span className="text-sm font-medium">Select Vessels</span>
                      {reqForm.vessel_ids.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setReqForm({...reqForm, vessel_ids: [], vessel_names: []})} 
                          className="h-auto p-1 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {vessels.map(vessel => (
                      <div 
                        key={vessel.id} 
                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => {
                          const isSelected = reqForm.vessel_ids.includes(vessel.id);
                          if (isSelected) {
                            setReqForm({
                              ...reqForm, 
                              vessel_ids: reqForm.vessel_ids.filter(id => id !== vessel.id),
                              vessel_names: reqForm.vessel_names.filter(name => name !== vessel.vessel_name)
                            });
                          } else {
                            setReqForm({
                              ...reqForm, 
                              vessel_ids: [...reqForm.vessel_ids, vessel.id],
                              vessel_names: [...reqForm.vessel_names, vessel.vessel_name]
                            });
                          }
                        }}
                      >
                        <Checkbox 
                          checked={reqForm.vessel_ids.includes(vessel.id)} 
                          onCheckedChange={() => {
                            const isSelected = reqForm.vessel_ids.includes(vessel.id);
                            if (isSelected) {
                              setReqForm({
                                ...reqForm, 
                                vessel_ids: reqForm.vessel_ids.filter(id => id !== vessel.id),
                                vessel_names: reqForm.vessel_names.filter(name => name !== vessel.vessel_name)
                              });
                            } else {
                              setReqForm({
                                ...reqForm, 
                                vessel_ids: [...reqForm.vessel_ids, vessel.id],
                                vessel_names: [...reqForm.vessel_names, vessel.vessel_name]
                              });
                            }
                          }}
                        />
                        <label className="text-sm flex-1 cursor-pointer">
                          {vessel.vessel_name} {vessel.vessel_type ? `(${vessel.vessel_type})` : ''}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {reqForm.vessel_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {reqForm.vessel_names.map((name, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        const vesselId = reqForm.vessel_ids[index];
                        setReqForm({
                          ...reqForm,
                          vessel_ids: reqForm.vessel_ids.filter(id => id !== vesselId),
                          vessel_names: reqForm.vessel_names.filter(n => n !== name)
                        });
                      }}
                    >
                      🚢 {name} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Responsible Person</Label>
              <Input value={reqForm.responsible_person} onChange={(e) => setReqForm({...reqForm, responsible_person: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReqSubmit}>{reqEditMode ? 'Update Requirement' : 'Add Requirement'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialogs */}
      <ImportExcelDialog
        open={importCertDialogOpen}
        onClose={() => setImportCertDialogOpen(false)}
        title="Import Certificates"
        description="Upload an Excel file to import certificates. Download the template for the correct format."
        templateColumns={certImportColumns}
        templateSampleData={certImportSample}
        onImport={handleImportCertificates}
        templateFileName="certificates_import_template.xlsx"
      />
      <ImportExcelDialog
        open={importReqDialogOpen}
        onClose={() => setImportReqDialogOpen(false)}
        title="Import Compliance Requirements"
        description="Upload an Excel file to import compliance requirements. Download the template for the correct format."
        templateColumns={reqImportColumns}
        templateSampleData={reqImportSample}
        onImport={handleImportRequirements}
        templateFileName="compliance_requirements_import_template.xlsx"
      />

      {/* View Document Dialog */}
      <Dialog open={viewDocumentDialogOpen} onOpenChange={setViewDocumentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.document_name}</DialogTitle>
            <DialogDescription>Document Details</DialogDescription>
          </DialogHeader>
          {viewingDocument && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge>{viewingDocument.category}</Badge>
                {viewingDocument.vessel_name && (
                  <Badge variant="outline">🚢 {viewingDocument.vessel_name}</Badge>
                )}
              </div>
              {viewingDocument.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{viewingDocument.description}</p>
                </div>
              )}
              {viewingDocument.upload_date && (
                <div>
                  <Label className="text-sm font-medium">Upload Date</Label>
                  <p className="text-sm mt-1">{new Date(viewingDocument.upload_date).toLocaleDateString()}</p>
                </div>
              )}
              {viewingDocument.file_url && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={() => window.open(viewingDocument.file_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Document
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDocumentDialogOpen(false);
                      window.location.href = '/documents';
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Go to Document Management
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compliance;
