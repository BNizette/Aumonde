import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

// EngineField component - moved outside to prevent recreation on each render
const EngineField = ({ label, engine, field, value, onChange }) => (
  <div className="flex items-center gap-2">
    <Label htmlFor={`${engine}_${field}`} className="text-xs w-24 text-right flex-shrink-0">
      {label}:
    </Label>
    <Input
      id={`${engine}_${field}`}
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => onChange(`${engine}_${field}`, e.target.value)}
      className="h-8 text-sm flex-1"
    />
  </div>
);

const EngineRunningLogForm = ({ open, onClose, onSave, log, tripId, mode = 'create' }) => {
  const [error, setError] = useState('');

  // Helper function to calculate UTC offset from a date
  const calculateUtcOffset = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    return `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    trip_id: tripId || '',
    log_datetime: '',
    utc_offset: '',
    // Engine One
    engine1_rpm: '',
    engine1_water_temp: '',
    engine1_oil_temp: '',
    engine1_oil_pressure: '',
    engine1_gearbox_temp: '',
    engine1_gearbox_pressure: '',
    engine1_pyrometers: '',
    engine1_battery_volts: '',
    engine1_aux_volts: '',
    engine1_fuel_level: '',
    engine1_engine_hrs_start: '',
    engine1_engine_hrs_end: '',
    // Engine Two
    engine2_rpm: '',
    engine2_water_temp: '',
    engine2_oil_temp: '',
    engine2_oil_pressure: '',
    engine2_gearbox_temp: '',
    engine2_gearbox_pressure: '',
    engine2_pyrometers: '',
    engine2_battery_volts: '',
    engine2_aux_volts: '',
    engine2_fuel_level: '',
    engine2_engine_hrs_start: '',
    engine2_engine_hrs_end: ''
  });

  useEffect(() => {
    if (!open) return;
    
    if (log && mode === 'edit') {
      const utcOffset = log.log_datetime ? calculateUtcOffset(log.log_datetime) : '';
      setFormData({
        trip_id: log.trip_id || tripId || '',
        log_datetime: log.log_datetime ? new Date(log.log_datetime).toISOString().slice(0, 16) : '',
        utc_offset: log.utc_offset || utcOffset,
        // Engine One
        engine1_rpm: log.engine1_rpm || '',
        engine1_water_temp: log.engine1_water_temp || '',
        engine1_oil_temp: log.engine1_oil_temp || '',
        engine1_oil_pressure: log.engine1_oil_pressure || '',
        engine1_gearbox_temp: log.engine1_gearbox_temp || '',
        engine1_gearbox_pressure: log.engine1_gearbox_pressure || '',
        engine1_pyrometers: log.engine1_pyrometers || '',
        engine1_battery_volts: log.engine1_battery_volts || '',
        engine1_aux_volts: log.engine1_aux_volts || '',
        engine1_fuel_level: log.engine1_fuel_level || '',
        engine1_engine_hrs_start: log.engine1_engine_hrs_start || '',
        engine1_engine_hrs_end: log.engine1_engine_hrs_end || '',
        // Engine Two
        engine2_rpm: log.engine2_rpm || '',
        engine2_water_temp: log.engine2_water_temp || '',
        engine2_oil_temp: log.engine2_oil_temp || '',
        engine2_oil_pressure: log.engine2_oil_pressure || '',
        engine2_gearbox_temp: log.engine2_gearbox_temp || '',
        engine2_gearbox_pressure: log.engine2_gearbox_pressure || '',
        engine2_pyrometers: log.engine2_pyrometers || '',
        engine2_battery_volts: log.engine2_battery_volts || '',
        engine2_aux_volts: log.engine2_aux_volts || '',
        engine2_fuel_level: log.engine2_fuel_level || '',
        engine2_engine_hrs_start: log.engine2_engine_hrs_start || '',
        engine2_engine_hrs_end: log.engine2_engine_hrs_end || ''
      });
    } else if (mode === 'create') {
      setFormData({
        trip_id: tripId || '',
        log_datetime: '',
        utc_offset: '',
        // Engine One
        engine1_rpm: '',
        engine1_water_temp: '',
        engine1_oil_temp: '',
        engine1_oil_pressure: '',
        engine1_gearbox_temp: '',
        engine1_gearbox_pressure: '',
        engine1_pyrometers: '',
        engine1_battery_volts: '',
        engine1_aux_volts: '',
        engine1_fuel_level: '',
        engine1_engine_hrs_start: '',
        engine1_engine_hrs_end: '',
        // Engine Two
        engine2_rpm: '',
        engine2_water_temp: '',
        engine2_oil_temp: '',
        engine2_oil_pressure: '',
        engine2_gearbox_temp: '',
        engine2_gearbox_pressure: '',
        engine2_pyrometers: '',
        engine2_battery_volts: '',
        engine2_aux_volts: '',
        engine2_fuel_level: '',
        engine2_engine_hrs_start: '',
        engine2_engine_hrs_end: ''
      });
    }
    setError('');
  }, [log, mode, open, tripId]);

  const handleChange = (field, value) => {
    // Auto-calculate UTC offset when datetime field changes
    if (field === 'log_datetime') {
      const utcOffset = calculateUtcOffset(value);
      setFormData(prev => ({ ...prev, [field]: value, utc_offset: utcOffset }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = () => {
    setError('');

    if (!formData.log_datetime) {
      setError('Please enter date and time');
      return;
    }

    const submitData = {
      trip_id: tripId,
      log_datetime: new Date(formData.log_datetime).toISOString(),
      // Engine One
      engine1_rpm: formData.engine1_rpm ? parseFloat(formData.engine1_rpm) : null,
      engine1_water_temp: formData.engine1_water_temp ? parseFloat(formData.engine1_water_temp) : null,
      engine1_oil_temp: formData.engine1_oil_temp ? parseFloat(formData.engine1_oil_temp) : null,
      engine1_oil_pressure: formData.engine1_oil_pressure ? parseFloat(formData.engine1_oil_pressure) : null,
      engine1_gearbox_temp: formData.engine1_gearbox_temp ? parseFloat(formData.engine1_gearbox_temp) : null,
      engine1_gearbox_pressure: formData.engine1_gearbox_pressure ? parseFloat(formData.engine1_gearbox_pressure) : null,
      engine1_pyrometers: formData.engine1_pyrometers ? parseFloat(formData.engine1_pyrometers) : null,
      engine1_battery_volts: formData.engine1_battery_volts ? parseFloat(formData.engine1_battery_volts) : null,
      engine1_aux_volts: formData.engine1_aux_volts ? parseFloat(formData.engine1_aux_volts) : null,
      engine1_fuel_level: formData.engine1_fuel_level ? parseFloat(formData.engine1_fuel_level) : null,
      engine1_engine_hrs_start: formData.engine1_engine_hrs_start ? parseFloat(formData.engine1_engine_hrs_start) : null,
      engine1_engine_hrs_end: formData.engine1_engine_hrs_end ? parseFloat(formData.engine1_engine_hrs_end) : null,
      // Engine Two
      engine2_rpm: formData.engine2_rpm ? parseFloat(formData.engine2_rpm) : null,
      engine2_water_temp: formData.engine2_water_temp ? parseFloat(formData.engine2_water_temp) : null,
      engine2_oil_temp: formData.engine2_oil_temp ? parseFloat(formData.engine2_oil_temp) : null,
      engine2_oil_pressure: formData.engine2_oil_pressure ? parseFloat(formData.engine2_oil_pressure) : null,
      engine2_gearbox_temp: formData.engine2_gearbox_temp ? parseFloat(formData.engine2_gearbox_temp) : null,
      engine2_gearbox_pressure: formData.engine2_gearbox_pressure ? parseFloat(formData.engine2_gearbox_pressure) : null,
      engine2_pyrometers: formData.engine2_pyrometers ? parseFloat(formData.engine2_pyrometers) : null,
      engine2_battery_volts: formData.engine2_battery_volts ? parseFloat(formData.engine2_battery_volts) : null,
      engine2_aux_volts: formData.engine2_aux_volts ? parseFloat(formData.engine2_aux_volts) : null,
      engine2_fuel_level: formData.engine2_fuel_level ? parseFloat(formData.engine2_fuel_level) : null,
      engine2_engine_hrs_start: formData.engine2_engine_hrs_start ? parseFloat(formData.engine2_engine_hrs_start) : null,
      engine2_engine_hrs_end: formData.engine2_engine_hrs_end ? parseFloat(formData.engine2_engine_hrs_end) : null
    };

    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Engine Running Log' : 'Edit Engine Running Log'}</DialogTitle>
          <DialogDescription>
            Record engine parameters for both engines
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="log_datetime">Date & Time *</Label>
              <Input
                id="log_datetime"
                type="datetime-local"
                value={formData.log_datetime}
                onChange={(e) => handleChange('log_datetime', e.target.value)}
                className="max-w-xs"
              />
            </div>

            {/* Two Engine Columns */}
            <div className="grid grid-cols-2 gap-6">
              {/* Port Engine Column */}
              <div className="space-y-3 border-r pr-4">
                <h3 className="font-semibold text-center text-teal-700 pb-2 border-b">Port Engine</h3>
                
                <EngineField label="RPM" engine="engine1" field="rpm" value={formData.engine1_rpm} onChange={handleChange} />
                <EngineField label="Water Temp" engine="engine1" field="water_temp" value={formData.engine1_water_temp} onChange={handleChange} />
                <EngineField label="Oil Temp" engine="engine1" field="oil_temp" value={formData.engine1_oil_temp} onChange={handleChange} />
                <EngineField label="Oil Pressure" engine="engine1" field="oil_pressure" value={formData.engine1_oil_pressure} onChange={handleChange} />
                <EngineField label="Gearbox Temp" engine="engine1" field="gearbox_temp" value={formData.engine1_gearbox_temp} onChange={handleChange} />
                <EngineField label="Gearbox Press" engine="engine1" field="gearbox_pressure" value={formData.engine1_gearbox_pressure} onChange={handleChange} />
                <EngineField label="Pyrometers" engine="engine1" field="pyrometers" value={formData.engine1_pyrometers} onChange={handleChange} />
                <EngineField label="Battery Volts" engine="engine1" field="battery_volts" value={formData.engine1_battery_volts} onChange={handleChange} />
                <EngineField label="Aux Volts" engine="engine1" field="aux_volts" value={formData.engine1_aux_volts} onChange={handleChange} />
                <EngineField label="Fuel Level" engine="engine1" field="fuel_level" value={formData.engine1_fuel_level} onChange={handleChange} />
                <EngineField label="Hrs Start" engine="engine1" field="engine_hrs_start" value={formData.engine1_engine_hrs_start} onChange={handleChange} />
                <EngineField label="Hrs End" engine="engine1" field="engine_hrs_end" value={formData.engine1_engine_hrs_end} onChange={handleChange} />
              </div>

              {/* Starboard Engine Column */}
              <div className="space-y-3 pl-4">
                <h3 className="font-semibold text-center text-blue-700 pb-2 border-b">Starboard Engine</h3>
                
                <EngineField label="RPM" engine="engine2" field="rpm" value={formData.engine2_rpm} onChange={handleChange} />
                <EngineField label="Water Temp" engine="engine2" field="water_temp" value={formData.engine2_water_temp} onChange={handleChange} />
                <EngineField label="Oil Temp" engine="engine2" field="oil_temp" value={formData.engine2_oil_temp} onChange={handleChange} />
                <EngineField label="Oil Pressure" engine="engine2" field="oil_pressure" value={formData.engine2_oil_pressure} onChange={handleChange} />
                <EngineField label="Gearbox Temp" engine="engine2" field="gearbox_temp" value={formData.engine2_gearbox_temp} onChange={handleChange} />
                <EngineField label="Gearbox Press" engine="engine2" field="gearbox_pressure" value={formData.engine2_gearbox_pressure} onChange={handleChange} />
                <EngineField label="Pyrometers" engine="engine2" field="pyrometers" value={formData.engine2_pyrometers} onChange={handleChange} />
                <EngineField label="Battery Volts" engine="engine2" field="battery_volts" value={formData.engine2_battery_volts} onChange={handleChange} />
                <EngineField label="Aux Volts" engine="engine2" field="aux_volts" value={formData.engine2_aux_volts} onChange={handleChange} />
                <EngineField label="Fuel Level" engine="engine2" field="fuel_level" value={formData.engine2_fuel_level} onChange={handleChange} />
                <EngineField label="Hrs Start" engine="engine2" field="engine_hrs_start" value={formData.engine2_engine_hrs_start} onChange={handleChange} />
                <EngineField label="Hrs End" engine="engine2" field="engine_hrs_end" value={formData.engine2_engine_hrs_end} onChange={handleChange} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Add Log Entry' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EngineRunningLogForm;
