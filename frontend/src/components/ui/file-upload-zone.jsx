import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Reusable File Upload Zone Component
 * Supports both click-to-upload and drag-and-drop functionality
 * 
 * @param {Object} props
 * @param {string} props.value - Current file URL (if already uploaded)
 * @param {function} props.onChange - Callback when file is uploaded, receives file_url
 * @param {string} props.accept - Accepted file types (e.g., ".pdf", ".jpg,.png,.jpeg")
 * @param {string} props.label - Label text for the upload zone
 * @param {string} props.description - Helper text (e.g., "Max 10MB")
 * @param {boolean} props.disabled - Whether upload is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {function} props.onError - Error callback
 * @param {function} props.onSuccess - Success callback with message
 */
const FileUploadZone = ({
  value,
  onChange,
  accept = ".pdf",
  label = "Click or drag to upload",
  description = "Max 10MB",
  disabled = false,
  className = "",
  onError,
  onSuccess
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type;
        }
        return file.type.includes(type.replace('*', ''));
      });
      
      if (!isValidType) {
        onError?.(`Invalid file type. Accepted: ${accept}`);
        return;
      }
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      onError?.('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.file_url) {
        onChange(response.data.file_url);
        onSuccess?.('File uploaded successfully');
      } else {
        onError?.('Upload failed - no file URL returned');
      }
    } catch (err) {
      console.error('Upload error:', err);
      onError?.(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
  };

  // Get display filename from URL
  const getFileName = (url) => {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  // If file is already uploaded, show the uploaded state
  if (value) {
    return (
      <div className={cn("border rounded-lg p-4 bg-green-50 border-green-200", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
            <a
              href={value.startsWith('http') ? value : `${BACKEND_URL}${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium truncate"
            >
              {getFileName(value) || 'View File'}
            </a>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Upload zone
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
        isDragOver && !disabled ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
      
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-600">Uploading...</p>
        </div>
      ) : (
        <>
          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">{label}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
          {isDragOver && (
            <p className="text-xs text-blue-600 mt-1 font-medium">Drop file here</p>
          )}
        </>
      )}
    </div>
  );
};

export default FileUploadZone;
