import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard } from '@/components/ui/summary-card';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Plus, Edit, Trash2, Eye, Download, X, ChevronDown, FileSpreadsheet, Navigation, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import HelpDialog from './HelpDialog';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Incidents = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.access_level === 'Admin' || currentUser.access_level === 'Full';
  const [incidents, setIncidents] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [viewingIncident, setViewingIncident] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');

  // Use custom hook for advanced filtering
  const {
    filters,
    setFilters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters,
    updateFilters,
    setFilterValue
  } = useAdvancedFilters({
    incident_types: [],
    severities: [],
    statuses: [],
    vessels: [],
    start_date: '',
    end_date: ''
  });

  const [formData, setFormData] = useState({
    incident_type: [],
    severity: 'Minor',
    title: '',
    description: '',
    incident_date: new Date().toISOString().slice(0, 16),
    utc_offset: '',
    location: '',
    trip_from: '',
    trip_to: '',
    gps_location: '',
    pilot_on_board: false,
    cargo_on_board: false,
    activity: [],
    vessel_id: '',
    vessel_name: '',
    injuries: false,
    injury_details: '',
    witnesses: '',
    immediate_actions: '',
    investigation_status: 'Reported',
    root_cause: '',
    risk_creator: '',
    corrective_actions: '',
    preventive_actions: '',
    responsible_person: '',
    target_completion_date: '',
    date_closed: '',
    date_risk_assessment_performed: '',
    date_amsa_notified: '',
    linked_trip_id: '',
    linked_trip_name: ''
  });
  const [trips, setTrips] = useState([]);

  const [incidentTypes, setIncidentTypes] = useState([
    'Contact with something other than a vessel',
    'Collision with another vessel',
    'Damage',
    'Dangerous occurrence',
    'Death',
    'Disabled',
    'Equipment/machinery failure',
    'Fire/smoke',
    'Flooding',
    'Foundering/sinking/presumed lost Injury',
    'Grounding',
    'Illness',
    'Leakage/spillage of dangerous goods',
    'Listing/capsize',
    'Loss of cargo/dangerous goods',
    'MARPOL issues',
    'Medical evacuation',
    'Near miss',
    'Person overboard with lifejacket',
    'Person overboard without lifejacket',
    'Other'
  ]);
  
  const activityOptions = [
    'Anchored',
    'Being towed',
    'Berthed',
    'Berthing/Unberthing',
    'Fishing/Unloading',
    'Loading/Unloading',
    'Towing',
    'Underway',
    'Other'
  ];
  
  const severityLevels = ['Minor', 'Moderate', 'Serious', 'Critical'];
  const statuses = ['Reported', 'Under Investigation', 'Completed', 'Closed'];

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [filters, sortBy]);

  const sortIncidents = (list, sort) => {
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'name_desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'severity':
          const severityOrder = { 'Critical': 0, 'Serious': 1, 'Moderate': 2, 'Minor': 3 };
          return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
        case 'date_asc':
          return new Date(a.incident_date || 0) - new Date(b.incident_date || 0);
        case 'date_desc':
        default:
          return new Date(b.incident_date || 0) - new Date(a.incident_date || 0);
      }
    });
  };

  // Handle URL parameters for pre-filtering
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vesselName = params.get('vessel_name');
    
    if (vesselName) {
      const decodedVesselName = decodeURIComponent(vesselName);
      setFilters(prev => ({
        ...prev,
        vessels: [decodedVesselName]
      }));
    }
  }, [location.search]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await fetch(`${API}/settings/incident/incident_types`, { headers });
      const data = await response.json();
      if (data.options && data.options.length > 0) {
        setIncidentTypes(data.options.filter(o => o.is_active !== false).map(o => o.value));
      }
    } catch (err) {
      console.error('Error fetching incident type settings:', err);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all incidents (no backend filtering)
      const [incidentsRes, vesselsRes, tripsRes] = await Promise.all([
        axios.get(`${API}/incidents`, { headers }),
        axios.get(`${API}/vessels`, { headers }),
        axios.get(`${API}/trips`, { headers })
      ]);
      setTrips(tripsRes.data || []);

      let filteredIncidents = incidentsRes.data;

      // Apply multi-select filters on client side
      if (filters.incident_types.length > 0) {
        filteredIncidents = filteredIncidents.filter(incident => {
          const incidentTypes = Array.isArray(incident.incident_type) 
            ? incident.incident_type 
            : [incident.incident_type];
          return incidentTypes.some(type => filters.incident_types.includes(type));
        });
      }

      if (filters.severities.length > 0) {
        filteredIncidents = filteredIncidents.filter(incident => 
          filters.severities.includes(incident.severity)
        );
      }

      if (filters.statuses.length > 0) {
        filteredIncidents = filteredIncidents.filter(incident => 
          filters.statuses.includes(incident.investigation_status)
        );
      }

      // Apply vessel filter
      if (filters.vessels && filters.vessels.length > 0) {
        filteredIncidents = filteredIncidents.filter(incident => 
          filters.vessels.includes(incident.vessel_name)
        );
      }

      // Apply date range filter
      if (filters.start_date || filters.end_date) {
        filteredIncidents = filteredIncidents.filter(incident => {
          if (!incident.incident_date) return false;
          
          const incidentDate = new Date(incident.incident_date);
          const startDate = filters.start_date ? new Date(filters.start_date) : null;
          const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59') : null;

          if (startDate && incidentDate < startDate) return false;
          if (endDate && incidentDate > endDate) return false;
          
          return true;
        });
      }

      // Apply sorting
      filteredIncidents = sortIncidents(filteredIncidents, sortBy);

      setIncidents(filteredIncidents);
      setVessels(vesselsRes.data);
    } catch (err) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (incidents.length === 0) { setError('No incidents to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Incident #', 'Title', 'Type', 'Severity', 'Status', 'Date', 'Location', 'Vessel', 'Description', 'Injuries', 'Risk Creator', 'Date Closed', 'Date Risk Assessment', 'Date AMSA Notified', 'Linked Trip'];
    const data = [headers, ...incidents.map(i => [
      i.incident_number || '-', i.title || '-',
      Array.isArray(i.incident_type) ? i.incident_type.join(', ') : (i.incident_type || '-'),
      i.severity || '-', i.investigation_status || '-',
      i.incident_date ? new Date(i.incident_date).toLocaleString() : '-',
      i.location || '-', i.vessel_name || '-', i.description || '-', i.injuries ? 'Yes' : 'No',
      i.risk_creator || '-',
      i.date_closed ? new Date(i.date_closed).toLocaleDateString() : '-',
      i.date_risk_assessment_performed ? new Date(i.date_risk_assessment_performed).toLocaleDateString() : '-',
      i.date_amsa_notified ? new Date(i.date_amsa_notified).toLocaleDateString() : '-',
      i.linked_trip_name || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Incidents');
    XLSX.writeFile(wb, `incidents_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${incidents.length} incidents to Excel`);
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
          const incidentData = {
            incident_number: row['Incident #'] || row['incident_number'] || '',
            title: row['Title'] || row['title'] || '',
            incident_type: row['Type'] ? [row['Type']] : [],
            severity: row['Severity'] || row['severity'] || 'Minor',
            investigation_status: row['Status'] || row['investigation_status'] || 'Reported',
            incident_date: row['Date'] || row['incident_date'] || new Date().toISOString(),
            location: row['Location'] || row['location'] || '',
            vessel_name: row['Vessel'] || row['vessel_name'] || '',
            description: row['Description'] || row['description'] || '',
            injuries: row['Injuries'] === 'Yes' || row['injuries'] === true,
            risk_creator: row['Risk Creator'] || row['risk_creator'] || '',
            date_closed: row['Date Closed'] || row['date_closed'] || '',
            date_risk_assessment_performed: row['Date Risk Assessment'] || row['date_risk_assessment_performed'] || '',
            date_amsa_notified: row['Date AMSA Notified'] || row['date_amsa_notified'] || '',
            linked_trip_name: row['Linked Trip'] || row['linked_trip_name'] || '',
          };

          if (!incidentData.title) continue;

          await axios.post(`${API}/incidents`, incidentData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error('Error importing incident:', err);
          errorCount++;
        }
      }

      setMessage(`Import complete: ${successCount} incidents added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchData();
    } catch (err) {
      setError('Error importing data: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Import template columns matching export format exactly
  const incidentImportColumns = ['Incident #', 'Title', 'Type', 'Severity', 'Status', 'Date', 'Location', 'Vessel', 'Description', 'Injuries', 'Risk Creator', 'Date Closed', 'Date Risk Assessment', 'Date AMSA Notified', 'Linked Trip'];
  const incidentImportSample = [['INC-001', 'Engine Failure', 'Mechanical', 'Minor', 'Reported', '2024-01-15 10:30', 'Port Jackson', 'MV Coral Queen', 'Engine failed during routine operation', 'No', 'John Smith', '', '', '', '']];

  const exportIncidentToExcel = (incident) => {
    const wb = XLSX.utils.book_new();
    
    // Incident Details sheet
    const detailsData = [
      ['INCIDENT REPORT'],
      [''],
      ['Incident Number', incident.incident_number || '-'],
      ['Title', incident.title || '-'],
      ['Incident Type', Array.isArray(incident.incident_type) ? incident.incident_type.join(', ') : (incident.incident_type || '-')],
      ['Severity', incident.severity || '-'],
      ['Status', incident.investigation_status || '-'],
      ['Date', incident.incident_date ? new Date(incident.incident_date).toLocaleString() : '-'],
      ['Location', incident.location || '-'],
      ['GPS Location', incident.gps_location || '-'],
      ['Vessel', incident.vessel_name || '-'],
      ['Trip From', incident.trip_from || '-'],
      ['Trip To', incident.trip_to || '-'],
      ['Linked Trip', incident.linked_trip_name || '-'],
      [''],
      ['DESCRIPTION'],
      [incident.description || '-'],
      [''],
      ['CIRCUMSTANCES'],
      ['Activity', Array.isArray(incident.activity) ? incident.activity.join(', ') : (incident.activity || '-')],
      ['Pilot On Board', incident.pilot_on_board ? 'Yes' : 'No'],
      ['Cargo On Board', incident.cargo_on_board ? 'Yes' : 'No'],
      [''],
      ['INJURIES'],
      ['Injuries Occurred', incident.injuries ? 'Yes' : 'No'],
      ['Injury Details', incident.injury_details || '-'],
      ['Witnesses', incident.witnesses || '-'],
      [''],
      ['IMMEDIATE ACTIONS'],
      [incident.immediate_actions || '-'],
      [''],
      ['INVESTIGATION'],
      ['Root Cause', incident.root_cause || '-'],
      ['Risk Creator', incident.risk_creator || '-'],
      ['Corrective Actions', incident.corrective_actions || '-'],
      ['Preventive Actions', incident.preventive_actions || '-'],
      ['Responsible Person', incident.responsible_person || '-'],
      ['Target Completion', incident.target_completion_date ? new Date(incident.target_completion_date).toLocaleDateString() : '-'],
      [''],
      ['INVESTIGATION DATES'],
      ['Date Closed', incident.date_closed ? new Date(incident.date_closed).toLocaleDateString() : '-'],
      ['Date Risk Assessment Performed', incident.date_risk_assessment_performed ? new Date(incident.date_risk_assessment_performed).toLocaleDateString() : '-'],
      ['Date AMSA Notified', incident.date_amsa_notified ? new Date(incident.date_amsa_notified).toLocaleDateString() : '-'],
      [''],
      ['METADATA'],
      ['Reported By', incident.reported_by_name || '-'],
      ['Created At', incident.created_at ? new Date(incident.created_at).toLocaleString() : '-'],
      ['Updated At', incident.updated_at ? new Date(incident.updated_at).toLocaleString() : '-']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(detailsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Incident Details');
    
    XLSX.writeFile(wb, `incident_${incident.incident_number || 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage('Incident exported to Excel');
    setTimeout(() => setMessage(''), 3000);
  };

  // GPS Location lookup function
  const getGPSLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setGpsLoading(true);

    // Check permission status first if available
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permissionStatus.state === 'denied') {
          setGpsLoading(false);
          setError('Location access is blocked. Please click the lock/site settings icon in your browser\'s address bar and allow location access, then try again.');
          setTimeout(() => setError(''), 6000);
          return;
        }
      } catch (e) {
        // Permissions API not fully supported, continue with geolocation request
        console.log('Permissions API check failed, proceeding with geolocation request');
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setFormData(prev => ({ ...prev, gps_location: coords }));
        setGpsLoading(false);
        setMessage(`GPS location captured: ${coords}`);
        setTimeout(() => setMessage(''), 3000);
      },
      (err) => {
        setGpsLoading(false);
        let errorMessage = 'Unable to retrieve location';
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location access denied. Click the lock/site settings icon in your browser\'s address bar, set Location to "Allow", then refresh and try again.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information unavailable. Please check your device\'s location services are enabled.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = `Location error: ${err.message || 'Unknown error'}`;
        }
        setError(errorMessage);
        setTimeout(() => setError(''), 6000);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
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
    // Calculate UTC offset from incident date
    const incidentDateObj = incident.incident_date ? new Date(incident.incident_date) : new Date();
    const offsetMinutes = incidentDateObj.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const calculatedOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    setFormData({
      ...incident,
      // Ensure arrays are properly initialized to prevent undefined errors
      incident_type: Array.isArray(incident.incident_type) ? incident.incident_type : [],
      activity: Array.isArray(incident.activity) ? incident.activity : [],
      incident_date: incident.incident_date && !isNaN(new Date(incident.incident_date).getTime()) ? new Date(incident.incident_date).toISOString().slice(0, 16) : '',
      utc_offset: incident.utc_offset || calculatedOffset,
      target_completion_date: incident.target_completion_date && !isNaN(new Date(incident.target_completion_date).getTime()) ? new Date(incident.target_completion_date).toISOString().slice(0, 16) : '',
      date_closed: incident.date_closed && !isNaN(new Date(incident.date_closed).getTime()) ? new Date(incident.date_closed).toISOString().slice(0, 10) : '',
      date_risk_assessment_performed: incident.date_risk_assessment_performed && !isNaN(new Date(incident.date_risk_assessment_performed).getTime()) ? new Date(incident.date_risk_assessment_performed).toISOString().slice(0, 10) : '',
      date_amsa_notified: incident.date_amsa_notified && !isNaN(new Date(incident.date_amsa_notified).getTime()) ? new Date(incident.date_amsa_notified).toISOString().slice(0, 10) : '',
      risk_creator: incident.risk_creator || '',
      linked_trip_id: incident.linked_trip_id || '',
      linked_trip_name: incident.linked_trip_name || ''
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
    // Calculate current UTC offset
    const now = new Date();
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const calculatedOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    setFormData({
      incident_type: [],
      severity: 'Minor',
      title: '',
      description: '',
      incident_date: new Date().toISOString().slice(0, 16),
      utc_offset: calculatedOffset,
      location: '',
      trip_from: '',
      trip_to: '',
      gps_location: '',
      pilot_on_board: false,
      cargo_on_board: false,
      activity: [],
      vessel_id: '',
      vessel_name: '',
      injuries: false,
      injury_details: '',
      witnesses: '',
      immediate_actions: '',
      investigation_status: 'Reported',
      root_cause: '',
      risk_creator: '',
      corrective_actions: '',
      preventive_actions: '',
      responsible_person: '',
      target_completion_date: '',
      date_closed: '',
      date_risk_assessment_performed: '',
      date_amsa_notified: '',
      linked_trip_id: '',
      linked_trip_name: ''
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

  // Helper function to calculate UTC offset from a date
  const calculateUtcOffset = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    return `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  };

  // Handle incident date change and auto-calculate UTC offset
  const handleIncidentDateChange = (newDate) => {
    const utcOffset = calculateUtcOffset(newDate);
    setFormData({
      ...formData,
      incident_date: newDate,
      utc_offset: utcOffset
    });
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
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Incident Management</h2>
            <HelpDialog 
              moduleKey="incident_management"
              title="Marine Order 504 (2024)"
              defaultContent="Requires incident reporting pathways, SMS review post-incident, and documentation of corrective actions to manage safety risks and prevent recurrence."
              defaultLink="https://www.amsa.gov.au/about/regulations-and-standards/marine-order-504-certificates-operation"
              defaultLinkText="View AMSA MO504 Regulations →"
              isAdmin={isAdmin}
            />
          </div>
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
        <SummaryCard
          value={incidents.length}
          label="Total Incidents"
          description="All incidents"
          color="blue"
          onClick={() => clearAllFilters()}
        />
        <SummaryCard
          value={incidents.filter(i => i.severity === 'Critical').length}
          label="Critical"
          description="Requires attention"
          color="red"
          onClick={() => updateFilters({ severities: ['Critical'] })}
        />
        <SummaryCard
          value={incidents.filter(i => i.severity === 'Serious').length}
          label="Serious"
          description="High priority"
          color="orange"
          onClick={() => updateFilters({ severities: ['Serious'] })}
        />
        <SummaryCard
          value={incidents.filter(i => i.investigation_status === 'Under Investigation').length}
          label="Under Investigation"
          description="Being reviewed"
          color="yellow"
          onClick={() => updateFilters({ statuses: ['Under Investigation'] })}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
              <Download className="h-4 w-4" />
              Import from Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Clear All Filters Button */}
            {(filters.incident_types.length > 0 || filters.severities.length > 0 || filters.statuses.length > 0 || filters.vessels.length > 0 || filters.start_date || filters.end_date) && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* First Row: Type, Severity, Status, Vessel - Multi-Select */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Incident Type Multi-Select */}
              <div>
                <Label>Incident Type</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {filters.incident_types.length === 0
                          ? 'All Types'
                          : filters.incident_types.length === 1
                          ? filters.incident_types[0]
                          : `${filters.incident_types.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Types</span>
                        {filters.incident_types.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFilter('incident_types')}
                            className="h-auto p-1 text-xs"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      {incidentTypes.map(type => (
                        <div
                          key={type}
                          className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleFilter('incident_types', type)}
                        >
                          <Checkbox
                            checked={filters.incident_types.includes(type)}
                            onCheckedChange={() => toggleFilter('incident_types', type)}
                          />
                          <label className="text-sm flex-1 cursor-pointer">{type}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.incident_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.incident_types.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => toggleFilter('incident_types', type)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Severity Multi-Select */}
              <div>
                <Label>Severity</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {filters.severities.length === 0
                          ? 'All Severities'
                          : filters.severities.length === 1
                          ? filters.severities[0]
                          : `${filters.severities.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Severities</span>
                        {filters.severities.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFilter('severities')}
                            className="h-auto p-1 text-xs"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      {severityLevels.map(level => (
                        <div
                          key={level}
                          className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleFilter('severities', level)}
                        >
                          <Checkbox
                            checked={filters.severities.includes(level)}
                            onCheckedChange={() => toggleFilter('severities', level)}
                          />
                          <label className="text-sm flex-1 cursor-pointer">{level}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.severities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.severities.map(level => (
                      <Badge key={level} variant="secondary" className="text-xs">
                        {level}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => toggleFilter('severities', level)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Multi-Select */}
              <div>
                <Label>Status</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {filters.statuses.length === 0
                          ? 'All Statuses'
                          : filters.statuses.length === 1
                          ? filters.statuses[0]
                          : `${filters.statuses.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Statuses</span>
                        {filters.statuses.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFilter('statuses')}
                            className="h-auto p-1 text-xs"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      {statuses.map(status => (
                        <div
                          key={status}
                          className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleFilter('statuses', status)}
                        >
                          <Checkbox
                            checked={filters.statuses.includes(status)}
                            onCheckedChange={() => toggleFilter('statuses', status)}
                          />
                          <label className="text-sm flex-1 cursor-pointer">{status}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.statuses.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.statuses.map(status => (
                      <Badge key={status} variant="secondary" className="text-xs">
                        {status}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => toggleFilter('statuses', status)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Vessel Multi-Select */}
              <div>
                <Label>Vessel</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {filters.vessels.length === 0
                          ? 'All Vessels'
                          : filters.vessels.length === 1
                          ? filters.vessels[0]
                          : `${filters.vessels.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Vessels</span>
                        {filters.vessels.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFilter('vessels')}
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
                          onClick={() => toggleFilter('vessels', vessel.vessel_name)}
                        >
                          <Checkbox
                            checked={filters.vessels.includes(vessel.vessel_name)}
                            onCheckedChange={() => toggleFilter('vessels', vessel.vessel_name)}
                          />
                          <label className="text-sm flex-1 cursor-pointer">{vessel.vessel_name}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.vessels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.vessels.map(vesselName => (
                      <Badge key={vesselName} variant="secondary" className="text-xs">
                        {vesselName}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => toggleFilter('vessels', vesselName)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Second Row: Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="start_date">From Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilterValue('start_date', e.target.value)}
                  placeholder="Start date"
                />
              </div>
              <div>
                <Label htmlFor="end_date">To Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilterValue('end_date', e.target.value)}
                  placeholder="End date"
                />
              </div>
              <div>
                {(filters.start_date || filters.end_date) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearDateFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Date Range
                  </Button>
                )}
              </div>
            </div>

            {/* Sort and Results Count */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-500 whitespace-nowrap">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48" data-testid="incident-sort-select">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date (Newest)</SelectItem>
                    <SelectItem value="date_asc">Date (Oldest)</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                    <SelectItem value="severity">Severity (Highest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <CardContent className="pt-3 pb-3">
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
                      <p><strong>Type:</strong> {Array.isArray(incident.incident_type) ? incident.incident_type.join(', ') : incident.incident_type}</p>
                      <p>
                        <strong>Date:</strong> {incident.incident_date ? new Date(incident.incident_date).toLocaleString() : 'N/A'}
                        {incident.incident_date && !isNaN(new Date(incident.incident_date).getTime()) && (
                          <span className="text-xs text-gray-500 ml-2">
                            (UTC: {new Date(incident.incident_date).toISOString().replace('T', ' ').slice(0, 19)})
                          </span>
                        )}
                      </p>
                      <p><strong>Location:</strong> {incident.location}</p>
                      {(incident.trip_from || incident.trip_to) && (
                        <p><strong>Trip:</strong> {incident.trip_from || 'N/A'} → {incident.trip_to || 'N/A'}</p>
                      )}
                      {incident.gps_location && <p><strong>GPS:</strong> {incident.gps_location}</p>}
                      {incident.activity && Array.isArray(incident.activity) && incident.activity.length > 0 && (
                        <p><strong>Activity:</strong> {incident.activity.join(', ')}</p>
                      )}
                      {incident.vessel_name && (
                        <p>
                          <strong>Vessel:</strong>{' '}
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/vessels?vessel=${incident.vessel_id}`); }}
                            className="text-blue-600 hover:underline"
                          >
                            {incident.vessel_name}
                          </button>
                        </p>
                      )}
                      {incident.linked_trip_name && (
                        <p>
                          <strong>Linked Trip:</strong>{' '}
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/trips?trip=${incident.linked_trip_id}`); }}
                            className="text-blue-600 hover:underline"
                          >
                            {incident.linked_trip_name}
                          </button>
                        </p>
                      )}
                      {incident.pilot_on_board && <p><strong>🧑‍✈️ Pilot on Board</strong></p>}
                      {incident.cargo_on_board && <p><strong>📦 Cargo on Board</strong></p>}
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
                <Label>Incident Type * (Select multiple)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {formData.incident_type.length === 0 ? 'Select incident types' :
                         formData.incident_type.length === 1 ? formData.incident_type[0] :
                         `${formData.incident_type.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 max-h-96 overflow-y-auto" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Types</span>
                        {formData.incident_type.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setFormData({...formData, incident_type: []})} className="h-auto p-1 text-xs">
                            Clear
                          </Button>
                        )}
                      </div>
                      {incidentTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => {
                            const isSelected = formData.incident_type.includes(type);
                            setFormData({
                              ...formData,
                              incident_type: isSelected 
                                ? formData.incident_type.filter(t => t !== type)
                                : [...formData.incident_type, type]
                            });
                          }}>
                          <Checkbox checked={formData.incident_type.includes(type)} />
                          <label className="text-sm flex-1 cursor-pointer">{type}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {formData.incident_type.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.incident_type.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                        <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFormData({
                          ...formData, 
                          incident_type: formData.incident_type.filter(t => t !== type)
                        })} />
                      </Badge>
                    ))}
                  </div>
                )}
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Incident Date & Time * (Local)</Label>
                <Input
                  type="datetime-local"
                  value={formData.incident_date}
                  onChange={(e) => handleIncidentDateChange(e.target.value)}
                />
                {formData.incident_date && !isNaN(new Date(formData.incident_date).getTime()) && (
                  <p className="text-xs text-gray-500 mt-1">
                    UTC: {new Date(formData.incident_date).toISOString().replace('T', ' ').slice(0, 19)}
                  </p>
                )}
              </div>
              <div>
                <Label>UTC Offset</Label>
                <Input
                  value={formData.utc_offset}
                  onChange={(e) => setFormData({...formData, utc_offset: e.target.value})}
                  placeholder="e.g., +10:00"
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from date
                </p>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location *
                </Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Where did this occur?"
                />
              </div>
            </div>

            {/* GPS Location - next to Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Navigation className="h-4 w-4" />
                  GPS Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.gps_location}
                    onChange={(e) => setFormData({...formData, gps_location: e.target.value})}
                    placeholder="Lat, Long"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={getGPSLocation}
                    disabled={gpsLoading}
                    className="whitespace-nowrap"
                  >
                    {gpsLoading ? (
                      <span className="animate-pulse">Getting...</span>
                    ) : (
                      <>📍 Get GPS</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Link to Existing Trip */}
            <div>
              <Label>Link to Existing Trip (Optional)</Label>
              <Select 
                value={formData.linked_trip_id || 'none'} 
                onValueChange={(value) => {
                  if (value === 'none') {
                    setFormData({...formData, linked_trip_id: '', linked_trip_name: ''});
                  } else {
                    const selectedTrip = trips.find(t => t.id === value);
                    setFormData({
                      ...formData, 
                      linked_trip_id: value, 
                      linked_trip_name: selectedTrip ? `${selectedTrip.trip_name || 'Trip'} - ${selectedTrip.vessel_name || ''}` : ''
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trip to link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked trip</SelectItem>
                  {trips.map(trip => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.trip_name || 'Unnamed Trip'} - {trip.vessel_name || 'No vessel'} ({trip.departure_date ? new Date(trip.departure_date).toLocaleDateString() : 'No date'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trip From</Label>
                <Input
                  value={formData.trip_from}
                  onChange={(e) => setFormData({...formData, trip_from: e.target.value})}
                  placeholder="Origin"
                />
              </div>
              <div>
                <Label>Trip To</Label>
                <Input
                  value={formData.trip_to}
                  onChange={(e) => setFormData({...formData, trip_to: e.target.value})}
                  placeholder="Destination"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pilot_on_board"
                  checked={formData.pilot_on_board}
                  onCheckedChange={(checked) => setFormData({...formData, pilot_on_board: checked})}
                />
                <Label htmlFor="pilot_on_board" className="cursor-pointer">Pilot on Board</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cargo_on_board"
                  checked={formData.cargo_on_board}
                  onCheckedChange={(checked) => setFormData({...formData, cargo_on_board: checked})}
                />
                <Label htmlFor="cargo_on_board" className="cursor-pointer">Cargo on Board</Label>
              </div>
            </div>

            <div>
              <Label>Activity (Select multiple)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {formData.activity.length === 0 ? 'Select activities' :
                       formData.activity.length === 1 ? formData.activity[0] :
                       `${formData.activity.length} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="p-2">
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <span className="text-sm font-medium">Select Activities</span>
                      {formData.activity.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setFormData({...formData, activity: []})} className="h-auto p-1 text-xs">
                          Clear
                        </Button>
                      )}
                    </div>
                    {activityOptions.map(activity => (
                      <div key={activity} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => {
                          const isSelected = formData.activity.includes(activity);
                          setFormData({
                            ...formData,
                            activity: isSelected 
                              ? formData.activity.filter(a => a !== activity)
                              : [...formData.activity, activity]
                          });
                        }}>
                        <Checkbox checked={formData.activity.includes(activity)} />
                        <label className="text-sm flex-1 cursor-pointer">{activity}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {formData.activity.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.activity.map(act => (
                    <Badge key={act} variant="secondary" className="text-xs">
                      {act}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFormData({
                        ...formData, 
                        activity: formData.activity.filter(a => a !== act)
                      })} />
                    </Badge>
                  ))}
                </div>
              )}
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
              <Label>Immediate Action/Treatment Performed</Label>
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
                  <Label>What Created the Risk?</Label>
                  <Textarea
                    value={formData.risk_creator}
                    onChange={(e) => setFormData({...formData, risk_creator: e.target.value})}
                    rows={2}
                    placeholder="Describe what created or contributed to the risk"
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

                {/* Investigation Date Fields */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Investigation Dates</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Date Closed</Label>
                      <Input
                        type="date"
                        value={formData.date_closed}
                        onChange={(e) => setFormData({...formData, date_closed: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Date Risk Assessment Performed</Label>
                      <Input
                        type="date"
                        value={formData.date_risk_assessment_performed}
                        onChange={(e) => setFormData({...formData, date_risk_assessment_performed: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Date AMSA Notified</Label>
                      <Input
                        type="date"
                        value={formData.date_amsa_notified}
                        onChange={(e) => setFormData({...formData, date_amsa_notified: e.target.value})}
                      />
                    </div>
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
            <div className="flex items-center justify-between">
              <DialogTitle>Incident Details</DialogTitle>
              {viewingIncident && (
                <Button 
                  onClick={() => exportIncidentToExcel(viewingIncident)}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              )}
            </div>
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
                <div><strong>Type:</strong> {Array.isArray(viewingIncident.incident_type) ? viewingIncident.incident_type.join(', ') : viewingIncident.incident_type}</div>
                <div className="col-span-2">
                  <strong>Date:</strong> {viewingIncident.incident_date ? new Date(viewingIncident.incident_date).toLocaleString() : 'N/A'}
                  {viewingIncident.incident_date && !isNaN(new Date(viewingIncident.incident_date).getTime()) && (
                    <span className="text-xs text-gray-500 ml-2">
                      (UTC: {new Date(viewingIncident.incident_date).toISOString().replace('T', ' ').slice(0, 19)})
                    </span>
                  )}
                </div>
                <div><strong>Location:</strong> {viewingIncident.location}</div>
                {viewingIncident.gps_location && <div><strong>GPS:</strong> {viewingIncident.gps_location}</div>}
                {viewingIncident.trip_from && <div><strong>Trip From:</strong> {viewingIncident.trip_from}</div>}
                {viewingIncident.trip_to && <div><strong>Trip To:</strong> {viewingIncident.trip_to}</div>}
                {viewingIncident.activity && Array.isArray(viewingIncident.activity) && viewingIncident.activity.length > 0 && (
                  <div className="col-span-2"><strong>Activity:</strong> {viewingIncident.activity.join(', ')}</div>
                )}
                {viewingIncident.pilot_on_board && <div><strong>🧑‍✈️ Pilot on Board:</strong> Yes</div>}
                {viewingIncident.cargo_on_board && <div><strong>📦 Cargo on Board:</strong> Yes</div>}
                {viewingIncident.vessel_name && (
                  <div>
                    <strong>Vessel:</strong>{' '}
                    <button 
                      onClick={() => { setViewDialogOpen(false); navigate(`/vessels?vessel=${viewingIncident.vessel_id}`); }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {viewingIncident.vessel_name}
                    </button>
                  </div>
                )}
                {viewingIncident.linked_trip_name && (
                  <div>
                    <strong>Linked Trip:</strong>{' '}
                    <button 
                      onClick={() => { setViewDialogOpen(false); navigate(`/trips?trip=${viewingIncident.linked_trip_id}`); }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {viewingIncident.linked_trip_name}
                    </button>
                  </div>
                )}
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
                  <h4 className="font-semibold mb-2">Immediate Action/Treatment Performed</h4>
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

      {/* Import Excel Dialog */}
      <ImportExcelDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Import Incidents"
        description="Upload an Excel file to import incidents. Download the template for the correct format."
        templateColumns={incidentImportColumns}
        templateSampleData={incidentImportSample}
        onImport={handleImport}
        templateFileName="incidents_import_template.xlsx"
      />
    </div>
  );
};

export default Incidents;