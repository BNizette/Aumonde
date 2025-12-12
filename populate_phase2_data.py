#!/usr/bin/env python3
"""
Populate AMSA Phase 2 modules with sample data
Incidents, Emergency Response, Compliance, AI Assistant
"""
import requests
import json
from datetime import datetime, timedelta

BACKEND_URL = "http://localhost:8001/api"

# Login to get token
def get_token():
    response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin123!"
    })
    return response.json()["access_token"]

def create_incidents(token):
    """Create sample incidents"""
    headers = {"Authorization": f"Bearer {token}"}
    
    incidents = [
        {
            "incident_type": "Near Miss",
            "severity": "Minor",
            "title": "Slip on wet deck",
            "description": "Crew member nearly slipped on wet deck during morning operations. No injury occurred but could have been serious.",
            "incident_date": (datetime.now() - timedelta(days=5)).isoformat(),
            "location": "Main Deck - Port Side",
            "vessel_id": "",
            "vessel_name": "MV Pacific Explorer",
            "injuries": False,
            "witnesses": "Captain John Masters, First Mate Sarah Thompson",
            "immediate_actions": "Area cordoned off, non-slip mats installed, crew briefed on wet deck procedures",
            "investigation_status": "Completed",
            "root_cause": "Inadequate drainage in that section of deck, morning dew accumulation",
            "corrective_actions": "Installed additional drainage, improved anti-slip surface treatment",
            "preventive_actions": "Morning deck inspection checklist updated, crew training on wet weather procedures",
            "responsible_person": "Chief Officer",
            "target_completion_date": (datetime.now() - timedelta(days=1)).isoformat()
        },
        {
            "incident_type": "Equipment Failure",
            "severity": "Moderate",
            "title": "Engine cooling system malfunction",
            "description": "Starboard engine cooling system failed during transit, causing temperature spike. Engine was shut down immediately to prevent damage.",
            "incident_date": (datetime.now() - timedelta(days=12)).isoformat(),
            "location": "Engine Room - Starboard Engine",
            "vessel_id": "",
            "vessel_name": "MV Pacific Explorer",
            "injuries": False,
            "witnesses": "Chief Engineer David Chen, Second Engineer Michael Roberts",
            "immediate_actions": "Engine shut down, auxiliary cooling activated, vessel proceeded on port engine",
            "investigation_status": "Under Investigation",
            "root_cause": "Coolant pump impeller failure due to wear",
            "corrective_actions": "Replaced coolant pump and impeller, full system flush performed",
            "preventive_actions": "Increased coolant pump inspection frequency, added to preventive maintenance schedule",
            "responsible_person": "Chief Engineer",
            "target_completion_date": (datetime.now() + timedelta(days=3)).isoformat()
        },
        {
            "incident_type": "Injury",
            "severity": "Serious",
            "title": "Hand injury during mooring operations",
            "description": "Deckhand sustained hand injury when mooring line slipped. Fingers caught between line and bollard.",
            "incident_date": (datetime.now() - timedelta(days=20)).isoformat(),
            "location": "Forward Mooring Station",
            "vessel_id": "",
            "vessel_name": "MV Whitsunday Spirit",
            "injuries": True,
            "injury_details": "Laceration and contusion to right hand, two fingers. Required medical attention, 5 stitches. Expected recovery: 2-3 weeks.",
            "witnesses": "Bosun, Second Mate",
            "immediate_actions": "First aid administered, injured crew member evacuated to shore medical facility, operations temporarily suspended",
            "investigation_status": "Completed",
            "root_cause": "Insufficient crew on mooring station, fatigue factor (end of long shift), inadequate glove protection",
            "corrective_actions": "Minimum 3 crew on mooring operations, proper safety gloves mandatory, improved supervision",
            "preventive_actions": "Updated mooring procedures, additional crew training, fatigue management review, new cut-resistant gloves ordered",
            "responsible_person": "Master",
            "target_completion_date": (datetime.now() - timedelta(days=5)).isoformat()
        },
        {
            "incident_type": "Environmental",
            "severity": "Minor",
            "title": "Minor oil leak detected",
            "description": "Small hydraulic oil leak discovered in deck machinery. Approximately 200ml of hydraulic fluid leaked onto deck before detected.",
            "incident_date": (datetime.now() - timedelta(days=3)).isoformat(),
            "location": "Aft Deck - Hydraulic Winch",
            "vessel_id": "",
            "vessel_name": "MV Coral Queen",
            "injuries": False,
            "witnesses": "Deckhand on duty",
            "immediate_actions": "Leak contained with absorbent pads, area cleaned, machinery shut down, environmental spill kit deployed",
            "investigation_status": "Reported",
            "responsible_person": "Chief Engineer",
            "target_completion_date": (datetime.now() + timedelta(days=7)).isoformat()
        },
        {
            "incident_type": "Near Miss",
            "severity": "Critical",
            "title": "Near collision with recreational vessel",
            "description": "Recreational vessel crossed bow at close range without radio contact. Evasive action taken to avoid collision.",
            "incident_date": (datetime.now() - timedelta(days=1)).isoformat(),
            "location": "Approaches to Port, 2nm offshore",
            "vessel_id": "",
            "vessel_name": "MV Pacific Explorer",
            "injuries": False,
            "witnesses": "Officer of the Watch, Lookout, Master (called to bridge)",
            "immediate_actions": "Hard turn to starboard, reduced speed, sounded warning signal, reported to VTS",
            "investigation_status": "Under Investigation",
            "root_cause": "Recreational vessel operator inattention, possible lack of VHF radio monitoring",
            "responsible_person": "Master",
            "target_completion_date": (datetime.now() + timedelta(days=5)).isoformat()
        }
    ]
    
    created = 0
    for incident in incidents:
        try:
            response = requests.post(f"{BACKEND_URL}/incidents", json=incident, headers=headers)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Created incident: {result['incident_number']} - {incident['title']}")
                created += 1
        except Exception as e:
            print(f"❌ Error creating incident: {str(e)}")
    
    print(f"✅ Created {created} incidents\n")

