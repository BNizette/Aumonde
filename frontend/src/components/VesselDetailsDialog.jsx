import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, ExternalLink } from 'lucide-react';
import { exportMultiSheetExcel, formatDate, safeValue, safeArrayJoin } from '../utils/excelExport';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VesselDetailsDialog = ({ open, onClose, vessel, onMessage }) => {
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState('details');
  const [trips, setTrips] = useState([]);
  const [runningLogs, setRunningLogs] = useState([]);
  const [staffLogs, setStaffLogs] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [engineLogs, setEngineLogs] = useState([]);
  const [drills, setDrills] = useState([]);
  const [risks, setRisks] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (open && vessel) {
      fetchVesselData();
      setSelectedView('details');
    }
  }, [open, vessel]);

  const fetchVesselData = async () => {
    if (!vessel || !vessel.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const vesselId = vessel.id;

      // First get trips for this vessel to fetch shift logs
      const tripsRes = await axios.get(`${API}/trips?vessel_id=${vesselId}`, { headers }).catch(() => ({ data: [] }));
      const tripsData = tripsRes.data || [];
      setTrips(tripsData);

      // Get trip IDs for fetching related logs
      const tripIds = tripsData.map(t => t.id);

      const [logsRes, shiftLogsRes, risksRes, maintenanceRes, incidentsRes, engineRes, drillsRes] = await Promise.all([
        axios.get(`${API}/running-logs?vessel_id=${vesselId}`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/trip-logs`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/risk-assessments`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/maintenance`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/incidents`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/engine-running-logs?vessel_id=${vesselId}`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/emergency/drills?vessel_id=${vesselId}`, { headers }).catch(() => ({ data: [] }))
      ]);

      setRunningLogs(logsRes.data || []);
      
      // Filter shift logs to only those for trips on this vessel
      const allShiftLogs = shiftLogsRes.data || [];
      const vesselShiftLogs = allShiftLogs.filter(log => tripIds.includes(log.trip_id));
      setStaffLogs(vesselShiftLogs);
      
      setRisks((risksRes.data || []).filter(r => r.vessel_id === vesselId));
      setMaintenance((maintenanceRes.data || []).filter(m => m.vessel_id === vesselId));
      setIncidents((incidentsRes.data || []).filter(i => i.vessel_id === vesselId));
      setEngineLogs(engineRes.data || []);
      setDrills(drillsRes.data || []);

      // Fetch passengers for all trips
      if (tripIds.length > 0) {
        const passengersRes = await axios.get(`${API}/trip-passengers`, { headers }).catch(() => ({ data: [] }));
        const allPassengers = passengersRes.data || [];
        setPassengers(allPassengers.filter(p => tripIds.includes(p.trip_id)));
      } else {
        setPassengers([]);
      }
    } catch (err) {
      console.error('Error fetching vessel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!vessel) return;
    
    const sheets = [
      {
        name: 'Vessel Details',
        headers: ['Field', 'Value'],
        data: [
          ['Vessel Name', safeValue(vessel.vessel_name)],
          ['Registration Number', safeValue(vessel.registration_number)],
          ['Vessel Type', safeValue(vessel.vessel_type)],
          ['Owner Name', safeValue(vessel.owner_name)],
          ['Operational Status', safeValue(vessel.operational_status)],
          ['Length Overall', vessel.length_overall ? `${vessel.length_overall}m` : '-'],
          ['Beam', vessel.beam ? `${vessel.beam}m` : '-'],
          ['Draft', vessel.draft ? `${vessel.draft}m` : '-'],
          ['Gross Tonnage', safeValue(vessel.gross_tonnage)],
          ['Year Built', safeValue(vessel.year_built)],
          ['Engine Type', safeValue(vessel.engine_type)],
          ['Engine Power', vessel.engine_power ? `${vessel.engine_power} kW` : '-'],
          ['Port of Registry', safeValue(vessel.port_of_registry)],
        ],
        columnWidths: [20, 30]
      },
      {
        name: 'Trips',
        headers: ['Trip Name', 'Type', 'Status', 'Departure', 'Arrival', 'From', 'To', 'Passengers', 'Crew'],
        data: trips.length > 0 ? trips.map(trip => {
          const now = new Date();
          const plannedDepart = trip.planned_depart_datetime ? new Date(trip.planned_depart_datetime) : null;
          const actualDepart = trip.actual_depart_datetime ? new Date(trip.actual_depart_datetime) : null;
          const actualArrival = trip.actual_arrival_datetime ? new Date(trip.actual_arrival_datetime) : null;
          let status = 'Scheduled';
          if (actualArrival) status = 'Completed';
          else if (actualDepart && !actualArrival) status = 'In Progress';
          else if (plannedDepart && now > plannedDepart && !actualDepart) status = 'Overdue';
          return [safeValue(trip.trip_name), safeValue(trip.trip_type), status, formatDate(actualDepart || plannedDepart, true), formatDate(actualArrival || trip.planned_arrival_datetime, true), safeValue(trip.depart_location), safeValue(trip.arrival_location), trip.number_of_passengers || 0, trip.number_of_crew || 0];
        }) : [['No trips recorded', '', '', '', '', '', '', '', '']],
        columnWidths: [25, 15, 12, 20, 20, 15, 15, 12, 10]
      },
      {
        name: 'Passengers',
        headers: ['Name', 'Trip', 'Contact', 'Emergency Contact', 'Special Requirements'],
        data: passengers.length > 0 ? passengers.map(p => {
          const trip = trips.find(t => t.id === p.trip_id);
          return [safeValue(p.name), safeValue(trip?.trip_name), safeValue(p.contact_number || p.email), safeValue(p.emergency_contact), safeValue(p.special_requirements)];
        }) : [['No passengers recorded', '', '', '', '']],
        columnWidths: [20, 20, 20, 20, 30]
      },
      {
        name: 'Shift Logs',
        headers: ['Shift Start', 'Shift End', 'Crew Member', 'Task Performed', 'Total Hours'],
        data: staffLogs.length > 0 ? staffLogs.map(s => [formatDate(s.shift_start_datetime, true), formatDate(s.shift_stop_datetime, true), safeValue(s.crew_name, 'Unknown'), safeValue(s.task_performed), s.total_hours ? `${s.total_hours}h` : '-']) : [['No shift logs recorded', '', '', '', '']],
        columnWidths: [20, 20, 20, 30, 12]
      },
      {
        name: 'Running Logs',
        headers: ['Date & Time', 'Category', 'Activity', 'Details', 'Crew'],
        data: runningLogs.length > 0 ? runningLogs.map(log => [formatDate(log.log_datetime, true), safeValue(log.category, 'General'), safeValue(log.activity), safeValue(log.activity_details), safeValue(log.crew_name)]) : [['No running logs recorded', '', '', '', '']],
        columnWidths: [20, 12, 20, 30, 15]
      },
      {
        name: 'Engine Logs',
        headers: ['Date & Time', 'Engine', 'Hours', 'Fuel Used', 'Oil Pressure', 'Temp', 'Notes'],
        data: engineLogs.length > 0 ? engineLogs.map(e => [formatDate(e.log_datetime, true), safeValue(e.engine_number), safeValue(e.engine_hours), safeValue(e.fuel_used), safeValue(e.oil_pressure), safeValue(e.engine_temp), safeValue(e.notes)]) : [['No engine logs recorded', '', '', '', '', '', '']],
        columnWidths: [20, 10, 10, 12, 12, 10, 30]
      },
      {
        name: 'Drill Logs',
        headers: ['Drill Type', 'Date', 'Participants', 'Outcome', 'Conducted By', 'Notes'],
        data: drills.length > 0 ? drills.map(d => [safeValue(d.drill_type), formatDate(d.drill_date, true), safeArrayJoin(d.participants, ', '), safeValue(d.outcome), safeValue(d.conducted_by_name), safeValue(d.notes)]) : [['No drill logs recorded', '', '', '', '', '']],
        columnWidths: [20, 15, 30, 15, 20, 30]
      },
      {
        name: 'Risk Assessments',
        headers: ['Activity/Task', 'Risk Level', 'Hazard', 'Control Measures', 'Assessment Date'],
        data: risks.length > 0 ? risks.map(r => [safeValue(r.activity_task), safeValue(r.risk_level), safeValue(r.hazard_description), safeValue(r.control_measures), formatDate(r.assessment_date)]) : [['No risk assessments recorded', '', '', '', '']],
        columnWidths: [25, 12, 30, 30, 15]
      },
      {
        name: 'Maintenance',
        headers: ['Type', 'Item/System', 'Status', 'Next Service', 'Last Service', 'Priority'],
        data: maintenance.length > 0 ? maintenance.map(m => [safeValue(m.maintenance_type), safeValue(m.item_system), safeValue(m.status), formatDate(m.next_service_date), formatDate(m.last_service_date), safeValue(m.priority)]) : [['No maintenance records', '', '', '', '', '']],
        columnWidths: [15, 20, 12, 15, 15, 10]
      },
      {
        name: 'Incidents',
        headers: ['Incident #', 'Title', 'Type', 'Severity', 'Date', 'Status', 'Location'],
        data: incidents.length > 0 ? incidents.map(i => [safeValue(i.incident_number), safeValue(i.title), safeArrayJoin(i.incident_type, '; '), safeValue(i.severity), formatDate(i.incident_date), safeValue(i.investigation_status), safeValue(i.location)]) : [['No incidents recorded', '', '', '', '', '', '']],
        columnWidths: [15, 25, 20, 10, 12, 15, 20]
      }
    ];

    exportMultiSheetExcel(sheets, `${vessel.vessel_name?.replace(/\s+/g, '_')}_details`);
    onMessage?.('Vessel data exported to Excel successfully');
  };

  const viewOptions = [
    { value: 'details', label: 'Vessel Details' },
    { value: 'trips', label: `Trips (${trips.length})` },
    { value: 'passengers', label: `Passengers (${passengers.length})` },
    { value: 'shifts', label: `Shift Logs (${staffLogs.length})` },
    { value: 'running', label: `Running Logs (${runningLogs.length})` },
    { value: 'engine', label: `Engine Logs (${engineLogs.length})` },
    { value: 'drills', label: `Drill Logs (${drills.length})` },
    { value: 'risks', label: `Risk Assessments (${risks.length})` },
    { value: 'maintenance', label: `Maintenance (${maintenance.length})` },
    { value: 'incidents', label: `Incidents (${incidents.length})` },
  ];

  const renderContent = () => {
    switch (selectedView) {
      case 'details':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><span className="text-sm text-gray-500">Vessel Name</span><p className="font-medium">{vessel.vessel_name || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Registration Number</span><p className="font-medium">{vessel.registration_number || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Vessel Type</span><Badge variant="outline">{vessel.vessel_type || 'N/A'}</Badge></div>
                <div><span className="text-sm text-gray-500">Owner Name</span><p className="font-medium">{vessel.owner_name || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Operational Status</span><Badge variant={vessel.operational_status === 'Operational' ? 'default' : 'secondary'}>{vessel.operational_status || 'Unknown'}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Specifications</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><span className="text-sm text-gray-500">Length Overall</span><p className="font-medium">{vessel.length_overall ? `${vessel.length_overall}m` : '-'}</p></div>
                <div><span className="text-sm text-gray-500">Beam</span><p className="font-medium">{vessel.beam ? `${vessel.beam}m` : '-'}</p></div>
                <div><span className="text-sm text-gray-500">Draft</span><p className="font-medium">{vessel.draft ? `${vessel.draft}m` : '-'}</p></div>
                <div><span className="text-sm text-gray-500">Gross Tonnage</span><p className="font-medium">{vessel.gross_tonnage || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Year Built</span><p className="font-medium">{vessel.year_built || '-'}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Engine Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><span className="text-sm text-gray-500">Number of Engines</span><p className="font-medium">{vessel.number_of_engines || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Engine Type</span><p className="font-medium">{vessel.engine_type || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Engine Power</span><p className="font-medium">{vessel.engine_power ? `${vessel.engine_power} kW` : '-'}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Contact & Registry</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><span className="text-sm text-gray-500">Boat Phone</span><p className="font-medium">{vessel.boat_phone || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Flag</span><p className="font-medium">{vessel.flag || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Port of Registry</span><p className="font-medium">{vessel.port_of_registry || '-'}</p></div>
              </CardContent>
            </Card>
          </div>
        );
      case 'trips':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {trips.length} trip{trips.length !== 1 ? 's' : ''} for this vessel
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/trips'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Trips
              </Button>
            </div>
            {trips.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Pax</TableHead>
                <TableHead>Crew</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => {
                const now = new Date();
                const plannedDepart = trip.planned_depart_datetime ? new Date(trip.planned_depart_datetime) : null;
                const actualDepart = trip.actual_depart_datetime ? new Date(trip.actual_depart_datetime) : null;
                const actualArrival = trip.actual_arrival_datetime ? new Date(trip.actual_arrival_datetime) : null;
                let status = 'Scheduled', statusVariant = 'outline';
                if (actualArrival) { status = 'Completed'; statusVariant = 'default'; }
                else if (actualDepart && !actualArrival) { status = 'In Progress'; statusVariant = 'secondary'; }
                else if (plannedDepart && now > plannedDepart && !actualDepart) { status = 'Overdue'; statusVariant = 'destructive'; }
                return (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.trip_name || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{trip.trip_type || 'N/A'}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant}>{status}</Badge></TableCell>
                    <TableCell>{(actualDepart || plannedDepart) ? new Date(actualDepart || plannedDepart).toLocaleString() : '-'}</TableCell>
                    <TableCell>{(actualArrival || trip.planned_arrival_datetime) ? new Date(actualArrival || trip.planned_arrival_datetime).toLocaleString() : '-'}</TableCell>
                    <TableCell>{trip.depart_location || '-'}</TableCell>
                    <TableCell>{trip.arrival_location || '-'}</TableCell>
                    <TableCell>{trip.number_of_passengers || 0}</TableCell>
                    <TableCell>{trip.number_of_crew || 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No trips recorded for this vessel.</p>
                <p className="text-xs mt-1">Create trips from the Trips module</p>
              </div>
            )}
          </div>
        );
      case 'passengers':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {passengers.length} passenger{passengers.length !== 1 ? 's' : ''} on this vessel's trips
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/trips'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Trips
              </Button>
            </div>
            {passengers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Emergency Contact</TableHead>
                <TableHead>Special Requirements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengers.map((p) => {
                const trip = trips.find(t => t.id === p.trip_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name || '-'}</TableCell>
                    <TableCell>{trip?.trip_name || '-'}</TableCell>
                    <TableCell>{p.contact_number || p.email || '-'}</TableCell>
                    <TableCell>{p.emergency_contact || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.special_requirements || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No passengers recorded for this vessel's trips.</p>
                <p className="text-xs mt-1">Add passengers from the Trips module</p>
              </div>
            )}
          </div>
        );
      case 'shifts':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {staffLogs.length} shift log{staffLogs.length !== 1 ? 's' : ''} for this vessel
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/trips'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Trips
              </Button>
            </div>
            {staffLogs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Start</TableHead>
                <TableHead>Shift End</TableHead>
                <TableHead>Crew Member</TableHead>
                <TableHead>Task Performed</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffLogs.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.shift_start_datetime ? new Date(shift.shift_start_datetime).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{shift.shift_stop_datetime ? new Date(shift.shift_stop_datetime).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{shift.crew_name || 'Unknown'}</TableCell>
                  <TableCell className="max-w-xs truncate">{shift.task_performed || '-'}</TableCell>
                  <TableCell>{shift.total_hours ? `${shift.total_hours}h` : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No shift logs recorded for this vessel.</p>
                <p className="text-xs mt-1">Add shift logs from the Trips module</p>
              </div>
            )}
          </div>
        );
      case 'running':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {runningLogs.length} running log{runningLogs.length !== 1 ? 's' : ''} for this vessel
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/trips'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Trips
              </Button>
            </div>
            {runningLogs.length > 0 ? (
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
              {runningLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.log_datetime ? new Date(log.log_datetime).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell><Badge variant="outline">{log.category || 'General'}</Badge></TableCell>
                  <TableCell>{log.activity || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.activity_details || '-'}</TableCell>
                  <TableCell>{log.crew_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No running logs recorded for this vessel.</p>
                <p className="text-xs mt-1">Add running logs from the Trips module</p>
              </div>
            )}
          </div>
        );
      case 'engine':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {engineLogs.length} engine log{engineLogs.length !== 1 ? 's' : ''} for this vessel
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/trips'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Trips
              </Button>
            </div>
            {engineLogs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Fuel Used</TableHead>
                <TableHead>Oil Pressure</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engineLogs.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.log_datetime ? new Date(e.log_datetime).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{e.engine_number || '-'}</TableCell>
                  <TableCell>{e.engine_hours || '-'}</TableCell>
                  <TableCell>{e.fuel_used || '-'}</TableCell>
                  <TableCell>{e.oil_pressure || '-'}</TableCell>
                  <TableCell>{e.engine_temp || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{e.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No engine logs recorded for this vessel.</p>
                <p className="text-xs mt-1">Add engine logs from the Trips module</p>
              </div>
            )}
          </div>
        );
      case 'drills':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {drills.length} drill{drills.length !== 1 ? 's' : ''} for this vessel
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/emergency'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Emergency
              </Button>
            </div>
            {drills.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drill Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Conducted By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drills.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.drill_type || '-'}</TableCell>
                  <TableCell>{d.drill_date ? new Date(d.drill_date).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell className="max-w-xs truncate">{Array.isArray(d.participants) ? d.participants.join(', ') : (d.participants || '-')}</TableCell>
                  <TableCell><Badge variant={d.outcome === 'Pass' ? 'default' : d.outcome === 'Fail' ? 'destructive' : 'secondary'}>{d.outcome || '-'}</Badge></TableCell>
                  <TableCell>{d.conducted_by_name || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{d.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No drill logs recorded for this vessel.</p>
                <p className="text-xs mt-1">Add drills from the Emergency module</p>
              </div>
            )}
          </div>
        );
      case 'risks':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {risks.length} risk assessment{risks.length !== 1 ? 's' : ''} for this vessel
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/risk-assessment'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Risk Assessment
              </Button>
            </div>
            {risks.length > 0 ? (
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
              {risks.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell className="font-medium">{risk.activity_task || '-'}</TableCell>
                  <TableCell><Badge variant={risk.risk_level === 'High' ? 'destructive' : risk.risk_level === 'Medium' ? 'default' : 'secondary'}>{risk.risk_level || '-'}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{risk.hazard_description || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{risk.control_measures || '-'}</TableCell>
                  <TableCell>{risk.assessment_date ? new Date(risk.assessment_date).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No risk assessments for this vessel.</p>
                <p className="text-xs mt-1">Add risk assessments from the Risk Assessment module</p>
              </div>
            )}
          </div>
        );
      case 'maintenance':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {maintenance.length} maintenance record{maintenance.length !== 1 ? 's' : ''} for this vessel
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/maintenance'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Maintenance
              </Button>
            </div>
            {maintenance.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item/System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead>Last Service</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.maintenance_type || '-'}</TableCell>
                  <TableCell>{item.item_system || '-'}</TableCell>
                  <TableCell><Badge variant={item.status === 'Completed' ? 'default' : item.status === 'Overdue' ? 'destructive' : 'secondary'}>{item.status || '-'}</Badge></TableCell>
                  <TableCell>{item.next_service_date ? new Date(item.next_service_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{item.last_service_date ? new Date(item.last_service_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell><Badge variant={item.priority === 'High' ? 'destructive' : 'outline'}>{item.priority || '-'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No maintenance records for this vessel.</p>
                <p className="text-xs mt-1">Add maintenance records from the Maintenance module</p>
              </div>
            )}
          </div>
        );
      case 'incidents':
        return incidents.length > 0 ? (
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
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">{incident.incident_number || '-'}</TableCell>
                  <TableCell>{incident.title || '-'}</TableCell>
                  <TableCell>{Array.isArray(incident.incident_type) ? incident.incident_type.join(', ') : (incident.incident_type || '-')}</TableCell>
                  <TableCell><Badge variant={incident.severity === 'Critical' || incident.severity === 'High' ? 'destructive' : 'secondary'}>{incident.severity || '-'}</Badge></TableCell>
                  <TableCell>{incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell><Badge variant="outline">{incident.investigation_status || '-'}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{incident.location || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-gray-500 text-center py-8">No incidents recorded for this vessel.</p>;
      default:
        return null;
    }
  };

  if (!vessel) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>🚢 {vessel.vessel_name || 'Vessel'} - Details & Activity</DialogTitle>
              <DialogDescription>View vessel information, logs and activity records</DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export All to Excel
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading data...</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <Select value={selectedView} onValueChange={setSelectedView}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  {viewOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg overflow-auto min-h-[300px]">
              {renderContent()}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VesselDetailsDialog;
