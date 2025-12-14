import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Plus, Edit, Trash2, Search, Filter, X, Eye, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import DocumentForm from './DocumentForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('all');
  const [vessels, setVessels] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = currentUser.access_level === 'Edit' || currentUser.access_level === 'Full';
  const canDelete = currentUser.access_level === 'Full';

  useEffect(() => {
    fetchDocuments();
    fetchVessels();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, categoryFilter, vesselFilter, sortBy, documents]);

  const applyFiltersAndSort = () => {
    let filtered = [...documents];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.file_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => 
        doc.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Apply vessel filter
    if (vesselFilter !== 'all') {
      if (vesselFilter === 'global') {
        filtered = filtered.filter(doc => !doc.vessel_id);
      } else {
        filtered = filtered.filter(doc => doc.vessel_id === vesselFilter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.document_name || '').localeCompare(b.document_name || '');
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'date':
          return (b.upload_date || '').localeCompare(a.upload_date || '');
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setVesselFilter('all');
    setSortBy('date');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || vesselFilter !== 'all' || sortBy !== 'date';

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
      setFilteredDocuments(response.data);
    } catch (err) {
      setError('Error fetching documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVessels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vessels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVessels(response.data);
    } catch (err) {
      console.error('Error fetching vessels:', err);
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedDocument(null);
    setFormOpen(true);
  };

  const handleEdit = (doc) => {
    setFormMode('edit');
    setSelectedDocument(doc);
    setFormOpen(true);
  };

  const handleView = (doc) => {
    setViewingDocument(doc);
    setViewDialogOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      
      if (formMode === 'create') {
        await axios.post(`${API}/documents`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Document uploaded successfully');
      } else {
        await axios.put(`${API}/documents/${selectedDocument.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Document updated successfully');
      }
      
      setFormOpen(false);
      fetchDocuments();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving document');
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Document deleted successfully');
      fetchDocuments();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error deleting document');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Regulations': 'bg-purple-100 text-purple-800',
      'Navigation': 'bg-orange-100 text-orange-800',
      'Safety': 'bg-red-100 text-red-800',
      'Compliance': 'bg-blue-100 text-blue-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['Other'];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Document Management</h2>
          <p className="text-gray-500 mt-1">Manage all system documents and files</p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
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

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, description, or file type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="w-full md:w-48">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="regulations">Regulations</SelectItem>
                    <SelectItem value="navigation">Navigation</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
                <Select value={vesselFilter} onValueChange={setVesselFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vessel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    <SelectItem value="global">Global Documents</SelectItem>
                    {vessels.map((vessel) => (
                      <SelectItem key={vessel.id} value={vessel.id}>
                        {vessel.vessel_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Upload Date (Newest)</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredDocuments.length} of {documents.length} documents
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || hasActiveFilters ? 'Try adjusting your search criteria' : 'Get started by uploading your first document'}
            </p>
            {canEdit && !searchQuery && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-teal-600" />
                  </div>

                  {/* Document Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {doc.document_name}
                    </div>
                    {doc.vessel_name && (
                      <div className="text-xs text-blue-600 font-medium mt-0.5">
                        🚢 {doc.vessel_name}
                      </div>
                    )}
                    {!doc.vessel_id && !doc.vessel_name && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        🌐 Global Document
                      </div>
                    )}
                    {doc.description && (
                      <div className="text-sm text-gray-500 truncate mt-1">
                        {doc.description}
                      </div>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div className="hidden md:block flex-shrink-0">
                    <Badge className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                  </div>

                  {/* Storage Type Badge - DOC or URL */}
                  <div className="hidden md:block flex-shrink-0">
                    {doc.file_url?.startsWith('/api/uploads/') ? (
                      <Badge className="bg-teal-100 text-teal-700 border-teal-300">
                        📄 DOC
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                        🔗 URL
                      </Badge>
                    )}
                  </div>

                  {/* File Type */}
                  <div className="hidden lg:block w-24 flex-shrink-0 text-center">
                    <span className="text-sm text-gray-600">
                      {doc.file_type || '-'}
                    </span>
                  </div>

                  {/* Upload Date */}
                  <div className="hidden xl:block w-28 flex-shrink-0 text-center">
                    <span className="text-sm text-gray-600">
                      {formatDate(doc.upload_date)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleView(doc)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      title="Open document"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(doc)}
                        title="Edit document"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(doc.id, doc.document_name)}
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Form Dialog */}
      <DocumentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        document={selectedDocument}
        mode={formMode}
      />

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.document_name}</DialogTitle>
            <DialogDescription>Document details and information</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {viewingDocument && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-1">Category</h3>
                  <Badge className={getCategoryColor(viewingDocument.category)}>
                    {viewingDocument.category}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-1">Storage Type</h3>
                  {viewingDocument.file_url?.startsWith('/api/uploads/') ? (
                    <Badge className="bg-teal-100 text-teal-700 border-teal-300">
                      📄 Uploaded Document
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      🔗 External URL
                    </Badge>
                  )}
                </div>

                {viewingDocument.file_type && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500 mb-1">File Type</h3>
                    <p className="text-sm">{viewingDocument.file_type}</p>
                  </div>
                )}

                {viewingDocument.description && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500 mb-1">Description</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingDocument.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-1">Upload Date</h3>
                  <p className="text-sm">{formatDate(viewingDocument.upload_date)}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-1">File URL</h3>
                  <a 
                    href={viewingDocument.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {viewingDocument.file_url}
                  </a>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => window.open(viewingDocument.file_url, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Document
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManagement;
