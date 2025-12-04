import { useState, useEffect, useContext } from 'react';
import { API, AuthContext } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Edit, Trash2, Eye, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import CrewForm from '@/components/CrewForm';

const CrewManagementNew = () => {
  const { user } = useContext(AuthContext);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchCrew();
  }, []);

  const fetchCrew = async () => {
    try {
      const response = await axios.get(`${API}/crew`);
      setCrew(response.data);
    } catch (error) {
      toast.error('Failed to fetch crew');
    } finally {
      setLoading(false);
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

  const calculateYears = (dateString) => {
    if (!dateString) return '';
    try {
      const qualDate = new Date(dateString);
      const today = new Date();
      const diffTime = Math.abs(today - qualDate);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      return diffYears.toFixed(2);
    } catch (e) {
      return '';
    }
  };

  // Filter and sort crew
  const getFilteredAndSortedCrew = () => {
    let filtered = [...crew];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.contact_details && member.contact_details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.position && member.position.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Position filter
    if (filterPosition !== 'all') {
      filtered = filtered.filter(member => 
        member.position && member.position.toLowerCase() === filterPosition.toLowerCase()
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(member => 
        member.role && member.role.toLowerCase() === filterRole.toLowerCase()
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name);
        case 'position':
          return (a.position || '').localeCompare(b.position || '');
        case 'role':
          return (a.role || '').localeCompare(b.role || '');
        case 'dateJoined':
          return new Date(b.date_joined_vessel || 0) - new Date(a.date_joined_vessel || 0);
        case 'dateCommenced':
          return new Date(b.date_commenced_employment || 0) - new Date(a.date_commenced_employment || 0);
        default:
          return 0;
      }
    });

    return filtered;
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
                          {member.qualifications && member.qualifications.length > 0 && (
                            <p className="text-gray-600">
                              Qualifications: {member.qualifications.map(q => q.name || q).join(', ')}
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
                      <ul className="space-y-1">
                        {selectedCrew.qualifications.map((q, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="font-medium">{q.name || q}</span>
                            {q.date && (
                              <span className="text-gray-500 text-xs">
                                ({formatDate(q.date)} - {calculateYears(q.date)} years)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600">No qualifications listed</p>
                    )}
                  </div>
                </div>

                {selectedCrew.cv_url && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">CV</h3>
                    <div className="text-sm">
                      <a 
                        href={selectedCrew.cv_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View CV Document
                      </a>
                    </div>
                  </div>
                )}

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
