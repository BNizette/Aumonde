import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Pencil, Save, X, ExternalLink } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HelpDialog = ({ 
  moduleKey, 
  title = 'Help Information',
  defaultContent = '',
  defaultLink = '',
  defaultLinkText = 'Learn more',
  isAdmin = false 
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [helpData, setHelpData] = useState({
    title: title,
    content: defaultContent,
    link_url: defaultLink,
    link_text: defaultLinkText
  });
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      fetchHelpContent();
    }
  }, [open, moduleKey]);

  const fetchHelpContent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/help/${moduleKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setHelpData({
          title: response.data.title || title,
          content: response.data.content || defaultContent,
          link_url: response.data.link_url || defaultLink,
          link_text: response.data.link_text || defaultLinkText
        });
      }
    } catch (err) {
      // If not found, use defaults
      if (err.response?.status !== 404) {
        console.error('Error fetching help content:', err);
      }
    }
  };

  const handleEdit = () => {
    setEditData({ ...helpData });
    setEditing(true);
    setError('');
    setMessage('');
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({});
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const token = localStorage.getItem('token');
      await axios.put(`${API}/help/${moduleKey}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHelpData({ ...editData });
      setEditing(false);
      setMessage('Help content saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving help content');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="p-1 h-auto"
        title="Click for help information"
      >
        <Info className="h-5 w-5 text-blue-500 hover:text-blue-700" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editing ? 'Edit Help Content' : helpData.title}</span>
              {isAdmin && !editing && (
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
            {!editing && (
              <DialogDescription>
                Module: {moduleKey}
              </DialogDescription>
            )}
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Help title"
                />
              </div>
              <div className="space-y-2">
                <Label>Content (supports markdown)</Label>
                <Textarea
                  value={editData.content}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  placeholder="Help content..."
                  rows={8}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input
                    value={editData.link_url}
                    onChange={(e) => setEditData({ ...editData, link_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link Text</Label>
                  <Input
                    value={editData.link_text}
                    onChange={(e) => setEditData({ ...editData, link_text: e.target.value })}
                    placeholder="Learn more"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{helpData.content}</p>
              </div>
              {helpData.link_url && (
                <a
                  href={helpData.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  {helpData.link_text}
                </a>
              )}
            </div>
          )}

          <DialogFooter>
            {editing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpDialog;
