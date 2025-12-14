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
import { Phone, Plus, Edit, Trash2, AlertTriangle, FileText, Activity, Search, Filter, X, Download, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Emergency = () => {
  const [contacts, setContacts] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [drills, setDrills] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [drillDialogOpen, setDrillDialogOpen] = useState(false);
  const [contactEditMode, setContactEditMode] = useState(false);
  const [procedureEditMode, setProcedureEditMode] = useState(false);
  const [drillEditMode, setDrillEditMode] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editingProcedureId, setEditingProcedureId] = useState(null);
  const [editingDrillId, setEditingDrillId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    procedure_steps: '',
    equipment_required: '',
    muster_station: '',
    key_contacts: ''
  });

  const [drillForm, setDrillForm] = useState({
    drill_type: 'Fire Drill',
    drill_date: new Date().toISOString().slice(0, 16),
    vessel_id: '',
    vessel_name: '',
    participants: '',
    duration_minutes: '',
    observations: '',
    areas_for_improvement: ''
  });

  const [contactTypes, setContactTypes] = useState(['Crew', 'Shore', 'Authority', 'Medical', 'Supplier']);
  const [emergencyTypes, setEmergencyTypes] = useState(['Fire', 'Medical Emergency', 'Man Overboard', 'Grounding', 'Collision', 'Flooding', 'Abandon Ship', 'Search and Rescue']);
  const [drillTypes, setDrillTypes] = useState(['Fire Drill', 'Abandon Ship Drill', 'Man Overboard Drill', 'Medical Emergency Drill', 'Collision Drill']);

  useEffect(() => {
    fetchData();
    fetchSettings();
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

      const [contactsRes, proceduresRes, drillsRes, vesselsRes] = await Promise.all([
        axios.get(`${API}/emergency/contacts`, { headers }),
        axios.get(`${API}/emergency/procedures`, { headers }),
        axios.get(`${API}/emergency/drills`, { headers }),
        axios.get(`${API}/vessels`, { headers })
      ]);

      setContacts(contactsRes.data);
      setProcedures(proceduresRes.data);
      setDrills(drillsRes.data);
      setVessels(vesselsRes.data);
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

  const exportContactsToCSV = () => {
    if (filteredContacts.length === 0) { setError('No contacts to export'); setTimeout(() => setError(''), 3000); return; }
    const headers = ['ID', 'Name', 'Title', 'Organization', 'Contact Type', 'Priority', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', 'Available 24/7', 'Notes', 'Created At'];
    const csvRows = [headers.join(','), ...filteredContacts.map(c => [
      `"${c.id || ''}"`, `"${(c.name || '').replace(/"/g, '""')}"`, `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${(c.organization || '').replace(/"/g, '""')}"`, `"${c.contact_type || ''}"`, `"${c.priority || ''}"`,
      `"${c.phone_primary || ''}"`, `"${c.phone_secondary || ''}"`, `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`, `"${c.available_24_7 ? 'Yes' : 'No'}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`, `"${c.created_at ? new Date(c.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `emergency_contacts_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Exported ${filteredContacts.length} emergency contacts to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportProceduresToCSV = () => {
    if (filteredProcedures.length === 0) { setError('No procedures to export'); setTimeout(() => setError(''), 3000); return; }
    const headers = ['ID', 'Procedure Name', 'Procedure Type', 'Description', 'Steps', 'Equipment Required', 'Response Time', 'Created At'];
    const csvRows = [headers.join(','), ...filteredProcedures.map(p => [
      `"${p.id || ''}"`, `"${(p.procedure_name || '').replace(/"/g, '""')}"`, `"${p.procedure_type || ''}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`, `"${(p.steps || '').replace(/"/g, '""')}"`,
      `"${(p.equipment_required || '').replace(/"/g, '""')}"`, `"${p.response_time || ''}"`,
      `"${p.created_at ? new Date(p.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `emergency_procedures_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Exported ${filteredProcedures.length} emergency procedures to CSV`);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportDrillsToCSV = () => {
    if (filteredDrills.length === 0) { setError('No drills to export'); setTimeout(() => setError(''), 3000); return; }
    const headers = ['ID', 'Drill Type', 'Vessel Name', 'Drill Date', 'Duration', 'Participants', 'Conducted By', 'Observations', 'Areas for Improvement', 'Overall Rating', 'Created At'];
    const csvRows = [headers.join(','), ...filteredDrills.map(d => [
      `"${d.id || ''}"`, `"${d.drill_type || ''}"`, `"${(d.vessel_name || '').replace(/"/g, '""')}"`,
      `"${d.drill_date ? new Date(d.drill_date).toLocaleDateString() : ''}"`, `"${d.duration_minutes || ''}"`,
      `"${d.participants_count || ''}"`, `"${(d.conducted_by || '').replace(/"/g, '""')}"`,
      `"${(d.observations || '').replace(/"/g, '""')}"`, `"${(d.areas_for_improvement || '').replace(/"/g, '""')}"`,
      `"${d.overall_rating || ''}"`, `"${d.created_at ? new Date(d.created_at).toLocaleString() : ''}"`
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `emergency_drills_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Exported ${filteredDrills.length} emergency drills to CSV`);
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
      procedure_steps: procedure.procedure_steps || '',
      equipment_required: procedure.equipment_required || '',
      muster_station: procedure.muster_station || '',
      key_contacts: procedure.key_contacts || ''
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
      participants: drill.participants || '',
      duration_minutes: drill.duration_minutes || '',
      observations: drill.observations || '',
      areas_for_improvement: drill.areas_for_improvement || ''
    });
    setEditingDrillId(drill.id);
    setDrillEditMode(true);
    setDrillDialogOpen(true);
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
      procedure_steps: '',
      equipment_required: '',
      muster_station: '',
      key_contacts: ''
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
      participants: '',
      duration_minutes: '',
      observations: '',
      areas_for_improvement: ''
    });
    setDrillEditMode(false);
    setEditingDrillId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Emergency Response</h2>
        <p className="text-gray-500 mt-1">Manage emergency contacts, procedures, and drills</p>
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

      <Tabs defaultValue="contacts" className="space-y-4">
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
                  <Button variant="outline" onClick={exportContactsToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
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
                  <Button variant="outline" onClick={exportProceduresToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
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
                      <div className="flex justify-between items-start">
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
                          <Button variant="outline" size="sm" onClick={() => handleEditProcedure(proc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteProcedure(proc.id, proc.title)}>
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
                  <Button variant="outline" onClick={exportDrillsToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{drill.drill_type}</h3>
                            <Badge variant="outline">{drill.duration_minutes ? `${drill.duration_minutes} min` : 'N/A'}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            <strong>Date:</strong> {new Date(drill.drill_date).toLocaleString()}
                          </p>
                          {drill.vessel_name && <p className="text-sm"><strong>Vessel:</strong> {drill.vessel_name}</p>}
                          {drill.participants && <p className="text-sm"><strong>Participants:</strong> {drill.participants}</p>}
                          {drill.observations && (
                            <div className="mt-2 text-sm">
                              <strong>Observations:</strong>
                              <p className="text-gray-700">{drill.observations}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditDrill(drill)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteDrill(drill.id, drill.drill_type)}>
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
              <Label>Procedure Steps *</Label>
              <Textarea rows={6} value={procedureForm.procedure_steps} onChange={(e) => setProcedureForm({...procedureForm, procedure_steps: e.target.value})} placeholder="Step 1: ...\nStep 2: ..." />
            </div>
            <div>
              <Label>Equipment Required</Label>
              <Input value={procedureForm.equipment_required} onChange={(e) => setProcedureForm({...procedureForm, equipment_required: e.target.value})} />
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
              <Label>Participants</Label>
              <Textarea rows={2} value={drillForm.participants} onChange={(e) => setDrillForm({...drillForm, participants: e.target.value})} placeholder="List participants..." />
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
    </div>
  );
};

export default Emergency;