def create_emergency_contacts(token):
    """Create sample emergency contacts"""
    headers = {"Authorization": f"Bearer {token}"}
    
    contacts = [
        {
            "contact_type": "Medical",
            "name": "Cairns Base Hospital",
            "organization": "Queensland Health",
            "role": "Emergency Department",
            "phone_primary": "+61 7 4226 0000",
            "phone_secondary": "",
            "email": "emergency@cairnshealth.qld.gov.au",
            "address": "The Esplanade, Cairns QLD 4870",
            "available_24_7": True,
            "notes": "Primary hospital for emergency evacuations in Cairns region",
            "priority": 1
        },
        {
            "contact_type": "Authority",
            "name": "Australian Maritime Safety Authority (AMSA)",
            "organization": "AMSA",
            "role": "Marine Rescue Coordination Centre",
            "phone_primary": "1800 641 792",
            "phone_secondary": "+61 2 6279 5000",
            "email": "rccaus@amsa.gov.au",
            "address": "GPO Box 2181, Canberra ACT 2601",
            "available_24_7": True,
            "notes": "For maritime emergencies and distress situations",
            "priority": 1
        },
        {
            "contact_type": "Shore",
            "name": "Head Office Operations",
            "organization": "Hover Marine",
            "role": "Operations Manager",
            "phone_primary": "+61 7 4050 1234",
            "phone_secondary": "+61 400 123 456",
            "email": "ops@hovermarine.com.au",
            "address": "Cairns Marina, Cairns QLD 4870",
            "available_24_7": True,
            "notes": "24/7 operations support and emergency contact",
            "priority": 1
        },
        {
            "contact_type": "Medical",
            "name": "Dr. Sarah Mitchell",
            "organization": "Marine Medical Services",
            "role": "Maritime Medical Advisor",
            "phone_primary": "+61 400 555 1234",
            "email": "s.mitchell@marinemedical.com.au",
            "available_24_7": False,
            "notes": "Remote medical advice for non-emergency situations. Available 8am-6pm weekdays.",
            "priority": 2
        },
        {
            "contact_type": "Supplier",
            "name": "Marine Diesel Services",
            "organization": "MDS Engineering",
            "role": "Emergency Engine Repairs",
            "phone_primary": "+61 7 4051 8888",
            "phone_secondary": "+61 400 888 999",
            "email": "emergency@mdsengineering.com.au",
            "available_24_7": True,
            "notes": "24/7 emergency engine repairs and parts supply",
            "priority": 2
        },
        {
            "contact_type": "Authority",
            "name": "Queensland Water Police",
            "organization": "QPS Maritime",
            "role": "Marine Incident Response",
            "phone_primary": "000",
            "phone_secondary": "+61 7 3222 1234",
            "email": "waterpolice@police.qld.gov.au",
            "available_24_7": True,
            "notes": "For incidents requiring police attendance",
            "priority": 1
        }
    ]
    
    created = 0
    for contact in contacts:
        try:
            response = requests.post(f"{BACKEND_URL}/emergency/contacts", json=contact, headers=headers)
            if response.status_code == 200:
                print(f"✅ Created contact: {contact['name']}")
                created += 1
        except Exception as e:
            print(f"❌ Error creating contact: {str(e)}")
    
    print(f"✅ Created {created} emergency contacts\n")

