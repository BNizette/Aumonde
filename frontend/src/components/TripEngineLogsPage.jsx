import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Edit, Trash2, Gauge, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import EngineRunningLogForm from './EngineRunningLogForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripEngineLogsPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [engineLogs, setEngineLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  
  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedLog, setSelectedLog] = useState(null);

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

      const tripRes = await axios.get(`${API}/trips/${tripId}`, { headers });
      setTrip(tripRes.data);
      
      // Fetch logs by vessel_id from the trip
      const vesselId = tripRes.data?.vessel_id;
      if (vesselId) {
        const logsRes = await axios.get(`${API}/engine-running-logs?vessel_id=${vesselId}`, { headers });
        // Sort by most recent first
        const sortedLogs = (logsRes.data || []).sort((a, b) => {
          const dateA = new Date(a.log_datetime || 0);
          const dateB = new Date(b.log_datetime || 0);
          return dateB - dateA;
        });
        setEngineLogs(sortedLogs);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load engine logs');
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

  const canEdit = user?.access_level === 'Edit' || user?.access_level === 'Full';
  const canDelete = user?.access_level === 'Full';

  // Log handlers
  const handleAddLog = () => {
    setSelectedLog(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditLog = (log) => {
    setSelectedLog(log);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleSaveLog = async (logData) => {
    try {
      const token = localStorage.getItem('token');
      if (formMode === 'create') {
        await axios.post(`${API}/engine-running-logs`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Engine log added successfully');
      } else {
        await axios.put(`${API}/engine-running-logs/${selectedLog.id}`, logData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Engine log updated successfully');
      }
      setFormOpen(false);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving engine log');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteLog = async (log) => {
    if (!window.confirm('Delete this engine log entry?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/engine-running-logs/${log.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Engine log deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting engine log');
      setTimeout(() => setError(''), 3000);
    }
  };

  const exportToExcel = () => {
    if (engineLogs.length === 0) {
      setError('No engine logs to export');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const wb = XLSX.utils.book_new();
    const headers = ['Date & Time', 'Engine 1 RPM', 'Engine 1 Water Temp', 'Engine 1 Oil Temp', 'Engine 2 RPM', 'Engine 2 Water Temp', 'Engine 2 Oil Temp'];
    const data = [headers, ...engineLogs.map(log => [
      log.log_datetime ? new Date(log.log_datetime).toLocaleString() : 'N/A',
      log.engine1_rpm || '-',
      log.engine1_water_temp ? `${log.engine1_water_temp}°C` : '-',
      log.engine1_oil_temp ? `${log.engine1_oil_temp}°C` : '-',
      log.engine2_rpm || '-',
      log.engine2_water_temp ? `${log.engine2_water_temp}°C` : '-',
      log.engine2_oil_temp ? `${log.engine2_oil_temp}°C` : '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Engine Logs');
    XLSX.writeFile(wb, `engine_logs_${trip?.trip_name?.replace(/\s+/g, '_') || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage('Engine logs exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading engine logs...</div>
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
              Engine Logs - {trip?.trip_name || 'Trip'}
            </h1>
            <p className="text-sm text-gray-500">
              {trip?.vessel_name && `Vessel: ${trip.vessel_name}`}
              {trip?.planned_depart_datetime && ` • ${formatDateTime(trip.planned_depart_datetime)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {engineLogs.length > 0 && (
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
            <Button onClick={handleAddLog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Engine Log
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
          <CardTitle className="text-lg">Engine Logs Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-purple-600">{engineLogs.length}</p>
              <p className="text-sm text-gray-500">Total Entries</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">
                {trip?.vessel_name ? (trip.number_of_engines || 2) : '-'}
              </p>
              <p className="text-sm text-gray-500">Engines Monitored</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engine Logs Table */}
      {engineLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gauge className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No engine logs recorded for this vessel</p>
            {canEdit && (
              <Button className="mt-4" onClick={handleAddLog}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Engine Log
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
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Port Engine (RPM)</TableHead>
                  <TableHead>Port Water Temp</TableHead>
                  <TableHead>Starboard Engine (RPM)</TableHead>
                  <TableHead>Starboard Water Temp</TableHead>
                  {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {engineLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-purple-600" />
                        {formatDateTime(log.log_datetime)}
                      </div>
                    </TableCell>
                    <TableCell>{log.engine1_rpm || '-'}</TableCell>
                    <TableCell>{log.engine1_water_temp ? `${log.engine1_water_temp}°C` : '-'}</TableCell>
                    <TableCell>{log.engine2_rpm || '-'}</TableCell>
                    <TableCell>{log.engine2_water_temp ? `${log.engine2_water_temp}°C` : '-'}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button size="sm" variant="ghost" onClick={() => handleEditLog(log)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDeleteLog(log)} 
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

      {/* Engine Log Form Dialog */}
      <EngineRunningLogForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveLog}
        log={selectedLog}
        tripId={tripId}
        mode={formMode}
      />
    </div>
  );
};

export default TripEngineLogsPage;
