import { useState, useEffect, useContext } from 'react';
import { API, AuthContext } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ship, Plus, CheckCircle2, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import VesselForm from '@/components/VesselForm';

const VesselManagement = () => {
  const { user } = useContext(AuthContext);
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVessels();
  }, []);

  const fetchVessels = async () => {
    try {
      const response = await axios.get(`${API}/vessels`);
      setVessels(response.data);
    } catch (error) {
      toast.error('Failed to fetch vessels');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/vessels`, formData);
      toast.success('Vessel added successfully');
      setOpen(false);
      fetchVessels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add vessel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (formData) => {
    setSubmitting(true);
    try {
      await axios.put(`${API}/vessels/${selectedVessel.id}`, formData);
      toast.success('Vessel updated successfully');
      setEditOpen(false);
      setSelectedVessel(null);
      fetchVessels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update vessel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vesselId, vesselName) => {
    if (!window.confirm(`Are you sure you want to delete vessel "${vesselName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/vessels/${vesselId}`);
      toast.success('Vessel deleted successfully');
      fetchVessels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete vessel');
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

  const openEditDialog = (vessel) => {
    setSelectedVessel(vessel);
    setEditOpen(true);
  };

  const handleViewVessel = (vessel) => {
    setSelectedVessel(vessel);
    setViewOpen(true);
  };

  return (
    <Layout>
      <div data-testid="vessel-management" className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Vessel Management</h1>
            <p className="text-gray-600">Manage your commercial vessels and their SMS configurations</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-vessel-button" className="bg-teal-500 hover:bg-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Vessel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vessel</DialogTitle>
                <p className="text-sm text-gray-600">Complete the vessel master file with all required details</p>
              </DialogHeader>
              <VesselForm 
                onSubmit={handleSubmit}
                onCancel={() => setOpen(false)}
                loading={submitting}
              />
            </DialogContent>
          </Dialog>
          
          {/* Edit Vessel Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Vessel: {selectedVessel?.name}</DialogTitle>
                <p className="text-sm text-gray-600">Update vessel master file details</p>
              </DialogHeader>
              {selectedVessel && (
                <VesselForm 
                  initialData={selectedVessel}
                  onSubmit={handleUpdate}
                  onCancel={() => {
                    setEditOpen(false);
                    setSelectedVessel(null);
                  }}
                  loading={submitting}
                  isEdit={true}
                />
              )}
            </DialogContent>
          </Dialog>
          
          {/* View Vessel Dialog */}
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Vessel Details: {selectedVessel?.name}</DialogTitle>
              </DialogHeader>
              {selectedVessel && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Registration:</span>
                      <p className="text-gray-900">{selectedVessel.registration_number}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Class:</span>
                      <p className="text-gray-900">{selectedVessel.vessel_class?.replace('_', ' ').toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Length:</span>
                      <p className="text-gray-900">{selectedVessel.length}m</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">SMS Type:</span>
                      <p className="text-gray-900 capitalize">{selectedVessel.sms_type}</p>
                    </div>
                    {selectedVessel.vessel_type && (
                      <div>
                        <span className="font-semibold text-gray-700">Type:</span>
                        <p className="text-gray-900">{selectedVessel.vessel_type}</p>
                      </div>
                    )}
                    {selectedVessel.year_of_build && (
                      <div>
                        <span className="font-semibold text-gray-700">Year Built:</span>
                        <p className="text-gray-900">{selectedVessel.year_of_build}</p>
                      </div>
                    )}
                    {selectedVessel.hull_material && (
                      <div>
                        <span className="font-semibold text-gray-700">Hull Material:</span>
                        <p className="text-gray-900">{selectedVessel.hull_material}</p>
                      </div>
                    )}
                    {selectedVessel.company_name && (
                      <div>
                        <span className="font-semibold text-gray-700">Company:</span>
                        <p className="text-gray-900">{selectedVessel.company_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        ) : vessels.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <Ship className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Vessels Added</h3>
              <p className="text-gray-600">Add your first vessel to get started with the SMS</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vessels.map((vessel) => (
              <Card key={vessel.id} data-testid={`vessel-card-${vessel.id}`} className="bg-white border-gray-200 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Ship className="w-5 h-5 text-blue-400" />
                        {vessel.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{vessel.registration_number}</p>
                    </div>
                    {vessel.eligible_simplified && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" title="Eligible for Simplified SMS" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Class:</span>
                    <span className="text-white font-medium">{vessel.vessel_class.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Length:</span>
                    <span className="text-white font-medium">{vessel.length}m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SMS Type:</span>
                    <span className="text-white font-medium capitalize">{vessel.sms_type}</span>
                  </div>
                  {vessel.eligible_simplified && (
                    <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                      Eligible for Simplified SMS
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <Button 
                      onClick={() => handleViewVessel(vessel)}
                      variant="outline"
                      size="sm"
                      className="w-full text-gray-700 border-gray-300 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    
                    {canEdit() && (
                      <Button 
                        onClick={() => openEditDialog(vessel)}
                        variant="outline"
                        size="sm"
                        className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Vessel
                      </Button>
                    )}
                    
                    {canDelete() && (
                      <Button 
                        onClick={() => handleDelete(vessel.id, vessel.name)}
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Vessel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VesselManagement;