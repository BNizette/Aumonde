import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Phone, Plus, Edit, Trash2, AlertTriangle, FileText, Activity, Search, Filter, X, Download, ChevronDown, Info, Eye, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ImportExcelDialog } from '@/components/ui/import-excel-dialog';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Emergency = () => {
  const [contacts, setContacts] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [drills, setDrills] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contacts');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [drillDialogOpen, setDrillDialogOpen] = useState(false);
  const [drillViewDialogOpen, setDrillViewDialogOpen] = useState(false);
  const [viewingDrill, setViewingDrill] = useState(null);
  const [procedureViewDialogOpen, setProcedureViewDialogOpen] = useState(false);
  const [viewingProcedure, setViewingProcedure] = useState(null);
  const [contactEditMode, setContactEditMode] = useState(false);
  const [procedureEditMode, setProcedureEditMode] = useState(false);
  const [drillEditMode, setDrillEditMode] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editingProcedureId, setEditingProcedureId] = useState(null);
  const [editingDrillId, setEditingDrillId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Drill Records states
  const [drillRecords, setDrillRecords] = useState({});
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [selectedDrillId, setSelectedDrillId] = useState(null);
  const [recordEditMode, setRecordEditMode] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [crewList, setCrewList] = useState([]);

  // Training Records states
  const [trainingRecords, setTrainingRecords] = useState({});
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedProcedureId, setSelectedProcedureId] = useState(null);
  const [trainingEditMode, setTrainingEditMode] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [importContactsOpen, setImportContactsOpen] = useState(false);
  const [importProceduresOpen, setImportProceduresOpen] = useState(false);
  const [importDrillsOpen, setImportDrillsOpen] = useState(false);
  const [importAllOpen, setImportAllOpen] = useState(false);

  // Filter states for Contacts
  const [contactSearch, setContactSearch] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

  // Use custom hook for Contact filters
  const {
    filters: contactFilters,
    toggleFilter: toggleContactFilter,
    clearFilter: clearContactFilterType,
    clearDateFilters: clearContactDateFilters,
    clearAllFilters: clearAllContactFilters,
    setFilterValue: setContactFilterValue,
    updateFilters: updateContactFilters
  } = useAdvancedFilters({
    types: [],
    priorities: [],
    start_date: '',
    end_date: ''
  });

  // Filter states for Procedures
  const [procedureSearch, setProcedureSearch] = useState('');
  const [filteredProcedures, setFilteredProcedures] = useState([]);

  // Use custom hook for Procedure filters
  const {
    filters: procedureFilters,
    toggleFilter: toggleProcedureFilter,
    clearFilter: clearProcedureFilterType,
    clearDateFilters: clearProcedureDateFilters,
    clearAllFilters: clearAllProcedureFilters,
    setFilterValue: setProcedureFilterValue,
    updateFilters: updateProcedureFilters
  } = useAdvancedFilters({
    types: [],
    start_date: '',
    end_date: ''
  });

  // Filter states for Drills
  const [drillSearch, setDrillSearch] = useState('');
  const [filteredDrills, setFilteredDrills] = useState([]);

  // Use custom hook for Drill filters
  const {
    filters: drillFilters,
    toggleFilter: toggleDrillFilter,
    clearFilter: clearDrillFilterType,
    clearDateFilters: clearDrillDateFilters,
    clearAllFilters: clearAllDrillFilters,
    setFilterValue: setDrillFilterValue,
    updateFilters: updateDrillFilters
  } = useAdvancedFilters({
    types: [],
    vessels: [],
    start_date: '',
    end_date: ''
  });

  const [contactForm, setContactForm] = useState({
    contact_type: 'Shore',
    name: '',
    organization: '',
    role: '',
    phone_primary: '',
    phone_secondary: '',
    email: '',
    address: '',
    available_24_7: false,
    notes: '',
    priority: 1
  });

  const [procedureForm, setProcedureForm] = useState({
    emergency_type: 'Fire',
    title: '',
    purpose: '',
    procedure_steps: '',
    vessel_ids: [],
    vessel_names: [],
    equipment_required: '',
    muster_station: '',
    key_contacts: '',
    masters_guidance_notes: '',
    reference_documents: '',
    authorised_by: '',
    date_authorised: ''
  });

  const [drillForm, setDrillForm] = useState({
    drill_type: 'Fire Drill',
    drill_date: new Date().toISOString().slice(0, 16),
    vessel_id: '',
    vessel_name: '',
    linked_trip_id: '',
    linked_trip_name: '',
    crew_participants: [],
    participants: '',
    duration_minutes: '',
    observations: '',
    areas_for_improvement: ''
  });
  const [trips, setTrips] = useState([]);

  const [recordForm, setRecordForm] = useState({
    record_date: new Date().toISOString().slice(0, 16),
    crew_members: [],
    status: 'Pass',
    authorized_by: '',
    authorized_by_id: '',
    notes: ''
  });

  const [trainingForm, setTrainingForm] = useState({
    training_date: new Date().toISOString().slice(0, 16),
    crew_members: [],
    status: 'Pass',
    authorized_by: '',
    authorized_by_id: '',
    notes: ''
  });

  const [contactTypes, setContactTypes] = useState(['Crew', 'Shore', 'Authority', 'Medical', 'Supplier']);
  const [emergencyTypes, setEmergencyTypes] = useState(['Fire', 'Medical Emergency', 'Man Overboard', 'Grounding', 'Collision', 'Flooding', 'Abandon Ship', 'Search and Rescue']);
  const [drillTypes, setDrillTypes] = useState(['Fire Drill', 'Abandon Ship Drill', 'Man Overboard Drill', 'Medical Emergency Drill', 'Collision Drill']);
  const [vesselFilter, setVesselFilter] = useState('');

  useEffect(() => {
    fetchData();
    fetchSettings();
    // Handle URL parameters for deep linking and filtering
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const vesselId = params.get('vessel_id');
    const vesselName = params.get('vessel_name');
    
    // Handle hash navigation for deep linking to tabs
    const hash = window.location.hash.replace('#', '');
    if (hash === 'drills' || hash === 'procedures' || hash === 'contacts') {
      setActiveTab(hash);
    } else if (tab === 'drills' || tab === 'procedures' || tab === 'contacts') {
      setActiveTab(tab);
    }
    
    // Set vessel filter if specified
    if (vesselName) {
      setVesselFilter(decodeURIComponent(vesselName));
    } else if (vesselId) {
      setVesselFilter(vesselId);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch contact types
      const contactRes = await fetch(`${API}/settings/emergency/contact_types`, { headers });
      const contactData = await contactRes.json();
      if (contactData.options && contactData.options.length > 0) {
        setContactTypes(contactData.options.filter(o => o.is_active !== false).map(o => o.value));
      }
      
      // Fetch emergency types
      const emergencyRes = await fetch(`${API}/settings/emergency/emergency_types`, { headers });
      const emergencyData = await emergencyRes.json();
      if (emergencyData.options && emergencyData.options.length > 0) {
        setEmergencyTypes(emergencyData.options.filter(o => o.is_active !== false).map(o => o.value));
      }
      
      // Fetch drill types
      const drillRes = await fetch(`${API}/settings/emergency/drill_types`, { headers });
      const drillData = await drillRes.json();
      if (drillData.options && drillData.options.length > 0) {
        setDrillTypes(drillData.options.filter(o => o.is_active !== false).map(o => o.value));
      }
    } catch (err) {
      console.error('Error fetching emergency settings:', err);
    }
  };

  useEffect(() => {
    applyContactFilters();
  }, [contactSearch, contactFilters, contacts]);

  useEffect(() => {
    applyProcedureFilters();
  }, [procedureSearch, procedureFilters, procedures]);

  useEffect(() => {
    applyDrillFilters();
  }, [drillSearch, drillFilters, drills]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [contactsRes, proceduresRes, drillsRes, vesselsRes, crewRes, tripsRes] = await Promise.all([
        axios.get(`${API}/emergency/contacts`, { headers }),
        axios.get(`${API}/emergency/procedures`, { headers }),
        axios.get(`${API}/emergency/drills`, { headers }),
        axios.get(`${API}/vessels`, { headers }),
        axios.get(`${API}/crew`, { headers }),
        axios.get(`${API}/trips`, { headers })
      ]);

      setContacts(contactsRes.data);
      setProcedures(proceduresRes.data);
      setDrills(drillsRes.data);
      setVessels(vesselsRes.data);
      setCrewList(crewRes.data);
      setTrips(tripsRes.data || []);
      
      // Fetch drill records for all drills IN PARALLEL
      const drillRecordPromises = drillsRes.data.map(drill => 
        axios.get(`${API}/emergency/drill-records/${drill.id}`, { headers })
          .then(res => ({ drillId: drill.id, records: res.data }))
          .catch(() => ({ drillId: drill.id, records: [] }))
      );
      
      // Fetch training records for all procedures IN PARALLEL
      const trainingRecordPromises = proceduresRes.data.map(procedure => 
        axios.get(`${API}/emergency/training-records/${procedure.id}`, { headers })
          .then(res => ({ procedureId: procedure.id, records: res.data }))
          .catch(() => ({ procedureId: procedure.id, records: [] }))
      );

      // Wait for all parallel requests to complete
      const [drillRecordResults, trainingRecordResults] = await Promise.all([
        Promise.all(drillRecordPromises),
        Promise.all(trainingRecordPromises)
      ]);

      // Build the maps from results
      const recordsMap = {};
      drillRecordResults.forEach(({ drillId, records }) => {
        recordsMap[drillId] = records;
      });
      setDrillRecords(recordsMap);

      const trainingMap = {};
      trainingRecordResults.forEach(({ procedureId, records }) => {
        trainingMap[procedureId] = records;
      });
      setTrainingRecords(trainingMap);
    } catch (err) {
      setError('Error fetching emergency data');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for Contacts
  const applyContactFilters = () => {
    let filtered = [...contacts];

    if (contactSearch) {
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.organization?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.role?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.phone_primary?.includes(contactSearch)
      );
    }

    // Apply multi-select type filter
    if (contactFilters.types.length > 0) {
      filtered = filtered.filter(contact => contactFilters.types.includes(contact.contact_type));
    }

    // Apply multi-select priority filter
    if (contactFilters.priorities.length > 0) {
      filtered = filtered.filter(contact => contactFilters.priorities.includes(contact.priority));
    }

    // Apply date range filter (created_at)
    if (contactFilters.start_date || contactFilters.end_date) {
      filtered = filtered.filter(contact => {
        if (!contact.created_at) return false;
        const createdDate = new Date(contact.created_at);
        const startDate = contactFilters.start_date ? new Date(contactFilters.start_date) : null;
        const endDate = contactFilters.end_date ? new Date(contactFilters.end_date + 'T23:59:59') : null;

        if (startDate && createdDate < startDate) return false;
        if (endDate && createdDate > endDate) return false;
        return true;
      });
    }

    // Sort by priority by default
    filtered.sort((a, b) => a.priority - b.priority);

    setFilteredContacts(filtered);
  };

  // Filter logic for Procedures
  const applyProcedureFilters = () => {
    let filtered = [...procedures];

    if (procedureSearch) {
      filtered = filtered.filter(proc =>
        proc.title?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
        proc.emergency_type?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
        proc.procedure_steps?.toLowerCase().includes(procedureSearch.toLowerCase())
      );
    }

    // Apply multi-select type filter
    if (procedureFilters.types.length > 0) {
      filtered = filtered.filter(proc => procedureFilters.types.includes(proc.emergency_type));
    }

    // Apply date range filter (created_at)
    if (procedureFilters.start_date || procedureFilters.end_date) {
      filtered = filtered.filter(proc => {
        if (!proc.created_at) return false;
        const createdDate = new Date(proc.created_at);
        const startDate = procedureFilters.start_date ? new Date(procedureFilters.start_date) : null;
        const endDate = procedureFilters.end_date ? new Date(procedureFilters.end_date + 'T23:59:59') : null;

        if (startDate && createdDate < startDate) return false;
        if (endDate && createdDate > endDate) return false;
        return true;
      });
    }

    // Sort by emergency type
    filtered.sort((a, b) => (a.emergency_type || '').localeCompare(b.emergency_type || ''));

    setFilteredProcedures(filtered);
  };

  // Filter logic for Drills
  const applyDrillFilters = () => {
    let filtered = [...drills];

    // Apply URL-based vessel filter first
    if (vesselFilter) {
      filtered = filtered.filter(drill => 
        drill.vessel_name === vesselFilter || drill.vessel_id === vesselFilter
      );
    }

    if (drillSearch) {
      filtered = filtered.filter(drill =>
        drill.drill_type?.toLowerCase().includes(drillSearch.toLowerCase()) ||
        drill.vessel_name?.toLowerCase().includes(drillSearch.toLowerCase()) ||
        drill.observations?.toLowerCase().includes(drillSearch.toLowerCase())
      );
    }

    // Apply multi-select type filter
    if (drillFilters.types.length > 0) {
      filtered = filtered.filter(drill => drillFilters.types.includes(drill.drill_type));
    }

    // Apply multi-select vessel filter
    if (drillFilters.vessels.length > 0) {
      filtered = filtered.filter(drill => drillFilters.vessels.includes(drill.vessel_name));
    }

    // Apply date range filter (drill_date)
    if (drillFilters.start_date || drillFilters.end_date) {
      filtered = filtered.filter(drill => {
        if (!drill.drill_date) return false;
        const drillDate = new Date(drill.drill_date);
        const startDate = drillFilters.start_date ? new Date(drillFilters.start_date) : null;
        const endDate = drillFilters.end_date ? new Date(drillFilters.end_date + 'T23:59:59') : null;

        if (startDate && drillDate < startDate) return false;
        if (endDate && drillDate > endDate) return false;
        return true;
      });
    }

    // Sort by drill date (most recent first)
    filtered.sort((a, b) => new Date(b.drill_date || 0) - new Date(a.drill_date || 0));

    setFilteredDrills(filtered);
  };

  const clearContactFilters = () => {
    setContactSearch('');
    clearAllContactFilters();
  };

  const clearProcedureFilters = () => {
    setProcedureSearch('');
    clearAllProcedureFilters();
  };

  const clearDrillFilters = () => {
    setDrillSearch('');
    clearAllDrillFilters();
  };

  const hasActiveContactFilters = contactSearch || contactFilters.types.length > 0 || contactFilters.priorities.length > 0 || contactFilters.start_date || contactFilters.end_date;
  const hasActiveProcedureFilters = procedureSearch || procedureFilters.types.length > 0 || procedureFilters.start_date || procedureFilters.end_date;
  const hasActiveDrillFilters = drillSearch || drillFilters.types.length > 0 || drillFilters.vessels.length > 0 || drillFilters.start_date || drillFilters.end_date;

  // Import template columns matching export formats
  const contactImportColumns = ['Name', 'Type', 'Organization', 'Role', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', '24/7 Available', 'Priority', 'Notes'];
  const contactImportSample = [['Emergency Services', 'External', 'Police', 'Emergency Response', '000', '', 'police@example.com', '123 Main St', 'Yes', '1', 'Primary emergency contact']];

  const procedureImportColumns = ['Title', 'Emergency Type', 'Purpose', 'Procedure Steps', 'Equipment Required', 'Muster Station', 'Key Contacts', "Master's Guidance Notes", 'Reference Documents', 'Authorised By', 'Date Authorised'];
  const procedureImportSample = [['Fire Emergency', 'Fire', '1. Sound alarm\n2. Evacuate\n3. Call 000', 'Fire extinguisher, Life jackets', 'Deck A Forward', 'Fire Warden, Captain']];

  const drillImportColumns = ['Drill Type', 'Vessel', 'Scheduled Date', 'Completed Date', 'Status', 'Participants', 'Notes'];
  const drillImportSample = [['Fire Drill', 'MV Coral Queen', '2024-01-15', '2024-01-15', 'Completed', '12', 'All crew participated']];

  // Import handlers
  const handleImportContacts = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0, errorCount = 0;
      for (const row of data) {
        try {
          const contactData = {
            name: row['Name'] || '',
            contact_type: row['Type'] || '',
            organization: row['Organization'] || '',
            role: row['Role'] || '',
            phone_primary: row['Primary Phone'] || '',
            phone_secondary: row['Secondary Phone'] || '',
            email: row['Email'] || '',
            address: row['Address'] || '',
            available_24_7: row['24/7 Available'] === 'Yes',
            priority: row['Priority'] || '',
            notes: row['Notes'] || '',
          };
          if (!contactData.name) continue;
          await axios.post(`${API}/emergency/contacts`, contactData, { headers: { Authorization: `Bearer ${token}` } });
          successCount++;
        } catch (err) { errorCount++; }
      }
      setMessage(`Import complete: ${successCount} contacts added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchContacts();
    } catch (err) { setError('Error importing: ' + err.message); setTimeout(() => setError(''), 5000); }
  };

  const handleImportProcedures = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0, errorCount = 0;
      for (const row of data) {
        try {
          const procedureData = {
            title: row['Title'] || '',
            emergency_type: row['Emergency Type'] || '',
            purpose: row['Purpose'] || '',
            procedure_steps: row['Procedure Steps'] || '',
            equipment_required: row['Equipment Required'] || '',
            muster_station: row['Muster Station'] || '',
            key_contacts: row['Key Contacts'] || '',
            masters_guidance_notes: row["Master's Guidance Notes"] || '',
            reference_documents: row['Reference Documents'] || '',
            authorised_by: row['Authorised By'] || '',
            date_authorised: row['Date Authorised'] || '',
          };
          if (!procedureData.title) continue;
          await axios.post(`${API}/emergency/procedures`, procedureData, { headers: { Authorization: `Bearer ${token}` } });
          successCount++;
        } catch (err) { errorCount++; }
      }
      setMessage(`Import complete: ${successCount} procedures added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchProcedures();
    } catch (err) { setError('Error importing: ' + err.message); setTimeout(() => setError(''), 5000); }
  };

  const handleImportDrills = async (data) => {
    try {
      const token = localStorage.getItem('token');
      let successCount = 0, errorCount = 0;
      for (const row of data) {
        try {
          const drillData = {
            drill_type: row['Drill Type'] || '',
            vessel_name: row['Vessel'] || '',
            scheduled_date: row['Scheduled Date'] || '',
            completed_date: row['Completed Date'] || '',
            status: row['Status'] || 'Scheduled',
            participants: row['Participants'] || '',
            notes: row['Notes'] || '',
          };
          if (!drillData.drill_type) continue;
          await axios.post(`${API}/emergency/drills`, drillData, { headers: { Authorization: `Bearer ${token}` } });
          successCount++;
        } catch (err) { errorCount++; }
      }
      setMessage(`Import complete: ${successCount} drills added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchDrills();
    } catch (err) { setError('Error importing: ' + err.message); setTimeout(() => setError(''), 5000); }
  };

  // Multi-worksheet import configuration (matches export format)
  const allEmergencyWorksheets = [
    {
      name: 'Contacts',
      columns: ['Name', 'Type', 'Organization', 'Role', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', '24/7 Available', 'Priority', 'Notes'],
      sampleData: [['Emergency Services', 'External', 'Police', 'Emergency Response', '000', '', 'police@example.com', '123 Main St', 'Yes', '1', 'Primary contact']]
    },
    {
      name: 'Procedures',
      columns: ['Title', 'Emergency Type', 'Purpose', 'Procedure Steps', 'Equipment Required', 'Muster Station', 'Key Contacts', "Master's Guidance Notes", 'Reference Documents', 'Authorised By', 'Date Authorised'],
      sampleData: [['Fire Emergency', 'Fire', 'Ensure safe evacuation during fire', '1. Sound alarm\n2. Evacuate', 'Fire extinguisher', 'Deck A', 'Fire Warden', 'Ensure all crew accounted for', 'SOLAS Ch III, SMS Manual Section 5', 'Captain Smith', '2024-01-15']]
    },
    {
      name: 'Drills',
      columns: ['Drill Type', 'Date', 'Duration (min)', 'Vessel', 'Participants', 'Observations', 'Areas for Improvement'],
      sampleData: [['Fire Drill', '2024-01-15', '30', 'MV Coral Queen', '12', 'Good response time', 'Improve muster point signage']]
    }
  ];

  // Multi-worksheet import handler
  const handleImportAllEmergency = async (sheetsData) => {
    try {
      const token = localStorage.getItem('token');
      let totalSuccess = 0, totalError = 0;

      // Import Contacts
      const contactsData = sheetsData['Contacts'] || [];
      for (const row of contactsData) {
        try {
          const data = {
            name: row['Name'] || '',
            contact_type: row['Type'] || '',
            organization: row['Organization'] || '',
            role: row['Role'] || '',
            phone_primary: row['Primary Phone'] || '',
            phone_secondary: row['Secondary Phone'] || '',
            email: row['Email'] || '',
            address: row['Address'] || '',
            available_24_7: row['24/7 Available'] === 'Yes',
            priority: row['Priority'] || '',
            notes: row['Notes'] || '',
          };
          if (!data.name) continue;
          await axios.post(`${API}/emergency/contacts`, data, { headers: { Authorization: `Bearer ${token}` } });
          totalSuccess++;
        } catch (err) { totalError++; }
      }

      // Import Procedures
      const proceduresData = sheetsData['Procedures'] || [];
      for (const row of proceduresData) {
        try {
          const data = {
            title: row['Title'] || '',
            emergency_type: row['Emergency Type'] || '',
            purpose: row['Purpose'] || '',
            procedure_steps: row['Procedure Steps'] || '',
            equipment_required: row['Equipment Required'] || '',
            muster_station: row['Muster Station'] || '',
            key_contacts: row['Key Contacts'] || '',
            masters_guidance_notes: row["Master's Guidance Notes"] || '',
            reference_documents: row['Reference Documents'] || '',
            authorised_by: row['Authorised By'] || '',
            date_authorised: row['Date Authorised'] || '',
          };
          if (!data.title) continue;
          await axios.post(`${API}/emergency/procedures`, data, { headers: { Authorization: `Bearer ${token}` } });
          totalSuccess++;
        } catch (err) { totalError++; }
      }

      // Import Drills
      const drillsData = sheetsData['Drills'] || [];
      for (const row of drillsData) {
        try {
          const data = {
            drill_type: row['Drill Type'] || '',
            drill_date: row['Date'] || '',
            duration_minutes: row['Duration (min)'] || '',
            vessel_name: row['Vessel'] || '',
            participants: row['Participants'] || '',
            observations: row['Observations'] || '',
            areas_for_improvement: row['Areas for Improvement'] || '',
          };
          if (!data.drill_type) continue;
          await axios.post(`${API}/emergency/drills`, data, { headers: { Authorization: `Bearer ${token}` } });
          totalSuccess++;
        } catch (err) { totalError++; }
      }

      setMessage(`Import complete: ${totalSuccess} records added${totalError > 0 ? `, ${totalError} failed` : ''}`);
      setTimeout(() => setMessage(''), 5000);
      fetchContacts();
      fetchProcedures();
      fetchDrills();
    } catch (err) { 
      setError('Error importing: ' + err.message); 
      setTimeout(() => setError(''), 5000); 
    }
  };

  const exportContactsToExcel = () => {
    if (filteredContacts.length === 0) { setError('No contacts to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Name', 'Type', 'Organization', 'Role', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', '24/7 Available', 'Priority', 'Notes'];
    const data = [headers, ...filteredContacts.map(c => [
      c.name || '-', c.contact_type || '-', c.organization || '-', c.role || '-',
      c.phone_primary || '-', c.phone_secondary || '-', c.email || '-', c.address || '-',
      c.available_24_7 ? 'Yes' : 'No', c.priority || '-', c.notes || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, `emergency_contacts_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredContacts.length} emergency contacts to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportProceduresToExcel = () => {
    if (filteredProcedures.length === 0) { setError('No procedures to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Title', 'Emergency Type', 'Purpose', 'Procedure Steps', 'Equipment Required', 'Muster Station', 'Key Contacts', "Master's Guidance Notes", 'Reference Documents', 'Authorised By', 'Date Authorised'];
    const data = [headers, ...filteredProcedures.map(p => [
      p.title || '-', p.emergency_type || '-', p.purpose || '-', p.procedure_steps || '-',
      p.equipment_required || '-', p.muster_station || '-', p.key_contacts || '-',
      p.masters_guidance_notes || '-', p.reference_documents || '-',
      p.authorised_by || '-', p.date_authorised ? new Date(p.date_authorised).toLocaleDateString() : '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 30 }, { wch: 50 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Procedures');
    XLSX.writeFile(wb, `emergency_procedures_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredProcedures.length} emergency procedures to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportDrillsToExcel = () => {
    if (filteredDrills.length === 0) { setError('No drills to export'); setTimeout(() => setError(''), 3000); return; }
    const wb = XLSX.utils.book_new();
    const headers = ['Drill Type', 'Date', 'Duration (min)', 'Vessel', 'Participants', 'Observations', 'Areas for Improvement'];
    const data = [headers, ...filteredDrills.map(d => [
      d.drill_type || '-', d.drill_date ? new Date(d.drill_date).toLocaleString() : '-',
      d.duration_minutes || '-', d.vessel_name || '-', d.participants || '-',
      d.observations || '-', d.areas_for_improvement || '-'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 35 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Drills');
    XLSX.writeFile(wb, `emergency_drills_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${filteredDrills.length} emergency drills to Excel`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Export Drill details and records to Excel
  const exportDrillToExcel = () => {
    if (!viewingDrill) return;

    const wb = XLSX.utils.book_new();
    const drill = viewingDrill;

    // Sheet 1: Drill Details
    const detailsData = [
      ['Drill Details'],
      [''],
      ['Field', 'Value'],
      ['Drill Type', drill.drill_type || 'N/A'],
      ['Date', drill.drill_date ? new Date(drill.drill_date).toLocaleString() : 'N/A'],
      ['Duration', drill.duration_minutes ? `${drill.duration_minutes} minutes` : 'N/A'],
      ['Vessel', drill.vessel_name || 'N/A'],
      ['Participants', drill.participants || 'N/A'],
      ['Observations', drill.observations || 'N/A'],
      ['Areas for Improvement', drill.areas_for_improvement || 'N/A'],
    ];
    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    wsDetails['!cols'] = [{ wch: 22 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Drill Details');

    // Sheet 2: Drill Records
    const recordsHeaders = ['Record Date', 'Crew Members', 'Status', 'Authorized By', 'Notes'];
    const recordsData = [recordsHeaders];
    const records = drillRecords[drill.id] || [];
    records.forEach(record => {
      recordsData.push([
        record.record_date ? new Date(record.record_date).toLocaleString() : 'N/A',
        record.crew_members?.join(', ') || 'N/A',
        record.status || 'N/A',
        record.authorized_by || 'N/A',
        record.notes || '-'
      ]);
    });
    if (records.length === 0) recordsData.push(['No drill records', '', '', '', '']);
    const wsRecords = XLSX.utils.aoa_to_sheet(recordsData);
    wsRecords['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsRecords, 'Drill Records');

    // Generate and download file
    const fileName = `${drill.drill_type?.replace(/\s+/g, '_')}_${new Date(drill.drill_date).toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setMessage('Drill data exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  // Export Procedure details and training records to Excel
  const exportProcedureToExcel = () => {
    if (!viewingProcedure) return;

    const wb = XLSX.utils.book_new();
    const procedure = viewingProcedure;

    // Sheet 1: Procedure Details
    const detailsData = [
      ['Procedure Details'],
      [''],
      ['Field', 'Value'],
      ['Title', procedure.title || 'N/A'],
      ['Emergency Type', procedure.emergency_type || 'N/A'],
      ['Procedure Steps', procedure.procedure_steps || 'N/A'],
      ['Equipment Required', procedure.equipment_required || 'N/A'],
      ['Muster Station', procedure.muster_station || 'N/A'],
      ['Key Contacts', procedure.key_contacts || 'N/A'],
    ];
    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    wsDetails['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Procedure Details');

    // Sheet 2: Training Records
    const trainingHeaders = ['Training Date', 'Crew Members', 'Status', 'Authorized By', 'Notes'];
    const trainingData = [trainingHeaders];
    const records = trainingRecords[procedure.id] || [];
    records.forEach(record => {
      trainingData.push([
        record.training_date ? new Date(record.training_date).toLocaleString() : 'N/A',
        record.crew_members?.join(', ') || 'N/A',
        record.status || 'N/A',
        record.authorized_by || 'N/A',
        record.notes || '-'
      ]);
    });
    if (records.length === 0) trainingData.push(['No training records', '', '', '', '']);
    const wsTraining = XLSX.utils.aoa_to_sheet(trainingData);
    wsTraining['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsTraining, 'Training Records');

    // Generate and download file
    const fileName = `${procedure.title?.replace(/\s+/g, '_')}_procedure_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setMessage('Procedure data exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveContact = async () => {
    if (!contactForm.name || !contactForm.phone_primary) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (contactEditMode) {
        await axios.put(`${API}/emergency/contacts/${editingContactId}`, contactForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Contact updated successfully');
      } else {
        await axios.post(`${API}/emergency/contacts`, contactForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Contact created successfully');
      }
      setContactDialogOpen(false);
      setContactEditMode(false);
      setEditingContactId(null);
      resetContactForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving contact');
    }
  };

  const handleSaveProcedure = async () => {
    if (!procedureForm.title || !procedureForm.procedure_steps) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (procedureEditMode) {
        await axios.put(`${API}/emergency/procedures/${editingProcedureId}`, procedureForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Procedure updated successfully');
      } else {
        await axios.post(`${API}/emergency/procedures`, procedureForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Procedure created successfully');
      }
      setProcedureDialogOpen(false);
      setProcedureEditMode(false);
      setEditingProcedureId(null);
      resetProcedureForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving procedure');
    }
  };

  const handleSaveDrill = async () => {
    if (!drillForm.drill_type || !drillForm.drill_date) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (drillEditMode) {
        await axios.put(`${API}/emergency/drills/${editingDrillId}`, drillForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Drill updated successfully');
      } else {
        await axios.post(`${API}/emergency/drills`, drillForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Drill created successfully');
      }
      setDrillDialogOpen(false);
      setDrillEditMode(false);
      setEditingDrillId(null);
      resetDrillForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving drill');
    }
  };

  const deleteContact = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/emergency/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Contact deleted');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Error deleting contact');
    }
  };

  const deleteProcedure = async (id) => {
    if (!window.confirm('Delete this procedure?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/emergency/procedures/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Procedure deleted');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Error deleting procedure');
    }
  };

  // Edit handlers
  const handleEditContact = (contact) => {
    setContactForm({
      contact_type: contact.contact_type || 'Shore',
      name: contact.name || '',
      organization: contact.organization || '',
      role: contact.role || '',
      phone_primary: contact.phone_primary || '',
      phone_secondary: contact.phone_secondary || '',
      email: contact.email || '',
      address: contact.address || '',
      available_24_7: contact.available_24_7 || false,
      notes: contact.notes || '',
      priority: contact.priority || 1
    });
    setEditingContactId(contact.id);
    setContactEditMode(true);
    setContactDialogOpen(true);
  };

  const handleEditProcedure = (procedure) => {
    setProcedureForm({
      emergency_type: procedure.emergency_type || 'Fire',
      title: procedure.title || '',
      purpose: procedure.purpose || '',
      procedure_steps: procedure.procedure_steps || '',
      vessel_ids: procedure.vessel_ids || [],
      vessel_names: procedure.vessel_names || [],
      equipment_required: procedure.equipment_required || '',
      muster_station: procedure.muster_station || '',
      key_contacts: procedure.key_contacts || '',
      masters_guidance_notes: procedure.masters_guidance_notes || '',
      reference_documents: procedure.reference_documents || '',
      authorised_by: procedure.authorised_by || '',
      date_authorised: procedure.date_authorised ? procedure.date_authorised.slice(0, 10) : ''
    });
    setEditingProcedureId(procedure.id);
    setProcedureEditMode(true);
    setProcedureDialogOpen(true);
  };

  const handleEditDrill = (drill) => {
    setDrillForm({
      drill_type: drill.drill_type || 'Fire Drill',
      drill_date: drill.drill_date ? new Date(drill.drill_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      vessel_id: drill.vessel_id || '',
      vessel_name: drill.vessel_name || '',
      linked_trip_id: drill.linked_trip_id || '',
      linked_trip_name: drill.linked_trip_name || '',
      crew_participants: drill.crew_participants || [],
      participants: drill.participants || '',
      duration_minutes: drill.duration_minutes || '',
      observations: drill.observations || '',
      areas_for_improvement: drill.areas_for_improvement || ''
    });
    setEditingDrillId(drill.id);
    setDrillEditMode(true);
    setDrillDialogOpen(true);
  };

  // View handlers
  const handleViewDrill = (drill) => {
    setViewingDrill(drill);
    setDrillViewDialogOpen(true);
  };

  const handleViewProcedure = (procedure) => {
    setViewingProcedure(procedure);
    setProcedureViewDialogOpen(true);
  };

  // Delete handlers
  const handleDeleteContact = async (contactId, contactName) => {
    if (!window.confirm(`Are you sure you want to delete contact "${contactName}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/emergency/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Contact deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting contact');
    }
  };

  const handleDeleteProcedure = async (procedureId, procedureTitle) => {
    if (!window.confirm(`Are you sure you want to delete procedure "${procedureTitle}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/emergency/procedures/${procedureId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Procedure deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting procedure');
    }
  };

  const handleDeleteDrill = async (drillId, drillType) => {
    if (!window.confirm(`Are you sure you want to delete drill "${drillType}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/emergency/drills/${drillId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Drill deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting drill');
    }
  };

  // Drill Record Functions
  const handleAddRecord = (drillId) => {
    setSelectedDrillId(drillId);
    setRecordEditMode(false);
    setRecordForm({
      record_date: new Date().toISOString().slice(0, 16),
      crew_members: [],
      status: 'Pass',
      authorized_by: '',
      authorized_by_id: '',
      notes: ''
    });
    setRecordDialogOpen(true);
  };

  const handleEditRecord = (record) => {
    setSelectedDrillId(record.drill_id);
    setRecordEditMode(true);
    setEditingRecordId(record.id);
    setRecordForm({
      record_date: new Date(record.record_date).toISOString().slice(0, 16),
      crew_members: record.crew_members || [],
      status: record.status,
      authorized_by: record.authorized_by,
      authorized_by_id: record.authorized_by_id || '',
      notes: record.notes || ''
    });
    setRecordDialogOpen(true);
  };

  const handleSaveRecord = async () => {
    try {
      const token = localStorage.getItem('token');
      const recordData = {
        ...recordForm,
        drill_id: selectedDrillId
      };

      if (recordEditMode) {
        await axios.put(`${API}/emergency/drill-records/${editingRecordId}`, recordData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Drill record updated successfully');
      } else {
        await axios.post(`${API}/emergency/drill-records`, recordData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Drill record added successfully');
      }

      setRecordDialogOpen(false);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving drill record');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this drill record?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/emergency/drill-records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Drill record deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting drill record');
    }
  };

  // Training Record Functions
  const handleAddTraining = (procedureId) => {
    setSelectedProcedureId(procedureId);
    setTrainingEditMode(false);
    setTrainingForm({
      training_date: new Date().toISOString().slice(0, 16),
      crew_members: [],
      status: 'Pass',
      authorized_by: '',
      authorized_by_id: '',
      notes: ''
    });
    setTrainingDialogOpen(true);
  };

  const handleEditTraining = (training) => {
    setSelectedProcedureId(training.procedure_id);
    setTrainingEditMode(true);
    setEditingTrainingId(training.id);
    setTrainingForm({
      training_date: new Date(training.training_date).toISOString().slice(0, 16),
      crew_members: training.crew_members || [],
      status: training.status,
      authorized_by: training.authorized_by,
      authorized_by_id: training.authorized_by_id || '',
      notes: training.notes || ''
    });
    setTrainingDialogOpen(true);
  };

  const handleSaveTraining = async () => {
    try {
      const token = localStorage.getItem('token');
      const trainingData = {
        ...trainingForm,
        procedure_id: selectedProcedureId
      };

      if (trainingEditMode) {
        await axios.put(`${API}/emergency/training-records/${editingTrainingId}`, trainingData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Training record updated successfully');
      } else {
        await axios.post(`${API}/emergency/training-records`, trainingData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Training record added successfully');
      }

      setTrainingDialogOpen(false);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving training record');
    }
  };

  const handleDeleteTraining = async (trainingId) => {
    if (!window.confirm('Are you sure you want to delete this training record?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/emergency/training-records/${trainingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Training record deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting training record');
    }
  };

  const resetContactForm = () => {
    setContactForm({
      contact_type: 'Shore',
      name: '',
      organization: '',
      role: '',
      phone_primary: '',
      phone_secondary: '',
      email: '',
      address: '',
      available_24_7: false,
      notes: '',
      priority: 1
    });
    setContactEditMode(false);
    setEditingContactId(null);
  };

  const resetProcedureForm = () => {
    setProcedureForm({
      emergency_type: 'Fire',
      title: '',
      purpose: '',
      procedure_steps: '',
      vessel_ids: [],
      vessel_names: [],
      equipment_required: '',
      muster_station: '',
      key_contacts: '',
      masters_guidance_notes: '',
      reference_documents: '',
      authorised_by: '',
      date_authorised: ''
    });
    setProcedureEditMode(false);
    setEditingProcedureId(null);
  };

  const resetDrillForm = () => {
    setDrillForm({
      drill_type: 'Fire Drill',
      drill_date: new Date().toISOString().slice(0, 16),
      vessel_id: '',
      vessel_name: '',
      linked_trip_id: '',
      linked_trip_name: '',
      crew_participants: [],
      participants: '',
      duration_minutes: '',
      observations: '',
      areas_for_improvement: ''
    });
    setDrillEditMode(false);
    setEditingDrillId(null);
  };

  // Export all Emergency Response data to Excel with 3 worksheets
  const exportAllEmergencyToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Contacts
    const contactsHeaders = ['Name', 'Type', 'Organization', 'Role', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', '24/7 Available', 'Priority', 'Notes'];
    const contactsData = [contactsHeaders];
    contacts.forEach(c => {
      contactsData.push([
        c.name || '-',
        c.contact_type || '-',
        c.organization || '-',
        c.role || '-',
        c.phone_primary || '-',
        c.phone_secondary || '-',
        c.email || '-',
        c.address || '-',
        c.available_24_7 ? 'Yes' : 'No',
        c.priority || '-',
        c.notes || '-'
      ]);
    });
    if (contacts.length === 0) contactsData.push(['No contacts recorded', '', '', '', '', '', '', '', '', '', '']);
    const wsContacts = XLSX.utils.aoa_to_sheet(contactsData);
    wsContacts['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsContacts, 'Contacts');

    // Sheet 2: Procedures
    const proceduresHeaders = ['Title', 'Emergency Type', 'Purpose', 'Procedure Steps', 'Equipment Required', 'Muster Station', 'Key Contacts', "Master's Guidance Notes", 'Reference Documents', 'Authorised By', 'Date Authorised'];
    const proceduresData = [proceduresHeaders];
    procedures.forEach(p => {
      proceduresData.push([
        p.title || '-',
        p.emergency_type || '-',
        p.purpose || '-',
        p.procedure_steps || '-',
        p.equipment_required || '-',
        p.muster_station || '-',
        p.key_contacts || '-',
        p.masters_guidance_notes || '-',
        p.reference_documents || '-',
        p.authorised_by || '-',
        p.date_authorised ? new Date(p.date_authorised).toLocaleDateString() : '-'
      ]);
    });
    if (procedures.length === 0) proceduresData.push(['No procedures recorded', '', '', '', '', '', '', '', '', '', '']);
    const wsProcedures = XLSX.utils.aoa_to_sheet(proceduresData);
    wsProcedures['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 30 }, { wch: 50 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsProcedures, 'Procedures');

    // Sheet 3: Drills
    const drillsHeaders = ['Drill Type', 'Date', 'Duration (min)', 'Vessel', 'Participants', 'Observations', 'Areas for Improvement'];
    const drillsData = [drillsHeaders];
    drills.forEach(d => {
      drillsData.push([
        d.drill_type || '-',
        d.drill_date ? new Date(d.drill_date).toLocaleString() : '-',
        d.duration_minutes || '-',
        d.vessel_name || '-',
        d.participants || '-',
        d.observations || '-',
        d.areas_for_improvement || '-'
      ]);
    });
    if (drills.length === 0) drillsData.push(['No drills recorded', '', '', '', '', '', '']);
    const wsDrills = XLSX.utils.aoa_to_sheet(drillsData);
    wsDrills['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 35 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsDrills, 'Drills');

    // Generate and download file
    const fileName = `emergency_response_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setMessage('Emergency Response data exported to Excel successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Emergency Response</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-blue-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="font-semibold mb-1">Marine Order 504 (2024)</p>
                <p className="text-sm mb-2">
                  Requires emergency procedures, assembly station protocols, crew drills, emergency training, and emergency contact management within the SMS framework.
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
          <p className="text-gray-500 mt-1">Manage emergency contacts, procedures, and drills</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setImportAllOpen(true)}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            <Download className="h-4 w-4" />
            Import from Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={exportAllEmergencyToExcel}
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="procedures">Procedures ({procedures.length})</TabsTrigger>
          <TabsTrigger value="drills">Drills ({drills.length})</TabsTrigger>
        </TabsList>

        {/* CONTACTS TAB */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Emergency Contacts
                  </CardTitle>
                  <CardDescription>Critical contacts for emergency situations</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImportContactsOpen(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                    <Download className="mr-2 h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Button variant="outline" onClick={exportContactsToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                  <Button onClick={() => setContactDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistics Cards - Clickable */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => clearContactFilters()}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Total Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold">{contacts.length}</div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateContactFilters({ priorities: [1]})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Priority 1</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-red-600">
                      {contacts.filter(c => c.priority === 1).length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Critical contacts</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateContactFilters({ types: ['Medical']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Medical</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-blue-600">
                      {contacts.filter(c => c.contact_type === 'Medical').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateContactFilters({ types: ['Authority']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Authorities</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-purple-600">
                      {contacts.filter(c => c.contact_type === 'Authority').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                {hasActiveContactFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearContactFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search contacts by name, organization, role, or phone..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Type</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {contactFilters.types.length === 0
                              ? 'All Types'
                              : contactFilters.types.length === 1
                              ? contactFilters.types[0]
                              : `${contactFilters.types.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Types</span>
                            {contactFilters.types.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearContactFilterType('types')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {contactTypes.map(type => (
                            <div
                              key={type}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleContactFilter('types', type)}
                            >
                              <Checkbox
                                checked={contactFilters.types.includes(type)}
                                onCheckedChange={() => toggleContactFilter('types', type)}
                              />
                              <span className="text-sm">{type}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {contactFilters.priorities.length === 0
                              ? 'All Priorities'
                              : contactFilters.priorities.length === 1
                              ? `Priority ${contactFilters.priorities[0]}`
                              : `${contactFilters.priorities.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Priorities</span>
                            {contactFilters.priorities.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearContactFilterType('priorities')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {[1, 2, 3].map(priority => (
                            <div
                              key={priority}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleContactFilter('priorities', priority)}
                            >
                              <Checkbox
                                checked={contactFilters.priorities.includes(priority)}
                                onCheckedChange={() => toggleContactFilter('priorities', priority)}
                              />
                              <span className="text-sm">Priority {priority}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Created Date From</Label>
                    <Input
                      type="date"
                      value={contactFilters.start_date}
                      onChange={(e) => updateContactFilters({ start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Created Date To</Label>
                    <Input
                      type="date"
                      value={contactFilters.end_date}
                      onChange={(e) => updateContactFilters({ end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredContacts.length} of {contacts.length} contacts
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredContacts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {contacts.length === 0 ? 'No emergency contacts added yet' : 'No contacts match your filters'}
                  </p>
                ) : (
                  filteredContacts.map((contact) => (
                    <div key={contact.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{contact.name}</h3>
                            <Badge>{contact.contact_type}</Badge>
                            {contact.available_24_7 && <Badge variant="outline">24/7</Badge>}
                            <Badge variant="outline">Priority {contact.priority}</Badge>
                          </div>
                          {contact.organization && <p className="text-sm text-gray-600">{contact.organization} {contact.role && `- ${contact.role}`}</p>}
                          <div className="mt-2 space-y-1 text-sm">
                            <p><Phone className="inline h-3 w-3 mr-1" /><strong>Primary:</strong> {contact.phone_primary}</p>
                            {contact.phone_secondary && <p><Phone className="inline h-3 w-3 mr-1" /><strong>Secondary:</strong> {contact.phone_secondary}</p>}
                            {contact.email && <p><strong>Email:</strong> {contact.email}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditContact(contact)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteContact(contact.id, contact.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROCEDURES TAB */}
        <TabsContent value="procedures">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Emergency Procedures
                  </CardTitle>
                  <CardDescription>Standard operating procedures for emergencies</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImportProceduresOpen(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                    <Download className="mr-2 h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Button variant="outline" onClick={exportProceduresToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                  <Button onClick={() => setProcedureDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Procedure
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistics Cards - Clickable */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => clearProcedureFilters()}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Total Procedures</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold">{procedures.length}</div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateProcedureFilters({ types: ['Fire']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Fire</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-red-600">
                      {procedures.filter(p => p.emergency_type === 'Fire').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateProcedureFilters({ types: ['Man Overboard']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Man Overboard</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-blue-600">
                      {procedures.filter(p => p.emergency_type === 'Man Overboard').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateProcedureFilters({ types: ['Medical Emergency']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Medical</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-green-600">
                      {procedures.filter(p => p.emergency_type === 'Medical Emergency').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                {hasActiveProcedureFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearProcedureFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search procedures by title, type, or steps..."
                    value={procedureSearch}
                    onChange={(e) => setProcedureSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div>
                  <Label>Emergency Type</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="truncate">
                          {procedureFilters.types.length === 0
                            ? 'All Emergency Types'
                            : procedureFilters.types.length === 1
                            ? procedureFilters.types[0]
                            : `${procedureFilters.types.length} selected`}
                        </span>
                        <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="p-2">
                        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                          <span className="text-sm font-medium">Select Emergency Types</span>
                          {procedureFilters.types.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => clearProcedureFilterType('types')}
                              className="h-auto p-1 text-xs"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        {emergencyTypes.map(type => (
                          <div
                            key={type}
                            className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                            onClick={() => toggleProcedureFilter('types', type)}
                          >
                            <Checkbox
                              checked={procedureFilters.types.includes(type)}
                              onCheckedChange={() => toggleProcedureFilter('types', type)}
                            />
                            <span className="text-sm">{type}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Created Date From</Label>
                    <Input
                      type="date"
                      value={procedureFilters.start_date}
                      onChange={(e) => updateProcedureFilters({ start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Created Date To</Label>
                    <Input
                      type="date"
                      value={procedureFilters.end_date}
                      onChange={(e) => updateProcedureFilters({ end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredProcedures.length} of {procedures.length} procedures
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredProcedures.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {procedures.length === 0 ? 'No emergency procedures added yet' : 'No procedures match your filters'}
                  </p>
                ) : (
                  filteredProcedures.map((proc) => (
                    <div key={proc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            <h3 className="font-semibold text-lg">{proc.title}</h3>
                            <Badge>{proc.emergency_type}</Badge>
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{proc.procedure_steps}</div>
                          {proc.equipment_required && (
                            <p className="mt-2 text-sm"><strong>Equipment:</strong> {proc.equipment_required}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewProcedure(proc)} title="View details & records">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditProcedure(proc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteProcedure(proc.id, proc.title)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Training record count indicator */}
                      {trainingRecords[proc.id] && trainingRecords[proc.id].length > 0 && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {trainingRecords[proc.id].length} training record{trainingRecords[proc.id].length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRILLS TAB */}
        <TabsContent value="drills">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Emergency Drills
                  </CardTitle>
                  <CardDescription>Record and track emergency drill exercises</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImportDrillsOpen(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                    <Download className="mr-2 h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Button variant="outline" onClick={exportDrillsToExcel} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                  <Button onClick={() => setDrillDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Drill
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistics Cards - Clickable */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setDrillSearch('');
                    clearDrillFilters();
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Total Drills</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold">{drills.length}</div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateDrillFilters({ types: ['Fire Drill']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Fire Drills</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-red-600">
                      {drills.filter(d => d.drill_type === 'Fire Drill').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateDrillFilters({ types: ['Abandon Ship Drill']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Abandon Ship</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-orange-600">
                      {drills.filter(d => d.drill_type === 'Abandon Ship Drill').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => updateDrillFilters({ types: ['Man Overboard Drill']})}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Man Overboard</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-blue-600">
                      {drills.filter(d => d.drill_type === 'Man Overboard Drill').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                {hasActiveDrillFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearDrillFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search drills by type, vessel, or observations..."
                    value={drillSearch}
                    onChange={(e) => setDrillSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Drill Type</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {drillFilters.types.length === 0
                              ? 'All Drill Types'
                              : drillFilters.types.length === 1
                              ? drillFilters.types[0]
                              : `${drillFilters.types.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Drill Types</span>
                            {drillFilters.types.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearDrillFilterType('types')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {drillTypes.map(type => (
                            <div
                              key={type}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleDrillFilter('types', type)}
                            >
                              <Checkbox
                                checked={drillFilters.types.includes(type)}
                                onCheckedChange={() => toggleDrillFilter('types', type)}
                              />
                              <span className="text-sm">{type}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Vessel</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {drillFilters.vessels.length === 0
                              ? 'All Vessels'
                              : drillFilters.vessels.length === 1
                              ? drillFilters.vessels[0]
                              : `${drillFilters.vessels.length} selected`}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                            <span className="text-sm font-medium">Select Vessels</span>
                            {drillFilters.vessels.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearDrillFilterType('vessels')}
                                className="h-auto p-1 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          {[...new Set(drills.map(d => d.vessel_name).filter(Boolean))].map(vessel => (
                            <div
                              key={vessel}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleDrillFilter('vessels', vessel)}
                            >
                              <Checkbox
                                checked={drillFilters.vessels.includes(vessel)}
                                onCheckedChange={() => toggleDrillFilter('vessels', vessel)}
                              />
                              <span className="text-sm">{vessel}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Drill Date From</Label>
                    <Input
                      type="date"
                      value={drillFilters.start_date}
                      onChange={(e) => updateDrillFilters({ start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Drill Date To</Label>
                    <Input
                      type="date"
                      value={drillFilters.end_date}
                      onChange={(e) => updateDrillFilters({ end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredDrills.length} of {drills.length} drills
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredDrills.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {drills.length === 0 ? 'No emergency drills recorded yet' : 'No drills match your filters'}
                  </p>
                ) : (
                  filteredDrills.map((drill) => (
                    <div key={drill.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{drill.drill_type}</h3>
                            <Badge variant="outline">{drill.duration_minutes ? `${drill.duration_minutes} min` : 'N/A'}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            <strong>Date:</strong> {new Date(drill.drill_date).toLocaleString()}
                          </p>
                          {drill.vessel_name && <p className="text-sm"><strong>Vessel:</strong> {drill.vessel_name}</p>}
                          {drill.crew_participants && drill.crew_participants.length > 0 && (
                            <p className="text-sm"><strong>Crew:</strong> {drill.crew_participants.join(', ')}</p>
                          )}
                          {drill.participants && <p className="text-sm"><strong>Other Participants:</strong> {drill.participants}</p>}
                          {drill.observations && (
                            <div className="mt-2 text-sm">
                              <strong>Observations:</strong>
                              <p className="text-gray-700">{drill.observations}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewDrill(drill)} title="View details & records">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditDrill(drill)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteDrill(drill.id, drill.drill_type)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Record count indicator */}
                      {drillRecords[drill.id] && drillRecords[drill.id].length > 0 && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {drillRecords[drill.id].length} record{drillRecords[drill.id].length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={(open) => {
        setContactDialogOpen(open);
        if (!open) resetContactForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{contactEditMode ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</DialogTitle>
            <DialogDescription>
              {contactEditMode ? 'Update emergency contact information' : 'Add a new emergency contact person or organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Type *</Label>
                <Select value={contactForm.contact_type} onValueChange={(value) => setContactForm({...contactForm, contact_type: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contactTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority (1-5) *</Label>
                <Input type="number" min="1" max="5" value={contactForm.priority} onChange={(e) => setContactForm({...contactForm, priority: parseInt(e.target.value)})} />
              </div>
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={contactForm.name} onChange={(e) => setContactForm({...contactForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Organization</Label>
                <Input value={contactForm.organization} onChange={(e) => setContactForm({...contactForm, organization: e.target.value})} />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={contactForm.role} onChange={(e) => setContactForm({...contactForm, role: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Phone *</Label>
                <Input value={contactForm.phone_primary} onChange={(e) => setContactForm({...contactForm, phone_primary: e.target.value})} />
              </div>
              <div>
                <Label>Secondary Phone</Label>
                <Input value={contactForm.phone_secondary} onChange={(e) => setContactForm({...contactForm, phone_secondary: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="available" checked={contactForm.available_24_7} onChange={(e) => setContactForm({...contactForm, available_24_7: e.target.checked})} className="rounded" />
              <Label htmlFor="available">Available 24/7</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveContact}>{contactEditMode ? 'Update Contact' : 'Add Contact'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procedure Dialog */}
      <Dialog open={procedureDialogOpen} onOpenChange={(open) => {
        setProcedureDialogOpen(open);
        if (!open) resetProcedureForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{procedureEditMode ? 'Edit Emergency Procedure' : 'Add Emergency Procedure'}</DialogTitle>
            <DialogDescription>
              {procedureEditMode ? 'Update emergency response procedure' : 'Document emergency response procedures'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Emergency Type *</Label>
              <Select value={procedureForm.emergency_type} onValueChange={(value) => setProcedureForm({...procedureForm, emergency_type: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {emergencyTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Procedure Title *</Label>
              <Input value={procedureForm.title} onChange={(e) => setProcedureForm({...procedureForm, title: e.target.value})} />
            </div>
            <div>
              <Label>Purpose</Label>
              <Textarea rows={2} value={procedureForm.purpose} onChange={(e) => setProcedureForm({...procedureForm, purpose: e.target.value})} placeholder="Brief description of the procedure's purpose..." />
            </div>
            <div>
              <Label>Procedure Steps *</Label>
              <Textarea rows={6} value={procedureForm.procedure_steps} onChange={(e) => setProcedureForm({...procedureForm, procedure_steps: e.target.value})} placeholder="Step 1: ...\nStep 2: ..." />
            </div>
            <div>
              <Label>Applicable Vessels (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {procedureForm.vessel_ids.length === 0 
                        ? 'All vessels / Not specified' 
                        : `${procedureForm.vessel_ids.length} vessel${procedureForm.vessel_ids.length !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <span className="text-sm font-medium">Select Vessels</span>
                      {procedureForm.vessel_ids.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setProcedureForm({...procedureForm, vessel_ids: [], vessel_names: []})} 
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
                        onClick={() => {
                          const isSelected = procedureForm.vessel_ids.includes(vessel.id);
                          if (isSelected) {
                            setProcedureForm({
                              ...procedureForm, 
                              vessel_ids: procedureForm.vessel_ids.filter(id => id !== vessel.id),
                              vessel_names: procedureForm.vessel_names.filter(name => name !== vessel.vessel_name)
                            });
                          } else {
                            setProcedureForm({
                              ...procedureForm, 
                              vessel_ids: [...procedureForm.vessel_ids, vessel.id],
                              vessel_names: [...procedureForm.vessel_names, vessel.vessel_name]
                            });
                          }
                        }}
                      >
                        <Checkbox 
                          checked={procedureForm.vessel_ids.includes(vessel.id)} 
                          onCheckedChange={() => {
                            const isSelected = procedureForm.vessel_ids.includes(vessel.id);
                            if (isSelected) {
                              setProcedureForm({
                                ...procedureForm, 
                                vessel_ids: procedureForm.vessel_ids.filter(id => id !== vessel.id),
                                vessel_names: procedureForm.vessel_names.filter(name => name !== vessel.vessel_name)
                              });
                            } else {
                              setProcedureForm({
                                ...procedureForm, 
                                vessel_ids: [...procedureForm.vessel_ids, vessel.id],
                                vessel_names: [...procedureForm.vessel_names, vessel.vessel_name]
                              });
                            }
                          }}
                        />
                        <label className="text-sm flex-1 cursor-pointer">
                          {vessel.vessel_name} {vessel.vessel_type ? `(${vessel.vessel_type})` : ''}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {procedureForm.vessel_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {procedureForm.vessel_names.map((name, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        const vesselId = procedureForm.vessel_ids[index];
                        setProcedureForm({
                          ...procedureForm,
                          vessel_ids: procedureForm.vessel_ids.filter(id => id !== vesselId),
                          vessel_names: procedureForm.vessel_names.filter(n => n !== name)
                        });
                      }}
                    >
                      🚢 {name} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Equipment Required</Label>
              <Textarea rows={6} value={procedureForm.equipment_required} onChange={(e) => setProcedureForm({...procedureForm, equipment_required: e.target.value})} placeholder="List required equipment..." />
            </div>
            <div>
              <Label>Master's Guidance Notes</Label>
              <Textarea rows={6} value={procedureForm.masters_guidance_notes} onChange={(e) => setProcedureForm({...procedureForm, masters_guidance_notes: e.target.value})} placeholder="Guidance notes from the Master..." />
            </div>
            <div>
              <Label>Reference Documents</Label>
              <Textarea rows={6} value={procedureForm.reference_documents} onChange={(e) => setProcedureForm({...procedureForm, reference_documents: e.target.value})} placeholder="List reference documents, manuals, regulations..." />
            </div>
            
            {/* Authorization Footer */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-sm mb-3">Authorization</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Authorised By</Label>
                  <Select 
                    value={procedureForm.authorised_by || "custom"} 
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setProcedureForm({...procedureForm, authorised_by: ''});
                      } else {
                        setProcedureForm({...procedureForm, authorised_by: value});
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select crew or type below" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">-- Type custom name --</SelectItem>
                      {crewList.map(crew => (
                        <SelectItem key={crew.id} value={crew.staff_name}>
                          {crew.staff_name} {crew.default_position ? `(${crew.default_position})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    className="mt-2"
                    value={procedureForm.authorised_by} 
                    onChange={(e) => setProcedureForm({...procedureForm, authorised_by: e.target.value})} 
                    placeholder="Or type name here..."
                  />
                </div>
                <div>
                  <Label>Date Authorised</Label>
                  <Input 
                    type="date" 
                    value={procedureForm.date_authorised} 
                    onChange={(e) => setProcedureForm({...procedureForm, date_authorised: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcedureDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProcedure}>{procedureEditMode ? 'Update Procedure' : 'Add Procedure'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drill Dialog */}
      <Dialog open={drillDialogOpen} onOpenChange={(open) => {
        setDrillDialogOpen(open);
        if (!open) resetDrillForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drillEditMode ? 'Edit Emergency Drill' : 'Record Emergency Drill'}</DialogTitle>
            <DialogDescription>
              {drillEditMode ? 'Update emergency drill record' : 'Document emergency drill exercise and observations'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Drill Type *</Label>
              <Select value={drillForm.drill_type} onValueChange={(value) => setDrillForm({...drillForm, drill_type: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {drillTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Drill Date & Time *</Label>
                <Input type="datetime-local" value={drillForm.drill_date} onChange={(e) => setDrillForm({...drillForm, drill_date: e.target.value})} />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={drillForm.duration_minutes} onChange={(e) => setDrillForm({...drillForm, duration_minutes: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Vessel (Optional)</Label>
              <Select value={drillForm.vessel_id} onValueChange={(value) => {
                const vessel = vessels.find(v => v.id === value);
                setDrillForm({...drillForm, vessel_id: value, vessel_name: vessel?.vessel_name || ''});
              }}>
                <SelectTrigger><SelectValue placeholder="Select vessel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vessels.map(v => <SelectItem key={v.id} value={v.id}>{v.vessel_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to Trip (Optional)</Label>
              <Select value={drillForm.linked_trip_id || 'none'} onValueChange={(value) => {
                if (value === 'none') {
                  setDrillForm({...drillForm, linked_trip_id: '', linked_trip_name: ''});
                } else {
                  const trip = trips.find(t => t.id === value);
                  setDrillForm({...drillForm, linked_trip_id: value, linked_trip_name: trip ? `${trip.trip_name || 'Trip'} - ${trip.vessel_name || ''}` : ''});
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select trip (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked trip</SelectItem>
                  {trips.filter(t => !drillForm.vessel_id || t.vessel_id === drillForm.vessel_id).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.trip_name || 'Unnamed Trip'} - {t.vessel_name || 'No vessel'} ({t.departure_date ? new Date(t.departure_date).toLocaleDateString() : 'No date'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Crew Participants</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {drillForm.crew_participants.length === 0 
                        ? 'Select crew members...' 
                        : `${drillForm.crew_participants.length} crew selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <span className="text-sm font-medium">Select Crew</span>
                      {drillForm.crew_participants.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDrillForm({...drillForm, crew_participants: []})} 
                          className="h-auto p-1 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {crewList.map(crew => (
                      <div 
                        key={crew.id} 
                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => {
                          const isSelected = drillForm.crew_participants.includes(crew.staff_name);
                          setDrillForm({
                            ...drillForm, 
                            crew_participants: isSelected 
                              ? drillForm.crew_participants.filter(n => n !== crew.staff_name)
                              : [...drillForm.crew_participants, crew.staff_name]
                          });
                        }}
                      >
                        <Checkbox 
                          checked={drillForm.crew_participants.includes(crew.staff_name)} 
                          onCheckedChange={() => {
                            const isSelected = drillForm.crew_participants.includes(crew.staff_name);
                            setDrillForm({
                              ...drillForm, 
                              crew_participants: isSelected 
                                ? drillForm.crew_participants.filter(n => n !== crew.staff_name)
                                : [...drillForm.crew_participants, crew.staff_name]
                            });
                          }}
                        />
                        <label className="text-sm flex-1 cursor-pointer">
                          {crew.staff_name} - {crew.default_position || 'Crew'}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {drillForm.crew_participants.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {drillForm.crew_participants.map((name, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDrillForm({
                        ...drillForm,
                        crew_participants: drillForm.crew_participants.filter(n => n !== name)
                      })}
                    >
                      {name} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Other Participants</Label>
              <Textarea rows={2} value={drillForm.participants} onChange={(e) => setDrillForm({...drillForm, participants: e.target.value})} placeholder="List any non-crew participants (visitors, inspectors, etc.)..." />
            </div>
            <div>
              <Label>Observations</Label>
              <Textarea rows={3} value={drillForm.observations} onChange={(e) => setDrillForm({...drillForm, observations: e.target.value})} placeholder="What went well..." />
            </div>
            <div>
              <Label>Areas for Improvement</Label>
              <Textarea rows={3} value={drillForm.areas_for_improvement} onChange={(e) => setDrillForm({...drillForm, areas_for_improvement: e.target.value})} placeholder="What could be improved..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrillDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDrill}>{drillEditMode ? 'Update Drill' : 'Record Drill'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drill Record Dialog */}
      <Dialog open={recordDialogOpen} onOpenChange={(open) => {
        setRecordDialogOpen(open);
        if (!open) {
          setRecordEditMode(false);
          setEditingRecordId(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{recordEditMode ? 'Edit Drill Record' : 'Add Drill Record'}</DialogTitle>
            <DialogDescription>
              Record drill execution details including crew participation and outcomes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Record Date & Time *</Label>
              <Input 
                type="datetime-local" 
                value={recordForm.record_date} 
                onChange={(e) => setRecordForm({...recordForm, record_date: e.target.value})} 
              />
            </div>
            
            <div>
              <Label>Crew Members *</Label>
              <Select 
                value={recordForm.crew_members.length > 0 ? recordForm.crew_members[0] : ''} 
                onValueChange={(value) => {
                  if (!recordForm.crew_members.includes(value)) {
                    setRecordForm({...recordForm, crew_members: [...recordForm.crew_members, value]});
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select crew members" /></SelectTrigger>
                <SelectContent>
                  {crewList.map(crew => (
                    <SelectItem key={crew.id} value={crew.staff_name}>{crew.staff_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recordForm.crew_members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recordForm.crew_members.map((member, idx) => (
                    <Badge key={idx} variant="secondary">
                      {member}
                      <button 
                        className="ml-2 text-xs" 
                        onClick={() => setRecordForm({
                          ...recordForm, 
                          crew_members: recordForm.crew_members.filter((_, i) => i !== idx)
                        })}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Status *</Label>
              <Select value={recordForm.status} onValueChange={(value) => setRecordForm({...recordForm, status: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Authorized By *</Label>
              <Select 
                value={recordForm.authorized_by} 
                onValueChange={(value) => {
                  const crew = crewList.find(c => c.staff_name === value);
                  setRecordForm({
                    ...recordForm, 
                    authorized_by: value,
                    authorized_by_id: crew?.id || ''
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select authorizing crew" /></SelectTrigger>
                <SelectContent>
                  {crewList.map(crew => (
                    <SelectItem key={crew.id} value={crew.staff_name}>{crew.staff_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                className="w-full p-2 border rounded-md min-h-[80px]"
                value={recordForm.notes}
                onChange={(e) => setRecordForm({...recordForm, notes: e.target.value})}
                placeholder="Any additional notes or observations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRecord}>{recordEditMode ? 'Update Record' : 'Add Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Training Record Dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={(open) => {
        setTrainingDialogOpen(open);
        if (!open) {
          setTrainingEditMode(false);
          setEditingTrainingId(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{trainingEditMode ? 'Edit Training Record' : 'Add Training Record'}</DialogTitle>
            <DialogDescription>
              Record procedure training details including crew participation and outcomes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Training Date & Time *</Label>
              <Input 
                type="datetime-local" 
                value={trainingForm.training_date} 
                onChange={(e) => setTrainingForm({...trainingForm, training_date: e.target.value})} 
              />
            </div>
            
            <div>
              <Label>Crew Members *</Label>
              <Select 
                value={trainingForm.crew_members.length > 0 ? trainingForm.crew_members[0] : ''} 
                onValueChange={(value) => {
                  if (!trainingForm.crew_members.includes(value)) {
                    setTrainingForm({...trainingForm, crew_members: [...trainingForm.crew_members, value]});
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select crew members" /></SelectTrigger>
                <SelectContent>
                  {crewList.map(crew => (
                    <SelectItem key={crew.id} value={crew.staff_name}>{crew.staff_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {trainingForm.crew_members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {trainingForm.crew_members.map((member, idx) => (
                    <Badge key={idx} variant="secondary">
                      {member}
                      <button 
                        className="ml-2 text-xs" 
                        onClick={() => setTrainingForm({
                          ...trainingForm, 
                          crew_members: trainingForm.crew_members.filter((_, i) => i !== idx)
                        })}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Status *</Label>
              <Select value={trainingForm.status} onValueChange={(value) => setTrainingForm({...trainingForm, status: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Authorized By *</Label>
              <Select 
                value={trainingForm.authorized_by} 
                onValueChange={(value) => {
                  const crew = crewList.find(c => c.staff_name === value);
                  setTrainingForm({
                    ...trainingForm, 
                    authorized_by: value,
                    authorized_by_id: crew?.id || ''
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select authorizing crew" /></SelectTrigger>
                <SelectContent>
                  {crewList.map(crew => (
                    <SelectItem key={crew.id} value={crew.staff_name}>{crew.staff_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                className="w-full p-2 border rounded-md min-h-[80px]"
                value={trainingForm.notes}
                onChange={(e) => setTrainingForm({...trainingForm, notes: e.target.value})}
                placeholder="Any additional notes or observations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrainingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTraining}>{trainingEditMode ? 'Update Record' : 'Add Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drill View Dialog */}
      <Dialog open={drillViewDialogOpen} onOpenChange={setDrillViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Drill Details & Records</DialogTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportDrillToExcel}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </DialogHeader>
          {viewingDrill && (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Drill Details</TabsTrigger>
                <TabsTrigger value="records">Records ({drillRecords[viewingDrill.id]?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Drill Type:</strong> {viewingDrill.drill_type}</div>
                  <div><strong>Duration:</strong> {viewingDrill.duration_minutes ? `${viewingDrill.duration_minutes} min` : 'N/A'}</div>
                  <div className="col-span-2"><strong>Date:</strong> {new Date(viewingDrill.drill_date).toLocaleString()}</div>
                  {viewingDrill.vessel_name && <div className="col-span-2"><strong>Vessel:</strong> {viewingDrill.vessel_name}</div>}
                  {viewingDrill.crew_participants && viewingDrill.crew_participants.length > 0 && (
                    <div className="col-span-2"><strong>Crew Participants:</strong> {viewingDrill.crew_participants.join(', ')}</div>
                  )}
                  {viewingDrill.participants && <div className="col-span-2"><strong>Other Participants:</strong> {viewingDrill.participants}</div>}
                </div>
                {viewingDrill.observations && (
                  <div>
                    <strong>Observations:</strong>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{viewingDrill.observations}</p>
                  </div>
                )}
                {viewingDrill.areas_for_improvement && (
                  <div>
                    <strong>Areas for Improvement:</strong>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{viewingDrill.areas_for_improvement}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="records">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Drill Execution Records</h3>
                    <Button size="sm" onClick={() => {
                      setDrillViewDialogOpen(false);
                      handleAddRecord(viewingDrill.id);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Record
                    </Button>
                  </div>
                  {drillRecords[viewingDrill.id] && drillRecords[viewingDrill.id].length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Crew</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Authorized By</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drillRecords[viewingDrill.id].map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{new Date(record.record_date).toLocaleString()}</TableCell>
                            <TableCell>{record.crew_members.join(', ')}</TableCell>
                            <TableCell>
                              <Badge variant={record.status === 'Pass' ? 'default' : 'destructive'}>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.authorized_by}</TableCell>
                            <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setDrillViewDialogOpen(false);
                                  handleEditRecord(record);
                                }}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(record.id)}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No records for this drill yet
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrillViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procedure View Dialog */}
      <Dialog open={procedureViewDialogOpen} onOpenChange={setProcedureViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Procedure Details & Training Records</DialogTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportProcedureToExcel}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </DialogHeader>
          {viewingProcedure && (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Procedure Details</TabsTrigger>
                <TabsTrigger value="records">Training Records ({trainingRecords[viewingProcedure.id]?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Title:</strong> {viewingProcedure.title}</div>
                  <div><strong>Emergency Type:</strong> <Badge>{viewingProcedure.emergency_type}</Badge></div>
                  {viewingProcedure.purpose && <div className="col-span-2"><strong>Purpose:</strong> {viewingProcedure.purpose}</div>}
                  {viewingProcedure.equipment_required && <div className="col-span-2"><strong>Equipment Required:</strong> <span className="whitespace-pre-wrap">{viewingProcedure.equipment_required}</span></div>}
                  {viewingProcedure.muster_station && <div className="col-span-2"><strong>Muster Station:</strong> {viewingProcedure.muster_station}</div>}
                  {viewingProcedure.key_contacts && <div className="col-span-2"><strong>Key Contacts:</strong> {viewingProcedure.key_contacts}</div>}
                  {viewingProcedure.masters_guidance_notes && <div className="col-span-2"><strong>Master's Guidance Notes:</strong> <p className="whitespace-pre-wrap mt-1">{viewingProcedure.masters_guidance_notes}</p></div>}
                  {viewingProcedure.reference_documents && <div className="col-span-2"><strong>Reference Documents:</strong> <p className="whitespace-pre-wrap mt-1">{viewingProcedure.reference_documents}</p></div>}
                </div>
                <div>
                  <strong>Procedure Steps:</strong>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{viewingProcedure.procedure_steps}</p>
                </div>
                {(viewingProcedure.authorised_by || viewingProcedure.date_authorised) && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-sm mb-2">Authorization</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {viewingProcedure.authorised_by && <div><strong>Authorised By:</strong> {viewingProcedure.authorised_by}</div>}
                      {viewingProcedure.date_authorised && <div><strong>Date Authorised:</strong> {new Date(viewingProcedure.date_authorised).toLocaleDateString()}</div>}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="records">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Training Records</h3>
                    <Button size="sm" onClick={() => {
                      setProcedureViewDialogOpen(false);
                      handleAddTraining(viewingProcedure.id);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Training Record
                    </Button>
                  </div>
                  {trainingRecords[viewingProcedure.id] && trainingRecords[viewingProcedure.id].length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Crew</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Authorized By</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trainingRecords[viewingProcedure.id].map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{new Date(record.training_date).toLocaleString()}</TableCell>
                            <TableCell>{record.crew_members.join(', ')}</TableCell>
                            <TableCell>
                              <Badge variant={record.status === 'Pass' ? 'default' : 'destructive'}>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.authorized_by}</TableCell>
                            <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setProcedureViewDialogOpen(false);
                                  handleEditTraining(record);
                                }}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteTraining(record.id)}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No training records for this procedure yet
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcedureViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialogs */}
      <ImportExcelDialog
        open={importAllOpen}
        onClose={() => setImportAllOpen(false)}
        title="Import All Emergency Response Data"
        description="Upload an Excel file with 3 worksheets (Contacts, Procedures, Drills) to import all emergency data. Download the template for the correct multi-sheet format."
        worksheets={allEmergencyWorksheets}
        onImport={handleImportAllEmergency}
        templateFileName="emergency_response_import_template.xlsx"
      />
      <ImportExcelDialog
        open={importContactsOpen}
        onClose={() => setImportContactsOpen(false)}
        title="Import Emergency Contacts"
        description="Upload an Excel file to import emergency contacts. Download the template for the correct format."
        templateColumns={contactImportColumns}
        templateSampleData={contactImportSample}
        onImport={handleImportContacts}
        templateFileName="emergency_contacts_import_template.xlsx"
      />
      <ImportExcelDialog
        open={importProceduresOpen}
        onClose={() => setImportProceduresOpen(false)}
        title="Import Emergency Procedures"
        description="Upload an Excel file to import emergency procedures. Download the template for the correct format."
        templateColumns={procedureImportColumns}
        templateSampleData={procedureImportSample}
        onImport={handleImportProcedures}
        templateFileName="emergency_procedures_import_template.xlsx"
      />
      <ImportExcelDialog
        open={importDrillsOpen}
        onClose={() => setImportDrillsOpen(false)}
        title="Import Emergency Drills"
        description="Upload an Excel file to import emergency drills. Download the template for the correct format."
        templateColumns={drillImportColumns}
        templateSampleData={drillImportSample}
        onImport={handleImportDrills}
        templateFileName="emergency_drills_import_template.xlsx"
      />
    </div>
  );
};

export default Emergency;
