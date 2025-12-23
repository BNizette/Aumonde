import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, Activity, FileText, ExternalLink } from 'lucide-react';
import { exportMultiSheetExcel, formatDate, safeValue } from '../utils/excelExport';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CrewDetailsDialog = ({ open, onClose, crew, onMessage }) => {
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState('details');
  const [trips, setTrips] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [drillRecords, setDrillRecords] = useState([]);
  const [trainingRecords, setTrainingRecords] = useState([]);

  useEffect(() => {
    if (open && crew) {
      fetchCrewData();
      setSelectedView('details');
    }
  }, [open, crew]);

  const calculateYears = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const years = Math.floor((now - date) / (365.25 * 24 * 60 * 60 * 1000));
    return years > 0 ? `${years} year${years > 1 ? 's' : ''}` : 'Less than 1 year';
  };

  const fetchCrewData = async () => {
    if (!crew || !crew.id || !crew.staff_name) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const crewId = crew.id;
      const crewName = crew.staff_name;

      const [tripsRes, shiftsRes, drillsRes, trainingRes] = await Promise.all([
        axios.get(`${API}/crew/${crewId}/trips`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/crew/${crewId}/shifts`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/crew/${encodeURIComponent(crewName)}/drill-records`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/crew/${encodeURIComponent(crewName)}/training-records`, { headers }).catch(() => ({ data: [] }))
      ]);

      setTrips(tripsRes.data || []);
      setShifts(shiftsRes.data || []);
      setDrillRecords(drillsRes.data || []);
      setTrainingRecords(trainingRes.data || []);
    } catch (err) {
      console.error('Error fetching crew data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!crew) return;
    
    const sheets = [
      {
        name: 'Crew Details',
        headers: ['Field', 'Value'],
        data: [
          ['Name', safeValue(crew.staff_name)],
          ['Position', safeValue(crew.default_position)],
          ['Role', safeValue(crew.role)],
          ['Mobile', safeValue(crew.mobile)],
          ['Telephone', safeValue(crew.telephone)],
          ['Email', safeValue(crew.email)],
          ['Address', safeValue(crew.address)],
          ['Date of Birth', formatDate(crew.date_of_birth)],
          ['Gender', safeValue(crew.gender)],
          ['Next of Kin', safeValue(crew.next_of_kin)],
          ['Next of Kin Contact', safeValue(crew.next_of_kin_contact)],
          ['Date Commenced', formatDate(crew.date_commenced)],
          ['Status', safeValue(crew.status)],
          ['License Number', safeValue(crew.license_number)],
          ['License Expiry', formatDate(crew.license_expiry)],
          ['Medical Cert Expiry', formatDate(crew.medical_cert_expiry)]
        ],
        columnWidths: [20, 30]
      },
      {
        name: 'Trip Allocations',
        headers: ['Trip Name', 'Vessel', 'Start Date', 'End Date', 'Position', 'Status'],
        data: trips.length > 0 ? trips.map(t => [
          safeValue(t.trip_name),
          safeValue(t.vessel_name),
          formatDate(t.start_date),
          formatDate(t.end_date),
          safeValue(t.position),
          safeValue(t.status)
        ]) : [['No trip allocations', '', '', '', '', '']],
        columnWidths: [25, 20, 15, 15, 15, 12]
      },
      {
        name: 'Crew Shifts',
        headers: ['Shift Start', 'Shift End', 'Vessel', 'Task Performed', 'Total Hours'],
        data: shifts.length > 0 ? shifts.map(s => [
          formatDate(s.shift_start_datetime, true),
          formatDate(s.shift_stop_datetime, true),
          safeValue(s.vessel_name),
          safeValue(s.task_performed),
          s.total_hours ? `${s.total_hours}h` : '-'
        ]) : [['No shift logs', '', '', '', '']],
        columnWidths: [20, 20, 20, 30, 12]
      },
      {
        name: 'Drills',
        headers: ['Drill Type', 'Record Date', 'Status', 'Authorized By', 'Notes'],
        data: drillRecords.length > 0 ? drillRecords.map(d => [
          safeValue(d.drill_type),
          formatDate(d.record_date, true),
          safeValue(d.status),
          safeValue(d.authorized_by),
          safeValue(d.notes)
        ]) : [['No drill records', '', '', '', '']],
        columnWidths: [20, 20, 10, 20, 30]
      },
      {
        name: 'Training',
        headers: ['Procedure', 'Emergency Type', 'Training Date', 'Status', 'Authorized By', 'Notes'],
        data: trainingRecords.length > 0 ? trainingRecords.map(t => [
          safeValue(t.procedure_title),
          safeValue(t.emergency_type),
          formatDate(t.training_date, true),
          safeValue(t.status),
          safeValue(t.authorized_by),
          safeValue(t.notes)
        ]) : [['No training records', '', '', '', '', '']],
        columnWidths: [25, 15, 20, 10, 20, 30]
      }
    ];

    exportMultiSheetExcel(sheets, `${crew.staff_name?.replace(/\s+/g, '_')}_details`);
    onMessage?.('Crew data exported to Excel successfully');
  };

  const viewOptions = [
    { value: 'details', label: 'Crew Details' },
    { value: 'trips', label: `Trip Allocations (${trips.length})` },
    { value: 'shifts', label: `Crew Shifts (${shifts.length})` },
    { value: 'drills', label: `Drills (${drillRecords.length})` },
    { value: 'training', label: `Training (${trainingRecords.length})` },
  ];

  const renderContent = () => {
    switch (selectedView) {
      case 'details':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><span className="text-sm text-gray-500">Full Name</span><p className="font-medium">{crew.staff_name || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Date of Birth</span><p className="font-medium">{crew.date_of_birth ? new Date(crew.date_of_birth).toLocaleDateString() : '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Gender</span><p className="font-medium">{crew.gender || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Address</span><p className="font-medium">{crew.address || '-'}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><span className="text-sm text-gray-500">Mobile</span><p className="font-medium">{crew.mobile || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Telephone</span><p className="font-medium">{crew.telephone || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Email</span><p className="font-medium">{crew.email || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Next of Kin</span><p className="font-medium">{crew.next_of_kin || '-'} {crew.next_of_kin_contact ? `(${crew.next_of_kin_contact})` : ''}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Employment Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><span className="text-sm text-gray-500">Position</span><Badge variant="outline">{crew.default_position || 'N/A'}</Badge></div>
                  <div><span className="text-sm text-gray-500">Role</span><p className="font-medium">{crew.role || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Date Commenced</span><p className="font-medium">{crew.date_commenced ? new Date(crew.date_commenced).toLocaleDateString() : '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Status</span><Badge variant={crew.status === 'Active' ? 'default' : 'secondary'}>{crew.status || 'Unknown'}</Badge></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Certifications</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><span className="text-sm text-gray-500">License Number</span><p className="font-medium">{crew.license_number || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">License Expiry</span><p className="font-medium">{crew.license_expiry ? new Date(crew.license_expiry).toLocaleDateString() : '-'}</p></div>
                  <div><span className="text-sm text-gray-500">Medical Cert Expiry</span><p className="font-medium">{crew.medical_cert_expiry ? new Date(crew.medical_cert_expiry).toLocaleDateString() : '-'}</p></div>
                </CardContent>
              </Card>
            </div>
            {crew.qualifications && crew.qualifications.length > 0 && (
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-lg">Qualifications</CardTitle></CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Qualification</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Years</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {crew.qualifications.map((qual, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{qual.name || 'N/A'}</TableCell>
                            <TableCell>{qual.date ? new Date(qual.date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>{calculateYears(qual.date)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );
      case 'trips':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {trips.length} trip{trips.length !== 1 ? 's' : ''} for this crew member
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
                <TableHead>Vessel</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.trip_name || 'N/A'}</TableCell>
                  <TableCell>{t.vessel_name || '-'}</TableCell>
                  <TableCell>{t.start_date ? new Date(t.start_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{t.end_date ? new Date(t.end_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell><Badge variant="outline">{t.status || 'Unknown'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No trip allocations for this crew member.</p>
                <p className="text-xs mt-1">Assign crew to trips from the Trips module</p>
              </div>
            )}
          </div>
        );
      case 'shifts':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {shifts.length} shift log{shifts.length !== 1 ? 's' : ''} for this crew member
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
            {shifts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Start</TableHead>
                <TableHead>Shift End</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead>Task Performed</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.shift_start_datetime ? new Date(s.shift_start_datetime).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{s.shift_stop_datetime ? new Date(s.shift_stop_datetime).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{s.vessel_name ? <Badge variant="outline" className="bg-purple-50 text-purple-700">🚢 {s.vessel_name}</Badge> : '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{s.task_performed || '-'}</TableCell>
                  <TableCell>{s.total_hours ? `${s.total_hours}h` : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No shift logs for this crew member.</p>
                <p className="text-xs mt-1">Add shift logs from the Trips module</p>
              </div>
            )}
          </div>
        );
      case 'drills':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {drillRecords.length} drill record{drillRecords.length !== 1 ? 's' : ''} for this crew member
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/emergency#drills'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Emergency
              </Button>
            </div>
            {drillRecords.length > 0 ? (
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
              {drillRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.drill_type || 'N/A'}</TableCell>
                  <TableCell>{new Date(r.record_date).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.status === 'Pass' ? 'default' : 'destructive'}>{r.status}</Badge></TableCell>
                  <TableCell>{r.authorized_by}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No drill records for this crew member.</p>
                <p className="text-xs mt-1">Add drill records from the Emergency module</p>
              </div>
            )}
          </div>
        );
      case 'training':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {trainingRecords.length} training record{trainingRecords.length !== 1 ? 's' : ''} for this crew member
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/crew'}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage in Crew
              </Button>
            </div>
            {trainingRecords.length > 0 ? (
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
              {trainingRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.procedure_title || 'N/A'}</TableCell>
                  <TableCell><Badge variant="outline">{r.emergency_type || 'N/A'}</Badge></TableCell>
                  <TableCell>{new Date(r.training_date).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.status === 'Pass' ? 'default' : 'destructive'}>{r.status}</Badge></TableCell>
                  <TableCell>{r.authorized_by}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No training records for this crew member.</p>
                <p className="text-xs mt-1">Add training records from the Emergency module</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (!crew) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>👤 {crew.staff_name} - Details & Activity</DialogTitle>
              <DialogDescription>View crew member information, trip allocations and shift logs</DialogDescription>
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

export default CrewDetailsDialog;
