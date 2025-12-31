import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Image, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BrandingSettings = () => {
  const [branding, setBranding] = useState({
    favicon_url: null,
    logo_url: null,
    app_name: 'AMSA Safety Management'
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({ favicon: false, logo: false });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const faviconInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/branding`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranding(response.data);
    } catch (err) {
      console.error('Error fetching branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/x-icon', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: JPG, PNG, ICO, SVG, GIF`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setUploading(prev => ({ ...prev, [type]: true }));
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/branding/upload/${type}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update local state with new URL
      setBranding(prev => ({
        ...prev,
        [`${type}_url`]: response.data.file_url
      }));

      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
      setTimeout(() => setMessage(''), 3000);

      // Apply favicon immediately if it was updated
      if (type === 'favicon') {
        applyFavicon(response.data.file_url);
      }

    } catch (err) {
      setError(err.response?.data?.detail || `Failed to upload ${type}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const applyFavicon = (url) => {
    // Update the favicon in the document head
    const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = `${fullUrl}?t=${Date.now()}`; // Cache bust
  };

  const handleRemove = async (type) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/branding`, {
        ...branding,
        [`${type}_url`]: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBranding(prev => ({
        ...prev,
        [`${type}_url`]: null
      }));

      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`);
      setTimeout(() => setMessage(''), 3000);

      // Reset favicon to default if removed
      if (type === 'favicon') {
        let link = document.querySelector("link[rel*='icon']");
        if (link) {
          link.href = '/favicon.ico';
        }
      }

    } catch (err) {
      setError(`Failed to remove ${type}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading branding settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Branding Settings
        </CardTitle>
        <CardDescription>
          Customize your application&apos;s favicon and logo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Favicon Upload */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Favicon</Label>
              <p className="text-sm text-gray-500">
                The small icon shown in browser tabs. Recommended: 32x32 or 64x64 pixels.
              </p>
            </div>
            {branding.favicon_url && (
              <div className="flex items-center gap-2">
                <img
                  src={getImageUrl(branding.favicon_url)}
                  alt="Current favicon"
                  className="w-8 h-8 object-contain border rounded"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove('favicon')}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={faviconInputRef}
              accept=".jpg,.jpeg,.png,.ico,.svg,.gif"
              onChange={(e) => handleFileUpload('favicon', e.target.files[0])}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => faviconInputRef.current?.click()}
              disabled={uploading.favicon}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading.favicon ? 'Uploading...' : 'Upload Favicon'}
            </Button>
            <span className="text-xs text-gray-500">JPG, PNG, ICO, or SVG (max 2MB)</span>
          </div>

          {branding.favicon_url && (
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Current file:</span>{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">{branding.favicon_url}</code>
              </p>
            </div>
          )}
        </div>

        {/* Logo Upload */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Logo</Label>
              <p className="text-sm text-gray-500">
                Your organization&apos;s logo for the application header. Recommended: 200x50 pixels or similar aspect ratio.
              </p>
            </div>
            {branding.logo_url && (
              <div className="flex items-center gap-2">
                <img
                  src={getImageUrl(branding.logo_url)}
                  alt="Current logo"
                  className="h-10 max-w-[120px] object-contain border rounded"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove('logo')}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={logoInputRef}
              accept=".jpg,.jpeg,.png,.svg,.gif"
              onChange={(e) => handleFileUpload('logo', e.target.files[0])}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading.logo}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading.logo ? 'Uploading...' : 'Upload Logo'}
            </Button>
            <span className="text-xs text-gray-500">JPG, PNG, or SVG (max 2MB)</span>
          </div>

          {branding.logo_url && (
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Current file:</span>{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">{branding.logo_url}</code>
              </p>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <Label className="text-base font-semibold mb-4 block">Preview</Label>
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">Browser Tab</p>
                <div className="flex items-center gap-2 bg-gray-100 rounded-t px-3 py-2 border-b">
                  {branding.favicon_url ? (
                    <img
                      src={getImageUrl(branding.favicon_url)}
                      alt="Favicon preview"
                      className="w-4 h-4 object-contain"
                    />
                  ) : (
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                  )}
                  <span className="text-xs text-gray-600 truncate max-w-[100px]">
                    {branding.app_name || 'AMSA Safety'}
                  </span>
                </div>
              </div>
              
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-2">Header Logo</p>
                <div className="flex items-center justify-center gap-2 bg-slate-800 rounded px-4 py-3">
                  {branding.logo_url ? (
                    <img
                      src={getImageUrl(branding.logo_url)}
                      alt="Logo preview"
                      className="h-8 max-w-[150px] object-contain"
                    />
                  ) : (
                    <span className="text-white font-semibold">AMSA Safety Management</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p><strong>Note:</strong> Changes to the favicon may require a browser refresh to take effect. The logo will be applied to the application header once uploaded.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandingSettings;
