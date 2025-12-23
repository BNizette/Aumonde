import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Calendar, Clock, User, Users, FileText, Activity, Gauge, Download, FileSpreadsheet, AlertTriangle, Shield, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import TripLogForm from './TripLogForm';
import RunningLogForm from './RunningLogForm';
import EngineRunningLogForm from './EngineRunningLogForm';
import AllocatedCrewForm from './AllocatedCrewForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripDetailsDialog = ({ open, onClose, trip, onRefresh }) => {
  const [shiftLogs, setShiftLogs] = useState([]);
  const [runningLogs, setRunningLogs] = useState([]);
  const [engineLogs, setEngineLogs] = useState([]);
  const [allocatedCrew, setAllocatedCrew] = useState([]);
  const [tripIncidents, setTripIncidents] = useState([]);
  const [tripDrills, setTripDrills] = useState([]);
  const [tripPassengers, setTripPassengers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Passenger form state
  const [passengerDialogOpen, setPassengerDialogOpen] = useState(false);
  const [passengerForm, setPassengerForm] = useState({ name: '', status: 'Adult', comment: '' });
  const [editingPassenger, setEditingPassenger] = useState(null);
  
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [runningFormOpen, setRunningFormOpen] = useState(false);
  const [engineFormOpen, setEngineFormOpen] = useState(false);
  const [crewFormOpen, setCrewFormOpen] = useState(false);
  
  const [shiftFormMode, setShiftFormMode] = useState('create');
  const [runningFormMode, setRunningFormMode] = useState('create');
  const [engineFormMode, setEngineFormMode] = useState('create');
  const [crewFormMode, setCrewFormMode] = useState('create');
  
  const [selectedShiftLog, setSelectedShiftLog] = useState(null);
  const [selectedRunningLog, setSelectedRunningLog] = useState(null);
  const [selectedEngineLog, setSelectedEngineLog] = useState(null);
  const [selectedCrewMember, setSelectedCrewMember] = useState(null);
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedLogView, setSelectedLogView] = useState('allocated');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const fetchAllLogs = useCallback(async () => {
    if (!trip) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Crew Shifts and Allocated Crew: filter by trip_id (trip-specific)
      // Running Logs and Engine Logs: filter by vessel_id (vessel-specific across all trips)
      const [shiftRes, runningRes, engineRes, crewRes, incidentsRes, drillsRes, passengersRes] = await Promise.all([
        axios.get(`${API}/trip-logs?trip_id=${trip.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/running-logs?vessel_id=${trip.vessel_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/engine-running-logs?vessel_id=${trip.vessel_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/allocated-crew?trip_id=${trip.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/emergency/drills`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/trip-passengers?trip_id=${trip.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setShiftLogs(shiftRes.data);
      setRunningLogs(runningRes.data);
      setEngineLogs(engineRes.data);
      setAllocatedCrew(crewRes.data);
      // Filter incidents linked to this trip
      setTripIncidents((incidentsRes.data || []).filter(i => i.linked_trip_id === trip.id));
      // Filter drills linked to this trip
      setTripDrills((drillsRes.data || []).filter(d => d.linked_trip_id === trip.id));
      setTripPassengers(passengersRes.data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [trip]);

  useEffect(() => {
    if (open && trip) {
      fetchAllLogs();
    }
  }, [open, trip, fetchAllLogs]);

  // Shift Log handlers
  const handleAddShiftLog = () => {
    setSelectedShiftLog(null);
    setShiftFormMode('create');
    setShiftFormOpen(true);
  };

  const handleEditShiftLog = (log) => {
    setSelectedShiftLog(log);
    setShiftFormMode('edit');
    setShiftFormOpen(true);
  };

  const handleSaveShiftLog = async (logData) => {
    try {
      const token = localStorage.getItem('token');
      if (shiftFormMode === 'create') {
        await axios.post(`${API}/trip-logs`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Shift log added successfully');
      } else {
        await axios.put(`${API}/trip-logs/${selectedShiftLog.id}`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Shift log updated successfully');
      }
      setShiftFormOpen(false);
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving shift log');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Export functions
  const exportAllocatedCrewToExcel = () => {
    if (allocatedCrew.length === 0) { setError('No allocated crew data to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Crew Name', 'Email', 'Phone', 'Position', 'Status'];
    const data = [headers, ...allocatedCrew.map(member => [
      member.crew?.staff_name || member.crew_name || 'N/A', member.crew?.email || 'N/A',
      member.crew?.phone || 'N/A', member.position || 'N/A', member.status || 'Active'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Allocated Crew');
    XLSX.writeFile(wb, `allocated_crew_${trip?.trip_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Allocated crew exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportCrewShiftsToExcel = () => {
    if (shiftLogs.length === 0) { setError('No crew shifts data to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Shift Start', 'Shift End', 'Crew Name', 'Task Performed', 'Total Hours'];
    const data = [headers, ...shiftLogs.map(log => [
      log.shift_start_datetime ? new Date(log.shift_start_datetime).toLocaleString() : 'N/A',
      log.shift_stop_datetime ? new Date(log.shift_stop_datetime).toLocaleString() : 'N/A',
      log.crew_name || 'N/A', log.task_performed || '-', log.total_hours ? `${log.total_hours}h` : 'N/A'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Crew Shifts');
    XLSX.writeFile(wb, `crew_shifts_${trip?.trip_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Crew shifts exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportRunningLogsToExcel = () => {
    if (runningLogs.length === 0) { setError('No running logs data to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Date & Time', 'Location', 'Weather', 'Sea State', 'Speed (knots)', 'Course', 'Fuel Level', 'Remarks', 'Officer'];
    const data = [headers, ...runningLogs.map(log => [
      log.log_datetime ? new Date(log.log_datetime).toLocaleString() : 'N/A',
      log.location || '-', log.weather_conditions || '-', log.sea_state || '-',
      log.speed_knots || '-', log.course || '-', log.fuel_level || '-',
      log.remarks || '-', log.officer_on_watch || 'N/A'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Running Logs');
    XLSX.writeFile(wb, `running_logs_${trip?.trip_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Running logs exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportEngineLogsToExcel = () => {
    if (engineLogs.length === 0) { setError('No engine logs data to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Date & Time', 'Engine Hours', 'RPM', 'Oil Pressure', 'Coolant Temp', 'Fuel Consumption', 'Status', 'Notes', 'Engineer'];
    const data = [headers, ...engineLogs.map(log => [
      log.log_datetime ? new Date(log.log_datetime).toLocaleString() : 'N/A',
      log.engine_hours || '-', log.rpm || '-', log.oil_pressure || '-',
      log.coolant_temp || '-', log.fuel_consumption || '-', log.engine_status || '-',
      log.maintenance_notes || '-', log.engineer_name || 'N/A'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Engine Logs');
    XLSX.writeFile(wb, `engine_logs_${trip?.trip_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Engine logs exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  // Export passengers to Excel
  const exportPassengersToExcel = () => {
    if (tripPassengers.length === 0) return;
    const wb = XLSX.utils.book_new();
    const headers = ['Name', 'Status', 'Comment'];
    const data = [headers, ...tripPassengers.map(p => [
      p.name || 'N/A',
      p.status || 'N/A',
      p.comment || ''
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Passengers');
    XLSX.writeFile(wb, `trip_passengers_${trip?.trip_name?.replace(/\s+/g, '_') || 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage('Passengers exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  // Export all trip data to Excel with multiple worksheets
  const exportTripToExcel = () => {
    if (!trip) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Trip Details
    const detailsData = [
      ['Trip Details'],
      [''],
      ['Field', 'Value'],
      ['Trip Name', trip.trip_name || 'N/A'],
      ['Vessel', trip.vessel_name || 'N/A'],
      ['Trip Type', trip.trip_type || 'N/A'],
      ['Operating Area', trip.operating_area || 'N/A'],
      ['Depart Location', trip.depart_location || 'N/A'],
      ['Arrival Location', trip.arrival_location || 'N/A'],
      ['Planned Depart', trip.planned_depart_datetime ? new Date(trip.planned_depart_datetime).toLocaleString() : (trip.depart_datetime ? new Date(trip.depart_datetime).toLocaleString() : 'N/A')],
      ['Planned Arrival', trip.planned_arrival_datetime ? new Date(trip.planned_arrival_datetime).toLocaleString() : (trip.arrival_datetime ? new Date(trip.arrival_datetime).toLocaleString() : 'N/A')],
      ['Actual Depart', trip.actual_depart_datetime ? new Date(trip.actual_depart_datetime).toLocaleString() : 'N/A'],
      ['Actual Arrival', trip.actual_arrival_datetime ? new Date(trip.actual_arrival_datetime).toLocaleString() : 'N/A'],
      ['Passengers', trip.number_of_passengers || '0'],
      ['Crew', trip.number_of_crew || '0'],
      ['Notes', trip.notes || 'N/A'],
    ];
    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    wsDetails['!cols'] = [{ wch: 18 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Trip Details');

    // Sheet 2: Allocated Crew
    const crewHeaders = ['Crew Name', 'Email', 'Phone', 'Position', 'Status'];
    const crewData = [crewHeaders];
    allocatedCrew.forEach(member => {
      crewData.push([
        member.crew?.staff_name || member.crew_name || 'N/A',
        member.crew?.email || 'N/A',
        member.crew?.phone || 'N/A',
        member.position || 'N/A',
        member.status || 'Active'
      ]);
    });
    if (allocatedCrew.length === 0) crewData.push(['No crew allocated', '', '', '', '']);
    const wsCrew = XLSX.utils.aoa_to_sheet(crewData);
    wsCrew['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsCrew, 'Allocated Crew');

    // Sheet 3: Crew Shifts
    const shiftsHeaders = ['Shift Start', 'Shift End', 'Crew Name', 'Task Performed', 'Total Hours'];
    const shiftsData = [shiftsHeaders];
    shiftLogs.forEach(log => {
      shiftsData.push([
        log.shift_start_datetime ? new Date(log.shift_start_datetime).toLocaleString() : 'N/A',
        log.shift_stop_datetime ? new Date(log.shift_stop_datetime).toLocaleString() : 'N/A',
        log.crew_name || 'N/A',
        log.task_performed || '-',
        log.total_hours ? `${log.total_hours}h` : 'N/A'
      ]);
    });
    if (shiftLogs.length === 0) shiftsData.push(['No crew shifts recorded', '', '', '', '']);
    const wsShifts = XLSX.utils.aoa_to_sheet(shiftsData);
    wsShifts['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsShifts, 'Crew Shifts');

    // Sheet 4: Running Logs
    const runningHeaders = ['Date & Time', 'Location', 'Weather', 'Sea State', 'Speed (knots)', 'Course', 'Fuel Level', 'Remarks', 'Officer'];
    const runningData = [runningHeaders];
    runningLogs.forEach(log => {
      runningData.push([
        log.log_datetime ? new Date(log.log_datetime).toLocaleString() : 'N/A',
        log.location || '-',
        log.weather_conditions || '-',
        log.sea_state || '-',
        log.speed_knots || '-',
        log.course || '-',
        log.fuel_level || '-',
        log.remarks || '-',
        log.officer_on_watch || 'N/A'
      ]);
    });
    if (runningLogs.length === 0) runningData.push(['No running logs recorded', '', '', '', '', '', '', '', '']);
    const wsRunning = XLSX.utils.aoa_to_sheet(runningData);
    wsRunning['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsRunning, 'Running Logs');

    // Sheet 5: Engine Logs
    const engineHeaders = ['Date & Time', 'Engine Hours', 'RPM', 'Oil Pressure', 'Coolant Temp', 'Fuel Consumption', 'Status', 'Notes', 'Engineer'];
    const engineData = [engineHeaders];
    engineLogs.forEach(log => {
      engineData.push([
        log.log_datetime ? new Date(log.log_datetime).toLocaleString() : 'N/A',
        log.engine_hours || '-',
        log.rpm || '-',
        log.oil_pressure || '-',
        log.coolant_temp || '-',
        log.fuel_consumption || '-',
        log.engine_status || '-',
        log.maintenance_notes || '-',
        log.engineer_name || 'N/A'
      ]);
    });
    if (engineLogs.length === 0) engineData.push(['No engine logs recorded', '', '', '', '', '', '', '', '']);
    const wsEngine = XLSX.utils.aoa_to_sheet(engineData);
    wsEngine['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsEngine, 'Engine Logs');

    // Generate and download file
    const fileName = `${trip.trip_name?.replace(/\s+/g, '_')}_details_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setMessage('Trip data exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteShiftLog = async (log) => {
    if (!window.confirm(`Delete shift log for ${log.crew_name}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/trip-logs/${log.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Shift log deleted successfully');
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting shift log');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Running Log handlers
  const handleAddRunningLog = () => {
    setSelectedRunningLog(null);
    setRunningFormMode('create');
    setRunningFormOpen(true);
  };

  const handleEditRunningLog = (log) => {
    setSelectedRunningLog(log);
    setRunningFormMode('edit');
    setRunningFormOpen(true);
  };

  const handleSaveRunningLog = async (logData) => {
    try {
      const token = localStorage.getItem('token');
      if (runningFormMode === 'create') {
        await axios.post(`${API}/running-logs`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Running log added successfully');
      } else {
        await axios.put(`${API}/running-logs/${selectedRunningLog.id}`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Running log updated successfully');
      }
      setRunningFormOpen(false);
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving running log');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteRunningLog = async (log) => {
    if (!window.confirm(`Delete running log: ${log.activity}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/running-logs/${log.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Running log deleted successfully');
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting running log');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Engine Log handlers
  const handleAddEngineLog = () => {
    setSelectedEngineLog(null);
    setEngineFormMode('create');
    setEngineFormOpen(true);
  };

  const handleEditEngineLog = (log) => {
    setSelectedEngineLog(log);
    setEngineFormMode('edit');
    setEngineFormOpen(true);
  };

  const handleSaveEngineLog = async (logData) => {
    try {
      const token = localStorage.getItem('token');
      if (engineFormMode === 'create') {
        await axios.post(`${API}/engine-running-logs`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Engine log added successfully');
      } else {
        await axios.put(`${API}/engine-running-logs/${selectedEngineLog.id}`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Engine log updated successfully');
      }
      setEngineFormOpen(false);
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving engine log');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteEngineLog = async (log) => {
    if (!window.confirm('Delete this engine log entry?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/engine-running-logs/${log.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Engine log deleted successfully');
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting engine log');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Allocated Crew handlers
  const handleAddCrewMember = () => {
    setSelectedCrewMember(null);
    setCrewFormMode('create');
    setCrewFormOpen(true);
  };

  const handleEditCrewMember = (crew) => {
    setSelectedCrewMember(crew);
    setCrewFormMode('edit');
    setCrewFormOpen(true);
  };

  const handleSaveCrewMember = async (crewData) => {
    try {
      const token = localStorage.getItem('token');
      if (crewFormMode === 'create') {
        await axios.post(`${API}/allocated-crew`, crewData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Crew member allocated successfully');
      } else {
        await axios.put(`${API}/allocated-crew/${selectedCrewMember.id}`, crewData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Allocated crew updated successfully');
      }
      setCrewFormOpen(false);
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving allocated crew');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteCrewMember = async (crew) => {
    if (!window.confirm(`Remove ${crew.crew_name} from this trip?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/allocated-crew/${crew.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Crew member removed successfully');
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error removing crew member');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalShiftHours = () => {
    return shiftLogs.reduce((sum, log) => sum + (log.total_hours || 0), 0).toFixed(2);
  };

  const canEdit = user?.access_level === 'Edit' || user?.access_level === 'Full';
  const canDelete = user?.access_level === 'Full';

  // Passenger CRUD functions
  const handleSavePassenger = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = { ...passengerForm, trip_id: trip.id };
      
      if (editingPassenger) {
        await axios.put(`${API}/trip-passengers/${editingPassenger.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Passenger updated');
      } else {
        await axios.post(`${API}/trip-passengers`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Passenger added');
      }
      
      setPassengerDialogOpen(false);
      setPassengerForm({ name: '', status: 'Adult', comment: '' });
      setEditingPassenger(null);
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving passenger');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditPassenger = (passenger) => {
    setPassengerForm({
      name: passenger.name || '',
      status: passenger.status || 'Adult',
      comment: passenger.comment || ''
    });
    setEditingPassenger(passenger);
    setPassengerDialogOpen(true);
  };

  const handleDeletePassenger = async (passenger) => {
    if (!window.confirm(`Delete passenger ${passenger.name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/trip-passengers/${passenger.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Passenger deleted');
      fetchAllLogs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting passenger');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Adult': 'bg-blue-100 text-blue-800',
      'Child': 'bg-green-100 text-green-800',
      'Baby': 'bg-pink-100 text-pink-800',
      'Senior': 'bg-purple-100 text-purple-800',
      'Special Needs': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!trip) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle>{trip.trip_name}</DialogTitle>
                <DialogDescription>Trip details and logs</DialogDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportTripToExcel}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </DialogHeader>

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

          <ScrollArea className="h-[65vh] pr-4">
            <div className="space-y-6">
              {/* Trip Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trip Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Vessel:</span>
                    <p className="text-gray-600">{trip.vessel_name || '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Trip Type:</span>
                    <p className="text-gray-600">{trip.trip_type || '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Operating Area:</span>
                    <p className="text-gray-600">{trip.operating_area || '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Depart Location:</span>
                    <p className="text-gray-600">{trip.depart_location || '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Arrival Location:</span>
                    <p className="text-gray-600">{trip.arrival_location || '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Planned Depart:</span>
                    <p className="text-gray-600">{formatDateTime(trip.planned_depart_datetime || trip.depart_datetime)}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Planned Arrival:</span>
                    <p className="text-gray-600">{formatDateTime(trip.planned_arrival_datetime || trip.arrival_datetime)}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Actual Depart:</span>
                    <p className="text-gray-600">{trip.actual_depart_datetime ? formatDateTime(trip.actual_depart_datetime) : '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Actual Arrival:</span>
                    <p className="text-gray-600">{trip.actual_arrival_datetime ? formatDateTime(trip.actual_arrival_datetime) : '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Passengers / Crew:</span>
                    <p className="text-gray-600">{trip.number_of_passengers || 0} / {trip.number_of_crew || 0}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Logs Dropdown Selector */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">View:</span>
                  <Select value={selectedLogView} onValueChange={setSelectedLogView}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allocated">Crew ({allocatedCrew.length})</SelectItem>
                      <SelectItem value="passengers">Passengers ({tripPassengers.length})</SelectItem>
                      <SelectItem value="shift">Shifts ({shiftLogs.length})</SelectItem>
                      <SelectItem value="running">Running Logs ({runningLogs.length})</SelectItem>
                      <SelectItem value="engine">Engine Logs ({engineLogs.length})</SelectItem>
                      <SelectItem value="incidents">Incidents ({tripIncidents.length})</SelectItem>
                      <SelectItem value="drills">Drills ({tripDrills.length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Allocated Crew View */}
                {selectedLogView === 'allocated' && (
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {allocatedCrew.length} crew {allocatedCrew.length === 1 ? 'member' : 'members'} allocated
                    </p>
                    <div className="flex gap-2">
                      {allocatedCrew.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={exportAllocatedCrewToExcel}
                          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Export to Excel
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="sm" onClick={handleAddCrewMember}>
                          <Plus className="h-4 w-4 mr-2" />
                          Allocate Crew
                        </Button>
                      )}
                    </div>
                  </div>

                  {allocatedCrew.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No crew allocated to this trip</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Crew Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Position</th>
                            {(canEdit || canDelete) && (
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {allocatedCrew.map((crew) => (
                            <tr key={crew.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{crew.crew_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{crew.position}</td>
                              {(canEdit || canDelete) && (
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {canEdit && (
                                      <Button size="sm" variant="ghost" onClick={() => handleEditCrewMember(crew)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCrewMember(crew)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Passengers View */}
                {selectedLogView === 'passengers' && (
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {tripPassengers.length} passenger{tripPassengers.length !== 1 ? 's' : ''} on this trip
                    </p>
                    <div className="flex gap-2">
                      {tripPassengers.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={exportPassengersToExcel}
                          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Export to Excel
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="sm" onClick={() => {
                          setPassengerForm({ name: '', status: 'Adult', comment: '' });
                          setEditingPassenger(null);
                          setPassengerDialogOpen(true);
                        }}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Passenger
                        </Button>
                      )}
                    </div>
                  </div>
                  {tripPassengers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No passengers recorded for this trip</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tripPassengers.map(passenger => (
                        <div key={passenger.id} className="p-3 border rounded-lg bg-gray-50 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{passenger.name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(passenger.status)}`}>
                                {passenger.status}
                              </span>
                            </div>
                            {passenger.comment && (
                              <p className="text-sm text-gray-500 mt-1">{passenger.comment}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {canEdit && (
                              <Button size="sm" variant="ghost" onClick={() => handleEditPassenger(passenger)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button size="sm" variant="ghost" onClick={() => handleDeletePassenger(passenger)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Shifts View */}
                {selectedLogView === 'shift' && (
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {shiftLogs.length} {shiftLogs.length === 1 ? 'entry' : 'entries'} • Total: {getTotalShiftHours()} hours
                    </p>
                    <div className="flex gap-2">
                      {shiftLogs.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={exportCrewShiftsToExcel}
                          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Export to Excel
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="sm" onClick={handleAddShiftLog}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Shift Log
                        </Button>
                      )}
                    </div>
                  </div>

                  {shiftLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No shift logs recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shiftLogs.map((log) => (
                        <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-teal-600" />
                                <span className="font-semibold">{log.crew_name}</span>
                                {log.total_hours && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {log.total_hours} hrs
                                  </Badge>
                                )}
                                {!log.total_hours && (
                                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                    In Progress
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDateTime(log.shift_start_datetime)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{log.shift_stop_datetime ? formatDateTime(log.shift_stop_datetime) : 'Ongoing'}</span>
                                </div>
                              </div>
                              
                              {log.task_performed && (
                                <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-2">
                                  <span className="font-medium">Task:</span> {log.task_performed}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 ml-4">
                              {canEdit && (
                                <Button size="sm" variant="ghost" onClick={() => handleEditShiftLog(log)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteShiftLog(log)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Running Logs View */}
                {selectedLogView === 'running' && (
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {runningLogs.length} {runningLogs.length === 1 ? 'entry' : 'entries'}
                    </p>
                    <div className="flex gap-2">
                      {runningLogs.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={exportRunningLogsToExcel}
                          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Export to Excel
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="sm" onClick={handleAddRunningLog}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Running Log
                        </Button>
                      )}
                    </div>
                  </div>

                  {runningLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No running logs recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {runningLogs.map((log) => (
                        <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold">{log.activity}</span>
                              </div>
                              
                              <div className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Crew:</span> {log.crew_name} • 
                                <span className="font-medium"> Time:</span> {formatDateTime(log.log_datetime)}
                              </div>
                              
                              {log.activity_details && (
                                <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-2">
                                  {log.activity_details}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 ml-4">
                              {canEdit && (
                                <Button size="sm" variant="ghost" onClick={() => handleEditRunningLog(log)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteRunningLog(log)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Engine Logs View */}
                {selectedLogView === 'engine' && (
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {engineLogs.length} {engineLogs.length === 1 ? 'entry' : 'entries'}
                    </p>
                    <div className="flex gap-2">
                      {engineLogs.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={exportEngineLogsToExcel}
                          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Export to Excel
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="sm" onClick={handleAddEngineLog}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Engine Log
                        </Button>
                      )}
                    </div>
                  </div>

                  {engineLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Gauge className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No engine logs recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {engineLogs.map((log) => (
                        <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <Gauge className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold">{formatDateTime(log.log_datetime)}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                {/* Port Engine */}
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-teal-700 border-b pb-1">Port Engine</div>
                                  {log.engine1_rpm && <div className="text-sm"><span className="font-medium">RPM:</span> {log.engine1_rpm}</div>}
                                  {log.engine1_water_temp && <div className="text-sm"><span className="font-medium">Water:</span> {log.engine1_water_temp}°C</div>}
                                  {log.engine1_oil_temp && <div className="text-sm"><span className="font-medium">Oil Temp:</span> {log.engine1_oil_temp}°C</div>}
                                  {log.engine1_oil_pressure && <div className="text-sm"><span className="font-medium">Oil Press:</span> {log.engine1_oil_pressure} PSI</div>}
                                  {log.engine1_gearbox_temp && <div className="text-sm"><span className="font-medium">Gearbox:</span> {log.engine1_gearbox_temp}°C</div>}
                                  {log.engine1_gearbox_pressure && <div className="text-sm"><span className="font-medium">GB Press:</span> {log.engine1_gearbox_pressure} PSI</div>}
                                  {log.engine1_pyrometers && <div className="text-sm"><span className="font-medium">Pyro:</span> {log.engine1_pyrometers}°C</div>}
                                  {log.engine1_battery_volts && <div className="text-sm"><span className="font-medium">Battery:</span> {log.engine1_battery_volts}V</div>}
                                  {log.engine1_aux_volts && <div className="text-sm"><span className="font-medium">Aux:</span> {log.engine1_aux_volts}V</div>}
                                  {log.engine1_fuel_level && <div className="text-sm"><span className="font-medium">Fuel:</span> {log.engine1_fuel_level}%</div>}
                                  {log.engine1_engine_hrs_start && <div className="text-sm"><span className="font-medium">Hrs:</span> {log.engine1_engine_hrs_start} - {log.engine1_engine_hrs_end || '?'}</div>}
                                </div>
                                
                                {/* Starboard Engine */}
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-blue-700 border-b pb-1">Starboard Engine</div>
                                  {log.engine2_rpm && <div className="text-sm"><span className="font-medium">RPM:</span> {log.engine2_rpm}</div>}
                                  {log.engine2_water_temp && <div className="text-sm"><span className="font-medium">Water:</span> {log.engine2_water_temp}°C</div>}
                                  {log.engine2_oil_temp && <div className="text-sm"><span className="font-medium">Oil Temp:</span> {log.engine2_oil_temp}°C</div>}
                                  {log.engine2_oil_pressure && <div className="text-sm"><span className="font-medium">Oil Press:</span> {log.engine2_oil_pressure} PSI</div>}
                                  {log.engine2_gearbox_temp && <div className="text-sm"><span className="font-medium">Gearbox:</span> {log.engine2_gearbox_temp}°C</div>}
                                  {log.engine2_gearbox_pressure && <div className="text-sm"><span className="font-medium">GB Press:</span> {log.engine2_gearbox_pressure} PSI</div>}
                                  {log.engine2_pyrometers && <div className="text-sm"><span className="font-medium">Pyro:</span> {log.engine2_pyrometers}°C</div>}
                                  {log.engine2_battery_volts && <div className="text-sm"><span className="font-medium">Battery:</span> {log.engine2_battery_volts}V</div>}
                                  {log.engine2_aux_volts && <div className="text-sm"><span className="font-medium">Aux:</span> {log.engine2_aux_volts}V</div>}
                                  {log.engine2_fuel_level && <div className="text-sm"><span className="font-medium">Fuel:</span> {log.engine2_fuel_level}%</div>}
                                  {log.engine2_engine_hrs_start && <div className="text-sm"><span className="font-medium">Hrs:</span> {log.engine2_engine_hrs_start} - {log.engine2_engine_hrs_end || '?'}</div>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 ml-4">
                              {canEdit && (
                                <Button size="sm" variant="ghost" onClick={() => handleEditEngineLog(log)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteEngineLog(log)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Incidents View */}
                {selectedLogView === 'incidents' && (
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {tripIncidents.length} incident{tripIncidents.length !== 1 ? 's' : ''} linked to this trip
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = '/incidents'}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage in Incidents
                    </Button>
                  </div>
                  {tripIncidents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No incidents linked to this trip</p>
                      <p className="text-xs mt-1">Link incidents from the Incidents module</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tripIncidents.map(incident => (
                        <div key={incident.id} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{incident.incident_number}</span>
                                <Badge variant={incident.severity === 'Critical' ? 'destructive' : incident.severity === 'Major' ? 'warning' : 'secondary'}>
                                  {incident.severity}
                                </Badge>
                                <Badge variant="outline">{incident.investigation_status}</Badge>
                              </div>
                              <p className="text-sm font-medium">{incident.title}</p>
                              <p className="text-xs text-gray-500">
                                {incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'No date'} • {incident.location || 'No location'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Drills Tab */}
                <TabsContent value="drills" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {tripDrills.length} drill{tripDrills.length !== 1 ? 's' : ''} linked to this trip
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = '/emergency'}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage in Drills
                    </Button>
                  </div>
                  {tripDrills.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No drills linked to this trip</p>
                      <p className="text-xs mt-1">Link drills from the Emergency module</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tripDrills.map(drill => (
                        <div key={drill.id} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{drill.drill_type}</p>
                              <p className="text-xs text-gray-500">
                                {drill.drill_date ? new Date(drill.drill_date).toLocaleDateString() : 'No date'} • {drill.vessel_name || 'No vessel'}
                              </p>
                              {drill.notes && <p className="text-sm text-gray-600 mt-1">{drill.notes}</p>}
                            </div>
                            <Badge variant={drill.status === 'Completed' ? 'success' : 'secondary'}>
                              {drill.status || 'Scheduled'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <TripLogForm
        open={shiftFormOpen}
        onClose={() => setShiftFormOpen(false)}
        onSave={handleSaveShiftLog}
        log={selectedShiftLog}
        tripId={trip?.id}
        mode={shiftFormMode}
      />

      <RunningLogForm
        open={runningFormOpen}
        onClose={() => setRunningFormOpen(false)}
        onSave={handleSaveRunningLog}
        log={selectedRunningLog}
        tripId={trip?.id}
        mode={runningFormMode}
      />

      <EngineRunningLogForm
        open={engineFormOpen}
        onClose={() => setEngineFormOpen(false)}
        onSave={handleSaveEngineLog}
        log={selectedEngineLog}
        tripId={trip?.id}
        mode={engineFormMode}
      />

      <AllocatedCrewForm
        open={crewFormOpen}
        onClose={() => setCrewFormOpen(false)}
        onSave={handleSaveCrewMember}
        crewMember={selectedCrewMember}
        tripId={trip?.id}
        mode={crewFormMode}
      />

      {/* Passenger Dialog */}
      <Dialog open={passengerDialogOpen} onOpenChange={setPassengerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPassenger ? 'Edit Passenger' : 'Add Passenger'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={passengerForm.name}
                onChange={(e) => setPassengerForm({...passengerForm, name: e.target.value})}
                placeholder="Passenger name"
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select 
                value={passengerForm.status} 
                onValueChange={(value) => setPassengerForm({...passengerForm, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Adult">Adult</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Baby">Baby</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Special Needs">Special Needs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                value={passengerForm.comment}
                onChange={(e) => setPassengerForm({...passengerForm, comment: e.target.value})}
                placeholder="Any additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassengerDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePassenger} disabled={!passengerForm.name}>
              {editingPassenger ? 'Update' : 'Add'} Passenger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TripDetailsDialog;
