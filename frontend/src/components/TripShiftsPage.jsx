import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Clock, User, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import TripLogForm from './TripLogForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripShiftsPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [shiftLogs, setShiftLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  
  // Form state
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [shiftFormMode, setShiftFormMode] = useState('create');
  const [selectedShiftLog, setSelectedShiftLog] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (tripId) {
      fetchData();
    }
  }, [tripId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [tripRes, shiftsRes] = await Promise.all([
        axios.get(`${API}/trips/${tripId}`, { headers }),
        axios.get(`${API}/trip-logs?trip_id=${tripId}`, { headers })
      ]);

      setTrip(tripRes.data);
      // Sort by most recent first
      const sortedShifts = (shiftsRes.data || []).sort((a, b) => {
        const dateA = new Date(a.shift_start_datetime || 0);
        const dateB = new Date(b.shift_start_datetime || 0);
        return dateB - dateA; // Most recent first
      });
      setShiftLogs(sortedShifts);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load shift logs');
    } finally {
      setLoading(false);
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

  const canEdit = user?.access_level === 'Edit' || user?.access_level === 'Full' || user?.access_level === 'Admin';
  const canDelete = user?.access_level === 'Full' || user?.access_level === 'Admin';

  // Shift handlers
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
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving shift log');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteShiftLog = async (log) => {
    if (!window.confirm(`Delete shift log for ${log.crew_name}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/trip-logs/${log.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Shift log deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting shift log');
      setTimeout(() => setError(''), 3000);
    }
  };

  const exportToExcel = () => {
    if (shiftLogs.length === 0) {
      setError('No shift logs to export');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const wb = XLSX.utils.book_new();
    const headers = ['Shift Start', 'Shift End', 'Crew Name', 'Task Performed', 'Total Hours'];
    const data = [headers, ...shiftLogs.map(log => [
      log.shift_start_datetime ? new Date(log.shift_start_datetime).toLocaleString() : 'N/A',
      log.shift_stop_datetime ? new Date(log.shift_stop_datetime).toLocaleString() : 'N/A',
      log.crew_name || 'N/A',
      log.task_performed || '-',
      log.total_hours ? `${log.total_hours}h` : 'N/A'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Crew Shifts');
    XLSX.writeFile(wb, `crew_shifts_${trip?.trip_name?.replace(/\s+/g, '_') || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Crew shifts exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading shift logs...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/trips')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trips
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Shift Logs - {trip?.trip_name || 'Trip'}
            </h1>
            <p className="text-sm text-gray-500">
              {trip?.vessel_name && `Vessel: ${trip.vessel_name}`}
              {trip?.planned_depart_datetime && ` • ${formatDateTime(trip.planned_depart_datetime)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {shiftLogs.length > 0 && (
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleAddShiftLog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Shift Log
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
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

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shift Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">{shiftLogs.length}</p>
              <p className="text-sm text-gray-500">Total Shifts</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{getTotalShiftHours()}</p>
              <p className="text-sm text-gray-500">Total Hours</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">
                {new Set(shiftLogs.map(s => s.crew_name)).size}
              </p>
              <p className="text-sm text-gray-500">Crew Members</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Logs Table */}
      {shiftLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No shift logs recorded for this trip</p>
            {canEdit && (
              <Button className="mt-4" onClick={handleAddShiftLog}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Shift Log
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crew Member</TableHead>
                  <TableHead>Shift Start</TableHead>
                  <TableHead>Shift End</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Task Performed</TableHead>
                  {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{log.crew_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatDateTime(log.shift_start_datetime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {log.shift_stop_datetime ? formatDateTime(log.shift_stop_datetime) : 'Ongoing'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.total_hours ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {log.total_hours} hrs
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          In Progress
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-gray-600">{log.task_performed || '-'}</p>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button size="sm" variant="ghost" onClick={() => handleEditShiftLog(log)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDeleteShiftLog(log)} 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Shift Form Dialog */}
      <TripLogForm
        open={shiftFormOpen}
        onClose={() => setShiftFormOpen(false)}
        onSave={handleSaveShiftLog}
        log={selectedShiftLog}
        tripId={tripId}
        vesselId={trip?.vessel_id}
        vesselName={trip?.vessel_name}
        mode={shiftFormMode}
      />
    </div>
  );
};

export default TripShiftsPage;
