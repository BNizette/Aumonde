import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, Search, Filter, X, Eye, AlertTriangle, FileText, Download, ChevronDown, Info, Activity, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveListCard } from '@/components/ui/responsive-list-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CrewForm from './CrewForm';
import ManualLogEntry from './ManualLogEntry';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CrewManagement = () => {
  const location = useLocation();
  const [crewList, setCrewList] = useState([]);
  const [filteredCrew, setFilteredCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [positions, setPositions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [prefilledData, setPrefilledData] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingCrew, setViewingCrew] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [selectedCrewForLogs, setSelectedCrewForLogs] = useState(null);
  const [crewTrips, setCrewTrips] = useState([]);
  const [crewShifts, setCrewShifts] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [crewDrillRecords, setCrewDrillRecords] = useState([]);
  const [crewTrainingRecords, setCrewTrainingRecords] = useState([]);
  const [manualCrewLogOpen, setManualCrewLogOpen] = useState(false);

  // Use custom hook for advanced filtering
  const {
    filters,
    setFilters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters: clearAllFiltersHook,
    updateFilters
  } = useAdvancedFilters({
    positions: [],
    roles: [],
    start_date: '',
    end_date: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = currentUser.access_level === 'Edit' || currentUser.access_level === 'Full';
  const canDelete = currentUser.access_level === 'Full';

  useEffect(() => {
    fetchCrew();
  }, []);

  // Handle navigation from Admin Panel
  useEffect(() => {
    if (location.state?.editCrewId && crewList.length > 0) {
      const crew = crewList.find(c => c.id === location.state.editCrewId);
      if (crew) {
        handleEdit(crew);
      }
      // Clear state
      window.history.replaceState({}, document.title);
    } else if (location.state?.createWithEmail) {
      setPrefilledData({
        email: location.state.createWithEmail,
        staff_name: location.state.createWithName || ''
      });
      setFormMode('create');
      setSelectedCrew(null);
      setFormOpen(true);
      // Clear state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, crewList]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filters, sortBy, crewList]);

  const applyFiltersAndSort = () => {
    let filtered = [...crewList];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(member =>
        member.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.default_position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.telephone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply multi-select position filter
    if (filters.positions.length > 0) {
      filtered = filtered.filter(member => 
        filters.positions.some(pos => member.default_position?.toLowerCase().includes(pos.toLowerCase()))
      );
    }

    // Apply multi-select role filter
    if (filters.roles.length > 0) {
      filtered = filtered.filter(member => 
        filters.roles.includes(member.role)
      );
    }

    // Apply date range filter
    if (filters.start_date || filters.end_date) {
      filtered = filtered.filter(member => {
        if (!member.date_commenced) return false;
        
        const memberDate = new Date(member.date_commenced);
        const startDate = filters.start_date ? new Date(filters.start_date) : null;
        const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59') : null;

        if (startDate && memberDate < startDate) return false;
        if (endDate && memberDate > endDate) return false;
        
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.staff_name || '').localeCompare(b.staff_name || '');
        case 'position':
          return (a.default_position || '').localeCompare(b.default_position || '');
        case 'role':
          return (a.role || '').localeCompare(b.role || '');
        case 'date':
          return (b.date_commenced || '').localeCompare(a.date_commenced || '');
        default:
          return 0;
      }
    });

    setFilteredCrew(filtered);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    clearAllFiltersHook();
  };

  // Export Allocated Ships to CSV
  const exportAllocatedShipsToCSV = () => {
    if (crewTrips.length === 0) {
      setError('No allocated ships data to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = [
      'Trip Name',
      'Vessel',
      'Position',
      'Departure Date',
      'Return Date',
      'Status',
      'Trip ID'
    ];

    const csvRows = [headers.join(','), ...crewTrips.map(allocation => [
      `"${allocation.trip?.trip_name || 'N/A'}"`,
      `"${allocation.trip?.vessel_name || 'N/A'}"`,
      `"${allocation.position || 'N/A'}"`,
      `"${allocation.trip?.depart_datetime ? new Date(allocation.trip.depart_datetime).toLocaleDateString() : 'N/A'}"`,
      `"${allocation.trip?.return_datetime ? new Date(allocation.trip.return_datetime).toLocaleDateString() : 'N/A'}"`,
      `"${allocation.trip?.status || 'N/A'}"`,
      `"${allocation.trip_id || 'N/A'}"`
    ].join(','))];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allocated_ships_${selectedCrew?.staff_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setMessage('Allocated ships exported to CSV successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  // Export Crew Shifts to CSV
  const exportCrewShiftsToExcel = () => {
    if (crewShifts.length === 0) { setError('No crew shifts data to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Shift Start', 'Shift End', 'Vessel', 'Task Performed', 'Total Hours', 'Trip ID'];
    const data = [headers, ...crewShifts.map(shift => [
      shift.shift_start_datetime ? new Date(shift.shift_start_datetime).toLocaleString() : '-',
      shift.shift_stop_datetime ? new Date(shift.shift_stop_datetime).toLocaleString() : '-',
      shift.vessel_name || '-', shift.task_performed || '-',
      shift.total_hours ? `${shift.total_hours}h` : '-', shift.trip_id ? shift.trip_id.substring(0, 8) + '...' : 'Manual'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Crew Shifts');
    XLSX.writeFile(wb, `crew_shifts_${selectedCrew?.staff_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Crew shifts exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportToExcel = () => {
    if (filteredCrew.length === 0) { setError('No crew to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Staff Name', 'Position', 'Role', 'Mobile', 'Email', 'Status', 'Date Commenced', 'Next of Kin', 'Next of Kin Contact'];
    const data = [headers, ...filteredCrew.map(c => [
      c.staff_name || '-', c.default_position || '-', c.role || '-', c.mobile || '-', c.email || '-',
      c.status || '-', c.date_commenced ? new Date(c.date_commenced).toLocaleDateString() : '-',
      c.next_of_kin || '-', c.next_of_kin_contact || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Crew');
    XLSX.writeFile(wb, `crew_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredCrew.length} crew members to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    clearAllFilters();
    setSortBy('name');
  };

  const hasActiveFilters = searchQuery || filters.positions.length > 0 || filters.roles.length > 0 || filters.start_date || filters.end_date || sortBy !== 'name';

  const fetchCrew = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/crew`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrewList(response.data);
      setFilteredCrew(response.data);
      
      // Extract unique values for filters
      const uniquePositions = [...new Set(response.data.map(c => c.default_position).filter(Boolean))];
      const uniqueRoles = [...new Set(response.data.map(c => c.role).filter(Boolean))];
      setPositions(uniquePositions);
      setRoles(uniqueRoles);
    } catch (err) {
      setError('Error fetching crew');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedCrew(null);
    setFormOpen(true);
  };

  const handleEdit = (crew) => {
    setFormMode('edit');
    setSelectedCrew(crew);
    setFormOpen(true);
  };

  const handleView = async (crew) => {
    setViewingCrew(crew);
    setSelectedCrewForLogs(crew);
    setViewDialogOpen(true);
    setLoadingLogs(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Fetch allocated trips for this crew
      const allocatedResponse = await axios.get(`${API}/allocated-crew`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allAllocations = allocatedResponse.data;
      const crewAllocations = allAllocations.filter(alloc => alloc.crew_id === crew.id);
      setCrewTrips(crewAllocations);

      // Fetch crew shifts (trip logs) for this crew
      const logsResponse = await axios.get(`${API}/trip-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const crewLogs = logsResponse.data.filter(log => log.crew_id === crew.id);
      
      // Fetch vessels to get vessel names
      const vesselsResponse = await axios.get(`${API}/vessels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const vessels = vesselsResponse.data;
      
      // Fetch trips to get vessel info from trips
      const tripsResponse = await axios.get(`${API}/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const trips = tripsResponse.data;
      
      // Enrich crew logs with vessel names
      const enrichedLogs = crewLogs.map(log => {
        let vesselName = null;
        
        // First try to get vessel from trip
        if (log.trip_id) {
          const trip = trips.find(t => t.id === log.trip_id);
          if (trip && trip.vessel_id) {
            const vessel = vessels.find(v => v.id === trip.vessel_id);
            vesselName = vessel?.vessel_name || null;
          }
        }
        
        // If manual entry with vessel_id, get vessel directly
        if (!vesselName && log.vessel_id) {
          const vessel = vessels.find(v => v.id === log.vessel_id);
          vesselName = vessel?.vessel_name || null;
        }
        
        return {
          ...log,
          vessel_name: vesselName
        };
      });
      
      setCrewShifts(enrichedLogs);

      // Fetch drill records for this crew member
      const drillRecordsResponse = await axios.get(`${API}/crew/${encodeURIComponent(crew.staff_name)}/drill-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrewDrillRecords(drillRecordsResponse.data);

      // Fetch training records for this crew member
      const trainingRecordsResponse = await axios.get(`${API}/crew/${encodeURIComponent(crew.staff_name)}/training-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrewTrainingRecords(trainingRecordsResponse.data);
      
    } catch (err) {
      console.error('Error fetching crew data:', err);
      setError('Error loading crew data');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Tab Export Functions (Excel)
  const exportCrewTripsToExcel = () => {
    if (crewTrips.length === 0) return;
    const wb = XLSX.utils.book_new();
    const headers = ['Trip Name', 'Vessel', 'Start Date', 'End Date', 'Position', 'Status'];
    const data = [headers, ...crewTrips.map(t => [
      t.trip_name || '-', t.vessel_name || '-',
      t.start_date ? new Date(t.start_date).toLocaleDateString() : '-',
      t.end_date ? new Date(t.end_date).toLocaleDateString() : '-',
      t.position || '-', t.status || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Trip Allocations');
    XLSX.writeFile(wb, `crew_trips_${selectedCrewForLogs?.staff_name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportCrewDrillsToExcel = () => {
    if (crewDrillRecords.length === 0) return;
    const wb = XLSX.utils.book_new();
    const headers = ['Drill Type', 'Record Date', 'Status', 'Authorized By', 'Notes'];
    const data = [headers, ...crewDrillRecords.map(d => [
      d.drill_type || '-', d.record_date ? new Date(d.record_date).toLocaleString() : '-',
      d.status || '-', d.authorized_by || '-', d.notes || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Drills');
    XLSX.writeFile(wb, `crew_drills_${selectedCrewForLogs?.staff_name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportCrewTrainingToExcel = () => {
    if (crewTrainingRecords.length === 0) return;
    const wb = XLSX.utils.book_new();
    const headers = ['Procedure', 'Emergency Type', 'Training Date', 'Status', 'Authorized By', 'Notes'];
    const data = [headers, ...crewTrainingRecords.map(t => [
      t.procedure_title || '-', t.emergency_type || '-',
      t.training_date ? new Date(t.training_date).toLocaleString() : '-',
      t.status || '-', t.authorized_by || '-', t.notes || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Training');
    XLSX.writeFile(wb, `crew_training_${selectedCrewForLogs?.staff_name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export all crew data to Excel with multiple worksheets
  const exportCrewToExcel = () => {
    if (!viewingCrew) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Crew Details
    const detailsData = [
      ['Crew Member Details'],
      [''],
      ['Field', 'Value'],
      ['Name', viewingCrew.staff_name || 'N/A'],
      ['Position', viewingCrew.default_position || 'N/A'],
      ['Role', viewingCrew.role || 'N/A'],
      ['Mobile', viewingCrew.mobile || 'N/A'],
      ['Telephone', viewingCrew.telephone || 'N/A'],
      ['Email', viewingCrew.email || 'N/A'],
      ['Address', viewingCrew.address || 'N/A'],
      ['Date of Birth', viewingCrew.date_of_birth ? new Date(viewingCrew.date_of_birth).toLocaleDateString() : 'N/A'],
      ['Gender', viewingCrew.gender || 'N/A'],
      ['Next of Kin', viewingCrew.next_of_kin || 'N/A'],
      ['Next of Kin Contact', viewingCrew.next_of_kin_contact || 'N/A'],
      ['Date Commenced', viewingCrew.date_commenced ? new Date(viewingCrew.date_commenced).toLocaleDateString() : 'N/A'],
      ['Date Ceased', viewingCrew.date_ceased ? new Date(viewingCrew.date_ceased).toLocaleDateString() : 'N/A'],
      ['Status', viewingCrew.status || 'N/A'],
      ['License Number', viewingCrew.license_number || 'N/A'],
      ['License Expiry', viewingCrew.license_expiry ? new Date(viewingCrew.license_expiry).toLocaleDateString() : 'N/A'],
      ['Medical Cert Expiry', viewingCrew.medical_cert_expiry ? new Date(viewingCrew.medical_cert_expiry).toLocaleDateString() : 'N/A'],
      [''],
      ['Qualifications'],
    ];
    
    // Add qualifications
    if (viewingCrew.qualifications && viewingCrew.qualifications.length > 0) {
      detailsData.push(['Name', 'Date', 'Years']);
      viewingCrew.qualifications.forEach(qual => {
        detailsData.push([
          qual.name || 'N/A',
          qual.date ? new Date(qual.date).toLocaleDateString() : 'N/A',
          qual.date ? calculateYears(qual.date) : 'N/A'
        ]);
      });
    } else {
      detailsData.push(['No qualifications recorded']);
    }

    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    wsDetails['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Crew Details');

    // Sheet 2: Trip Allocations
    const tripsHeaders = ['Trip Name', 'Vessel', 'Start Date', 'End Date', 'Position', 'Status'];
    const tripsData = [tripsHeaders];
    crewTrips.forEach(allocation => {
      tripsData.push([
        allocation.trip_name || 'N/A',
        allocation.vessel_name || 'N/A',
        allocation.start_date ? new Date(allocation.start_date).toLocaleDateString() : 'N/A',
        allocation.end_date ? new Date(allocation.end_date).toLocaleDateString() : 'N/A',
        allocation.position || 'N/A',
        allocation.status || 'N/A'
      ]);
    });
    if (crewTrips.length === 0) {
      tripsData.push(['No trip allocations recorded', '', '', '', '', '']);
    }
    const wsTrips = XLSX.utils.aoa_to_sheet(tripsData);
    wsTrips['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTrips, 'Trip Allocations');

    // Sheet 3: Crew Shifts
    const shiftsHeaders = ['Shift Start', 'Shift End', 'Vessel', 'Task Performed', 'Total Hours', 'Trip ID'];
    const shiftsData = [shiftsHeaders];
    crewShifts.forEach(shift => {
      shiftsData.push([
        shift.shift_start_datetime ? new Date(shift.shift_start_datetime).toLocaleString() : 'N/A',
        shift.shift_stop_datetime ? new Date(shift.shift_stop_datetime).toLocaleString() : 'N/A',
        shift.vessel_name || '-',
        shift.task_performed || '-',
        shift.total_hours ? `${shift.total_hours}h` : 'N/A',
        shift.trip_id ? shift.trip_id.substring(0, 8) + '...' : 'Manual'
      ]);
    });
    if (crewShifts.length === 0) {
      shiftsData.push(['No crew shifts recorded', '', '', '', '', '']);
    }
    const wsShifts = XLSX.utils.aoa_to_sheet(shiftsData);
    wsShifts['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsShifts, 'Crew Shifts');

    // Sheet 4: Drills
    const drillsHeaders = ['Drill Type', 'Record Date', 'Status', 'Authorized By', 'Notes'];
    const drillsData = [drillsHeaders];
    crewDrillRecords.forEach(record => {
      drillsData.push([
        record.drill_type || 'N/A',
        record.record_date ? new Date(record.record_date).toLocaleString() : 'N/A',
        record.status || 'N/A',
        record.authorized_by || 'N/A',
        record.notes || '-'
      ]);
    });
    if (crewDrillRecords.length === 0) {
      drillsData.push(['No drill records recorded', '', '', '', '']);
    }
    const wsDrills = XLSX.utils.aoa_to_sheet(drillsData);
    wsDrills['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsDrills, 'Drills');

    // Sheet 5: Training
    const trainingHeaders = ['Procedure', 'Emergency Type', 'Training Date', 'Status', 'Authorized By', 'Notes'];
    const trainingData = [trainingHeaders];
    crewTrainingRecords.forEach(record => {
      trainingData.push([
        record.procedure_title || 'N/A',
        record.emergency_type || 'N/A',
        record.training_date ? new Date(record.training_date).toLocaleString() : 'N/A',
        record.status || 'N/A',
        record.authorized_by || 'N/A',
        record.notes || '-'
      ]);
    });
    if (crewTrainingRecords.length === 0) {
      trainingData.push(['No training records recorded', '', '', '', '', '']);
    }
    const wsTraining = XLSX.utils.aoa_to_sheet(trainingData);
    wsTraining['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsTraining, 'Training');

    // Generate and download file
    const fileName = `${viewingCrew.staff_name?.replace(/\s+/g, '_')}_details_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setMessage('Crew data exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const checkDuplicates = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const checkData = {
        ...formData,
        id: formMode === 'edit' ? selectedCrew.id : null
      };
      
      const response = await axios.post(`${API}/crew/check-duplicate`, checkData, {
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
        await axios.post(`${API}/crew`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Crew member created successfully');
      } else {
        await axios.put(`${API}/crew/${selectedCrew.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Crew member updated successfully');
      }
      
      setFormOpen(false);
      setShowDuplicateDialog(false);
      setPendingFormData(null);
      fetchCrew();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving crew member');
    }
  };

  const handleDelete = async (crewId, crewName) => {
    if (!window.confirm(`Are you sure you want to delete ${crewName}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/crew/${crewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Crew member deleted successfully');
      fetchCrew();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting crew member');
    }
  };

  const calculateYears = (dateStr) => {
    if (!dateStr) return null;
    const qualDate = new Date(dateStr);
    const now = new Date();
    const years = (now - qualDate) / (365.25 * 24 * 60 * 60 * 1000);
    return years.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading crew...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Crew Management</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-blue-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-semibold mb-1">MO504 - Schedule 1 Clause 6(4)</p>
                  <p className="text-sm mb-2">
                    Requires crewing evaluation, fatigue risk management, crew certificates of competency, and documented SMS including crew training and responsibilities.
                  </p>
                  <a 
                    href="https://www.amsa.gov.au/vessels-operators/domestic-commercial-vessels/crewing-guidance-domestic-commercial-vessels"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    View AMSA Crewing Guidance →
                  </a>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-gray-500 mt-1">Manage crew members and their qualifications</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setManualCrewLogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Add Crew Log
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Crew Member
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
          onClick={() => {
            setSearchQuery('');
            updateFilters({
              positions: [],
              roles: [],
              start_date: '',
              end_date: ''
            });
            setSortBy('name');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Crew</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold">{crewList.length}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('');
            updateFilters({
              positions: ['Master'],
              roles: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Masters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-blue-600">
              {crewList.filter(c => c.default_position === 'Master').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('');
            updateFilters({
              positions: ['Engineer'],
              roles: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Engineers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-600">
              {crewList.filter(c => c.default_position?.includes('Engineer')).length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSearchQuery('');
            updateFilters({
              positions: ['Crew', 'Deckhand'],
              roles: [],
              start_date: '',
              end_date: ''
            });
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Crew Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-purple-600">
              {crewList.filter(c => c.default_position === 'Crew' || c.default_position === 'Deckhand').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
            <FileSpreadsheet className="h-4 w-4" />
            Export to Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(filters.positions.length > 0 || filters.roles.length > 0 || filters.start_date || filters.end_date || searchQuery) && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, contact, or position..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Position</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">{filters.positions.length === 0 ? 'All Positions' : filters.positions.length === 1 ? filters.positions[0] : `${filters.positions.length} selected`}</span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Positions</span>
                        {filters.positions.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('positions')} className="h-auto p-1 text-xs">Clear</Button>)}
                      </div>
                      {positions.map(pos => (<div key={pos} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('positions', pos)}>
                        <Checkbox checked={filters.positions.includes(pos)} onCheckedChange={() => toggleFilter('positions', pos)} />
                        <label className="text-sm flex-1 cursor-pointer">{pos}</label>
                      </div>))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.positions.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.positions.map(pos => (<Badge key={pos} variant="secondary" className="text-xs">{pos}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('positions', pos)} /></Badge>))}</div>)}
              </div>
              <div>
                <Label>Role</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">{filters.roles.length === 0 ? 'All Roles' : filters.roles.length === 1 ? filters.roles[0] : `${filters.roles.length} selected`}</span>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <span className="text-sm font-medium">Select Roles</span>
                        {filters.roles.length > 0 && (<Button variant="ghost" size="sm" onClick={() => clearFilter('roles')} className="h-auto p-1 text-xs">Clear</Button>)}
                      </div>
                      {roles.map(role => (<div key={role} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer" onClick={() => toggleFilter('roles', role)}>
                        <Checkbox checked={filters.roles.includes(role)} onCheckedChange={() => toggleFilter('roles', role)} />
                        <label className="text-sm flex-1 cursor-pointer">{role}</label>
                      </div>))}
                    </div>
                  </PopoverContent>
                </Popover>
                {filters.roles.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{filters.roles.map(role => (<Badge key={role} variant="secondary" className="text-xs">{role}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleFilter('roles', role)} /></Badge>))}</div>)}
              </div>
              <div>
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="date">Date Commenced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div><Label htmlFor="start_date">From Date</Label><Input id="start_date" type="date" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} /></div>
              <div><Label htmlFor="end_date">To Date</Label><Input id="end_date" type="date" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} /></div>
              <div>{(filters.start_date || filters.end_date) && (<Button variant="outline" size="sm" onClick={clearDateFilters} className="w-full"><X className="h-4 w-4 mr-2" />Clear Date Range</Button>)}</div>
            </div>
            <div className="text-sm text-gray-500">Showing {filteredCrew.length} of {crewList.length} crew members</div>
          </div>
        </CardContent>
      </Card>

      {/* Crew List */}
      <ResponsiveListCard
        items={filteredCrew}
        renderIcon={(member) => <Users className="h-5 w-5 text-orange-600" />}
        renderContent={(member) => (
          <>
            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {member.staff_name}
              </div>
            </div>

            {/* Position */}
            <div className="hidden sm:block w-32 flex-shrink-0">
              <span className="text-sm text-gray-600">
                {member.default_position || '-'}
              </span>
            </div>

            {/* Role Badge */}
            <div className="hidden md:block flex-shrink-0">
              <Badge variant="outline" className="whitespace-nowrap">
                {member.role || 'Crew'}
              </Badge>
            </div>

            {/* Mobile */}
            <div className="hidden lg:block w-36 flex-shrink-0">
              <span className="text-sm text-gray-600">
                {member.mobile || '-'}
              </span>
            </div>

            {/* Qualifications Count */}
            <div className="hidden xl:block w-24 flex-shrink-0 text-center">
              <span className="text-sm text-gray-600">
                {member.qualifications && member.qualifications.length > 0 
                  ? `${member.qualifications.length} quals`
                  : '-'}
              </span>
            </div>
          </>
        )}
        renderActions={(member) => (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleView(member)}
              title="View details & logs"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(member)}
                title="Edit crew member"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(member.id, member.staff_name)}
                title="Delete crew member"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        emptyState={{
          icon: Users,
          title: 'No crew members found',
          message: (searchQuery || hasActiveFilters) ? 'Try adjusting your search criteria' : 'Get started by adding your first crew member',
          action: canEdit && !searchQuery ? {
            label: 'Add Crew Member',
            onClick: handleCreate,
            icon: Plus
          } : undefined
        }}
      />

      {/* Crew Form Dialog */}
      <CrewForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setPrefilledData(null);
        }}
        onSave={handleSave}
        crew={selectedCrew}
        mode={formMode}
        prefilledData={prefilledData}
      />

      {/* View Details & Logs Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle>👤 {viewingCrew?.staff_name} - Details & Activity</DialogTitle>
                <DialogDescription>View crew member information, trip allocations and shift logs</DialogDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportCrewToExcel}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </DialogHeader>
          
          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading data...</div>
            </div>
          ) : (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Crew Details</TabsTrigger>
                <TabsTrigger value="trips">Trip Allocations ({crewTrips.length})</TabsTrigger>
                <TabsTrigger value="shifts">Crew Shifts ({crewShifts.length})</TabsTrigger>
                <TabsTrigger value="drills">Drills ({crewDrillRecords.length})</TabsTrigger>
                <TabsTrigger value="training">Training ({crewTrainingRecords.length})</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details">
          <ScrollArea className="h-[500px] pr-4">
            {viewingCrew && (
              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Position:</span> {viewingCrew.default_position || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span> {viewingCrew.role || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Mobile:</span> {viewingCrew.mobile || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Telephone:</span> {viewingCrew.telephone || 'N/A'}
                    </div>
                    {viewingCrew.address && (
                      <div className="col-span-2">
                        <span className="font-medium">Address:</span> {viewingCrew.address}
                      </div>
                    )}
                  </div>
                </div>

                {/* Qualifications */}
                {viewingCrew.qualifications && viewingCrew.qualifications.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Qualifications</h3>
                    <div className="space-y-2">
                      {viewingCrew.qualifications.map((qual, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-medium">{qual.name}</div>
                          {qual.date && (
                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <span>Date: {new Date(qual.date).toLocaleDateString()}</span>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Years: {calculateYears(qual.date)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {viewingCrew.experience && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Experience</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingCrew.experience}</p>
                  </div>
                )}

                {/* Certifications */}
                {(viewingCrew.license_number || viewingCrew.medical_cert_expiry) && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Certifications</h3>
                    <div className="space-y-2 text-sm">
                      {viewingCrew.license_number && (
                        <div>
                          <span className="font-medium">License:</span> {viewingCrew.license_number}
                          {viewingCrew.license_expiry && ` (Expires: ${new Date(viewingCrew.license_expiry).toLocaleDateString()})`}
                        </div>
                      )}
                      {viewingCrew.medical_cert_expiry && (
                        <div>
                          <span className="font-medium">Medical Certificate Expiry:</span> {new Date(viewingCrew.medical_cert_expiry).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          </TabsContent>

          {/* Trip Allocations Tab */}
          <TabsContent value="trips" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-600">
                Trips allocated to {viewingCrew?.staff_name}
              </div>
              {crewTrips.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCrewTripsToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </div>
            {crewTrips.length > 0 ? (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip Name</TableHead>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crewTrips.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">{allocation.trip_name || 'N/A'}</TableCell>
                        <TableCell>{allocation.vessel_name || '-'}</TableCell>
                        <TableCell>
                          {allocation.start_date ? new Date(allocation.start_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {allocation.end_date ? new Date(allocation.end_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{allocation.status || 'Unknown'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No trip allocations for this crew member
              </div>
            )}
          </TabsContent>

          {/* Crew Shifts Tab */}
          <TabsContent value="shifts" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-600">
                Crew shift logs for {viewingCrew?.staff_name}
              </div>
              {crewShifts.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCrewShiftsToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </div>
            {crewShifts.length > 0 ? (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift Start</TableHead>
                      <TableHead>Shift End</TableHead>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Task Performed</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Trip ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crewShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">
                          {shift.shift_start_datetime ? new Date(shift.shift_start_datetime).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {shift.shift_stop_datetime ? new Date(shift.shift_stop_datetime).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {shift.vessel_name ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              🚢 {shift.vessel_name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
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
                No shift logs for this crew member
              </div>
            )}
          </TabsContent>

          {/* Drills Tab */}
          <TabsContent value="drills" className="space-y-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Emergency Drills
              </h3>
              {crewDrillRecords.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCrewDrillsToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </div>
            {crewDrillRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drill Type</TableHead>
                      <TableHead>Record Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Authorized By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crewDrillRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.drill_type || 'N/A'}</TableCell>
                        <TableCell>{new Date(record.record_date).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'Pass' ? 'default' : 'destructive'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.authorized_by}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No drill records for this crew member
              </div>
            )}
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Procedure Training
              </h3>
              {crewTrainingRecords.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCrewTrainingToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </div>
            {crewTrainingRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Emergency Type</TableHead>
                      <TableHead>Training Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Authorized By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crewTrainingRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.procedure_title || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.emergency_type || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{new Date(record.training_date).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'Pass' ? 'default' : 'destructive'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.authorized_by}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No training records for this crew member
              </div>
            )}
          </TabsContent>

            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
                  {dup.field === 'email' && '⚠️ Email Address'}
                  {dup.field === 'phone' && '⚠️ Phone Number'}
                  {dup.field === 'name' && '⚠️ Staff Name'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Value:</span> {dup.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Existing Record:</span>{' '}
                  {dup.existing_record.name} ({dup.existing_record.position})
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

      {/* Manual Crew Log Entry Dialog */}
      <ManualLogEntry
        open={manualCrewLogOpen}
        onClose={() => setManualCrewLogOpen(false)}
        type="crew"
      />
    </div>
  );
};

export default CrewManagement;
