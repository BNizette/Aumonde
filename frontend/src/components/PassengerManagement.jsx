import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Eye, Users, UserPlus, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import PassengerForm from './PassengerForm';

const PassengerManagement = () => {
  const API = process.env.REACT_APP_BACKEND_URL + '/api';
  const [passengers, setPassengers] = useState([]);
  const [filteredPassengers, setFilteredPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passengerToDelete, setPassengerToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPassenger, setViewingPassenger] = useState(null);

  useEffect(() => {
    fetchPassengers();
  }, []);

  useEffect(() => {
    filterPassengers();
  }, [search, passengers]);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/passengers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setPassengers(data || []);
    } catch (error) {
      console.error('Error fetching passengers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPassengers = () => {
    let filtered = [...passengers];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.contact_email?.toLowerCase().includes(searchLower) ||
        p.contact_phone?.includes(search)
      );
    }
    setFilteredPassengers(filtered);
  };

  const handleAdd = () => {
    setSelectedPassenger(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (passenger) => {
    setSelectedPassenger(passenger);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleView = (passenger) => {
    setViewingPassenger(passenger);
    setViewDialogOpen(true);
  };

  const handleDelete = (passenger) => {
    setPassengerToDelete(passenger);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!passengerToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/passengers/${passengerToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPassengers();
      setDeleteDialogOpen(false);
      setPassengerToDelete(null);
    } catch (error) {
      console.error('Error deleting passenger:', error);
    }
  };

  const handleSave = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const url = formMode === 'edit' 
        ? `${API}/passengers/${selectedPassenger.id}`
        : `${API}/passengers`;
      
      await fetch(url, {
        method: formMode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      fetchPassengers();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving passenger:', error);
    }
  };

  const primaryCount = passengers.filter(p => p.passenger_type === 'Primary').length;
  const guestCount = passengers.filter(p => p.passenger_type === 'Guest').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading passengers...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Passenger Management
          </h1>
          <p className="text-gray-500">Manage passenger profiles, preferences, and requirements</p>
        </div>
        <Button onClick={handleAdd}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Passenger
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Passengers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passengers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Primary Guests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{primaryCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Additional Guests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{guestCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Passengers</CardTitle>
          <CardDescription>View and manage all passenger profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Passenger Table */}
          {filteredPassengers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {passengers.length === 0 ? 'No passengers added yet' : 'No passengers match your search'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Dietary</TableHead>
                  <TableHead>Medical Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPassengers.map((passenger) => (
                  <TableRow key={passenger.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {passenger.photo_url ? (
                          <img 
                            src={passenger.photo_url} 
                            alt={passenger.name} 
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{passenger.name}</div>
                          {passenger.passenger_type === 'Guest' && passenger.relationship_to_primary && (
                            <div className="text-xs text-gray-500">{passenger.relationship_to_primary}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={passenger.passenger_type === 'Primary' ? 'default' : 'secondary'}>
                        {passenger.passenger_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {passenger.contact_email && <div>{passenger.contact_email}</div>}
                        {passenger.contact_phone && <div className="text-gray-500">{passenger.contact_phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs truncate">
                        {[passenger.dietary_restrictions, passenger.dietary_preference].filter(Boolean).join(', ') || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs truncate">
                        {[passenger.allergies, passenger.medical_conditions].filter(Boolean).join(', ') || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(passenger)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(passenger)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(passenger)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      <PassengerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        passenger={selectedPassenger}
        mode={formMode}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Passenger</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {passengerToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingPassenger?.photo_url ? (
                <img 
                  src={viewingPassenger.photo_url} 
                  alt={viewingPassenger?.name} 
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div>
                <div>{viewingPassenger?.name}</div>
                <Badge variant={viewingPassenger?.passenger_type === 'Primary' ? 'default' : 'secondary'}>
                  {viewingPassenger?.passenger_type}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewingPassenger && (
            <div className="space-y-6">
              {/* Details */}
              <div>
                <h3 className="font-semibold mb-2">Contact Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Email:</span> {viewingPassenger.contact_email || '-'}</div>
                  <div><span className="text-gray-500">Phone:</span> {viewingPassenger.contact_phone || '-'}</div>
                  <div><span className="text-gray-500">DOB:</span> {viewingPassenger.date_of_birth || '-'}</div>
                  <div><span className="text-gray-500">Address:</span> {viewingPassenger.address || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Emergency:</span> {viewingPassenger.emergency_contact_name} - {viewingPassenger.emergency_contact_phone}</div>
                </div>
              </div>

              {/* Medical */}
              <div>
                <h3 className="font-semibold mb-2">Medical & Dietary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Allergies:</span> {viewingPassenger.allergies || '-'}</div>
                  <div><span className="text-gray-500">Medications:</span> {viewingPassenger.medications || '-'}</div>
                  <div><span className="text-gray-500">Medical Conditions:</span> {viewingPassenger.medical_conditions || '-'}</div>
                  <div><span className="text-gray-500">Special Equipment:</span> {viewingPassenger.special_equipment || '-'}</div>
                  <div><span className="text-gray-500">Dietary Restrictions:</span> {viewingPassenger.dietary_restrictions || '-'}</div>
                  <div><span className="text-gray-500">Dislikes:</span> {viewingPassenger.dislikes || '-'}</div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className="font-semibold mb-2">Preferences & Provisioning</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Dietary Preference:</span> {viewingPassenger.dietary_preference || '-'}</div>
                  <div><span className="text-gray-500">Beverage Preference:</span> {viewingPassenger.beverage_preference || '-'}</div>
                  <div><span className="text-gray-500">Alcohol Allowed:</span> {viewingPassenger.alcohol_allowed ? 'Yes' : 'No'}</div>
                  <div><span className="text-gray-500">Dining Style:</span> {viewingPassenger.dining_styles?.length > 0 ? viewingPassenger.dining_styles.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : (viewingPassenger.dining_style || '-')}</div>
                </div>
              </div>

              {/* Entertainment */}
              <div>
                <h3 className="font-semibold mb-2">Entertainment & Activities</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Music Genre:</span> {viewingPassenger.music_genre || '-'}</div>
                  <div><span className="text-gray-500">Movie Preferences:</span> {viewingPassenger.movie_preferences || '-'}</div>
                  <div><span className="text-gray-500">Internet Requirement:</span> {viewingPassenger.internet_requirement || '-'}</div>
                  <div><span className="text-gray-500">Privacy Level:</span> {viewingPassenger.privacy_level || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Desired Experiences:</span> {viewingPassenger.desired_experiences || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Special Requests:</span> {viewingPassenger.special_requests || '-'}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setViewDialogOpen(false); handleEdit(viewingPassenger); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PassengerManagement;
