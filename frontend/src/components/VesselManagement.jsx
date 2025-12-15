import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Ship, Plus, Edit, Trash2, Search, Calendar, Filter, X, AlertTriangle, Download, ChevronDown, FileText, Eye, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveListCard } from '@/components/ui/responsive-list-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import VesselForm from './VesselForm';
import ManualLogEntry from './ManualLogEntry';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VesselManagement = () => {
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vesselTypes, setVesselTypes] = useState([]);
  const [statusTypes, setStatusTypes] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [manualLogOpen, setManualLogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedVesselForLogs, setSelectedVesselForLogs] = useState(null);
  const [vesselRunningLogs, setVesselRunningLogs] = useState([]);
  const [vesselStaffLogs, setVesselStaffLogs] = useState([]);
  const [vesselRisks, setVesselRisks] = useState([]);
  const [vesselMaintenance, setVesselMaintenance] = useState([]);
  const [vesselIncidents, setVesselIncidents] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Use custom hook for advanced filtering
  const {
    filters,
    setFilters,
    toggleFilter,
    clearFilter,
    clearAllFilters: clearAllFiltersHook,
    setFilterValue
  } = useAdvancedFilters({
    vessel_types: [],
    min_length: '',
    max_length: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = currentUser.access_level === 'Edit' || currentUser.access_level === 'Full';
  const canDelete = currentUser.access_level === 'Full';

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filters, sortBy, vessels]);

  const applyFiltersAndSort = () => {
    let filtered = [...vessels];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(vessel =>
        vessel.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.vessel_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply multi-select vessel type filter
    if (filters.vessel_types.length > 0) {
      filtered = filtered.filter(vessel => 
        filters.vessel_types.includes(vessel.vessel_type)
      );
    }

    // Apply length range filter
    if (filters.min_length || filters.max_length) {
      filtered = filtered.filter(vessel => {
        const length = parseFloat(vessel.length_overall) || 0;
        const minLength = parseFloat(filters.min_length) || 0;
        const maxLength = parseFloat(filters.max_length) || Infinity;

        if (minLength && length < minLength) return false;
        if (maxLength !== Infinity && length > maxLength) return false;
        
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.vessel_name || '').localeCompare(b.vessel_name || '');
        case 'type':
          return (a.vessel_type || '').localeCompare(b.vessel_type || '');
        case 'year':
          return (b.year_built || 0) - (a.year_built || 0);
        case 'registration':
          return (a.registration_number || '').localeCompare(b.registration_number || '');
        default:
          return 0;
      }
    });

    setFilteredVessels(filtered);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    clearAllFiltersHook();
    setSortBy('name');
  };

  const exportToCSV = () => {
    if (filteredVessels.length === 0) {
      setError('No vessels to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = [
      'ID', 'Vessel Name', 'Registration Number', 'Vessel Type', 'Year Built',
      'Length (m)', 'Beam (m)', 'Draft (m)', 'Gross Tonnage', 'Net Tonnage',
      'Passenger Capacity', 'Crew Capacity', 'Flag State', 'Port of Registry',
      'IMO Number', 'MMSI Number', 'Call Sign', 'Owner Name', 'Owner Contact',
      'Operator Name', 'Operator Contact', 'Classification Society',
      'Class Notation', 'Hull Material', 'Propulsion Type', 'Engine Manufacturer',
      'Engine Model', 'Engine Power (kW)', 'Operational Status', 'Last Survey Date',
      'Next Survey Due', 'Insurance Expiry', 'Created At'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredVessels.map(v => [
        `"${v.id || ''}"`,
        `"${(v.vessel_name || '').replace(/"/g, '""')}"`,
        `"${v.registration_number || ''}"`,
        `"${v.vessel_type || ''}"`,
        `"${v.year_built || ''}"`,
        `"${v.length || ''}"`,
        `"${v.beam || ''}"`,
        `"${v.draft || ''}"`,
        `"${v.gross_tonnage || ''}"`,
        `"${v.net_tonnage || ''}"`,
        `"${v.passenger_capacity || ''}"`,
        `"${v.crew_capacity || ''}"`,
        `"${v.flag_state || ''}"`,
        `"${v.port_of_registry || ''}"`,
        `"${v.imo_number || ''}"`,
        `"${v.mmsi_number || ''}"`,
        `"${v.call_sign || ''}"`,
        `"${(v.owner_name || '').replace(/"/g, '""')}"`,
        `"${v.owner_contact || ''}"`,
        `"${(v.operator_name || '').replace(/"/g, '""')}"`,
        `"${v.operator_contact || ''}"`,
        `"${v.classification_society || ''}"`,
        `"${v.class_notation || ''}"`,
        `"${v.hull_material || ''}"`,
        `"${v.propulsion_type || ''}"`,
        `"${v.engine_manufacturer || ''}"`,
        `"${v.engine_model || ''}"`,
        `"${v.engine_power || ''}"`,
        `"${v.operational_status || ''}"`,
        `"${v.last_survey_date ? new Date(v.last_survey_date).toLocaleDateString() : ''}"`,
        `"${v.next_survey_due ? new Date(v.next_survey_due).toLocaleDateString() : ''}"`,
        `"${v.insurance_expiry ? new Date(v.insurance_expiry).toLocaleDateString() : ''}"`,
        `"${v.created_at ? new Date(v.created_at).toLocaleString() : ''}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vessels_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage(`Exported ${filteredVessels.length} vessels to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    clearAllFilters();
    setSortBy('name');
  };

  const hasActiveFilters = searchQuery || filters.vessel_types.length > 0 || filters.min_length || filters.max_length || sortBy !== 'name';

  const fetchVessels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vessels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVessels(response.data);
      setFilteredVessels(response.data);
      
      // Extract unique values for filters
      const uniqueTypes = [...new Set(response.data.map(v => v.vessel_type).filter(Boolean))];
      const uniqueStatuses = [...new Set(response.data.map(v => v.operational_status).filter(Boolean))];
      setVesselTypes(uniqueTypes);
      setStatusTypes(uniqueStatuses);
    } catch (err) {
      setError('Error fetching vessels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedVessel(null);
    setFormOpen(true);
  };

  const handleEdit = (vessel) => {
    setFormMode('edit');
    setSelectedVessel(vessel);
    setFormOpen(true);
  };

  const handleViewLogs = async (vessel) => {
    setSelectedVesselForLogs(vessel);
    setLogsDialogOpen(true);
    setLoadingLogs(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch running logs for this vessel
      const runningLogsResponse = await axios.get(`${API}/running-logs?vessel_id=${vessel.id}`, { headers });
      setVesselRunningLogs(runningLogsResponse.data);
      
      // Fetch crew shifts (trip logs) for this vessel
      const tripLogsResponse = await axios.get(`${API}/trip-logs`, { headers });
      
      // Fetch trips to match vessel_id with shifts
      const tripsResponse = await axios.get(`${API}/trips`, { headers });
      const trips = tripsResponse.data;
      
      // Filter shifts that belong to trips with this vessel
      const vesselShifts = tripLogsResponse.data.filter(log => {
        // Check if log has vessel_id (manual entry)
        if (log.vessel_id === vessel.id) return true;
        
        // Check if log's trip is for this vessel
        if (log.trip_id) {
          const trip = trips.find(t => t.id === log.trip_id);
          return trip && trip.vessel_id === vessel.id;
        }
        
        return false;
      });
      
      setVesselStaffLogs(vesselShifts);

      // Fetch risk assessments for this vessel
      const risksResponse = await axios.get(`${API}/risks`, { headers });
      const vesselRisks = risksResponse.data.filter(risk => risk.vessel_id === vessel.id);
      setVesselRisks(vesselRisks);

      // Fetch maintenance records for this vessel
      const maintenanceResponse = await axios.get(`${API}/maintenance`, { headers });
      const vesselMaintenance = maintenanceResponse.data.filter(m => m.vessel_id === vessel.id);
      setVesselMaintenance(vesselMaintenance);

      // Fetch incidents for this vessel
      const incidentsResponse = await axios.get(`${API}/incidents`, { headers });
      const vesselIncidents = incidentsResponse.data.filter(i => i.vessel_id === vessel.id);
      setVesselIncidents(vesselIncidents);
      
    } catch (err) {
      console.error('Error fetching vessel logs:', err);
      setError('Error loading vessel logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  // CSV Export Functions
  const exportVesselTripsToCSV = () => {
    if (vesselRunningLogs.length === 0) return;
    const headers = ['Trip Name', 'Depart Date', 'Return Date', 'Captain', 'Created At'];
    const csvRows = [headers.join(','), ...vesselRunningLogs.map(t => [
      `"${(t.trip_name || '').replace(/"/g, '""')}"`,
      `"${t.depart_datetime ? new Date(t.depart_datetime).toLocaleString() : ''}"`,
      `"${t.return_datetime ? new Date(t.return_datetime).toLocaleString() : ''}"`,
      `"${(t.captain || '').replace(/"/g, '""')}"`,
      `"${t.created_at ? new Date(t.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `vessel_trips_${selectedVesselForLogs?.vessel_name}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportVesselStaffToCSV = () => {
    if (vesselStaffLogs.length === 0) return;
    const headers = ['Staff Name', 'Shift Start', 'Shift End', 'Task Performed', 'Total Hours', 'Trip ID'];
    const csvRows = [headers.join(','), ...vesselStaffLogs.map(s => [
      `"${(s.staff_name || '').replace(/"/g, '""')}"`,
      `"${s.shift_start_datetime ? new Date(s.shift_start_datetime).toLocaleString() : ''}"`,
      `"${s.shift_stop_datetime ? new Date(s.shift_stop_datetime).toLocaleString() : ''}"`,
      `"${(s.task_performed || '').replace(/"/g, '""')}"`,
      `"${s.total_hours || ''}"`,
      `"${s.trip_id || 'Manual'}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `vessel_staff_${selectedVesselForLogs?.vessel_name}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportVesselRisksToCSV = () => {
    if (vesselRisks.length === 0) return;
    const headers = ['Activity/Task', 'Risk Level', 'Hazard', 'Control Measures', 'Assessment Date'];
    const csvRows = [headers.join(','), ...vesselRisks.map(r => [
      `"${(r.activity_task || '').replace(/"/g, '""')}"`,
      `"${r.risk_level || ''}"`,
      `"${(r.hazard_description || '').replace(/"/g, '""')}"`,
      `"${(r.control_measures || '').replace(/"/g, '""')}"`,
      `"${r.assessment_date ? new Date(r.assessment_date).toLocaleDateString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `vessel_risks_${selectedVesselForLogs?.vessel_name}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportVesselMaintenanceToCSV = () => {
    if (vesselMaintenance.length === 0) return;
    const headers = ['Type', 'Item/System', 'Status', 'Next Service Date', 'Last Service Date', 'Priority'];
    const csvRows = [headers.join(','), ...vesselMaintenance.map(m => [
      `"${(m.maintenance_type || '').replace(/"/g, '""')}"`,
      `"${(m.item_system || '').replace(/"/g, '""')}"`,
      `"${m.status || ''}"`,
      `"${m.next_service_date ? new Date(m.next_service_date).toLocaleDateString() : ''}"`,
      `"${m.last_service_date ? new Date(m.last_service_date).toLocaleDateString() : ''}"`,
      `"${m.priority || ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `vessel_maintenance_${selectedVesselForLogs?.vessel_name}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportVesselIncidentsToCSV = () => {
    if (vesselIncidents.length === 0) return;
    const headers = ['Incident #', 'Title', 'Type', 'Severity', 'Date', 'Status', 'Location'];
    const csvRows = [headers.join(','), ...vesselIncidents.map(i => [
      `"${i.incident_number || ''}"`,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${Array.isArray(i.incident_type) ? i.incident_type.join('; ') : (i.incident_type || '')}"`,
      `"${i.severity || ''}"`,
      `"${i.incident_date ? new Date(i.incident_date).toLocaleDateString() : ''}"`,
      `"${i.investigation_status || ''}"`,
      `"${(i.location || '').replace(/"/g, '""')}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `vessel_incidents_${selectedVesselForLogs?.vessel_name}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const checkDuplicates = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const checkData = {
        ...formData,
        id: formMode === 'edit' ? selectedVessel.id : null
      };
      
      const response = await axios.post(`${API}/vessels/check-duplicate`, checkData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (err) {
      console.error('Error checking duplicates:', err);
      return { has_duplicates: false, duplicates: [] };
    }
  };

  const handleSave = async (formData) => {
    setPendingFormData(formData);
    
    // Check for duplicates
    const duplicateCheck = await checkDuplicates(formData);
    
    if (duplicateCheck.has_duplicates) {
      setDuplicateWarning(duplicateCheck.duplicates);
      setShowDuplicateDialog(true);
      return; // Don't save yet, wait for user confirmation
    }
    
    // No duplicates, proceed with save
    await performSave(formData);
  };

  const performSave = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      if (formMode === 'create') {
        await axios.post(`${API}/vessels`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Vessel created successfully');
      } else {
        await axios.put(`${API}/vessels/${selectedVessel.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Vessel updated successfully');
      }
      
      setFormOpen(false);
      setShowDuplicateDialog(false);
      setPendingFormData(null);
      fetchVessels();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving vessel');
    }
  };

  const handleDelete = async (vesselId, vesselName) => {
    if (!window.confirm(`Are you sure you want to delete ${vesselName}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/vessels/${vesselId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Vessel deleted successfully');
      fetchVessels();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting vessel');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading vessels...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Vessel Management</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-blue-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-semibold mb-1">Marine Order 504 (2024)</p>
                  <p className="text-sm mb-2">
                    Requires certificates of operation, vessel stability risk management, notification of vessel alterations, and documented SMS for operational integrity.
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
          <p className="text-gray-500 mt-1">Manage your fleet of vessels and their certificates</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setManualLogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Add Vessel Log
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vessel
            </Button>
          </div>
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
          onClick={() => clearFilters()}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Vessels</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{vessels.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('Passenger');
            setFilters({
              vessel_types: [],
              min_length: '',
              max_length: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Passenger Vessels</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-blue-600">
              {vessels.filter(v => v.vessel_type?.includes('Passenger')).length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('Operational');
            setFilters({
              vessel_types: [],
              min_length: '',
              max_length: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Active Fleet</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-600">
              {vessels.filter(v => v.operational_status === 'Operational').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => clearFilters()}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-purple-600">
              {vessels.reduce((sum, v) => sum + (parseInt(v.max_passengers) || 0), 0)} pax
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Total passenger capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Clear All Button */}
            {(filters.vessel_types.length > 0 || filters.min_length || filters.max_length || searchQuery) && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, registration, type, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Multi-Select Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Vessel Type Multi-Select */}
              <div>
                <Label>Vessel Type</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {filters.vessel_types.length === 0 ? 'All Types' :
                         filters.vessel_types.length === 1 ? filters.vessel_types[0] :
                         `${filters.vessel_types.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Types</span>
                        {filters.vessel_types.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => clearFilter('vessel_types')} className="h-auto p-1 text-xs">
                            Clear
                          </Button>
                        )}
                      </div>
                      {vesselTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleFilter('vessel_types', type)}>
                          <Checkbox checked={filters.vessel_types.includes(type)} onCheckedChange={() => toggleFilter('vessel_types', type)} />
                          <label className="text-sm flex-1 cursor-pointer">{type}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.vessel_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.vessel_types.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                        <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('vessel_types', type)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Length Range Filters */}
              <div>
                <Label htmlFor="min_length">From Length (m)</Label>
                <Input 
                  id="min_length" 
                  type="number" 
                  placeholder="Min length"
                  value={filters.min_length}
                  onChange={(e) => setFilterValue('min_length', e.target.value)} 
                />
              </div>
              
              <div>
                <Label htmlFor="max_length">To Length (m)</Label>
                <Input 
                  id="max_length" 
                  type="number" 
                  placeholder="Max length"
                  value={filters.max_length}
                  onChange={(e) => setFilterValue('max_length', e.target.value)} 
                />
              </div>

              {/* Sort By */}
              <div>
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="type">Vessel Type</SelectItem>
                    <SelectItem value="year">Year Built (Newest)</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Counter */}
            <div className="text-sm text-gray-500">
              Showing {filteredVessels.length} of {vessels.length} vessels
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vessels List - Responsive Card Layout */}
      <ResponsiveListCard
        items={filteredVessels}
        renderIcon={(vessel) => <Ship className="h-5 w-5 text-blue-600" />}
        renderContent={(vessel) => (
          <>
            {/* Vessel Name */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {vessel.vessel_name}
              </div>
              <div className="text-sm text-gray-500 truncate sm:hidden">
                {vessel.vessel_type || 'N/A'}
              </div>
            </div>

            {/* Registration */}
            <div className="hidden sm:block w-32 flex-shrink-0">
              <span className="text-sm text-gray-600">
                {vessel.registration_number || '-'}
              </span>
            </div>

            {/* Type Badge */}
            <div className="hidden sm:block flex-shrink-0">
              <Badge variant="outline" className="whitespace-nowrap text-xs">
                {vessel.vessel_type || 'N/A'}
              </Badge>
            </div>

            {/* Owner */}
            <div className="hidden md:block w-36 flex-shrink-0">
              <span className="text-sm text-gray-600 truncate block">
                {vessel.owner_name || '-'}
              </span>
            </div>

            {/* Specifications */}
            <div className="hidden lg:block w-28 flex-shrink-0 text-center">
              <span className="text-sm text-gray-600">
                {vessel.length_overall ? `${vessel.length_overall}m × ${vessel.beam}m` : '-'}
              </span>
            </div>

            {/* Status Badge */}
            <div className="hidden xl:block flex-shrink-0">
              <Badge 
                variant={vessel.operational_status === 'Operational' ? 'default' : 'secondary'}
                className="text-xs whitespace-nowrap"
              >
                {vessel.operational_status || 'Unknown'}
              </Badge>
            </div>

            {/* Survey Expiry */}
            <div className="hidden xl:block w-28 flex-shrink-0">
              <span className="text-sm text-gray-600">
                {vessel.cert_survey_expiry ? formatDate(vessel.cert_survey_expiry) : '-'}
              </span>
            </div>
          </>
        )}
        renderActions={(vessel) => (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewLogs(vessel)}
              title="View logs"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(vessel)}
                title="Edit vessel"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(vessel.id, vessel.vessel_name)}
                title="Delete vessel"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        emptyState={{
          icon: Ship,
          title: 'No vessels found',
          message: searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first vessel',
          action: canEdit && !searchQuery ? {
            label: 'Add Vessel',
            onClick: handleCreate,
            icon: Plus
          } : undefined
        }}
      />

      {/* Vessel Form Dialog */}
      <VesselForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        vessel={selectedVessel}
        mode={formMode}
      />

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Potential Duplicate Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following fields match existing records:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-4">
            {duplicateWarning?.map((dup, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-semibold text-sm text-yellow-800 mb-1">
                  {dup.field === 'registration_number' && '⚠️ Registration Number'}
                  {dup.field === 'vessel_name' && '⚠️ Vessel Name'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Value:</span> {dup.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Existing Record:</span>{' '}
                  {dup.existing_record.name} ({dup.existing_record.type || dup.existing_record.registration})
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDuplicateDialog(false);
              setPendingFormData(null);
              setDuplicateWarning(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => performSave(pendingFormData)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Override and Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual Vessel Log Entry Dialog */}
      <ManualLogEntry
        open={manualLogOpen}
        onClose={() => {
          setManualLogOpen(false);
          fetchVessels(); // Refresh data
        }}
        type="running"
      />

      {/* Vessel Details & Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              🚢 {selectedVesselForLogs?.vessel_name || 'Vessel'} - Details & Activity
            </DialogTitle>
            <DialogDescription>
              View vessel information, trip logs and allocated staff activity
            </DialogDescription>
          </DialogHeader>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading data...</div>
            </div>
          ) : (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Vessel Details</TabsTrigger>
                <TabsTrigger value="running">Trip Logs ({vesselRunningLogs.length})</TabsTrigger>
                <TabsTrigger value="staff">Allocated Staff ({vesselStaffLogs.length})</TabsTrigger>
                <TabsTrigger value="risks">Risk Assessments ({vesselRisks.length})</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance ({vesselMaintenance.length})</TabsTrigger>
                <TabsTrigger value="incidents">Incidents ({vesselIncidents.length})</TabsTrigger>
              </TabsList>

              {/* Vessel Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {selectedVesselForLogs && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Vessel Name</span>
                          <p className="font-medium">{selectedVesselForLogs.vessel_name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Registration Number</span>
                          <p className="font-medium">{selectedVesselForLogs.registration_number || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Vessel Type</span>
                          <Badge variant="outline">{selectedVesselForLogs.vessel_type || 'N/A'}</Badge>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Owner Name</span>
                          <p className="font-medium">{selectedVesselForLogs.owner_name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Operational Status</span>
                          <Badge variant={selectedVesselForLogs.operational_status === 'Operational' ? 'default' : 'secondary'}>
                            {selectedVesselForLogs.operational_status || 'Unknown'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Specifications */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Specifications</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Length Overall</span>
                          <p className="font-medium">{selectedVesselForLogs.length_overall ? `${selectedVesselForLogs.length_overall}m` : '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Beam</span>
                          <p className="font-medium">{selectedVesselForLogs.beam ? `${selectedVesselForLogs.beam}m` : '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Draft</span>
                          <p className="font-medium">{selectedVesselForLogs.draft ? `${selectedVesselForLogs.draft}m` : '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Gross Tonnage</span>
                          <p className="font-medium">{selectedVesselForLogs.gross_tonnage || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Year Built</span>
                          <p className="font-medium">{selectedVesselForLogs.year_built || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Engine Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Engine Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Number of Engines</span>
                          <p className="font-medium">{selectedVesselForLogs.number_of_engines || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Engine Type</span>
                          <p className="font-medium">{selectedVesselForLogs.engine_type || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Engine Power</span>
                          <p className="font-medium">{selectedVesselForLogs.engine_power ? `${selectedVesselForLogs.engine_power} kW` : '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Boat Phone</span>
                          <p className="font-medium">{selectedVesselForLogs.boat_phone || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Flag</span>
                          <p className="font-medium">{selectedVesselForLogs.flag || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Port of Registry</span>
                          <p className="font-medium">{selectedVesselForLogs.port_of_registry || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Trip Logs Tab */}
              <TabsContent value="running" className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  Running logs and activity entries for {selectedVesselForLogs?.vessel_name}
                </div>
                {vesselRunningLogs.length > 0 ? (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Crew</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vesselRunningLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">
                              {log.log_datetime ? new Date(log.log_datetime).toLocaleString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {log.category || 'General'}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.activity || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {log.activity_details || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {log.crew_name || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No trip logs recorded for this vessel
                  </div>
                )}
              </TabsContent>

              <TabsContent value="staff" className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  Crew shift logs for staff allocated to {selectedVesselForLogs?.vessel_name}
                </div>
                {vesselStaffLogs.length > 0 ? (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shift Start</TableHead>
                          <TableHead>Shift End</TableHead>
                          <TableHead>Crew Member</TableHead>
                          <TableHead>Task Performed</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Trip ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vesselStaffLogs.map((shift) => (
                          <TableRow key={shift.id}>
                            <TableCell className="font-medium">
                              {shift.shift_start_datetime ? new Date(shift.shift_start_datetime).toLocaleString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {shift.shift_stop_datetime ? new Date(shift.shift_stop_datetime).toLocaleString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                👤 {shift.crew_name || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {shift.task_performed || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {shift.total_hours ? `${shift.total_hours}h` : 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {shift.trip_id ? `${shift.trip_id.substring(0, 8)}...` : 'Manual'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No staff shift logs recorded for this vessel
                  </div>
                )}
              </TabsContent>

              {/* Risk Assessments Tab */}
              <TabsContent value="risks" className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  Risk assessments related to {selectedVesselForLogs?.vessel_name}
                </div>
                {vesselRisks.length > 0 ? (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity/Task</TableHead>
                          <TableHead>Risk Level</TableHead>
                          <TableHead>Hazard</TableHead>
                          <TableHead>Control Measures</TableHead>
                          <TableHead>Assessment Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vesselRisks.map((risk) => (
                          <TableRow key={risk.id}>
                            <TableCell className="font-medium">{risk.activity_task}</TableCell>
                            <TableCell>
                              <Badge variant={risk.risk_level === 'High' ? 'destructive' : risk.risk_level === 'Medium' ? 'default' : 'secondary'}>
                                {risk.risk_level}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{risk.hazard_description || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{risk.control_measures || '-'}</TableCell>
                            <TableCell>{risk.assessment_date ? new Date(risk.assessment_date).toLocaleDateString() : 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No risk assessments for this vessel
                  </div>
                )}
              </TabsContent>

              {/* Maintenance Tab */}
              <TabsContent value="maintenance" className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  Maintenance records for {selectedVesselForLogs?.vessel_name}
                </div>
                {vesselMaintenance.length > 0 ? (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Item/System</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Next Service Date</TableHead>
                          <TableHead>Last Service Date</TableHead>
                          <TableHead>Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vesselMaintenance.map((maintenance) => (
                          <TableRow key={maintenance.id}>
                            <TableCell>
                              <Badge variant="outline">{maintenance.maintenance_type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{maintenance.item_system}</TableCell>
                            <TableCell>
                              <Badge variant={maintenance.status === 'Completed' ? 'default' : maintenance.status === 'Overdue' ? 'destructive' : 'secondary'}>
                                {maintenance.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{maintenance.next_service_date ? new Date(maintenance.next_service_date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>{maintenance.last_service_date ? new Date(maintenance.last_service_date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={maintenance.priority === 'High' ? 'destructive' : 'secondary'}>
                                {maintenance.priority || 'Normal'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No maintenance records for this vessel
                  </div>
                )}
              </TabsContent>

              {/* Incidents Tab */}
              <TabsContent value="incidents" className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  Incidents involving {selectedVesselForLogs?.vessel_name}
                </div>
                {vesselIncidents.length > 0 ? (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Incident #</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vesselIncidents.map((incident) => (
                          <TableRow key={incident.id}>
                            <TableCell className="font-medium">{incident.incident_number}</TableCell>
                            <TableCell className="max-w-xs truncate">{incident.title}</TableCell>
                            <TableCell>
                              <div className="text-xs">
                                {Array.isArray(incident.incident_type) 
                                  ? incident.incident_type.slice(0, 2).join(', ') + (incident.incident_type.length > 2 ? '...' : '')
                                  : incident.incident_type}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={incident.severity === 'Critical' || incident.severity === 'Serious' ? 'destructive' : 'secondary'}>
                                {incident.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>{incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{incident.investigation_status}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{incident.location || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No incidents recorded for this vessel
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VesselManagement;