def create_emergency_procedures(token):
    """Create sample emergency procedures"""
    headers = {"Authorization": f"Bearer {token}"}
    
    procedures = [
        {
            "emergency_type": "Fire",
            "title": "Fire Emergency Response Procedure",
            "procedure_steps": """1. Sound general alarm (7 short blasts + 1 long blast)
2. Announce "FIRE, FIRE, FIRE" on PA system with location
3. Master to assume command, proceed to bridge
4. Crew to muster stations as per fire plan
5. Fire team don firefighting gear and breathing apparatus
6. Locate and assess fire
7. Attack fire using appropriate extinguishing agent
8. Boundary cooling of adjacent spaces
9. Activate fixed fire suppression if required
10. Continue firefighting until fire is extinguished
11. Post fire watch for minimum 4 hours
12. Investigate cause and complete incident report""",
            "equipment_required": "Fire extinguishers (CO2, foam, dry powder), Fire hoses, Breathing apparatus, Firefighting suits, Thermal imaging camera, Boundary cooling equipment",
            "muster_station": "Main Deck Aft - Fire Station",
            "key_contacts": "Master, Chief Engineer, Fire Team Leader"
        },
        {
            "emergency_type": "Man Overboard",
            "title": "Man Overboard Recovery Procedure",
            "procedure_steps": """1. Shout "MAN OVERBOARD" - note side (port/starboard)
2. Throw lifebuoy with smoke signal toward person
3. Continuous pointing at person in water
4. Sound alarm - 3 long blasts
5. Announce on PA: "Man Overboard - Port/Starboard Side"
6. Wheel hard over toward side of person (Williamson Turn)
7. Stop engines when person alongside
8. Deploy rescue boat or rescue swimmer
9. Use rescue basket/ladder for recovery
10. Provide first aid and medical assessment
11. Account for all crew
12. Complete incident report""",
            "equipment_required": "Lifebuoys with lights and smoke signals, Rescue boat, Rescue ladder/basket, Life jackets, Throw lines, First aid equipment",
            "muster_station": "Bridge and Boat Deck",
            "key_contacts": "Master, Officer of Watch, Boat Crew"
        },
        {
            "emergency_type": "Medical Emergency",
            "title": "Medical Emergency Response Procedure",
            "procedure_steps": """1. Assess patient - ABC (Airway, Breathing, Circulation)
2. Call for First Aider/Medic
3. Announce medical emergency on PA if needed
4. Provide immediate first aid
5. Contact medical advice via radio/phone
6. Prepare medical report: symptoms, vital signs, treatment given
7. If serious: request medical evacuation
8. Coordinate with shore medical facilities
9. Prepare for evacuation (helicopter/rescue boat)
10. Continue treatment and monitoring
11. Document all actions and treatments
12. Complete medical incident report""",
            "equipment_required": "First aid kits, AED (Automated External Defibrillator), Stretcher, Oxygen equipment, Medical reference guides, Radio/satellite phone",
            "muster_station": "Medical Room or casualty location",
            "key_contacts": "First Aider, Master, Maritime Medical Advisor (via radio)"
        },
        {
            "emergency_type": "Grounding",
            "title": "Vessel Grounding Emergency Procedure",
            "procedure_steps": """1. Stop engines immediately
2. Sound general alarm
3. Master to bridge
4. Check for hull damage and water ingress
5. Sound all tanks and spaces
6. Assess position, tide, weather
7. Calculate time to high tide
8. Do NOT attempt to refloat without damage assessment
9. Contact coastal radio and report position
10. Request salvage assessment if needed
11. Prepare anchors for kedging if required
12. Monitor for stability and list
13. Prepare for evacuation if necessary
14. Complete grounding report""",
            "equipment_required": "Sounding equipment, Damage control equipment, Pumps, Anchors, Radio equipment",
            "muster_station": "Bridge",
            "key_contacts": "Master, Chief Engineer, AMSA, Salvage Company"
        }
    ]
    
    created = 0
    for proc in procedures:
        try:
            response = requests.post(f"{BACKEND_URL}/emergency/procedures", json=proc, headers=headers)
            if response.status_code == 200:
                print(f"✅ Created procedure: {proc['title']}")
                created += 1
        except Exception as e:
            print(f"❌ Error creating procedure: {str(e)}")
    
    print(f"✅ Created {created} emergency procedures\n")

