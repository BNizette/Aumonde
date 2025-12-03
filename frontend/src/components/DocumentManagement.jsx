import { useState, useEffect } from 'react';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';

const DocumentManagement = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'policy',
    content: '',
    version: '1.0'
  });

  useEffect(() => {
    fetchVessels();
  }, []);

  useEffect(() => {
    if (selectedVessel) {
      fetchDocuments();
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

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents/vessel/${selectedVessel.id}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/documents`, {
        ...formData,
        vessel_id: selectedVessel.id
      });
      toast.success('Document added successfully');
      setOpen(false);
      setFormData({ title: '', document_type: 'policy', content: '', version: '1.0' });
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to add document');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </Layout>
    );
  }

  if (vessels.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2>
          <p className="text-gray-600 mb-6">Please add a vessel first.</p>
          <a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Vessels
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="document-management" className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Document Management</h1>
            <p className="text-gray-600">Manage SMS documentation, policies, and procedures</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-document-button" className="bg-teal-500 hover:bg-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-300 text-white max-w-2xl w-full mx-4">
              <DialogHeader>
                <DialogTitle>Add New Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    data-testid="document-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-gray-50 border-gray-300"
                  />
                </div>
                
                <div>
                  <Label htmlFor="document_type">Document Type</Label>
                  <select
                    id="document_type"
                    data-testid="document-type-select"
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    className="w-full p-2 rounded-md bg-gray-50 border-gray-300 text-white border"
                  >
                    <option value="policy">Policy</option>
                    <option value="procedure">Procedure</option>
                    <option value="manual">Manual</option>
                    <option value="certificate">Certificate</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    data-testid="document-version-input"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    required
                    className="bg-gray-50 border-gray-300"
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    data-testid="document-content-input"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className="bg-gray-50 border-gray-300"
                    placeholder="Enter document content..."
                  />
                </div>
                
                <Button type="submit" data-testid="submit-document-button" className="w-full bg-teal-500 hover:bg-teal-600">
                  Add Document
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {vessels.length > 1 && (
          <div className="flex items-center gap-4">
            <Label className="text-gray-700">Select Vessel:</Label>
            <select
              data-testid="vessel-select-documents"
              value={selectedVessel?.id || ''}
              onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))}
              className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
            >
              {vessels.map((vessel) => (
                <option key={vessel.id} value={vessel.id}>
                  {vessel.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {documents.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Documents Added</h3>
              <p className="text-gray-600">Add documents to build your SMS library</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Card key={doc.id} data-testid={`document-card-${doc.id}`} className="bg-white border-gray-200 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <span className="truncate">{doc.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="text-white font-medium capitalize">{doc.document_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Version:</span>
                    <span className="text-white font-medium">{doc.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-white font-medium">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {doc.content && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{doc.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DocumentManagement;