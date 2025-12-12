import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const RiskAssessmentDetails = ({ open, onClose, risk }) => {
  if (!risk) return null;

  const getRiskLevelColor = (level) => {
    const colors = {
      'Critical': 'bg-red-600 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-white',
      'Low': 'bg-green-500 text-white',
      'Very Low': 'bg-blue-500 text-white'
    };
    return colors[level] || 'bg-gray-500 text-white';
  };

  const getLikelihoodLabel = (value) => {
    const labels = {
      '1': '1 - Rare',
      '2': '2 - Unlikely',
      '3': '3 - Possible',
      '4': '4 - Likely',
      '5': '5 - Almost Certain'
    };
    return labels[value] || value;
  };

  const getConsequenceLabel = (value) => {
    const labels = {
      '1': '1 - Insignificant',
      '2': '2 - Minor',
      '3': '3 - Moderate',
      '4': '4 - Major',
      '5': '5 - Catastrophic'
    };
    return labels[value] || value;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {risk.activity_task}
            <Badge className={getRiskLevelColor(risk.risk_level)}>
              {risk.risk_level}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Risk Assessment Details
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Location</span>
                  <p className="text-gray-900">{risk.location || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Vessel</span>
                  <p className="text-gray-900">{risk.vessel_name || 'General (All vessels)'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  <p className="text-gray-900">{risk.status}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Review Date</span>
                  <p className="text-gray-900">
                    {risk.review_date ? new Date(risk.review_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Hazard Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Hazard Information</h3>
              <div>
                <span className="text-sm font-medium text-gray-500">Hazard</span>
                <p className="text-gray-900 mt-1">{risk.hazard}</p>
              </div>
              {risk.risk_description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Risk Description</span>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">{risk.risk_description}</p>
                </div>
              )}
            </div>

            {/* Initial Risk Assessment */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Initial Risk Assessment</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Likelihood</span>
                  <p className="text-gray-900">{getLikelihoodLabel(risk.likelihood)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Consequence</span>
                  <p className="text-gray-900">{getConsequenceLabel(risk.consequence)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Risk Level</span>
                  <div className="mt-1">
                    <Badge className={getRiskLevelColor(risk.risk_level)}>
                      {risk.risk_level} ({risk.risk_rating})
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Control Measures */}
            {risk.control_measures && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Control Measures</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{risk.control_measures}</p>
                </div>
              </div>
            )}

            {/* Residual Risk Assessment */}
            {risk.residual_likelihood && risk.residual_consequence && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Residual Risk (After Controls)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Likelihood</span>
                    <p className="text-gray-900">{getLikelihoodLabel(risk.residual_likelihood)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Consequence</span>
                    <p className="text-gray-900">{getConsequenceLabel(risk.residual_consequence)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Risk Level</span>
                    <div className="mt-1">
                      <Badge className={getRiskLevelColor(risk.residual_risk_level)}>
                        {risk.residual_risk_level} ({risk.residual_risk_rating})
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Risk Reduction:</strong> From {risk.risk_level} ({risk.risk_rating}) to {risk.residual_risk_level} ({risk.residual_risk_rating})
                  </p>
                </div>
              </div>
            )}

            {/* Management */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Management</h3>
              <div className="grid grid-cols-2 gap-4">
                {risk.responsible_person && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Responsible Person</span>
                    <p className="text-gray-900">{risk.responsible_person}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Created By</span>
                  <p className="text-gray-900">{risk.created_by_name || 'System'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created At</span>
                  <p className="text-gray-900">
                    {new Date(risk.created_at).toLocaleString()}
                  </p>
                </div>
                {risk.updated_at && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Last Updated</span>
                    <p className="text-gray-900">
                      {new Date(risk.updated_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {risk.notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Additional Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{risk.notes}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default RiskAssessmentDetails;