def create_emergency_drills(token):
    """Create sample emergency drills"""
    headers = {"Authorization": f"Bearer {token}"}
    
    drills = [
        {
            "drill_type": "Fire Drill",
            "drill_date": (datetime.now() - timedelta(days=15)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Pacific Explorer",
            "participants": "Master, Chief Engineer, 6 crew members (full complement)",
            "duration_minutes": 25,
            "observations": "All crew responded quickly to alarm. Fire team correctly donned BA and located simulated fire. Good coordination between bridge and fire team. All safety procedures followed correctly.",
            "areas_for_improvement": "BA communication could be improved - one team member had radio issues. Need to check all BA equipment before next drill. Response time good but could be 30 seconds faster with more practice."
        },
        {
            "drill_type": "Abandon Ship Drill",
            "drill_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Whitsunday Spirit",
            "participants": "All crew (8 persons) and 20 volunteer passengers",
            "duration_minutes": 35,
            "observations": "Muster was orderly. All passengers located their lifejackets quickly. Liferaft deployment procedure demonstrated. Passengers briefed on survival procedures. EPIRB and SART operation explained.",
            "areas_for_improvement": "Some passengers confused about muster station location - need clearer signage. One crew member forgot to bring passenger list. Liferaft hydrostatic release needs maintenance check."
        },
        {
            "drill_type": "Man Overboard Drill",
            "drill_date": (datetime.now() - timedelta(days=7)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Coral Queen",
            "participants": "Bridge team, Deck crew (4 persons)",
            "duration_minutes": 18,
            "observations": "Quick response to alarm. Williamson turn executed perfectly. Dummy recovered in 8 minutes. Good use of lifebuoy and smoke signal. Crew maintained visual contact throughout.",
            "areas_for_improvement": "Recovery ladder deployment was slow - needs practice. One crew member unsure of their role - review emergency procedure assignments."
        }
    ]
    
    created = 0
    for drill in drills:
        try:
            response = requests.post(f"{BACKEND_URL}/emergency/drills", json=drill, headers=headers)
            if response.status_code == 200:
                print(f"✅ Created drill: {drill['drill_type']} on {drill['vessel_name']}")
                created += 1
        except Exception as e:
            print(f"❌ Error creating drill: {str(e)}")
    
    print(f"✅ Created {created} emergency drills\n")

def create_compliance_certificates(token):
    """Create sample compliance certificates"""
    headers = {"Authorization": f"Bearer {token}"}
    
    certificates = [
        {
            "certificate_type": "Vessel Certificate",
            "certificate_name": "Certificate of Survey - Passenger Vessel",
            "certificate_number": "AMSA-PV-2024-1234",
            "issuing_authority": "Australian Maritime Safety Authority",
            "issue_date": (datetime.now() - timedelta(days=200)).isoformat(),
            "expiry_date": (datetime.now() + timedelta(days=165)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Pacific Explorer",
            "notes": "Annual survey completed, valid for passenger operations up to 45 passengers"
        },
        {
            "certificate_type": "Vessel Certificate",
            "certificate_name": "Safety Management Certificate (ISM)",
            "certificate_number": "ISM-2024-5678",
            "issuing_authority": "Australian Register of Ships",
            "issue_date": (datetime.now() - timedelta(days=400)).isoformat(),
            "expiry_date": (datetime.now() + timedelta(days=1425)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Pacific Explorer",
            "notes": "ISM Code compliance certificate - 5 year validity"
        },
        {
            "certificate_type": "Vessel Certificate",
            "certificate_name": "Radio Station License",
            "certificate_number": "RSL-2024-9012",
            "issuing_authority": "Australian Communications and Media Authority",
            "issue_date": (datetime.now() - timedelta(days=180)).isoformat(),
            "expiry_date": (datetime.now() + timedelta(days=185)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Pacific Explorer",
            "notes": "VHF/MF radio license"
        },
        {
            "certificate_type": "Vessel Certificate",
            "certificate_name": "Load Line Certificate",
            "certificate_number": "LL-2024-3456",
            "issuing_authority": "Australian Register of Ships",
            "issue_date": (datetime.now() - timedelta(days=730)).isoformat(),
            "expiry_date": (datetime.now() + timedelta(days=1095)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Whitsunday Spirit",
            "notes": "Load line survey valid until next special survey"
        },
        {
            "certificate_type": "Company Certificate",
            "certificate_name": "Document of Compliance (ISM)",
            "certificate_number": "DOC-2024-7890",
            "issuing_authority": "Australian Register of Ships",
            "issue_date": (datetime.now() - timedelta(days=500)).isoformat(),
            "expiry_date": (datetime.now() + timedelta(days=1325)).isoformat(),
            "notes": "Company ISM compliance - covers all vessel operations"
        },
        {
            "certificate_type": "Vessel Certificate",
            "certificate_name": "Certificate of Survey - EXPIRING SOON",
            "certificate_number": "AMSA-CS-2024-WARNING",
            "issuing_authority": "Australian Maritime Safety Authority",
            "issue_date": (datetime.now() - timedelta(days=350)).isoformat(),
            "expiry_date": (datetime.now() + timedelta(days=15)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Coral Queen",
            "notes": "⚠️ URGENT: Certificate expires in 15 days - survey must be scheduled immediately"
        },
        {
            "certificate_type": "Vessel Certificate",
            "certificate_name": "Insurance Certificate - Hull & Machinery - EXPIRED",
            "certificate_number": "INS-HM-2023-EXPIRED",
            "issuing_authority": "Maritime Insurance Group",
            "issue_date": (datetime.now() - timedelta(days=380)).isoformat(),
            "expiry_date": (datetime.now() - timedelta(days=15)).isoformat(),
            "vessel_id": "",
            "vessel_name": "MV Coral Queen",
            "notes": "🚨 EXPIRED: Insurance renewal required immediately - vessel may not operate"
        }
    ]
    
    created = 0
    for cert in certificates:
        try:
            response = requests.post(f"{BACKEND_URL}/compliance/certificates", json=cert, headers=headers)
            if response.status_code == 200:
                print(f"✅ Created certificate: {cert['certificate_name']}")
                created += 1
        except Exception as e:
            print(f"❌ Error creating certificate: {str(e)}")
    
    print(f"✅ Created {created} compliance certificates\n")

def create_compliance_requirements(token):
    """Create sample compliance requirements"""
    headers = {"Authorization": f"Bearer {token}"}
    
    requirements = [
        {
            "requirement_name": "Annual Safety Drills (Minimum 12 per year)",
            "category": "Safety",
            "description": "All vessels must conduct minimum 12 emergency drills per year: 6 fire drills, 3 man overboard drills, 3 abandon ship drills. All drills must be documented.",
            "regulatory_reference": "AMSA Marine Order 504 (Certificates of survey - national law)",
            "compliance_status": "Compliant",
            "responsible_person": "Master / Operations Manager",
            "notes": "Current year: 9 drills completed. On track for 12+ by year end."
        },
        {
            "requirement_name": "Drug and Alcohol Management Plan",
            "category": "Safety",
            "description": "Company must maintain and implement drug and alcohol management plan. Random testing required minimum twice per year.",
            "regulatory_reference": "AMSA Marine Order 505 (Operational safety)",
            "compliance_status": "Compliant",
            "responsible_person": "Operations Manager",
            "notes": "Plan updated 2024. Random testing conducted quarterly. All results negative."
        },
        {
            "requirement_name": "Waste Management Plan - NEEDING REVIEW",
            "category": "Environmental",
            "description": "All vessels must have approved Garbage Management Plan. Annual review required. Plans must be vessel-specific and posted in crew areas.",
            "regulatory_reference": "MARPOL Annex V",
            "compliance_status": "Partial",
            "responsible_person": "Environmental Officer",
            "notes": "⚠️ Plans are 18 months old. Annual review overdue. Need to update and resubmit to AMSA."
        },
        {
            "requirement_name": "Crew Certification Requirements",
            "category": "Operational",
            "description": "All crew must hold valid certificates of competency appropriate to their position. Certificates must be renewed before expiry.",
            "regulatory_reference": "AMSA Marine Order 505",
            "compliance_status": "Compliant",
            "responsible_person": "Crewing Manager",
            "notes": "All crew certificates current. Expiry tracking system in place. 2 renewals due in next 3 months."
        },
        {
            "requirement_name": "Passenger Safety Briefing",
            "category": "Safety",
            "description": "Safety briefing must be conducted for all passengers before departure. Includes life jacket location, muster stations, and emergency signals.",
            "regulatory_reference": "AMSA Marine Order 504",
            "compliance_status": "Compliant",
            "responsible_person": "Master",
            "notes": "Standard safety briefing delivered on every voyage. Video briefing also available."
        },
        {
            "requirement_name": "Bridge Resource Management Training - OVERDUE",
            "category": "Safety",
            "description": "All bridge officers must complete BRM training every 5 years. Training must be from approved provider.",
            "regulatory_reference": "STCW Convention",
            "compliance_status": "Non-Compliant",
            "responsible_person": "Training Coordinator",
            "notes": "🚨 2 officers have expired BRM certificates. Training scheduled for next month but currently non-compliant."
        }
    ]
    
    created = 0
    for req in requirements:
        try:
            response = requests.post(f"{BACKEND_URL}/compliance/requirements", json=req, headers=headers)
            if response.status_code == 200:
                print(f"✅ Created requirement: {req['requirement_name']}")
                created += 1
        except Exception as e:
            print(f"❌ Error creating requirement: {str(e)}")
    
    print(f"✅ Created {created} compliance requirements\n")

def main():
    print("=" * 70)
    print("🚀 AMSA Phase 2 Sample Data Population")
    print("=" * 70)
    print()
    
    try:
        print("🔐 Logging in...")
        token = get_token()
        print("✅ Authentication successful\n")
        
        print("📋 Creating Incidents...")
        create_incidents(token)
        
        print("🚨 Creating Emergency Contacts...")
        create_emergency_contacts(token)
        
        print("📖 Creating Emergency Procedures...")
        create_emergency_procedures(token)
        
        print("⚠️ Creating Emergency Drills...")
        create_emergency_drills(token)
        
        print("🛡️ Creating Compliance Certificates...")
        create_compliance_certificates(token)
        
        print("✅ Creating Compliance Requirements...")
        create_compliance_requirements(token)
        
        print("=" * 70)
        print("✅ PHASE 2 SAMPLE DATA POPULATION COMPLETE!")
        print("=" * 70)
        print()
        print("Summary:")
        print("  - 5 Incidents (various types and severities)")
        print("  - 6 Emergency Contacts")
        print("  - 4 Emergency Procedures")
        print("  - 3 Emergency Drills")
        print("  - 7 Compliance Certificates (includes expiring and expired)")
        print("  - 6 Compliance Requirements (various statuses)")
        print()
        print("🎉 Ready to view in the application!")
        print("   Login: admin@test.com / Admin123!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
