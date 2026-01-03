import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Edit, Save, RotateCcw, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChecklistTemplatesEditor = () => {
  const [templates, setTemplates] = useState({
    pre_departure: { sections: [] },
    safety_briefing: { sections: [] }
  });
  const [activeTab, setActiveTab] = useState('pre_departure');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetType, setResetType] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/checklist-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load checklist templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (checklistType) => {
    setSaving(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/admin/checklist-templates/${checklistType}`,
        templates[checklistType],
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`${checklistType === 'pre_departure' ? 'Pre-departure' : 'Safety Briefing'} template saved successfully`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const resetTemplate = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/checklist-templates/${resetType}/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`${resetType === 'pre_departure' ? 'Pre-departure' : 'Safety Briefing'} template reset to default`);
      setResetDialogOpen(false);
      fetchTemplates();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error resetting template:', err);
      setError('Failed to reset template');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (checklistType, sectionIndex, field, value) => {
    setTemplates(prev => {
      const updated = { ...prev };
      updated[checklistType] = {
        ...updated[checklistType],
        sections: updated[checklistType].sections.map((section, idx) =>
          idx === sectionIndex ? { ...section, [field]: value } : section
        )
      };
      return updated;
    });
  };

  const updateItem = (checklistType, sectionIndex, itemIndex, field, value) => {
    setTemplates(prev => {
      const updated = { ...prev };
      updated[checklistType] = {
        ...updated[checklistType],
        sections: updated[checklistType].sections.map((section, sIdx) =>
          sIdx === sectionIndex
            ? {
                ...section,
                items: section.items.map((item, iIdx) =>
                  iIdx === itemIndex ? { ...item, [field]: value } : item
                )
              }
            : section
        )
      };
      return updated;
    });
  };

  const addSection = (checklistType) => {
    const newSection = {
      section_id: `section_${Date.now()}`,
      section_name: 'New Section',
      items: [{ item_id: `item_${Date.now()}`, label: 'New Item', checked: false, remarks: '' }]
    };
    setTemplates(prev => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        sections: [...prev[checklistType].sections, newSection]
      }
    }));
  };

  const removeSection = (checklistType, sectionIndex) => {
    setTemplates(prev => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        sections: prev[checklistType].sections.filter((_, idx) => idx !== sectionIndex)
      }
    }));
  };

  const addItem = (checklistType, sectionIndex) => {
    const newItem = {
      item_id: `item_${Date.now()}`,
      label: 'New Item',
      checked: false,
      remarks: ''
    };
    setTemplates(prev => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        sections: prev[checklistType].sections.map((section, idx) =>
          idx === sectionIndex
            ? { ...section, items: [...section.items, newItem] }
            : section
        )
      }
    }));
  };

  const removeItem = (checklistType, sectionIndex, itemIndex) => {
    setTemplates(prev => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        sections: prev[checklistType].sections.map((section, sIdx) =>
          sIdx === sectionIndex
            ? { ...section, items: section.items.filter((_, iIdx) => iIdx !== itemIndex) }
            : section
        )
      }
    }));
  };

  const moveSection = (checklistType, fromIndex, direction) => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= templates[checklistType].sections.length) return;

    setTemplates(prev => {
      const sections = [...prev[checklistType].sections];
      [sections[fromIndex], sections[toIndex]] = [sections[toIndex], sections[fromIndex]];
      return {
        ...prev,
        [checklistType]: { ...prev[checklistType], sections }
      };
    });
  };

  const moveItem = (checklistType, sectionIndex, fromIndex, direction) => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    const section = templates[checklistType].sections[sectionIndex];
    if (toIndex < 0 || toIndex >= section.items.length) return;

    setTemplates(prev => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        sections: prev[checklistType].sections.map((sec, sIdx) =>
          sIdx === sectionIndex
            ? {
                ...sec,
                items: sec.items.map((item, iIdx) => {
                  if (iIdx === fromIndex) return sec.items[toIndex];
                  if (iIdx === toIndex) return sec.items[fromIndex];
                  return item;
                })
              }
            : sec
        )
      }
    }));
  };

  const renderTemplateEditor = (checklistType) => {
    const template = templates[checklistType] || { sections: [] };
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {checklistType === 'pre_departure' ? 'Pre-departure Checklist' : 'Safety Briefing'} Template
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setResetType(checklistType);
                setResetDialogOpen(true);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset to Default
            </Button>
            <Button 
              onClick={() => saveTemplate(checklistType)}
              disabled={saving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {template.sections.map((section, sectionIndex) => (
            <AccordionItem 
              key={section.section_id} 
              value={section.section_id}
              className="border rounded-lg"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => { e.stopPropagation(); moveSection(checklistType, sectionIndex, 'up'); }}
                      disabled={sectionIndex === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => { e.stopPropagation(); moveSection(checklistType, sectionIndex, 'down'); }}
                      disabled={sectionIndex === template.sections.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-medium text-left">{section.section_name}</span>
                  <span className="text-xs text-gray-500">({section.items.length} items)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Section Name</Label>
                      <Input
                        value={section.section_name}
                        onChange={(e) => updateSection(checklistType, sectionIndex, 'section_name', e.target.value)}
                        placeholder="Section name"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSection(checklistType, sectionIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 ml-4 border-l-2 pl-4">
                    <Label className="text-sm font-medium">Checklist Items</Label>
                    {section.items.map((item, itemIndex) => (
                      <div key={item.item_id} className="flex gap-2 items-center">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => moveItem(checklistType, sectionIndex, itemIndex, 'up')}
                            disabled={itemIndex === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => moveItem(checklistType, sectionIndex, itemIndex, 'down')}
                            disabled={itemIndex === section.items.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-gray-500 w-8">{item.item_id}</span>
                        <Input
                          value={item.label}
                          onChange={(e) => updateItem(checklistType, sectionIndex, itemIndex, 'label', e.target.value)}
                          placeholder="Item label"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(checklistType, sectionIndex, itemIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addItem(checklistType, sectionIndex)}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Button
          variant="outline"
          onClick={() => addSection(checklistType)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Section
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading checklist templates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Checklist Templates</CardTitle>
        <CardDescription>
          Edit the default Pre-departure and Safety Briefing checklists that appear for new trips.
          Changes will apply to new trip checklists only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{message}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pre_departure">Pre-departure Checklist</TabsTrigger>
            <TabsTrigger value="safety_briefing">Safety Briefing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pre_departure">
            {renderTemplateEditor('pre_departure')}
          </TabsContent>
          
          <TabsContent value="safety_briefing">
            {renderTemplateEditor('safety_briefing')}
          </TabsContent>
        </Tabs>

        {/* Reset Confirmation Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Template to Default</DialogTitle>
              <DialogDescription>
                Are you sure you want to reset the {resetType === 'pre_departure' ? 'Pre-departure Checklist' : 'Safety Briefing'} template to its default values? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={resetTemplate} disabled={saving}>
                {saving ? 'Resetting...' : 'Reset to Default'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ChecklistTemplatesEditor;
