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
import { Ship, Plus, Edit, Trash2, Search, Calendar, Filter, X, AlertTriangle, Download, ChevronDown, FileText, Eye, Info, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import VesselDetailsDialog from './VesselDetailsDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveListCard } from '@/components/ui/responsive-list-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SummaryCard } from '@/components/ui/summary-card';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  const exportToExcel = () => {
    if (filteredVessels.length === 0) {
      setError('No vessels to export');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const wb = XLSX.utils.book_new();
    
    // Comprehensive headers covering Basic, Specs & Safety, and Equipment
    const headers = [
      // Basic Details
      'Vessel Name', 'Registration Number', 'Unique ID', 'Vessel Type', 'Owner Name', 'Owner Contact', 
      'Boat Phone', 'Flag', 'Port of Registry', 'IMO Number', 'MMSI Number', 'Call Sign', 
      'AIS Class', 'Home Port', 'Operational Status',
      // Specifications
      'Length Overall (m)', 'Length at Waterline (m)', 'Beam (m)', 'Draft (m)', 'Air Draft (m)',
      'CE Category', 'Gross Tonnage', 'Construction Material', 'Year Built', 'Builder',
      'Number of Engines', 'Engine Type', 'Engine Power', 'Engine 1 Model', 'Engine 1 Serial',
      'Engine 2 Model', 'Engine 2 Serial', 'Propeller Type', 'Propeller Material',
      'Fuel Type', 'Fuel Capacity (L)', 'Water Capacity (L)',
      // Auxiliary Engine
      'Aux Engine Type', 'Aux Engine Power', 'Aux Engine Fuel', 'Aux Engine Serial',
      // Capacity
      'Max Passengers Berthed', 'Max Passengers Unberthed', 'Max Crew',
      // Equipment
      'Navigation Equipment', 'Communication Equipment', 'Safety Equipment',
      'Inside Equipment', 'Outside Equipment',
      // Safety Equipment
      'Life Rafts', 'Life Jackets', 'EPIRB', 'Fire Extinguishers', 'Flares',
      // Certificates
      'Survey Cert Issue', 'Survey Cert Expiry', 'Operation Cert Issue', 'Operation Cert Expiry',
      'Loadline Cert Issue', 'Loadline Cert Expiry', 'Stability Book Date', 'Stability Book Expiry'
    ];
    
    const data = [headers, ...filteredVessels.map(v => [
      // Basic Details
      v.vessel_name || '', v.registration_number || '', v.unique_identifier_number || '', 
      v.vessel_type || '', v.owner_name || '', v.owner_contact || '',
      v.boat_phone || '', v.flag || '', v.port_of_registry || '', v.imo_number || '', 
      v.mmsi_number || '', v.call_sign || '', v.ais_class || '', v.home_port || '', 
      v.operational_status || '',
      // Specifications
      v.length_overall || v.length || '', v.length_at_waterline || '', v.beam || '', 
      v.draft || '', v.air_draft || '', v.ce_category || '', v.gross_tonnage || '', 
      v.construction_material || '', v.year_built || '', v.builder || '',
      v.number_of_engines || '', v.engine_type || '', v.engine_power || '', 
      v.engine1_model || '', v.engine1_serial || '', v.engine2_model || '', v.engine2_serial || '',
      v.propeller_type || '', v.propeller_material || '', v.fuel_type || '', 
      v.fuel_capacity || '', v.water_capacity || '',
      // Auxiliary Engine
      v.aux_type || '', v.aux_power || '', v.aux_fuel || '', v.aux_serial || '',
      // Capacity
      v.max_passengers_berthed || '', v.max_passengers_unberthed || '', v.max_crew || '',
      // Equipment
      v.navigation_equipment || '', v.communication_equipment || '', v.safety_equipment || '',
      v.inside_equipment || '', v.outside_equipment || '',
      // Safety Equipment
      v.life_rafts || '', v.life_jackets || '', v.epirb ? 'Yes' : 'No', 
      v.fire_extinguishers || '', v.flares || '',
      // Certificates
      v.cert_survey_issue || '', v.cert_survey_expiry || '', v.cert_operation_issue || '', 
      v.cert_operation_expiry || '', v.cert_loadline_issue || '', v.cert_loadline_expiry || '',
      v.stability_book_date || '', v.stability_book_expiry || ''
    ])];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Set column widths
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Vessels');
    XLSX.writeFile(wb, `vessels_full_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredVessels.length} vessels with all fields to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Import from Excel handler - handles all vessel fields
  const handleImport = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const vesselData = {
            // Basic Details
            vessel_name: row['Vessel Name'] || '',
            registration_number: row['Registration Number'] || '',
            unique_identifier_number: row['Unique ID'] || '',
            vessel_type: row['Vessel Type'] || '',
            owner_name: row['Owner Name'] || '',
            owner_contact: row['Owner Contact'] || '',
            boat_phone: row['Boat Phone'] || '',
            flag: row['Flag'] || '',
            port_of_registry: row['Port of Registry'] || '',
            imo_number: row['IMO Number'] || '',
            mmsi_number: row['MMSI Number'] || '',
            call_sign: row['Call Sign'] || '',
            ais_class: row['AIS Class'] || '',
            home_port: row['Home Port'] || '',
            operational_status: row['Operational Status'] || 'Operational',
            // Specifications
            length_overall: row['Length Overall (m)'] || '',
            length_at_waterline: row['Length at Waterline (m)'] || '',
            beam: row['Beam (m)'] || '',
            draft: row['Draft (m)'] || '',
            air_draft: row['Air Draft (m)'] || '',
            ce_category: row['CE Category'] || '',
            gross_tonnage: row['Gross Tonnage'] || '',
            construction_material: row['Construction Material'] || '',
            year_built: row['Year Built'] || '',
            builder: row['Builder'] || '',
            number_of_engines: row['Number of Engines'] || '',
            engine_type: row['Engine Type'] || '',
            engine_power: row['Engine Power'] || '',
            engine1_model: row['Engine 1 Model'] || '',
            engine1_serial: row['Engine 1 Serial'] || '',
            engine2_model: row['Engine 2 Model'] || '',
            engine2_serial: row['Engine 2 Serial'] || '',
            propeller_type: row['Propeller Type'] || '',
            propeller_material: row['Propeller Material'] || '',
            fuel_type: row['Fuel Type'] || '',
            fuel_capacity: row['Fuel Capacity (L)'] || '',
            water_capacity: row['Water Capacity (L)'] || '',
            // Auxiliary Engine
            aux_type: row['Aux Engine Type'] || '',
            aux_power: row['Aux Engine Power'] || '',
            aux_fuel: row['Aux Engine Fuel'] || '',
            aux_serial: row['Aux Engine Serial'] || '',
            // Capacity
            max_passengers_berthed: row['Max Passengers Berthed'] || '',
            max_passengers_unberthed: row['Max Passengers Unberthed'] || '',
            max_crew: row['Max Crew'] || '',
            // Equipment
            navigation_equipment: row['Navigation Equipment'] || '',
            communication_equipment: row['Communication Equipment'] || '',
            safety_equipment: row['Safety Equipment'] || '',
            inside_equipment: row['Inside Equipment'] || '',
            outside_equipment: row['Outside Equipment'] || '',
            // Safety Equipment
            life_rafts: row['Life Rafts'] || '',
            life_jackets: row['Life Jackets'] || '',
            epirb: row['EPIRB'] === 'Yes' || row['EPIRB'] === true,
            fire_extinguishers: row['Fire Extinguishers'] || '',
            flares: row['Flares'] || '',
            // Certificates
            cert_survey_issue: row['Survey Cert Issue'] || '',
            cert_survey_expiry: row['Survey Cert Expiry'] || '',
            cert_operation_issue: row['Operation Cert Issue'] || '',
            cert_operation_expiry: row['Operation Cert Expiry'] || '',
            cert_loadline_issue: row['Loadline Cert Issue'] || '',
            cert_loadline_expiry: row['Loadline Cert Expiry'] || '',
            stability_book_date: row['Stability Book Date'] || '',
            stability_book_expiry: row['Stability Book Expiry'] || '',
          };

          if (!vesselData.vessel_name) continue;

          await axios.post(`${API}/vessels`, vesselData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error('Error importing vessel:', err);
          errorCount++;
        }
      }

      setMessage(`Import complete: ${successCount} vessels added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchVessels();
    } catch (err) {
      setError('Error importing data: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Import template columns matching comprehensive export format
  const vesselImportColumns = [
    // Basic Details
    'Vessel Name', 'Registration Number', 'Unique ID', 'Vessel Type', 'Owner Name', 'Owner Contact', 
    'Boat Phone', 'Flag', 'Port of Registry', 'IMO Number', 'MMSI Number', 'Call Sign', 
    'AIS Class', 'Home Port', 'Operational Status',
    // Specifications
    'Length Overall (m)', 'Length at Waterline (m)', 'Beam (m)', 'Draft (m)', 'Air Draft (m)',
    'CE Category', 'Gross Tonnage', 'Construction Material', 'Year Built', 'Builder',
    'Number of Engines', 'Engine Type', 'Engine Power', 'Engine 1 Model', 'Engine 1 Serial',
    'Engine 2 Model', 'Engine 2 Serial', 'Propeller Type', 'Propeller Material',
    'Fuel Type', 'Fuel Capacity (L)', 'Water Capacity (L)',
    // Auxiliary Engine
    'Aux Engine Type', 'Aux Engine Power', 'Aux Engine Fuel', 'Aux Engine Serial',
    // Capacity
    'Max Passengers Berthed', 'Max Passengers Unberthed', 'Max Crew',
    // Equipment
    'Navigation Equipment', 'Communication Equipment', 'Safety Equipment',
    'Inside Equipment', 'Outside Equipment',
    // Safety Equipment
    'Life Rafts', 'Life Jackets', 'EPIRB', 'Fire Extinguishers', 'Flares',
    // Certificates
    'Survey Cert Issue', 'Survey Cert Expiry', 'Operation Cert Issue', 'Operation Cert Expiry',
    'Loadline Cert Issue', 'Loadline Cert Expiry', 'Stability Book Date', 'Stability Book Expiry'
  ];
  const vesselImportSample = [[
    'MV Example', 'REG123', 'UID001', 'Passenger', 'Maritime Co', '+61400000000',
    '+61400000001', 'Australia', 'Sydney', 'IMO1234567', '123456789', 'VK1234',
    'A', 'Sydney', 'Operational',
    '25', '23', '8', '2.5', '4',
    'Category B', '150', 'Fibreglass', '2020', 'Boat Builder Pty Ltd',
    '2', 'Diesel', '500 HP', 'Yanmar 6LY3', 'YM123456', 'Yanmar 6LY3', 'YM654321',
    'Fixed pitch', 'Bronze', 'Diesel', '2000', '500',
    'Generator', '15 kW', 'Diesel', 'GEN123',
    '50', '100', '8',
    'GPS, Radar, AIS', 'VHF Radio, EPIRB', 'Life rafts, Life jackets',
    'Galley, Heads', 'Swim platform',
    '2', '50', 'Yes', '6', '12',
    '2024-01-01', '2025-01-01', '2024-01-01', '2025-01-01',
    '2024-01-01', '2025-01-01', '2024-01-01', '2025-01-01'
  ]];

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

  const handleViewLogs = (vessel) => {
    setSelectedVesselForLogs(vessel);
    setLogsDialogOpen(true);
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
        <SummaryCard
          value={vessels.length}
          label="Total Vessels"
          description="All vessels"
          color="blue"
          onClick={() => clearFilters()}
        />
        <SummaryCard
          value={vessels.filter(v => v.vessel_type?.includes('Passenger')).length}
          label="Passenger Vessels"
          description="Click to filter"
          color="cyan"
          onClick={() => {
            setSearchQuery('Passenger');
            setFilters({ vessel_types: [], min_length: '', max_length: '' });
          }}
        />
        <SummaryCard
          value={vessels.filter(v => v.operational_status === 'Operational').length}
          label="Active Fleet"
          description="Operational vessels"
          color="green"
          onClick={() => {
            setSearchQuery('Operational');
            setFilters({ vessel_types: [], min_length: '', max_length: '' });
          }}
        />
        <SummaryCard
          value={`${vessels.reduce((sum, v) => sum + (parseInt(v.max_passengers) || 0), 0)} pax`}
          label="Total Capacity"
          description="Passenger capacity"
          color="purple"
          onClick={() => clearFilters()}
        />
      </div>

      {/* Search and Filter Bar */}
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


      {/* Vessel Details Dialog */}
      <VesselDetailsDialog
        open={logsDialogOpen}
        onClose={() => setLogsDialogOpen(false)}
        vessel={selectedVesselForLogs}
        onMessage={(msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); }}
      />

      {/* Import Excel Dialog */}
      <ImportExcelDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Import Vessels"
        description="Upload an Excel file to import vessels. Download the template for the correct format."
        templateColumns={vesselImportColumns}
        templateSampleData={vesselImportSample}
        onImport={handleImport}
        templateFileName="vessels_import_template.xlsx"
      />
    </div>
  );
};

export default VesselManagement;

