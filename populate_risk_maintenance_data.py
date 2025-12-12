import requests
import os
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8001')
API = f"{BACKEND_URL}/api"

# Admin credentials
EMAIL = "admin@test.com"
PASSWORD = "Admin123!"

def get_token():
    """Login and get authentication token"""
    response = requests.post(f"{API}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    return response.json()["access_token"]

def get_vessels(headers):
    """Get list of vessels"""
    response = requests.get(f"{API}/vessels", headers=headers)
    return response.json()

def create_risk_assessments(headers, vessels):
    """Create sample risk assessments"""
    print("\n📋 Creating Risk Assessments...")
    
    risk_assessments = [
        {
            "activity_task": "Mooring and Unmooring Operations",
            "location": "Port - Wharf Side",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "hazard": "Entanglement in mooring lines, slips and falls, crush injuries",
            "risk_description": "Crew working with heavy mooring lines under tension. Risk of line snap, entanglement, or falling overboard during operations.",
            "likelihood": "3",
            "consequence": "4",
            "risk_level": "High",
            "risk_rating": "12",
            "control_measures": "• Use proper PPE (gloves, safety shoes, high-vis vest)\n• Maintain clear snap-back zones\n• Use radio communication between deck and bridge\n• Conduct pre-operation safety briefing\n• Ensure adequate lighting for night operations\n• Regular inspection of mooring equipment",
            "residual_likelihood": "2",
            "residual_consequence": "3",
            "residual_risk_level": "Medium",
            "residual_risk_rating": "6",
            "responsible_person": "Master / Chief Officer",
            "review_date": (datetime.now() + timedelta(days=180)).isoformat(),
            "status": "Active",
            "notes": "High-risk activity requiring constant vigilance. All crew must be trained in mooring procedures."
        },
        {
            "activity_task": "Working at Heights - Mast and Rigging Inspection",
            "location": "On Deck / Mast Area",
            "vessel_id": vessels[1]["id"] if len(vessels) > 1 else "",
            "vessel_name": vessels[1]["vessel_name"] if len(vessels) > 1 else "MV Coral Queen",
            "hazard": "Falls from height, equipment failure, weather conditions",
            "risk_description": "Crew working aloft for inspection and maintenance of mast, rigging, and navigation equipment. Risk of falling from height.",
            "likelihood": "2",
            "consequence": "5",
            "risk_level": "High",
            "risk_rating": "10",
            "control_measures": "• Use certified fall arrest harness and double lanyards\n• Conduct pre-climb equipment inspection\n• Weather conditions must be favorable (wind <15 knots)\n• Spotter on deck at all times\n• Tool bags secured to prevent dropped objects\n• Emergency descent plan in place",
            "residual_likelihood": "1",
            "residual_consequence": "5",
            "residual_risk_level": "Medium",
            "residual_risk_rating": "5",
            "responsible_person": "Master",
            "review_date": (datetime.now() + timedelta(days=180)).isoformat(),
            "status": "Active",
            "notes": "Only qualified personnel with working at heights certification permitted."
        },
        {
            "activity_task": "Refueling Operations",
            "location": "Fuel Dock / Fuel Station",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "hazard": "Fire, explosion, fuel spill, environmental pollution",
            "risk_description": "Transfer of diesel fuel from shore facility to vessel tanks. Risk of spills, fire, or explosion due to fuel vapors.",
            "likelihood": "2",
            "consequence": "5",
            "risk_level": "High",
            "risk_rating": "10",
            "control_measures": "• No smoking policy enforced\n• Fire extinguishers positioned and ready\n• Spill kit on deck\n• Engine shut down during fueling\n• Constant monitoring of fuel transfer\n• Bonding cable connected\n• VHF radio on emergency channel\n• Crew briefed on emergency procedures",
            "residual_likelihood": "1",
            "residual_consequence": "4",
            "residual_risk_level": "Medium",
            "residual_risk_rating": "4",
            "responsible_person": "Chief Engineer",
            "review_date": (datetime.now() + timedelta(days=365)).isoformat(),
            "status": "Active",
            "notes": "Critical operation requiring full attention. All safety protocols must be followed without exception."
        },
        {
            "activity_task": "Passenger Embarkation and Disembarkation",
            "location": "Gangway / Boarding Area",
            "vessel_id": vessels[2]["id"] if len(vessels) > 2 else "",
            "vessel_name": vessels[2]["vessel_name"] if len(vessels) > 2 else "MV Whitsunday Spirit",
            "hazard": "Slips, trips and falls, falling overboard, crush injuries",
            "risk_description": "Passengers boarding and disembarking vessel via gangway. Risk of falls, especially for elderly or mobility-impaired passengers.",
            "likelihood": "3",
            "consequence": "3",
            "risk_level": "Medium",
            "risk_rating": "9",
            "control_measures": "• Non-slip surfaces on gangway\n• Handrails on both sides\n• Crew assistance available\n• Clear signage and instructions\n• Adequate lighting\n• Safety briefing before departure\n• Life jackets accessible\n• Supervision during boarding",
            "residual_likelihood": "2",
            "residual_consequence": "2",
            "residual_risk_level": "Low",
            "residual_risk_rating": "4",
            "responsible_person": "Deck Crew / Host",
            "review_date": (datetime.now() + timedelta(days=365)).isoformat(),
            "status": "Active",
            "notes": "Special attention required for passengers with mobility issues or young children."
        },
        {
            "activity_task": "Engine Room Operations and Maintenance",
            "location": "Engine Room",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "hazard": "Burns from hot surfaces, noise exposure, confined space, machinery hazards",
            "risk_description": "Working in engine room with hot machinery, high noise levels, and confined spaces. Risk of burns, hearing damage, and entrapment.",
            "likelihood": "3",
            "consequence": "3",
            "risk_level": "Medium",
            "risk_rating": "9",
            "control_measures": "• Mandatory hearing protection (ear plugs/muffs)\n• Heat-resistant gloves when touching hot surfaces\n• Proper ventilation maintained\n• Machinery guards in place\n• Two-person rule for confined space entry\n• Emergency communication system\n• Regular noise level monitoring",
            "residual_likelihood": "2",
            "residual_consequence": "2",
            "residual_risk_level": "Low",
            "residual_risk_rating": "4",
            "responsible_person": "Chief Engineer",
            "review_date": (datetime.now() + timedelta(days=180)).isoformat(),
            "status": "Active",
            "notes": "Engine room entry procedures must be followed. All personnel must be familiar with emergency shutdown procedures."
        },
        {
            "activity_task": "Anchor Handling",
            "location": "Foredeck / Anchor Windlass Area",
            "vessel_id": vessels[1]["id"] if len(vessels) > 1 else "",
            "vessel_name": vessels[1]["vessel_name"] if len(vessels) > 1 else "MV Coral Queen",
            "hazard": "Chain under tension, crush injuries, finger/hand injuries, slips",
            "risk_description": "Operating anchor windlass and handling anchor chain. Heavy equipment under high tension with risk of serious injury.",
            "likelihood": "2",
            "consequence": "4",
            "risk_level": "High",
            "risk_rating": "8",
            "control_measures": "• Keep clear of chain and windlass when in operation\n• Use remote control from safe distance\n• Wear steel-toed boots and gloves\n• Clear communication with bridge\n• Emergency stop readily accessible\n• Area cordoned off during operations\n• Pre-operation inspection of windlass",
            "residual_likelihood": "1",
            "residual_consequence": "4",
            "residual_risk_level": "Medium",
            "residual_risk_rating": "4",
            "responsible_person": "Chief Officer / Bosun",
            "review_date": (datetime.now() + timedelta(days=180)).isoformat(),
            "status": "Active",
            "notes": "High consequence activity. Never work alone. Maintain constant communication with bridge."
        },
        {
            "activity_task": "Working with Chemicals - Cleaning and Maintenance",
            "location": "Various - Deck, Accommodation, Engine Room",
            "vessel_id": vessels[2]["id"] if len(vessels) > 2 else "",
            "vessel_name": vessels[2]["vessel_name"] if len(vessels) > 2 else "MV Whitsunday Spirit",
            "hazard": "Chemical exposure, skin/eye irritation, inhalation hazards",
            "risk_description": "Use of cleaning chemicals, degreasers, and maintenance products. Risk of chemical burns, respiratory irritation, or allergic reactions.",
            "likelihood": "2",
            "consequence": "3",
            "risk_level": "Medium",
            "risk_rating": "6",
            "control_measures": "• Safety Data Sheets (SDS) available and reviewed\n• Appropriate PPE (gloves, goggles, respirator if needed)\n• Adequate ventilation during use\n• Chemicals properly labeled and stored\n• Spill kit available\n• Emergency eyewash accessible\n• Never mix chemicals\n• Proper disposal procedures",
            "residual_likelihood": "1",
            "residual_consequence": "2",
            "residual_risk_level": "Low",
            "residual_risk_rating": "2",
            "responsible_person": "Chief Officer / Chief Engineer",
            "review_date": (datetime.now() + timedelta(days=365)).isoformat(),
            "status": "Active",
            "notes": "Training required before handling chemicals. Keep SDS readily accessible."
        },
        {
            "activity_task": "Navigation in Restricted Waters",
            "location": "Bridge / Navigation Area",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "hazard": "Collision, grounding, navigation error, equipment failure",
            "risk_description": "Operating vessel in channels, ports, and restricted waterways with increased traffic and limited maneuvering space.",
            "likelihood": "2",
            "consequence": "5",
            "risk_level": "High",
            "risk_rating": "10",
            "control_measures": "• Proper passage planning\n• All navigation equipment operational and checked\n• Additional lookout posted\n• Reduced speed appropriate to conditions\n• Bridge team fully briefed\n• VHF monitoring port operations channel\n• Electronic chart system with alarms active\n• Master on bridge during critical phases",
            "residual_likelihood": "1",
            "residual_consequence": "4",
            "residual_risk_level": "Medium",
            "residual_risk_rating": "4",
            "responsible_person": "Master",
            "review_date": (datetime.now() + timedelta(days=180)).isoformat(),
            "status": "Active",
            "notes": "Master must be on bridge. Passage plan reviewed before departure."
        }
    ]
    
    created = 0
    for assessment in risk_assessments:
        try:
            response = requests.post(f"{API}/risk-assessments", json=assessment, headers=headers)
            if response.status_code == 200:
                print(f"✅ Created risk assessment: {assessment['activity_task']}")
                created += 1
            else:
                print(f"❌ Failed to create: {assessment['activity_task']} - {response.text}")
        except Exception as e:
            print(f"❌ Error creating {assessment['activity_task']}: {str(e)}")
    
    print(f"✅ Created {created} risk assessments")
    return created

def create_maintenance_records(headers, vessels):
    """Create sample maintenance records"""
    print("\n🔧 Creating Maintenance Records...")
    
    maintenance_records = [
        {
            "title": "Main Engine 500-Hour Service - Port Side",
            "equipment_system": "Main Engine",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "maintenance_type": "Preventive",
            "description": "500-hour service: Oil and filter change, fuel filter replacement, cooling system inspection, belt tension check. Engine oils: 15W-40 marine grade. Oil filters: Part #MF-334",
            "scheduled_date": (datetime.now() + timedelta(days=15)).isoformat(),
            "priority": "Medium",
            "status": "Scheduled",
            "labor_hours": 4.0,
            "responsible_person": "Chief Engineer",
            "service_frequency": "Every 500 hours",
            "cost": 450.00,
            "parts_used": "Engine oil (20L), Oil filter, Fuel filter"
        },
        {
            "title": "Main Engine 500-Hour Service - Starboard Side",
            "equipment_system": "Main Engine",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "maintenance_type": "Preventive",
            "description": "500-hour service: Oil and filter change, fuel filter replacement, cooling system inspection, belt tension check. Coordinate with port side engine service. Same parts required.",
            "scheduled_date": (datetime.now() + timedelta(days=16)).isoformat(),
            "priority": "Medium",
            "status": "Scheduled",
            "labor_hours": 4.0,
            "responsible_person": "Chief Engineer",
            "service_frequency": "Every 500 hours",
            "cost": 450.00,
            "parts_used": "Engine oil (20L), Oil filter, Fuel filter"
        },
        {
            "title": "Navigation Radar Annual Inspection",
            "equipment_system": "Navigation Equipment",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "maintenance_type": "Inspection",
            "description": "Annual inspection and calibration of navigation radar. Check antenna rotation, signal strength, and display accuracy. External technician required. Book appointment with approved service provider.",
            "scheduled_date": (datetime.now() + timedelta(days=45)).isoformat(),
            "priority": "High",
            "status": "Scheduled",
            "labor_hours": 3.0,
            "responsible_person": "Master",
            "service_frequency": "Annually",
            "cost": 350.00
        },
        {
            "title": "Life Raft Service and Recertification - OVERDUE",
            "equipment_system": "Safety Equipment",
            "vessel_id": vessels[1]["id"] if len(vessels) > 1 else "",
            "vessel_name": vessels[1]["vessel_name"] if len(vessels) > 1 else "MV Coral Queen",
            "maintenance_type": "Inspection",
            "description": "Annual life raft service and recertification. Send to approved service station. URGENT: Certificate expires in 10 days. Arrange transport to service station immediately.",
            "scheduled_date": (datetime.now() - timedelta(days=5)).isoformat(),
            "next_service_date": (datetime.now() + timedelta(days=365)).isoformat(),
            "priority": "Critical",
            "status": "Overdue",
            "labor_hours": 1.0,
            "responsible_person": "Chief Officer",
            "service_frequency": "Annually",
            "cost": 550.00
        },
        {
            "title": "Fire Extinguisher 6-Month Inspection",
            "equipment_system": "Safety Equipment",
            "vessel_id": vessels[1]["id"] if len(vessels) > 1 else "",
            "vessel_name": vessels[1]["vessel_name"] if len(vessels) > 1 else "MV Coral Queen",
            "maintenance_type": "Inspection",
            "description": "6-month inspection of all 12 fire extinguishers. Check pressure, condition, accessibility, and signage. Replace any with pressure in yellow zone. Update inspection tags.",
            "scheduled_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "High",
            "status": "Scheduled",
            "labor_hours": 2.0,
            "responsible_person": "Chief Officer",
            "service_frequency": "Every 6 months",
            "cost": 120.00
        },
        {
            "title": "AC System Repair - Passenger Cabin",
            "equipment_system": "HVAC",
            "vessel_id": vessels[2]["id"] if len(vessels) > 2 else "",
            "vessel_name": vessels[2]["vessel_name"] if len(vessels) > 2 else "MV Whitsunday Spirit",
            "maintenance_type": "Corrective",
            "description": "Passenger cabin AC not cooling adequately. Check refrigerant levels, clean filters, inspect compressor. Customer complaints received. Priority repair before next charter. May need refrigerant top-up.",
            "scheduled_date": (datetime.now() + timedelta(days=2)).isoformat(),
            "priority": "High",
            "status": "Scheduled",
            "labor_hours": 3.0,
            "responsible_person": "Chief Engineer",
            "cost": 280.00,
            "parts_used": "AC filters, Refrigerant R134a"
        },
        {
            "title": "Annual Hull Antifouling and Painting",
            "equipment_system": "Hull",
            "vessel_id": vessels[2]["id"] if len(vessels) > 2 else "",
            "vessel_name": vessels[2]["vessel_name"] if len(vessels) > 2 else "MV Whitsunday Spirit",
            "maintenance_type": "Preventive",
            "description": "Annual hull cleaning and antifouling paint application. Haul out required. Book slipway in advance. Vessel out of service for 3 days. Coordinate with charter schedule.",
            "scheduled_date": (datetime.now() + timedelta(days=90)).isoformat(),
            "priority": "Medium",
            "status": "Planned",
            "labor_hours": 24.0,
            "responsible_person": "Master",
            "service_frequency": "Annually",
            "cost": 5500.00,
            "parts_used": "Antifoul paint, Hull cleaner, Sandpaper, Rollers"
        },
        {
            "title": "Fresh Water Maker Quarterly Service",
            "equipment_system": "Water Systems",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "maintenance_type": "Preventive",
            "description": "Quarterly service: Replace pre-filters, clean membranes, check pressure pumps, test water quality. Stock: Pre-filters (Part #WF-220), membrane cleaner solution. Test TDS levels after service.",
            "scheduled_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "priority": "Medium",
            "status": "Scheduled",
            "labor_hours": 3.0,
            "responsible_person": "Chief Engineer",
            "service_frequency": "Quarterly",
            "cost": 220.00,
            "parts_used": "Pre-filters (WF-220), Membrane cleaner"
        },
        {
            "title": "Anchor Windlass Repair - Grinding Noise",
            "equipment_system": "Deck Machinery",
            "vessel_id": vessels[1]["id"] if len(vessels) > 1 else "",
            "vessel_name": vessels[1]["vessel_name"] if len(vessels) > 1 else "MV Coral Queen",
            "maintenance_type": "Corrective",
            "description": "Windlass making unusual grinding noise. Inspect gearbox, check oil levels, examine clutch mechanism. Started investigation. May need gearbox oil change or clutch adjustment. Monitor during operation.",
            "scheduled_date": datetime.now().isoformat(),
            "priority": "High",
            "status": "In Progress",
            "labor_hours": 4.0,
            "responsible_person": "Chief Engineer",
            "cost": 380.00,
            "parts_used": "Gearbox oil"
        },
        {
            "title": "VHF Radio Annual Inspection and Certification",
            "equipment_system": "Communication Equipment",
            "vessel_id": vessels[0]["id"] if vessels else "",
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "maintenance_type": "Inspection",
            "description": "Annual VHF radio inspection and certification by licensed technician. Required for certificate renewal. Book approved marine electronics technician.",
            "scheduled_date": (datetime.now() + timedelta(days=60)).isoformat(),
            "priority": "High",
            "status": "Scheduled",
            "labor_hours": 2.0,
            "responsible_person": "Master",
            "service_frequency": "Annually",
            "cost": 275.00
        },
        {
            "title": "Teak Deck Refinishing - Foredeck",
            "equipment_system": "Deck",
            "vessel_id": vessels[2]["id"] if len(vessels) > 2 else "",
            "vessel_name": vessels[2]["vessel_name"] if len(vessels) > 2 else "MV Whitsunday Spirit",
            "maintenance_type": "Preventive",
            "description": "Sand and revarnish teak deck sections. Inspect for rot or damage, replace boards if necessary. Schedule during dry season. Vessel out of service for 2 days. Order marine varnish.",
            "scheduled_date": (datetime.now() + timedelta(days=120)).isoformat(),
            "priority": "Low",
            "status": "Planned",
            "labor_hours": 16.0,
            "responsible_person": "Bosun",
            "service_frequency": "Every 2 years",
            "cost": 1200.00,
            "parts_used": "Marine varnish, Sandpaper, Teak oil"
        },
        {
            "title": "Bilge Pump Quarterly Test",
            "equipment_system": "Bilge Systems",
            "vessel_id": vessels[1]["id"] if len(vessels) > 1 else "",
            "vessel_name": vessels[1]["vessel_name"] if len(vessels) > 1 else "MV Coral Queen",
            "maintenance_type": "Inspection",
            "description": "Quarterly test of all bilge pumps. Test automatic float switches, check discharge capacity, clean strainers. Critical safety system. Test both manual and automatic operation. Record pump capacity.",
            "scheduled_date": (datetime.now() + timedelta(days=10)).isoformat(),
            "priority": "High",
            "status": "Scheduled",
            "labor_hours": 2.0,
            "responsible_person": "Chief Engineer",
            "service_frequency": "Quarterly",
            "cost": 85.00
        }
    ]
    
    created = 0
    for record in maintenance_records:
        try:
            response = requests.post(f"{API}/maintenance", json=record, headers=headers)
            if response.status_code == 200:
                print(f"✅ Created maintenance: {record['title']} - {record['vessel_name']}")
                created += 1
            else:
                print(f"❌ Failed to create: {record['title']} - {response.text}")
        except Exception as e:
            print(f"❌ Error creating {record['title']}: {str(e)}")
    
    print(f"✅ Created {created} maintenance records")
    return created

def main():
    print("=" * 70)
    print("POPULATING RISK ASSESSMENT & MAINTENANCE DATA")
    print("=" * 70)
    
    try:
        print("\n🔐 Authenticating...")
        token = get_token()
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Authentication successful")
        
        print("\n📋 Fetching vessels...")
        vessels = get_vessels(headers)
        print(f"✅ Found {len(vessels)} vessels")
        
        # Create data
        risk_count = create_risk_assessments(headers, vessels)
        maintenance_count = create_maintenance_records(headers, vessels)
        
        print("\n" + "=" * 70)
        print("✅ DATA POPULATION COMPLETE!")
        print("=" * 70)
        print(f"\nSummary:")
        print(f"  - {risk_count} Risk Assessments")
        print(f"  - {maintenance_count} Maintenance Records")
        print(f"\n🎉 Ready to view in the application!")
        print(f"   Login: {EMAIL}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
