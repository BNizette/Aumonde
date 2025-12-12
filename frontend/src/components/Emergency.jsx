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
import { Phone, Plus, Edit, Trash2, AlertTriangle, FileText, Activity, Search, Filter, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filter states for Contacts
  const [contactSearch, setContactSearch] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('all');
  const [contactPriorityFilter, setContactPriorityFilter] = useState('all');
  const [contactSort, setContactSort] = useState('priority');
  const [filteredContacts, setFilteredContacts] = useState([]);

  // Filter states for Procedures
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureTypeFilter, setProcedureTypeFilter] = useState('all');
  const [procedureSort, setProcedureSort] = useState('type');
  const [filteredProcedures, setFilteredProcedures] = useState([]);

  // Filter states for Drills
  const [drillSearch, setDrillSearch] = useState('');
  const [drillTypeFilter, setDrillTypeFilter] = useState('all');
  const [drillVesselFilter, setDrillVesselFilter] = useState('all');
  const [drillSort, setDrillSort] = useState('date');
  const [filteredDrills, setFilteredDrills] = useState([]);

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

  const contactTypes = ['Crew', 'Shore', 'Authority', 'Medical', 'Supplier'];
  const emergencyTypes = ['Fire', 'Medical Emergency', 'Man Overboard', 'Grounding', 'Collision', 'Flooding', 'Abandon Ship', 'Search and Rescue'];
  const drillTypes = ['Fire Drill', 'Abandon Ship Drill', 'Man Overboard Drill', 'Medical Emergency Drill', 'Collision Drill'];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyContactFilters();
  }, [contactSearch, contactTypeFilter, contactPriorityFilter, contactSort, contacts]);

  useEffect(() => {
    applyProcedureFilters();
  }, [procedureSearch, procedureTypeFilter, procedureSort, procedures]);

  useEffect(() => {
    applyDrillFilters();
  }, [drillSearch, drillTypeFilter, drillVesselFilter, drillSort, drills]);

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

    if (contactTypeFilter !== 'all') {
      filtered = filtered.filter(contact => contact.contact_type === contactTypeFilter);
    }

    if (contactPriorityFilter !== 'all') {
      filtered = filtered.filter(contact => contact.priority === parseInt(contactPriorityFilter));
    }

    filtered.sort((a, b) => {
      switch (contactSort) {
        case 'priority':
          return a.priority - b.priority;
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'type':
          return (a.contact_type || '').localeCompare(b.contact_type || '');
        default:
          return 0;
      }
    });

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

    if (procedureTypeFilter !== 'all') {
      filtered = filtered.filter(proc => proc.emergency_type === procedureTypeFilter);
    }

    filtered.sort((a, b) => {
      switch (procedureSort) {
        case 'type':
          return (a.emergency_type || '').localeCompare(b.emergency_type || '');
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

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

    if (drillTypeFilter !== 'all') {
      filtered = filtered.filter(drill => drill.drill_type === drillTypeFilter);
    }

    if (drillVesselFilter !== 'all') {
      filtered = filtered.filter(drill => drill.vessel_name === drillVesselFilter);
    }

    filtered.sort((a, b) => {
      switch (drillSort) {
        case 'date':
          return new Date(b.drill_date || 0) - new Date(a.drill_date || 0);
        case 'type':
          return (a.drill_type || '').localeCompare(b.drill_type || '');
        case 'vessel':
          return (a.vessel_name || '').localeCompare(b.vessel_name || '');
        default:
          return 0;
      }
    });

    setFilteredDrills(filtered);
  };

  const clearContactFilters = () => {
    setContactSearch('');
    setContactTypeFilter('all');
    setContactPriorityFilter('all');
    setContactSort('priority');
  };

  const clearProcedureFilters = () => {
    setProcedureSearch('');
    setProcedureTypeFilter('all');
    setProcedureSort('type');
  };

  const clearDrillFilters = () => {
    setDrillSearch('');
    setDrillTypeFilter('all');
    setDrillVesselFilter('all');
    setDrillSort('date');
  };

  const hasActiveContactFilters = contactSearch || contactTypeFilter !== 'all' || contactPriorityFilter !== 'all' || contactSort !== 'priority';
  const hasActiveProcedureFilters = procedureSearch || procedureTypeFilter !== 'all' || procedureSort !== 'type';
  const hasActiveDrillFilters = drillSearch || drillTypeFilter !== 'all' || drillVesselFilter !== 'all' || drillSort !== 'date';

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.phone_primary) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/emergency/contacts`, contactForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Emergency contact added successfully');
      setContactDialogOpen(false);
      resetContactForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving contact');
    }
  };

  const handleProcedureSubmit = async () => {
    if (!procedureForm.title || !procedureForm.procedure_steps) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/emergency/procedures`, procedureForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Emergency procedure added successfully');
      setProcedureDialogOpen(false);
      resetProcedureForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving procedure');
    }
  };

  const handleDrillSubmit = async () => {
    if (!drillForm.drill_type || !drillForm.drill_date) {
      setError('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/emergency/drills`, drillForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Emergency drill recorded successfully');
      setDrillDialogOpen(false);
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
                <Button onClick={() => setContactDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistics Cards - Clickable */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setContactSearch('');
                    setContactTypeFilter('all');
                    setContactPriorityFilter('all');
                    setContactSort('priority');
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Total Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{contacts.length}</div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setContactPriorityFilter('1')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Priority 1</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-red-600">
                      {contacts.filter(c => c.priority === 1).length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Critical contacts</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setContactTypeFilter('Medical')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Medical</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-blue-600">
                      {contacts.filter(c => c.contact_type === 'Medical').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setContactTypeFilter('Authority')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Authorities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-purple-600">
                      {contacts.filter(c => c.contact_type === 'Authority').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search contacts by name, organization, role, or phone..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Select value={contactTypeFilter} onValueChange={setContactTypeFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Type" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {contactTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={contactPriorityFilter} onValueChange={setContactPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="1">Priority 1</SelectItem>
                        <SelectItem value="2">Priority 2</SelectItem>
                        <SelectItem value="3">Priority 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={contactSort} onValueChange={setContactSort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="type">Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredContacts.length} of {contacts.length} contacts
                  </p>
                  {hasActiveContactFilters && (
                    <Button variant="outline" size="sm" onClick={clearContactFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
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
                        <Button variant="destructive" size="sm" onClick={() => deleteContact(contact.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                <Button onClick={() => setProcedureDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Procedure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistics Cards - Clickable */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setProcedureSearch('');
                    setProcedureTypeFilter('all');
                    setProcedureSort('type');
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Total Procedures</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{procedures.length}</div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setProcedureTypeFilter('Fire')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Fire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-red-600">
                      {procedures.filter(p => p.emergency_type === 'Fire').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setProcedureTypeFilter('Man Overboard')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Man Overboard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-blue-600">
                      {procedures.filter(p => p.emergency_type === 'Man Overboard').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setProcedureTypeFilter('Medical Emergency')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Medical</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-green-600">
                      {procedures.filter(p => p.emergency_type === 'Medical Emergency').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search procedures by title, type, or steps..."
                      value={procedureSearch}
                      onChange={(e) => setProcedureSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="w-full md:w-56">
                    <Select value={procedureTypeFilter} onValueChange={setProcedureTypeFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Emergency Type" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {emergencyTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={procedureSort} onValueChange={setProcedureSort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="type">Emergency Type</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredProcedures.length} of {procedures.length} procedures
                  </p>
                  {hasActiveProcedureFilters && (
                    <Button variant="outline" size="sm" onClick={clearProcedureFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
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
                        <Button variant="destructive" size="sm" onClick={() => deleteProcedure(proc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                <Button onClick={() => setDrillDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Drill
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistics Cards - Clickable */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setDrillSearch('');
                    setDrillTypeFilter('all');
                    setDrillVesselFilter('all');
                    setDrillSort('date');
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Total Drills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{drills.length}</div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to show all</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setDrillTypeFilter('Fire Drill')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Fire Drills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-red-600">
                      {drills.filter(d => d.drill_type === 'Fire Drill').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setDrillTypeFilter('Abandon Ship Drill')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Abandon Ship</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-orange-600">
                      {drills.filter(d => d.drill_type === 'Abandon Ship Drill').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setDrillTypeFilter('Man Overboard Drill')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Man Overboard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-blue-600">
                      {drills.filter(d => d.drill_type === 'Man Overboard Drill').length}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click to filter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search drills by type, vessel, or observations..."
                      value={drillSearch}
                      onChange={(e) => setDrillSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="w-full md:w-56">
                    <Select value={drillTypeFilter} onValueChange={setDrillTypeFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Drill Type" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {drillTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={drillVesselFilter} onValueChange={setDrillVesselFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vessel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vessels</SelectItem>
                        {[...new Set(drills.map(d => d.vessel_name).filter(Boolean))].map(vessel => (
                          <SelectItem key={vessel} value={vessel}>{vessel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-48">
                    <Select value={drillSort} onValueChange={setDrillSort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date (Newest)</SelectItem>
                        <SelectItem value="type">Drill Type</SelectItem>
                        <SelectItem value="vessel">Vessel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredDrills.length} of {drills.length} drills
                  </p>
                  {hasActiveDrillFilters && (
                    <Button variant="outline" size="sm" onClick={clearDrillFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
            <DialogDescription>Add a new emergency contact person or organization</DialogDescription>
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
            <Button onClick={handleContactSubmit}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procedure Dialog */}
      <Dialog open={procedureDialogOpen} onOpenChange={setProcedureDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Emergency Procedure</DialogTitle>
            <DialogDescription>Document emergency response procedures</DialogDescription>
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
            <Button onClick={handleProcedureSubmit}>Add Procedure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drill Dialog */}
      <Dialog open={drillDialogOpen} onOpenChange={setDrillDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Emergency Drill</DialogTitle>
            <DialogDescription>Document emergency drill exercise and observations</DialogDescription>
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
            <Button onClick={handleDrillSubmit}>Record Drill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Emergency;
