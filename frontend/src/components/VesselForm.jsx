import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Shield, Calendar, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

const VesselForm = ({ open, onClose, onSave, vessel, mode = 'create' }) => {
  const [vesselCertificates, setVesselCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [formData, setFormData] = useState({
    // Tab 1: Basic Details
    vessel_name: '',
    registration_number: '',
    vessel_type: '',
    owner_name: '',
    owner_contact: '',
    boat_phone: '',
    flag: '',
    port_of_registry: '',
    imo_number: '',
    mmsi_number: '',
    call_sign: '',
    ais_class: '',
    home_port: '',
    
    // Tab 2: Specifications
    length_overall: '',
    length_at_waterline: '',
    beam: '',
    draft: '',
    air_draft: '',
    ce_category: '',
    gross_tonnage: '',
    construction_material: '',
    year_built: '',
    builder: '',
    number_of_engines: '',
    engine_type: '',
    engine_power: '',
    propeller_type: '',
    propeller_material: '',
    fuel_type: '',
    fuel_capacity: '',
    inside_equipment: '',
    outside_equipment: '',
    water_capacity: '',
    max_passengers: '',
    max_crew: '',
    
    // Tab 3: Equipment
    navigation_equipment: '',
    communication_equipment: '',
    safety_equipment: '',
    
    // Tab 4: Safety Equipment
    life_rafts: '',
    life_jackets: '',
    epirb: false,
    fire_extinguishers: '',
    flares: '',
    
    // Tab 5: Certificate Record - Statutory
    cert_survey_issue: '',
    cert_survey_expiry: '',
    cert_operation_issue: '',
    cert_operation_expiry: '',
    cert_loadline_issue: '',
    cert_loadline_expiry: '',
    
    // Operational Documentation
    stability_book_date: '',
    stability_book_expiry: '',
    safety_mgmt_date: '',
    safety_mgmt_expiry: '',
    
    // Third Party Certificates
    cert_classification_issue: '',
    cert_classification_expiry: '',
    cert_lifting_gear_issue: '',
    cert_lifting_gear_expiry: '',
    cert_life_raft_issue: '',
    cert_life_raft_expiry: '',
    cert_epirb_issue: '',
    cert_epirb_expiry: '',
    cert_fire_extinguisher_issue: '',
    cert_fire_extinguisher_expiry: '',
    cert_lifejacket_issue: '',
    cert_lifejacket_expiry: '',
    cert_gas_issue: '',
    cert_gas_expiry: '',
    cert_electrical_issue: '',
    cert_electrical_expiry: '',
    cert_compass_issue: '',
    cert_compass_expiry: '',
    cert_eiapp_issue: '',
    cert_eiapp_expiry: '',
    cert_other_issue: '',
    cert_other_expiry: '',
    
    // Tab 6: Photo
    vessel_photo_url: ''
  });

  // Fetch compliance certificates for this vessel
  useEffect(() => {
    const fetchVesselCertificates = async () => {
      if (vessel && vessel.id && mode === 'edit') {
        setLoadingCertificates(true);
        try {
          const API = process.env.REACT_APP_BACKEND_URL;
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API}/api/compliance/certificates`, {
            params: { vessel_id: vessel.id },
            headers: { Authorization: `Bearer ${token}` }
          });
          setVesselCertificates(response.data || []);
        } catch (err) {
          console.error('Error fetching vessel certificates:', err);
          setVesselCertificates([]);
        } finally {
          setLoadingCertificates(false);
        }
      } else {
        setVesselCertificates([]);
      }
    };

    fetchVesselCertificates();
  }, [vessel, mode]);

  useEffect(() => {
    if (vessel && mode === 'edit') {
      setFormData({ ...vessel });
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        vessel_name: '',
        registration_number: '',
        vessel_type: '',
        owner_name: '',
        owner_contact: '',
        boat_phone: '',
        flag: '',
        port_of_registry: '',
        imo_number: '',
        mmsi_number: '',
        call_sign: '',
        ais_class: '',
        home_port: '',
        length_overall: '',
        length_at_waterline: '',
        beam: '',
        draft: '',
        air_draft: '',
        ce_category: '',
        gross_tonnage: '',
        construction_material: '',
        year_built: '',
        builder: '',
        number_of_engines: '',
        engine_type: '',
        engine_power: '',
        propeller_type: '',
        propeller_material: '',
        fuel_type: '',
        fuel_capacity: '',
        inside_equipment: '',
        outside_equipment: '',
        water_capacity: '',
        max_passengers: '',
        max_crew: '',
        navigation_equipment: '',
        communication_equipment: '',
        safety_equipment: '',
        life_rafts: '',
        life_jackets: '',
        epirb: false,
        fire_extinguishers: '',
        flares: '',
        cert_survey_issue: '',
        cert_survey_expiry: '',
        cert_operation_issue: '',
        cert_operation_expiry: '',
        cert_loadline_issue: '',
        cert_loadline_expiry: '',
        stability_book_date: '',
        stability_book_expiry: '',
        safety_mgmt_date: '',
        safety_mgmt_expiry: '',
        cert_classification_issue: '',
        cert_classification_expiry: '',
        cert_lifting_gear_issue: '',
        cert_lifting_gear_expiry: '',
        cert_life_raft_issue: '',
        cert_life_raft_expiry: '',
        cert_epirb_issue: '',
        cert_epirb_expiry: '',
        cert_fire_extinguisher_issue: '',
        cert_fire_extinguisher_expiry: '',
        cert_lifejacket_issue: '',
        cert_lifejacket_expiry: '',
        cert_gas_issue: '',
        cert_gas_expiry: '',
        cert_electrical_issue: '',
        cert_electrical_expiry: '',
        cert_compass_issue: '',
        cert_compass_expiry: '',
        cert_eiapp_issue: '',
        cert_eiapp_expiry: '',
        cert_other_issue: '',
        cert_other_expiry: '',
        
        // Tab 6: Photo
        vessel_photo_url: ''
      });
    }
  }, [vessel, mode, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Vessel' : 'Edit Vessel'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Enter vessel details across all tabs' : 'Update vessel information'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="specs">Specs & Safety</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="photo">Photo</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] w-full pr-4">
            {/* TAB 1: BASIC DETAILS */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vessel_name">Vessel Name *</Label>
                  <Input
                    id="vessel_name"
                    value={formData.vessel_name}
                    onChange={(e) => handleChange('vessel_name', e.target.value)}
                    placeholder="Enter vessel name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => handleChange('registration_number', e.target.value)}
                    placeholder="e.g., ABC123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vessel_type">Vessel Type</Label>
                  <Input
                    id="vessel_type"
                    value={formData.vessel_type}
                    onChange={(e) => handleChange('vessel_type', e.target.value)}
                    placeholder="e.g., Passenger, Cargo, Fishing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => handleChange('owner_name', e.target.value)}
                    placeholder="Vessel owner"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="owner_contact">Owner Contact</Label>
                  <Input
                    id="owner_contact"
                    value={formData.owner_contact}
                    onChange={(e) => handleChange('owner_contact', e.target.value)}
                    placeholder="Phone, email, address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boat_phone">Boat Phone Number</Label>
                  <Input
                    id="boat_phone"
                    value={formData.boat_phone}
                    onChange={(e) => handleChange('boat_phone', e.target.value)}
                    placeholder="e.g., +61 xxx xxx xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flag">Flag</Label>
                  <Input
                    id="flag"
                    value={formData.flag}
                    onChange={(e) => handleChange('flag', e.target.value)}
                    placeholder="e.g., Australia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port_of_registry">Port of Registry</Label>
                  <Input
                    id="port_of_registry"
                    value={formData.port_of_registry}
                    onChange={(e) => handleChange('port_of_registry', e.target.value)}
                    placeholder="e.g., Sydney"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="home_port">Home Port</Label>
                  <Input
                    id="home_port"
                    value={formData.home_port}
                    onChange={(e) => handleChange('home_port', e.target.value)}
                    placeholder="e.g., Cairns"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imo_number">IMO Number</Label>
                  <Input
                    id="imo_number"
                    value={formData.imo_number}
                    onChange={(e) => handleChange('imo_number', e.target.value)}
                    placeholder="e.g., IMO9876543"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mmsi_number">MMSI Number</Label>
                  <Input
                    id="mmsi_number"
                    value={formData.mmsi_number}
                    onChange={(e) => handleChange('mmsi_number', e.target.value)}
                    placeholder="e.g., 503123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call_sign">Call Sign</Label>
                  <Input
                    id="call_sign"
                    value={formData.call_sign}
                    onChange={(e) => handleChange('call_sign', e.target.value)}
                    placeholder="e.g., VKPE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ais_class">AIS Class</Label>
                  <select
                    id="ais_class"
                    value={formData.ais_class}
                    onChange={(e) => handleChange('ais_class', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select AIS Class</option>
                    <option value="A">Class A</option>
                    <option value="B">Class B</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: SPECIFICATIONS & SAFETY */}
            <TabsContent value="specs" className="space-y-6">
              {/* Specifications Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Specifications</h3>
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ce_category">CE Category</Label>
                  <Input
                    id="ce_category"
                    value={formData.ce_category}
                    onChange={(e) => handleChange('ce_category', e.target.value)}
                    placeholder="e.g., A, B, C, D"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gross_tonnage">Gross Tonnage</Label>
                  <Input
                    id="gross_tonnage"
                    type="number"
                    step="0.01"
                    value={formData.gross_tonnage}
                    onChange={(e) => handleChange('gross_tonnage', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length_overall">Length Overall (m)</Label>
                  <Input
                    id="length_overall"
                    type="number"
                    step="0.01"
                    value={formData.length_overall}
                    onChange={(e) => handleChange('length_overall', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length_at_waterline">Length at Waterline (m)</Label>
                  <Input
                    id="length_at_waterline"
                    type="number"
                    step="0.01"
                    value={formData.length_at_waterline}
                    onChange={(e) => handleChange('length_at_waterline', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beam">Beam (m)</Label>
                  <Input
                    id="beam"
                    type="number"
                    step="0.01"
                    value={formData.beam}
                    onChange={(e) => handleChange('beam', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draft">Draft (m)</Label>
                  <Input
                    id="draft"
                    type="number"
                    step="0.01"
                    value={formData.draft}
                    onChange={(e) => handleChange('draft', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="air_draft">Air Draft (m)</Label>
                  <Input
                    id="air_draft"
                    type="number"
                    step="0.01"
                    value={formData.air_draft}
                    onChange={(e) => handleChange('air_draft', e.target.value)}
                    placeholder="Height above waterline"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="construction_material">Construction Material</Label>
                  <Input
                    id="construction_material"
                    value={formData.construction_material}
                    onChange={(e) => handleChange('construction_material', e.target.value)}
                    placeholder="e.g., Steel, Aluminum, Fiberglass"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_built">Year Built</Label>
                  <Input
                    id="year_built"
                    type="number"
                    value={formData.year_built}
                    onChange={(e) => handleChange('year_built', e.target.value)}
                    placeholder="YYYY"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="builder">Builder</Label>
                  <Input
                    id="builder"
                    value={formData.builder}
                    onChange={(e) => handleChange('builder', e.target.value)}
                    placeholder="Shipyard or manufacturer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_engines">Number of Engines</Label>
                  <Input
                    id="number_of_engines"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.number_of_engines}
                    onChange={(e) => handleChange('number_of_engines', e.target.value)}
                    placeholder="e.g., 1, 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engine_type">Engine Type</Label>
                  <Input
                    id="engine_type"
                    value={formData.engine_type}
                    onChange={(e) => handleChange('engine_type', e.target.value)}
                    placeholder="e.g., Diesel, Petrol, Electric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engine_power">Engine Power</Label>
                  <Input
                    id="engine_power"
                    value={formData.engine_power}
                    onChange={(e) => handleChange('engine_power', e.target.value)}
                    placeholder="e.g., 500 HP, 350 kW"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propeller_type">Propeller Type</Label>
                  <Input
                    id="propeller_type"
                    value={formData.propeller_type}
                    onChange={(e) => handleChange('propeller_type', e.target.value)}
                    placeholder="e.g., Fixed, Variable Pitch"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propeller_material">Propeller Material</Label>
                  <Input
                    id="propeller_material"
                    value={formData.propeller_material}
                    onChange={(e) => handleChange('propeller_material', e.target.value)}
                    placeholder="e.g., Bronze, Stainless Steel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Fuel Type</Label>
                  <Input
                    id="fuel_type"
                    value={formData.fuel_type}
                    onChange={(e) => handleChange('fuel_type', e.target.value)}
                    placeholder="e.g., Diesel, Petrol"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel_capacity">Fuel Capacity (L)</Label>
                  <Input
                    id="fuel_capacity"
                    type="number"
                    step="0.1"
                    value={formData.fuel_capacity}
                    onChange={(e) => handleChange('fuel_capacity', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="water_capacity">Water Capacity (L)</Label>
                  <Input
                    id="water_capacity"
                    type="number"
                    step="0.1"
                    value={formData.water_capacity}
                    onChange={(e) => handleChange('water_capacity', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_passengers">Max Passengers</Label>
                  <Input
                    id="max_passengers"
                    type="number"
                    value={formData.max_passengers}
                    onChange={(e) => handleChange('max_passengers', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_crew">Max Crew</Label>
                  <Input
                    id="max_crew"
                    type="number"
                    value={formData.max_crew}
                    onChange={(e) => handleChange('max_crew', e.target.value)}
                  />
                </div>
                </div>
              </div>

              {/* Safety Equipment Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Safety Equipment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="life_rafts">Life Rafts (Quantity)</Label>
                    <Input
                      id="life_rafts"
                      type="number"
                      value={formData.life_rafts}
                      onChange={(e) => handleChange('life_rafts', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="life_jackets">Life Jackets (Quantity)</Label>
                    <Input
                      id="life_jackets"
                      type="number"
                      value={formData.life_jackets}
                      onChange={(e) => handleChange('life_jackets', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fire_extinguishers">Fire Extinguishers (Quantity)</Label>
                    <Input
                      id="fire_extinguishers"
                      type="number"
                      value={formData.fire_extinguishers}
                      onChange={(e) => handleChange('fire_extinguishers', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flares">Flares (Quantity)</Label>
                    <Input
                      id="flares"
                      type="number"
                      value={formData.flares}
                      onChange={(e) => handleChange('flares', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="epirb"
                        checked={formData.epirb}
                        onCheckedChange={(checked) => handleChange('epirb', checked)}
                      />
                      <Label htmlFor="epirb">EPIRB (Emergency Position Indicating Radio Beacon)</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: EQUIPMENT */}
            <TabsContent value="equipment" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="navigation_equipment">Navigation Equipment</Label>
                  <Textarea
                    id="navigation_equipment"
                    value={formData.navigation_equipment}
                    onChange={(e) => handleChange('navigation_equipment', e.target.value)}
                    placeholder="GPS, radar, compass, charts, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="communication_equipment">Communication Equipment</Label>
                  <Textarea
                    id="communication_equipment"
                    value={formData.communication_equipment}
                    onChange={(e) => handleChange('communication_equipment', e.target.value)}
                    placeholder="VHF radio, satellite phone, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="safety_equipment">Safety Equipment</Label>
                  <Textarea
                    id="safety_equipment"
                    value={formData.safety_equipment}
                    onChange={(e) => handleChange('safety_equipment', e.target.value)}
                    placeholder="First aid kits, distress signals, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inside_equipment">Inside Equipment</Label>
                  <Textarea
                    id="inside_equipment"
                    value={formData.inside_equipment}
                    onChange={(e) => handleChange('inside_equipment', e.target.value)}
                    placeholder="Interior equipment and fixtures"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outside_equipment">Outside Equipment</Label>
                  <Textarea
                    id="outside_equipment"
                    value={formData.outside_equipment}
                    onChange={(e) => handleChange('outside_equipment', e.target.value)}
                    placeholder="Exterior equipment and fixtures"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: SAFETY EQUIPMENT */}
            <TabsContent value="safety" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="life_rafts">Life Rafts (Quantity)</Label>
                  <Input
                    id="life_rafts"
                    type="number"
                    value={formData.life_rafts}
                    onChange={(e) => handleChange('life_rafts', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="life_jackets">Life Jackets (Quantity)</Label>
                  <Input
                    id="life_jackets"
                    type="number"
                    value={formData.life_jackets}
                    onChange={(e) => handleChange('life_jackets', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fire_extinguishers">Fire Extinguishers (Quantity)</Label>
                  <Input
                    id="fire_extinguishers"
                    type="number"
                    value={formData.fire_extinguishers}
                    onChange={(e) => handleChange('fire_extinguishers', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flares">Flares (Quantity)</Label>
                  <Input
                    id="flares"
                    type="number"
                    value={formData.flares}
                    onChange={(e) => handleChange('flares', e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="epirb"
                      checked={formData.epirb}
                      onCheckedChange={(checked) => handleChange('epirb', checked)}
                    />
                    <Label htmlFor="epirb" className="cursor-pointer">EPIRB Installed</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: COMPLIANCE CERTIFICATES */}
            <TabsContent value="certificates" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Compliance Certificates</h3>
                  <p className="text-sm text-gray-500">
                    {mode === 'create' 
                      ? 'Save the vessel first to manage certificates' 
                      : `Certificates linked to ${formData.vessel_name || 'this vessel'}`}
                  </p>
                </div>
                {mode === 'edit' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to Compliance module with vessel filter
                      window.location.href = `/compliance?vessel=${vessel.id}`;
                    }}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage in Compliance
                  </Button>
                )}
              </div>

              {mode === 'create' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Certificates Yet</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Save this vessel first, then you can add and manage compliance certificates from the Compliance module.
                  </p>
                </div>
              ) : loadingCertificates ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading certificates...</div>
                </div>
              ) : vesselCertificates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                  <FileText className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Certificates Found</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-md">
                    This vessel doesn't have any compliance certificates registered yet. Add certificates from the Compliance module.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      window.location.href = `/compliance?vessel=${vessel.id}`;
                    }}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Add Certificate
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {vesselCertificates.map((cert) => {
                    const getStatusIcon = () => {
                      switch (cert.status) {
                        case 'Valid': return <CheckCircle className="h-5 w-5 text-green-600" />;
                        case 'Expiring Soon': return <Clock className="h-5 w-5 text-yellow-600" />;
                        case 'Expired': return <AlertTriangle className="h-5 w-5 text-red-600" />;
                        default: return <FileText className="h-5 w-5 text-gray-400" />;
                      }
                    };

                    const getStatusBadge = () => {
                      const variants = {
                        'Valid': 'default',
                        'Expiring Soon': 'secondary',
                        'Expired': 'destructive'
                      };
                      return (
                        <Badge variant={variants[cert.status] || 'outline'} className="text-xs">
                          {cert.status}
                        </Badge>
                      );
                    };

                    const formatDate = (dateStr) => {
                      if (!dateStr) return '-';
                      try {
                        return new Date(dateStr).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });
                      } catch {
                        return '-';
                      }
                    };

                    return (
                      <div
                        key={cert.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon()}
                        </div>

                        {/* Certificate Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">
                              {cert.certificate_name}
                            </h4>
                            {getStatusBadge()}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                            <div>
                              <span className="font-medium">Type:</span> {cert.certificate_type}
                            </div>
                            {cert.certificate_number && (
                              <div>
                                <span className="font-medium">Number:</span> {cert.certificate_number}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Authority:</span> {cert.issuing_authority}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">Issue:</span> {formatDate(cert.issue_date)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">Expiry:</span> {formatDate(cert.expiry_date)}
                            </div>
                          </div>

                          {cert.notes && (
                            <p className="text-sm text-gray-500 mt-2 italic">
                              {cert.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="pt-2 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/compliance?vessel=${vessel.id}`;
                      }}
                    >
                      View All in Compliance Module
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 6: PHOTO */}
            <TabsContent value="photo" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vessel_photo_url">Vessel Photo URL</Label>
                  <Input
                    id="vessel_photo_url"
                    value={formData.vessel_photo_url}
                    onChange={(e) => handleChange('vessel_photo_url', e.target.value)}
                    placeholder="Enter photo URL or upload path"
                  />
                </div>
                {formData.vessel_photo_url && (
                  <div className="space-y-2">
                    <Label>Photo Preview</Label>
                    <div className="border rounded-lg p-4">
                      <img 
                        src={formData.vessel_photo_url} 
                        alt="Vessel" 
                        className="max-w-full h-auto max-h-64 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="text-muted-foreground text-sm hidden">
                        Unable to load image from the provided URL
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Create Vessel' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VesselForm;
