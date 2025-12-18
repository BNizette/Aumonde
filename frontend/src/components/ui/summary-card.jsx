import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Reusable Summary Card component for dashboard statistics
 * 
 * @param {Object} props
 * @param {number|string} props.value - The main statistic value to display
 * @param {string} props.label - The label/title for the statistic
 * @param {string} props.description - Optional description text below the label
 * @param {string} props.color - Color theme: 'blue', 'green', 'yellow', 'red', 'orange', 'purple', 'cyan', 'indigo', 'gray'
 * @param {function} props.onClick - Click handler for filtering
 * @param {string} props.className - Additional CSS classes
 */
const SummaryCard = ({ 
  value, 
  label, 
  description, 
  color = 'blue', 
  onClick, 
  className = '' 
}) => {
  // Color mappings for border and text
  const colorMap = {
    blue: { border: 'border-l-blue-500', text: 'text-blue-600' },
    green: { border: 'border-l-green-500', text: 'text-green-600' },
    yellow: { border: 'border-l-yellow-500', text: 'text-yellow-600' },
    red: { border: 'border-l-red-500', text: 'text-red-600' },
    orange: { border: 'border-l-orange-500', text: 'text-orange-600' },
    purple: { border: 'border-l-purple-500', text: 'text-purple-600' },
    cyan: { border: 'border-l-cyan-500', text: 'text-cyan-600' },
    indigo: { border: 'border-l-indigo-500', text: 'text-indigo-600' },
    gray: { border: 'border-l-gray-500', text: 'text-gray-600' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${colors.border} ${className}`}
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3">
        <div className="text-center">
          <div className={`text-lg font-bold ${colors.text}`}>{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { SummaryCard };
export default SummaryCard;
