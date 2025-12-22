import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet } from 'lucide-react';
import { exportMultiSheetExcel, formatDate, safeValue, safeArrayJoin } from '../utils/excelExport';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VesselDetailsDialog = ({ open, onClose, vessel, onMessage }) => {
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [runningLogs, setRunningLogs] = useState([]);
  const [staffLogs, setStaffLogs] = useState([]);
  const [risks, setRisks] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (open && vessel) {
      fetchVesselData();
    }
  }, [open, vessel]);

  const fetchVesselData = async () => {
    if (!vessel || !vessel.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const vesselId = vessel.id;

      const [tripsRes, logsRes, staffRes, risksRes, maintenanceRes, incidentsRes] = await Promise.all([
        axios.get(`${API}/trips?vessel_id=${vesselId}`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/vessels/${vesselId}/running-logs`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/vessels/${vesselId}/staff-logs`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/risk-assessments`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/maintenance`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/incidents`, { headers }).catch(() => ({ data: [] }))
      ]);

      setTrips(tripsRes.data || []);
      setRunningLogs(logsRes.data || []);
      setStaffLogs(staffRes.data || []);
      setRisks((risksRes.data || []).filter(r => r.vessel_id === vesselId));
      setMaintenance((maintenanceRes.data || []).filter(m => m.vessel_id === vesselId));
      setIncidents((incidentsRes.data || []).filter(i => i.vessel_id === vesselId));
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
        name: 'Trip Logs',
        headers: ['Date & Time', 'Category', 'Activity', 'Details', 'Crew'],
        data: runningLogs.length > 0 ? runningLogs.map(log => [
          formatDate(log.log_datetime, true),
          safeValue(log.category, 'General'),
          safeValue(log.activity),
          safeValue(log.activity_details),
          safeValue(log.crew_name)
        ]) : [['No trip logs recorded', '', '', '', '']],
        columnWidths: [20, 12, 20, 30, 15]
      },
      {
        name: 'Allocated Staff',
        headers: ['Shift Start', 'Shift End', 'Crew Member', 'Task Performed', 'Total Hours'],
        data: staffLogs.length > 0 ? staffLogs.map(s => [
          formatDate(s.shift_start_datetime, true),
          formatDate(s.shift_stop_datetime, true),
          safeValue(s.crew_name, 'Unknown'),
          safeValue(s.task_performed),
          s.total_hours ? `${s.total_hours}h` : '-'
        ]) : [['No staff logs recorded', '', '', '', '']],
        columnWidths: [20, 20, 20, 30, 12]
      },
      {
        name: 'Risk Assessments',
        headers: ['Activity/Task', 'Risk Level', 'Hazard', 'Control Measures', 'Assessment Date'],
        data: risks.length > 0 ? risks.map(r => [
          safeValue(r.activity_task),
          safeValue(r.risk_level),
          safeValue(r.hazard_description),
          safeValue(r.control_measures),
          formatDate(r.assessment_date)
        ]) : [['No risk assessments recorded', '', '', '', '']],
        columnWidths: [25, 12, 30, 30, 15]
      },
      {
        name: 'Maintenance',
        headers: ['Type', 'Item/System', 'Status', 'Next Service', 'Last Service', 'Priority'],
        data: maintenance.length > 0 ? maintenance.map(m => [
          safeValue(m.maintenance_type),
          safeValue(m.item_system),
          safeValue(m.status),
          formatDate(m.next_service_date),
          formatDate(m.last_service_date),
          safeValue(m.priority)
        ]) : [['No maintenance records', '', '', '', '', '']],
        columnWidths: [15, 20, 12, 15, 15, 10]
      },
      {
        name: 'Incidents',
        headers: ['Incident #', 'Title', 'Type', 'Severity', 'Date', 'Status', 'Location'],
        data: incidents.length > 0 ? incidents.map(i => [
          safeValue(i.incident_number),
          safeValue(i.title),
          safeArrayJoin(i.incident_type, '; '),
          safeValue(i.severity),
          formatDate(i.incident_date),
          safeValue(i.investigation_status),
          safeValue(i.location)
        ]) : [['No incidents recorded', '', '', '', '', '', '']],
        columnWidths: [15, 25, 20, 10, 12, 15, 20]
      }
    ];

    exportMultiSheetExcel(sheets, `${vessel.vessel_name?.replace(/\s+/g, '_')}_details`);
    onMessage?.('Vessel data exported to Excel successfully');
  };

  if (!vessel) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>🚢 {vessel.vessel_name || 'Vessel'} - Details & Activity</DialogTitle>
              <DialogDescription>View vessel information, trip logs and allocated staff activity</DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading data...</div>
          </div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Vessel Details</TabsTrigger>
              <TabsTrigger value="running">Trip Logs ({runningLogs.length})</TabsTrigger>
              <TabsTrigger value="staff">Allocated Staff ({staffLogs.length})</TabsTrigger>
              <TabsTrigger value="risks">Risk Assessments ({risks.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance ({maintenance.length})</TabsTrigger>
              <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
            </TabsList>

            {/* Vessel Details Tab */}
            <TabsContent value="details" className="space-y-4">
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
            </TabsContent>

            {/* Trip Logs Tab */}
            <TabsContent value="running" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Running logs for {vessel.vessel_name}</div>
                {runningLogs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    exportMultiSheetExcel([{
                      name: 'Trip Logs',
                      headers: ['Date & Time', 'Category', 'Activity', 'Details', 'Crew'],
                      data: runningLogs.map(log => [formatDate(log.log_datetime, true), safeValue(log.category, 'General'), safeValue(log.activity), safeValue(log.activity_details), safeValue(log.crew_name)]),
                      columnWidths: [20, 12, 20, 30, 15]
                    }], `vessel_trips_${vessel.vessel_name}`);
                  }} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />Export to Excel
                  </Button>
                )}
              </div>
              {runningLogs.length > 0 ? (
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
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No trip logs recorded for this vessel.</p>
              )}
            </TabsContent>

            {/* Staff Tab */}
            <TabsContent value="staff" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Staff allocated to {vessel.vessel_name}</div>
                {staffLogs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    exportMultiSheetExcel([{
                      name: 'Allocated Staff',
                      headers: ['Shift Start', 'Shift End', 'Crew Member', 'Task Performed', 'Total Hours'],
                      data: staffLogs.map(s => [formatDate(s.shift_start_datetime, true), formatDate(s.shift_stop_datetime, true), safeValue(s.crew_name), safeValue(s.task_performed), s.total_hours ? `${s.total_hours}h` : '-']),
                      columnWidths: [20, 20, 20, 30, 12]
                    }], `vessel_staff_${vessel.vessel_name}`);
                  }} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />Export to Excel
                  </Button>
                )}
              </div>
              {staffLogs.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
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
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No staff logs recorded for this vessel.</p>
              )}
            </TabsContent>

            {/* Risks Tab */}
            <TabsContent value="risks" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Risk assessments for {vessel.vessel_name}</div>
                {risks.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    exportMultiSheetExcel([{
                      name: 'Risk Assessments',
                      headers: ['Activity/Task', 'Risk Level', 'Hazard', 'Control Measures', 'Assessment Date'],
                      data: risks.map(r => [safeValue(r.activity_task), safeValue(r.risk_level), safeValue(r.hazard_description), safeValue(r.control_measures), formatDate(r.assessment_date)]),
                      columnWidths: [25, 12, 30, 30, 15]
                    }], `vessel_risks_${vessel.vessel_name}`);
                  }} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />Export to Excel
                  </Button>
                )}
              </div>
              {risks.length > 0 ? (
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
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No risk assessments for this vessel.</p>
              )}
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Maintenance records for {vessel.vessel_name}</div>
                {maintenance.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    exportMultiSheetExcel([{
                      name: 'Maintenance',
                      headers: ['Type', 'Item/System', 'Status', 'Next Service', 'Last Service', 'Priority'],
                      data: maintenance.map(m => [safeValue(m.maintenance_type), safeValue(m.item_system), safeValue(m.status), formatDate(m.next_service_date), formatDate(m.last_service_date), safeValue(m.priority)]),
                      columnWidths: [15, 20, 12, 15, 15, 10]
                    }], `vessel_maintenance_${vessel.vessel_name}`);
                  }} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />Export to Excel
                  </Button>
                )}
              </div>
              {maintenance.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
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
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No maintenance records for this vessel.</p>
              )}
            </TabsContent>

            {/* Incidents Tab */}
            <TabsContent value="incidents" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Incidents for {vessel.vessel_name}</div>
                {incidents.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    exportMultiSheetExcel([{
                      name: 'Incidents',
                      headers: ['Incident #', 'Title', 'Type', 'Severity', 'Date', 'Status', 'Location'],
                      data: incidents.map(i => [safeValue(i.incident_number), safeValue(i.title), safeArrayJoin(i.incident_type, '; '), safeValue(i.severity), formatDate(i.incident_date), safeValue(i.investigation_status), safeValue(i.location)]),
                      columnWidths: [15, 25, 20, 10, 12, 15, 20]
                    }], `vessel_incidents_${vessel.vessel_name}`);
                  }} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />Export to Excel
                  </Button>
                )}
              </div>
              {incidents.length > 0 ? (
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
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No incidents recorded for this vessel.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VesselDetailsDialog;
