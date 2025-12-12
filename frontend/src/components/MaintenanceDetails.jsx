import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const MaintenanceDetails = ({ open, onClose, record }) => {
  if (!record) return null;

  const getStatusColor = (status) => {
    const colors = {
      'Scheduled': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Overdue': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-600 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-white',
      'Low': 'bg-green-500 text-white'
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {record.title}
            <Badge className={getStatusColor(record.status)}>
              {record.status}
            </Badge>
            <Badge className={getPriorityColor(record.priority)}>
              {record.priority}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Maintenance Record Details
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Type</span>
                  <p className="text-gray-900">{record.maintenance_type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Priority</span>
                  <p className="text-gray-900">{record.priority}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Equipment/System</span>
                  <p className="text-gray-900">{record.equipment_system}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Vessel</span>
                  <p className="text-gray-900">{record.vessel_name || 'General (All vessels)'}</p>
                </div>
              </div>
              {record.description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Description</span>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">{record.description}</p>
                </div>
              )}
            </div>

            {/* Schedule Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Scheduled Date</span>
                  <p className="text-gray-900">
                    {record.scheduled_date ? new Date(record.scheduled_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Completed Date</span>
                  <p className="text-gray-900">
                    {record.completed_date ? new Date(record.completed_date).toLocaleDateString() : 'Not completed'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Next Service Date</span>
                  <p className="text-gray-900">
                    {record.next_service_date ? new Date(record.next_service_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Service Frequency</span>
                  <p className="text-gray-900">{record.service_frequency || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Responsibility */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Responsibility</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Responsible Person</span>
                  <p className="text-gray-900">{record.responsible_person || 'Not assigned'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created By</span>
                  <p className="text-gray-900">{record.created_by_name || 'System'}</p>
                </div>
              </div>
            </div>

            {/* Costs & Resources */}
            {(record.cost || record.labor_hours || record.parts_used) && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Costs & Resources</h3>
                <div className="grid grid-cols-2 gap-4">
                  {record.cost && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Cost</span>
                      <p className="text-gray-900 text-lg font-semibold">${record.cost.toFixed(2)}</p>
                    </div>
                  )}
                  {record.labor_hours && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Labor Hours</span>
                      <p className="text-gray-900">{record.labor_hours} hours</p>
                    </div>
                  )}
                </div>
                {record.parts_used && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Parts Used</span>
                    <div className="bg-gray-50 p-3 rounded-lg mt-1">
                      <p className="text-gray-900 whitespace-pre-wrap">{record.parts_used}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completion Information */}
            {record.completion_notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Completion Information</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Completion Notes</span>
                  <p className="text-gray-900 mt-2 whitespace-pre-wrap">{record.completion_notes}</p>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {record.notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Additional Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{record.notes}</p>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Audit Trail</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Created At</span>
                  <p className="text-gray-900">{new Date(record.created_at).toLocaleString()}</p>
                </div>
                {record.updated_at && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Last Updated</span>
                    <p className="text-gray-900">{new Date(record.updated_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceDetails;
