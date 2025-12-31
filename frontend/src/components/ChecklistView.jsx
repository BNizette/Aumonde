import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, CheckCircle, AlertCircle, ChevronDown, ChevronRight, User, Clock, FileCheck } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChecklistView = ({ tripId, checklistType, title, crewList = [], onMessage }) => {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (tripId) {
      fetchChecklist();
    }
  }, [tripId, checklistType]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/trips/${tripId}/checklists/${checklistType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklist(response.data);
      
      // Expand all sections by default
      const expanded = {};
      response.data.sections?.forEach(section => {
        expanded[section.section_id] = true;
      });
      setExpandedSections(expanded);
      
      if (response.data.authorized_by) {
        setSelectedCrew(response.data.authorized_by);
      }
    } catch (err) {
      console.error('Error fetching checklist:', err);
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckItem = (sectionId, itemId, checked) => {
    setChecklist(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.section_id === sectionId) {
          return {
            ...section,
            items: section.items.map(item => {
              if (item.item_id === itemId) {
                return { ...item, checked };
              }
              return item;
            })
          };
        }
        return section;
      })
    }));
  };

  const handleRemarksChange = (sectionId, itemId, remarks) => {
    setChecklist(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.section_id === sectionId) {
          return {
            ...section,
            items: section.items.map(item => {
              if (item.item_id === itemId) {
                return { ...item, remarks };
              }
              return item;
            })
          };
        }
        return section;
      })
    }));
  };

  const handleSave = async (authorize = false) => {
    if (authorize && !selectedCrew) {
      setError('Please select a crew member to authorize');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const selectedCrewMember = crewList.find(c => c.id === selectedCrew);
      
      const payload = {
        sections: checklist.sections.map(section => ({
          section_id: section.section_id,
          section_name: section.section_name,
          items: section.items.map(item => ({
            item_id: item.item_id,
            checked: item.checked,
            remarks: item.remarks || ''
          }))
        }))
      };

      if (authorize && selectedCrew) {
        payload.authorized_by = selectedCrew;
        payload.authorized_by_name = selectedCrewMember?.staff_name || 'Unknown';
      }

      await axios.put(`${API}/trips/${tripId}/checklists/${checklistType}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh to get updated authorization timestamp
      await fetchChecklist();
      
      onMessage && onMessage(authorize ? 'Checklist saved and authorized' : 'Checklist saved');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save checklist');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getCompletionStats = () => {
    if (!checklist?.sections) return { total: 0, checked: 0, percentage: 0 };
    
    let total = 0;
    let checked = 0;
    
    checklist.sections.forEach(section => {
      section.items.forEach(item => {
        total++;
        if (item.checked) checked++;
      });
    });
    
    return {
      total,
      checked,
      percentage: total > 0 ? Math.round((checked / total) * 100) : 0
    };
  };

  const getSectionStats = (section) => {
    const total = section.items.length;
    const checked = section.items.filter(item => item.checked).length;
    return { total, checked };
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileCheck className="h-12 w-12 mx-auto mb-2 animate-pulse opacity-30" />
        <p>Loading checklist...</p>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>Failed to load checklist</p>
      </div>
    );
  }

  const stats = getCompletionStats();

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header with Stats and Authorization */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${stats.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{stats.checked}/{stats.total}</span>
            </div>
            <Badge variant={stats.percentage === 100 ? 'default' : 'secondary'}>
              {stats.percentage}% Complete
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Authorize by:</Label>
            <Select value={selectedCrew} onValueChange={setSelectedCrew}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select crew" />
              </SelectTrigger>
              <SelectContent>
                {crewList.map(crew => (
                  <SelectItem key={crew.id} value={crew.id}>
                    {crew.staff_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Authorization Status */}
      {checklist.authorized_at && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <span className="font-medium">Authorized by:</span> {checklist.authorized_by_name} on{' '}
            {new Date(checklist.authorized_at).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Checklist Sections */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {checklist.sections?.map(section => {
            const sectionStats = getSectionStats(section);
            const isExpanded = expandedSections[section.section_id];
            
            return (
              <Collapsible 
                key={section.section_id} 
                open={isExpanded}
                onOpenChange={() => toggleSection(section.section_id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 transition-colors">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="font-medium text-sm">{section.section_name}</span>
                      </div>
                      <Badge 
                        variant={sectionStats.checked === sectionStats.total ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {sectionStats.checked}/{sectionStats.total}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="divide-y">
                      {section.items.map(item => (
                        <div 
                          key={item.item_id} 
                          className={`p-3 ${item.checked ? 'bg-green-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`${section.section_id}-${item.item_id}`}
                              checked={item.checked}
                              onCheckedChange={(checked) => handleCheckItem(section.section_id, item.item_id, checked)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <label 
                                htmlFor={`${section.section_id}-${item.item_id}`}
                                className={`text-sm cursor-pointer ${item.checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                              >
                                <span className="font-medium text-gray-600">{item.item_id}</span> {item.label}
                              </label>
                              <Input
                                placeholder="Remarks (optional)"
                                value={item.remarks || ''}
                                onChange={(e) => handleRemarksChange(section.section_id, item.item_id, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={saving || !selectedCrew}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save & Authorize'}
        </Button>
      </div>
    </div>
  );
};

export default ChecklistView;
