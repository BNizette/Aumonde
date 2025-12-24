import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link as LinkIcon, X, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentForm = ({ open, onClose, onSave, document, mode = 'create' }) => {
  const [uploadMethod, setUploadMethod] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [vessels, setVessels] = useState([]);
  const [loadingVessels, setLoadingVessels] = useState(false);
  const [documentCategories, setDocumentCategories] = useState(['Regulations', 'Navigation', 'Safety', 'Compliance', 'Other']);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    document_name: '',
    category: 'Other',
    file_url: '',
    file_type: '',
    description: '',
    vessel_id: 'global'
  });

  useEffect(() => {
    if (open) {
      fetchVessels();
      fetchDocumentCategories();
    }
  }, [open]);

  const fetchDocumentCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/settings/document/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const categories = (response.data?.options || [])
        .filter(o => o.is_active !== false)
        .map(o => typeof o === 'string' ? o : o.value);
      if (categories.length > 0) {
        setDocumentCategories(categories);
      }
    } catch (err) {
      console.error('Error fetching document categories:', err);
      // Keep default categories on error
    }
  };

  useEffect(() => {
    if (document && mode === 'edit') {
      setFormData({
        document_name: document.document_name || '',
        category: document.category || 'Other',
        file_url: document.file_url || '',
        file_type: document.file_type || '',
        description: document.description || '',
        vessel_id: document.vessel_id || 'global'
      });
      setUploadMethod('url');
    } else if (mode === 'create') {
      setFormData({
        document_name: '',
        category: 'Other',
        file_url: '',
        file_type: '',
        description: '',
        vessel_id: 'global'
      });
      setSelectedFile(null);
      setUploadMethod('file');
      setError('');
    }
  }, [document, mode, open]);

  const fetchVessels = async () => {
    try {
      setLoadingVessels(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vessels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVessels(response.data);
    } catch (err) {
      console.error('Error fetching vessels:', err);
    } finally {
      setLoadingVessels(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      
      if (!formData.document_name) {
        handleChange('document_name', file.name.replace(/\.[^/.]+$/, ''));
      }
      
      const fileType = file.type || file.name.split('.').pop().toUpperCase();
      handleChange('file_type', fileType);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      
      if (!formData.document_name) {
        handleChange('document_name', file.name.replace(/\.[^/.]+$/, ''));
      }
      
      const fileType = file.type || file.name.split('.').pop().toUpperCase();
      handleChange('file_type', fileType);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return null;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const formDataUpload = new FormData();
      formDataUpload.append('file', selectedFile);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/documents/upload`, formDataUpload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'File upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.document_name) {
      setError('Please enter a document name');
      return;
    }

    try {
      let finalFileUrl = formData.file_url;
      let finalFileType = formData.file_type;

      if (uploadMethod === 'file' && selectedFile) {
        const uploadResult = await uploadFile();
        if (uploadResult) {
          finalFileUrl = uploadResult.file_url;
          if (!finalFileType) {
            finalFileType = uploadResult.file_type;
          }
        } else {
          return;
        }
      } else if (uploadMethod === 'url' && !finalFileUrl) {
        setError('Please enter a file URL');
        return;
      }

      const documentData = {
        ...formData,
        file_url: finalFileUrl,
        file_type: finalFileType,
        vessel_id: formData.vessel_id === 'global' ? null : formData.vessel_id
      };

      onSave(documentData);
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Upload New Document' : 'Edit Document'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new document to the system' : 'Update document information'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document_name">Document Name *</Label>
            <Input
              id="document_name"
              value={formData.document_name}
              onChange={(e) => handleChange('document_name', e.target.value)}
              placeholder="Enter document name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vessel_id">Attach to Vessel (Optional)</Label>
            <Select value={formData.vessel_id} onValueChange={(value) => handleChange('vessel_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Global Document (All Vessels)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global Document (All Vessels)</SelectItem>
                {vessels.map((vessel) => (
                  <SelectItem key={vessel.id} value={vessel.id}>
                    {vessel.vessel_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Leave as "Global" for documents not specific to any vessel
            </p>
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label>Upload Method</Label>
              <Tabs value={uploadMethod} onValueChange={setUploadMethod}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    External URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-4">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileText className="h-12 w-12 mx-auto text-teal-600" />
                        <div className="font-medium">{selectedFile.name}</div>
                        <div className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 mx-auto text-gray-400" />
                        <div className="font-medium">Click to upload or drag and drop</div>
                        <div className="text-sm text-gray-500">PDF, DOC, XLS, JPG, PNG (Max 50MB)</div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                    />
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="url" className="space-y-2">
                  <Label htmlFor="file_url">File URL *</Label>
                  <Input
                    id="file_url"
                    value={formData.file_url}
                    onChange={(e) => handleChange('file_url', e.target.value)}
                    placeholder="https://example.com/document.pdf"
                  />
                  <p className="text-xs text-gray-500">
                    Paste the URL of your document (from cloud storage, Google Drive, Dropbox, etc.)
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="file_url_edit">File URL</Label>
              <Input
                id="file_url_edit"
                value={formData.file_url}
                onChange={(e) => handleChange('file_url', e.target.value)}
                placeholder="https://example.com/document.pdf"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file_type">File Type</Label>
            <Input
              id="file_type"
              value={formData.file_type}
              onChange={(e) => handleChange('file_type', e.target.value)}
              placeholder="e.g., PDF, DOCX, XLSX, JPG"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add notes or description about this document"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Uploading...' : mode === 'create' ? 'Upload Document' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentForm;
