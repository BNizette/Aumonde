import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';

/**
 * DateTime input with a "Now" button to set current date/time
 */
const DateTimeInput = ({ 
  id, 
  value, 
  onChange, 
  label,
  required = false,
  className = '',
  showNowButton = true 
}) => {
  const setToNow = () => {
    // Format datetime for datetime-local input: YYYY-MM-DDTHH:mm
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    onChange(formattedDateTime);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Input
        id={id}
        type="datetime-local"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0"
      />
      {showNowButton && (
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={setToNow}
          title="Set to current date and time"
          className="px-2 h-9 flex-shrink-0"
        >
          <Clock className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export { DateTimeInput };
export default DateTimeInput;
