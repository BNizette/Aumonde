import { useState, useEffect, useContext } from 'react';
import { API, AuthContext } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Edit, Trash2, Eye, Ship } from 'lucide-react';
import { toast } from 'sonner';
import CrewForm from '@/components/CrewForm';

const CrewManagementNew = () => {
  const { user } = useContext(AuthContext);
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    if (selectedVessel) {
      fetchCrew();
    }
  }, [selectedVessel]);

  const fetchVessels = async () => {
    try {
      const response = await axios.get(`${API}/vessels`);
      setVessels(response.data);
      if (response.data.length > 0) {
        setSelectedVessel(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch vessels');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrew = async () => {
    if (!selectedVessel) return;
    
    try {
      const response = await axios.get(`${API}/crew/vessel/${selectedVessel.id}`);
      setCrew(response.data);
    } catch (error) {
      toast.error('Failed to fetch crew');
    }
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/crew`, formData);
      toast.success('Crew member added successfully');
      setOpen(false);
      fetchCrew();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add crew member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (formData) => {
    setSubmitting(true);
    try {
      await axios.put(`${API}/crew/${selectedCrew.id}`, formData);
      toast.success('Crew member updated successfully');
      setEditOpen(false);
      setSelectedCrew(null);
      fetchCrew();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update crew member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (crewId, crewName) => {
    if (!window.confirm(`Are you sure you want to delete crew member "${crewName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/crew/${crewId}`);
      toast.success('Crew member deleted successfully');
      fetchCrew();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete crew member');
    }
  };

  const canEdit = () => {
    const accessLevel = user?.access_level || 'edit';
    return accessLevel === 'edit' || accessLevel === 'full';
  };

  const canDelete = () => {
    const accessLevel = user?.access_level || 'edit';
    return accessLevel === 'full' || user?.role === 'owner';
  };

  const openEditDialog = (crewMember) => {
    setSelectedCrew(crewMember);
    setEditOpen(true);
  };

  const openViewDialog = (crewMember) => {
    setSelectedCrew(crewMember);
    setViewOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crew Management</h1>
          <p className="text-gray-600">Manage crew members, qualifications, and training records</p>
        </div>

        {/* Vessel Selector */}
        {vessels.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Ship className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 mb-4">No vessels found. Please add a vessel first.</p>
                <Button
                  onClick={() => window.location.href = '/vessels'}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Go to Vessel Management
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Label className="text-gray-700 font-medium">Select Vessel:</Label>
                  <select
                    value={selectedVessel?.id || ''}
                    onChange={(e) => {
                      const vessel = vessels.find(v => v.id === e.target.value);
                      setSelectedVessel(vessel);
                    }}
                    className="flex-1 p-2 rounded-md bg-white border-gray-300 text-gray-900 border"
                  >
                    {vessels.map(vessel => (
                      <option key={vessel.id} value={vessel.id}>
                        {vessel.name} - {vessel.registration_number}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

        {/* Crew List */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-500" />
                Crew Members
              </CardTitle>
              {canEdit() && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <Button
                    onClick={() => setOpen(true)}
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Crew Member
                  </Button>
                  <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Crew Member</DialogTitle>
                      <p className="text-sm text-gray-600">Complete crew details, qualifications, and training records</p>
                    </DialogHeader>
                    <CrewForm
                      vesselId={selectedVessel?.id}
                      onSubmit={handleSubmit}
                      onCancel={() => setOpen(false)}
                      loading={submitting}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {crew.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No crew members found for this vessel</p>
                {canEdit() && (
                  <Button
                    onClick={() => setOpen(true)}
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Crew Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crew.map((member) => (
                  <Card key={member.id} className="border-gray-200 hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">{member.full_name}</h3>
                          <p className="text-sm text-gray-600">{member.position}</p>
                        </div>

                        <div className="space-y-1 text-sm">
                          {member.contact_details && (
                            <p className="text-gray-600">📞 {member.contact_details}</p>
                          )}
                          {member.date_joined_vessel && (
                            <p className="text-gray-600">Joined: {formatDate(member.date_joined_vessel)}</p>
                          )}
                          {member.qualifications && member.qualifications.length > 0 && (
                            <p className="text-gray-600">
                              Qualifications: {member.qualifications.join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewDialog(member)}
                            className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>

                          {canEdit() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(member)}
                              className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}

                          {canDelete() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(member.id, member.full_name)}
                              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Crew Member: {selectedCrew?.full_name}</DialogTitle>
              <p className="text-sm text-gray-600">Update crew details, qualifications, and training records</p>
            </DialogHeader>
            {selectedCrew && (
              <CrewForm
                vesselId={selectedVessel?.id}
                initialData={selectedCrew}
                onSubmit={handleUpdate}
                onCancel={() => {
                  setEditOpen(false);
                  setSelectedCrew(null);
                }}
                loading={submitting}
                isEdit={true}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crew Member Details: {selectedCrew?.full_name}</DialogTitle>
            </DialogHeader>
            {selectedCrew && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Name:</p>
                      <p className="font-medium">{selectedCrew.full_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Position:</p>
                      <p className="font-medium">{selectedCrew.position}</p>
                    </div>
                    {selectedCrew.address && (
                      <div className="col-span-2">
                        <p className="text-gray-600">Address:</p>
                        <p className="font-medium">{selectedCrew.address}</p>
                      </div>
                    )}
                    {selectedCrew.contact_details && (
                      <div>
                        <p className="text-gray-600">Contact:</p>
                        <p className="font-medium">{selectedCrew.contact_details}</p>
                      </div>
                    )}
                    {selectedCrew.next_of_kin && (
                      <div>
                        <p className="text-gray-600">Next of Kin:</p>
                        <p className="font-medium">{selectedCrew.next_of_kin}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Qualifications</h3>
                  <div className="text-sm space-y-2">
                    {selectedCrew.qualifications && selectedCrew.qualifications.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {selectedCrew.qualifications.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600">No qualifications listed</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Training Record</h3>
                  <div className="space-y-3 text-sm">
                    {selectedCrew.briefings_observed && selectedCrew.briefings_observed.length > 0 && (
                      <div>
                        <p className="text-gray-600 font-medium">Safety Briefings Observed:</p>
                        <p>{selectedCrew.briefings_observed.length} completed</p>
                      </div>
                    )}
                    {selectedCrew.briefings_delivered && selectedCrew.briefings_delivered.length > 0 && (
                      <div>
                        <p className="text-gray-600 font-medium">Safety Briefings Delivered:</p>
                        <p>{selectedCrew.briefings_delivered.length} completed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default CrewManagementNew;
