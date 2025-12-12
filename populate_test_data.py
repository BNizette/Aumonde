#!/usr/bin/env python3
"""
Populate AMSA Safety Management System with test data
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

def create_vessels(token):
    """Create test vessels"""
    headers = {"Authorization": f"Bearer {token}"}
    
    vessels = [
        {
            "vessel_name": "MV Pacific Explorer",
            "registration_number": "REG-PE-2024",
            "vessel_type": "Charter Vessel",
            "flag": "Australia",
            "port_of_registry": "Sydney",
            "imo_number": "IMO9876543",
            "call_sign": "VKPE",
            "mmsi_number": "503123456",
            "gross_tonnage": 250.5,
            "net_tonnage": 180.3,
            "length_overall": 28.5,
            "breadth": 7.2,
            "depth": 3.5,
            "max_speed": 18.0,
            "number_of_engines": 2,
            "engine_type": "Diesel - Twin",
            "engine_model": "Caterpillar C32",
            "total_power_kw": 1200.0,
            "fuel_type": "Marine Diesel",
            "fuel_capacity": 5000.0,
            "passenger_capacity": 45,
            "crew_capacity": 8,
            "build_year": 2018,
            "builder_name": "Australian Marine Builders",
            "classification_society": "Australian Register of Ships"
        },
        {
            "vessel_name": "MV Coral Queen",
            "registration_number": "REG-CQ-2023",
            "vessel_type": "Tourism Vessel",
            "flag": "Australia",
            "port_of_registry": "Cairns",
            "imo_number": "IMO9876544",
            "call_sign": "VKCQ",
            "mmsi_number": "503123457",
            "gross_tonnage": 180.0,
            "net_tonnage": 120.0,
            "length_overall": 24.0,
            "breadth": 6.5,
            "depth": 3.0,
            "max_speed": 16.0,
            "number_of_engines": 2,
            "engine_type": "Diesel - Twin",
            "engine_model": "Volvo D13",
            "total_power_kw": 900.0,
            "fuel_type": "Marine Diesel",
            "fuel_capacity": 3500.0,
            "passenger_capacity": 30,
            "crew_capacity": 5,
            "build_year": 2020,
            "builder_name": "Queensland Marine Works",
            "classification_society": "Australian Register of Ships"
        },
        {
            "vessel_name": "MV Whitsunday Spirit",
            "registration_number": "REG-WS-2022",
            "vessel_type": "Charter Vessel",
            "flag": "Australia",
            "port_of_registry": "Airlie Beach",
            "imo_number": "IMO9876545",
            "call_sign": "VKWS",
            "mmsi_number": "503123458",
            "gross_tonnage": 150.0,
            "net_tonnage": 95.0,
            "length_overall": 22.0,
            "breadth": 6.0,
            "depth": 2.8,
            "max_speed": 15.0,
            "number_of_engines": 2,
            "engine_type": "Diesel - Twin",
            "engine_model": "Cummins QSB",
            "total_power_kw": 700.0,
            "fuel_type": "Marine Diesel",
            "fuel_capacity": 2800.0,
            "passenger_capacity": 25,
            "crew_capacity": 4,
            "build_year": 2019,
            "builder_name": "Whitsunday Shipbuilders",
            "classification_society": "Australian Register of Ships"
        }
    ]
    
    created_vessels = []
    for vessel in vessels:
        response = requests.post(f"{BACKEND_URL}/vessels", headers=headers, json=vessel)
        if response.status_code == 200:
            created_vessels.append(response.json())
            print(f"✅ Created vessel: {vessel['vessel_name']}")
        else:
            print(f"❌ Failed to create vessel: {vessel['vessel_name']}")
    
    return created_vessels

def create_crew(token):
    """Create test crew members"""
    headers = {"Authorization": f"Bearer {token}"}
    
    crew_members = [
        {
            "staff_name": "John Masters",
            "email": "john.masters@maritime.com.au",
            "mobile": "+61 412 345 678",
            "address": "123 Marine Drive, Cairns QLD 4870",
            "next_of_kin": "Sarah Masters",
            "kin_contact": "+61 412 345 679",
            "date_commenced": "2020-01-15",
            "default_position": "Master",
            "role": "Crew",
            "qualifications": [
                {"name": "Master Class 5", "date": "2025-05-10"},
                {"name": "STCW 95", "date": "2025-03-15"}
            ]
        },
        {
            "staff_name": "Sarah Thompson",
            "email": "sarah.thompson@maritime.com.au",
            "mobile": "+61 423 456 789",
            "address": "45 Ocean View Road, Airlie Beach QLD 4802",
            "next_of_kin": "Mike Thompson",
            "kin_contact": "+61 423 456 790",
            "date_commenced": "2021-03-10",
            "default_position": "Chief Engineer",
            "role": "Crew",
            "qualifications": [
                {"name": "Marine Engineer Class 3", "date": "2025-02-15"}
            ]
        },
        {
            "staff_name": "David Chen",
            "email": "david.chen@maritime.com.au",
            "mobile": "+61 434 567 890",
            "address": "78 Harbor Street, Sydney NSW 2000",
            "next_of_kin": "Lisa Chen",
            "kin_contact": "+61 434 567 891",
            "date_commenced": "2022-06-01",
            "default_position": "Deckhand",
            "role": "Crew",
            "qualifications": [
                {"name": "Coxswain", "date": "2026-05-20"}
            ]
        },
        {
            "staff_name": "Emma Wilson",
            "email": "emma.wilson@maritime.com.au",
            "mobile": "+61 445 678 901",
            "address": "12 Coastal Avenue, Port Douglas QLD 4877",
            "next_of_kin": "Tom Wilson",
            "kin_contact": "+61 445 678 902",
            "date_commenced": "2021-09-15",
            "default_position": "First Mate",
            "role": "Crew",
            "qualifications": [
                {"name": "Master Class 5", "date": "2025-08-10"},
                {"name": "Advanced First Aid", "date": "2026-01-15"}
            ]
        },
        {
            "staff_name": "Michael Roberts",
            "email": "michael.roberts@maritime.com.au",
            "mobile": "+61 456 789 012",
            "address": "33 Marina Boulevard, Cairns QLD 4870",
            "next_of_kin": "Jane Roberts",
            "kin_contact": "+61 456 789 013",
            "date_commenced": "2022-02-20",
            "default_position": "Second Engineer",
            "role": "Crew",
            "qualifications": [
                {"name": "Marine Engineer Class 4", "date": "2025-04-10"}
            ]
        },
        {
            "staff_name": "Sophie Anderson",
            "email": "sophie.anderson@maritime.com.au",
            "mobile": "+61 467 890 123",
            "address": "99 Beach Road, Whitsundays QLD 4802",
            "next_of_kin": "Peter Anderson",
            "kin_contact": "+61 467 890 124",
            "date_commenced": "2023-01-10",
            "default_position": "Steward",
            "role": "Host",
            "qualifications": [
                {"name": "Food Safety Certificate", "date": "2025-12-01"}
            ]
        }
    ]
    
    created_crew = []
    for crew in crew_members:
        response = requests.post(f"{BACKEND_URL}/crew", headers=headers, json=crew)
        if response.status_code == 200:
            created_crew.append(response.json())
            print(f"✅ Created crew: {crew['staff_name']}")
        else:
            print(f"❌ Failed to create crew: {crew['staff_name']}")
            print(f"   Response: {response.json()}")
    
    return created_crew

def create_trips(token, vessels, crew):
    """Create test trips"""
    headers = {"Authorization": f"Bearer {token}"}
    
    now = datetime.now()
    
    trips = [
        {
            "trip_name": "Great Barrier Reef Charter - Day 1",
            "vessel_id": vessels[0]["id"] if vessels else None,
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "trip_type": "Charter",
            "operating_area": "Great Barrier Reef",
            "depart_datetime": (now - timedelta(days=5)).isoformat(),
            "arrival_datetime": (now - timedelta(days=5) + timedelta(hours=8)).isoformat(),
            "number_of_passengers": 42,
            "number_of_crew": 6
        },
        {
            "trip_name": "Whitsunday Islands Tour",
            "vessel_id": vessels[1]["id"] if len(vessels) > 1 else None,
            "vessel_name": vessels[1]["vessel_name"] if len(vessels) > 1 else "MV Coral Queen",
            "trip_type": "Tourism",
            "operating_area": "Whitsunday Islands",
            "depart_datetime": (now - timedelta(days=3)).isoformat(),
            "arrival_datetime": (now - timedelta(days=3) + timedelta(hours=6)).isoformat(),
            "number_of_passengers": 28,
            "number_of_crew": 4
        },
        {
            "trip_name": "Sydney Harbour Cruise",
            "vessel_id": vessels[2]["id"] if len(vessels) > 2 else None,
            "vessel_name": vessels[2]["vessel_name"] if len(vessels) > 2 else "MV Whitsunday Spirit",
            "trip_type": "Commercial",
            "operating_area": "Sydney Harbour",
            "depart_datetime": (now - timedelta(days=1)).isoformat(),
            "arrival_datetime": (now - timedelta(days=1) + timedelta(hours=4)).isoformat(),
            "number_of_passengers": 20,
            "number_of_crew": 3
        },
        {
            "trip_name": "Cairns to Port Douglas Transfer",
            "vessel_id": vessels[0]["id"] if vessels else None,
            "vessel_name": vessels[0]["vessel_name"] if vessels else "MV Pacific Explorer",
            "trip_type": "Transfer",
            "operating_area": "Cairns - Port Douglas",
            "depart_datetime": now.isoformat(),
            "arrival_datetime": (now + timedelta(hours=3)).isoformat(),
            "number_of_passengers": 35,
            "number_of_crew": 5
        }
    ]
    
    created_trips = []
    for trip in trips:
        response = requests.post(f"{BACKEND_URL}/trips", headers=headers, json=trip)
        if response.status_code == 200:
            created_trips.append(response.json())
            print(f"✅ Created trip: {trip['trip_name']}")
        else:
            print(f"❌ Failed to create trip: {trip['trip_name']}")
    
    return created_trips

def allocate_crew_to_trips(token, trips, crew):
    """Allocate crew members to trips"""
    headers = {"Authorization": f"Bearer {token}"}
    
    if not trips or not crew:
        print("⚠️ No trips or crew to allocate")
        return []
    
    allocations = []
    
    # Trip 1 - Full crew
    if len(trips) > 0 and len(crew) >= 4:
        trip_allocations = [
            {"trip_id": trips[0]["id"], "crew_id": crew[0]["id"], 
             "crew_name": crew[0]["staff_name"], "position": "Master"},
            {"trip_id": trips[0]["id"], "crew_id": crew[1]["id"], 
             "crew_name": crew[1]["staff_name"], "position": "Chief Engineer"},
            {"trip_id": trips[0]["id"], "crew_id": crew[3]["id"], 
             "crew_name": crew[3]["staff_name"], "position": "First Mate"},
            {"trip_id": trips[0]["id"], "crew_id": crew[2]["id"], 
             "crew_name": crew[2]["staff_name"], "position": "Deckhand"},
        ]
        
        for allocation in trip_allocations:
            response = requests.post(f"{BACKEND_URL}/allocated-crew", headers=headers, json=allocation)
            if response.status_code == 200:
                allocations.append(response.json())
                print(f"✅ Allocated {allocation['crew_name']} to {trips[0]['trip_name']}")
    
    # Trip 2 - Medium crew
    if len(trips) > 1 and len(crew) >= 3:
        trip_allocations = [
            {"trip_id": trips[1]["id"], "crew_id": crew[3]["id"], 
             "crew_name": crew[3]["staff_name"], "position": "Acting Master"},
            {"trip_id": trips[1]["id"], "crew_id": crew[4]["id"], 
             "crew_name": crew[4]["staff_name"], "position": "Engineer"},
            {"trip_id": trips[1]["id"], "crew_id": crew[5]["id"], 
             "crew_name": crew[5]["staff_name"], "position": "Steward"},
        ]
        
        for allocation in trip_allocations:
            response = requests.post(f"{BACKEND_URL}/allocated-crew", headers=headers, json=allocation)
            if response.status_code == 200:
                allocations.append(response.json())
                print(f"✅ Allocated {allocation['crew_name']} to {trips[1]['trip_name']}")
    
    # Trip 4 (current trip) - Full crew
    if len(trips) > 3 and len(crew) >= 5:
        trip_allocations = [
            {"trip_id": trips[3]["id"], "crew_id": crew[0]["id"], 
             "crew_name": crew[0]["staff_name"], "position": "Master"},
            {"trip_id": trips[3]["id"], "crew_id": crew[1]["id"], 
             "crew_name": crew[1]["staff_name"], "position": "Chief Engineer"},
            {"trip_id": trips[3]["id"], "crew_id": crew[2]["id"], 
             "crew_name": crew[2]["staff_name"], "position": "Deckhand"},
            {"trip_id": trips[3]["id"], "crew_id": crew[4]["id"], 
             "crew_name": crew[4]["staff_name"], "position": "Second Engineer"},
            {"trip_id": trips[3]["id"], "crew_id": crew[5]["id"], 
             "crew_name": crew[5]["staff_name"], "position": "Steward"},
        ]
        
        for allocation in trip_allocations:
            response = requests.post(f"{BACKEND_URL}/allocated-crew", headers=headers, json=allocation)
            if response.status_code == 200:
                allocations.append(response.json())
                print(f"✅ Allocated {allocation['crew_name']} to {trips[3]['trip_name']}")
    
    return allocations

def create_shift_logs(token, trips, crew):
    """Create crew shift logs"""
    headers = {"Authorization": f"Bearer {token}"}
    
    if not trips or not crew:
        return []
    
    now = datetime.now()
    shift_logs = []
    
    # Add shifts for first trip (completed)
    if len(trips) > 0:
        shifts = [
            {
                "trip_id": trips[0]["id"],
                "crew_id": crew[0]["id"],
                "crew_name": crew[0]["staff_name"],
                "shift_start_datetime": (now - timedelta(days=5)).isoformat(),
                "shift_stop_datetime": (now - timedelta(days=5) + timedelta(hours=8)).isoformat(),
                "task_performed": "Navigating vessel, monitoring weather conditions"
            },
            {
                "trip_id": trips[0]["id"],
                "crew_id": crew[1]["id"],
                "crew_name": crew[1]["staff_name"],
                "shift_start_datetime": (now - timedelta(days=5)).isoformat(),
                "shift_stop_datetime": (now - timedelta(days=5) + timedelta(hours=8)).isoformat(),
                "task_performed": "Engine monitoring, routine maintenance checks"
            }
        ]
        
        for shift in shifts:
            response = requests.post(f"{BACKEND_URL}/trip-logs", headers=headers, json=shift)
            if response.status_code == 200:
                shift_logs.append(response.json())
                print(f"✅ Created shift log for {shift['crew_name']}")
    
    # Add ongoing shift for current trip
    if len(trips) > 3:
        shift = {
            "trip_id": trips[3]["id"],
            "crew_id": crew[0]["id"],
            "crew_name": crew[0]["staff_name"],
            "shift_start_datetime": now.isoformat(),
            "task_performed": "Transit to Port Douglas, passenger safety briefing"
        }
        
        response = requests.post(f"{BACKEND_URL}/trip-logs", headers=headers, json=shift)
        if response.status_code == 200:
            shift_logs.append(response.json())
            print(f"✅ Created ongoing shift log for {shift['crew_name']}")
    
    return shift_logs

def create_running_logs(token, trips, crew):
    """Create running logs"""
    headers = {"Authorization": f"Bearer {token}"}
    
    if not trips or not crew:
        return []
    
    now = datetime.now()
    running_logs = []
    
    if len(trips) > 0:
        logs = [
            {
                "trip_id": trips[0]["id"],
                "crew_id": crew[0]["id"],
                "crew_name": crew[0]["staff_name"],
                "log_datetime": (now - timedelta(days=5)).isoformat(),
                "activity": "Departure Port",
                "activity_details": "Departed Cairns Marina, all systems checked and operational"
            },
            {
                "trip_id": trips[0]["id"],
                "crew_id": crew[3]["id"],
                "crew_name": crew[3]["staff_name"],
                "log_datetime": (now - timedelta(days=5) + timedelta(hours=2)).isoformat(),
                "activity": "Safety Drill",
                "activity_details": "Conducted passenger safety drill and life jacket demonstration"
            },
            {
                "trip_id": trips[0]["id"],
                "crew_id": crew[0]["id"],
                "crew_name": crew[0]["staff_name"],
                "log_datetime": (now - timedelta(days=5) + timedelta(hours=4)).isoformat(),
                "activity": "Weather Update",
                "activity_details": "Received weather update: SE winds 10-15 knots, sea state moderate"
            }
        ]
        
        for log in logs:
            response = requests.post(f"{BACKEND_URL}/running-logs", headers=headers, json=log)
            if response.status_code == 200:
                running_logs.append(response.json())
                print(f"✅ Created running log: {log['activity']}")
    
    return running_logs

def create_engine_logs(token, trips):
    """Create engine running logs"""
    headers = {"Authorization": f"Bearer {token}"}
    
    if not trips:
        return []
    
    now = datetime.now()
    engine_logs = []
    
    if len(trips) > 0:
        logs = [
            {
                "trip_id": trips[0]["id"],
                "log_datetime": (now - timedelta(days=5)).isoformat(),
                # Port Engine
                "engine1_rpm": 1850,
                "engine1_water_temp": 82.5,
                "engine1_oil_temp": 95.0,
                "engine1_oil_pressure": 55.0,
                "engine1_gearbox_temp": 75.0,
                "engine1_gearbox_pressure": 28.0,
                "engine1_pyrometers": 420.0,
                "engine1_battery_volts": 13.8,
                "engine1_aux_volts": 13.5,
                "engine1_fuel_level": 85.0,
                "engine1_engine_hrs_start": 4250.5,
                "engine1_engine_hrs_end": 4258.5,
                # Starboard Engine
                "engine2_rpm": 1850,
                "engine2_water_temp": 83.0,
                "engine2_oil_temp": 96.0,
                "engine2_oil_pressure": 54.5,
                "engine2_gearbox_temp": 76.0,
                "engine2_gearbox_pressure": 27.5,
                "engine2_pyrometers": 425.0,
                "engine2_battery_volts": 13.7,
                "engine2_aux_volts": 13.6,
                "engine2_fuel_level": 85.0,
                "engine2_engine_hrs_start": 4230.0,
                "engine2_engine_hrs_end": 4238.0
            },
            {
                "trip_id": trips[0]["id"],
                "log_datetime": (now - timedelta(days=5) + timedelta(hours=4)).isoformat(),
                # Port Engine
                "engine1_rpm": 1900,
                "engine1_water_temp": 84.0,
                "engine1_oil_temp": 97.0,
                "engine1_oil_pressure": 54.0,
                "engine1_gearbox_temp": 77.0,
                "engine1_gearbox_pressure": 27.0,
                "engine1_pyrometers": 430.0,
                "engine1_battery_volts": 13.9,
                "engine1_aux_volts": 13.7,
                "engine1_fuel_level": 70.0,
                "engine1_engine_hrs_start": 4258.5,
                "engine1_engine_hrs_end": 4262.5,
                # Starboard Engine
                "engine2_rpm": 1900,
                "engine2_water_temp": 84.5,
                "engine2_oil_temp": 98.0,
                "engine2_oil_pressure": 53.5,
                "engine2_gearbox_temp": 78.0,
                "engine2_gearbox_pressure": 26.5,
                "engine2_pyrometers": 432.0,
                "engine2_battery_volts": 13.8,
                "engine2_aux_volts": 13.8,
                "engine2_fuel_level": 70.0,
                "engine2_engine_hrs_start": 4238.0,
                "engine2_engine_hrs_end": 4242.0
            }
        ]
        
        for log in logs:
            response = requests.post(f"{BACKEND_URL}/engine-running-logs", headers=headers, json=log)
            if response.status_code == 200:
                engine_logs.append(response.json())
                print(f"✅ Created engine log")
    
    return engine_logs

def create_documents(token, vessels):
    """Create test documents"""
    headers = {"Authorization": f"Bearer {token}"}
    
    documents = [
        {
            "document_name": "Vessel Registration Certificate - MV Pacific Explorer",
            "category": "Registration",
            "file_url": "https://example.com/documents/registration-cert-pe.pdf",
            "file_type": "url",
            "description": "Annual vessel registration certificate valid until 2026-01-15. Issued by AMSA.",
            "vessel_id": vessels[0]["id"] if vessels else None
        },
        {
            "document_name": "Safety Management Certificate - MV Pacific Explorer",
            "category": "Safety",
            "file_url": "https://example.com/documents/safety-management-pe.pdf",
            "file_type": "url",
            "description": "Safety Management Certificate valid until 2025-03-20. Issued by AMSA.",
            "vessel_id": vessels[0]["id"] if vessels else None
        },
        {
            "document_name": "Insurance Policy - Hull & Machinery",
            "category": "Insurance",
            "file_url": "https://example.com/documents/insurance-hull-pe.pdf",
            "file_type": "url",
            "description": "Hull & Machinery insurance policy. Coverage: $5M AUD. Valid until 2025-01-01.",
            "vessel_id": vessels[0]["id"] if vessels else None
        },
        {
            "document_name": "Company Safety Management System Manual",
            "category": "Safety",
            "file_url": "https://example.com/documents/safety-manual.pdf",
            "file_type": "url",
            "description": "Company-wide SMS manual applying to all vessels. Version 2024.1"
        },
        {
            "document_name": "Emergency Response Plan",
            "category": "Safety",
            "file_url": "https://example.com/documents/emergency-response-plan.pdf",
            "file_type": "url",
            "description": "Fleet-wide emergency response procedures. Updated quarterly."
        },
        {
            "document_name": "Crew Training Records - 2024",
            "category": "Training",
            "file_url": "https://example.com/documents/training-records-2024.pdf",
            "file_type": "url",
            "description": "Consolidated crew training and certification records for 2024"
        }
    ]
    
    created_docs = []
    for doc in documents:
        response = requests.post(f"{BACKEND_URL}/documents", headers=headers, json=doc)
        if response.status_code == 200:
            created_docs.append(response.json())
            print(f"✅ Created document: {doc['document_name']}")
        else:
            print(f"❌ Failed to create document: {doc['document_name']}")
    
    return created_docs

def main():
    print("=" * 60)
    print("POPULATING AMSA SAFETY MANAGEMENT SYSTEM WITH TEST DATA")
    print("=" * 60)
    print()
    
    try:
        # Get authentication token
        print("🔐 Authenticating...")
        token = get_token()
        print("✅ Authentication successful\n")
        
        # Create vessels
        print("🚢 Creating vessels...")
        vessels = create_vessels(token)
        print(f"✅ Created {len(vessels)} vessels\n")
        
        # Create crew members
        print("👥 Creating crew members...")
        crew = create_crew(token)
        print(f"✅ Created {len(crew)} crew members\n")
        
        # Create trips
        print("🗓️  Creating trips...")
        trips = create_trips(token, vessels, crew)
        print(f"✅ Created {len(trips)} trips\n")
        
        # Allocate crew to trips
        print("📋 Allocating crew to trips...")
        allocations = allocate_crew_to_trips(token, trips, crew)
        print(f"✅ Created {len(allocations)} crew allocations\n")
        
        # Create shift logs
        print("⏰ Creating shift logs...")
        shift_logs = create_shift_logs(token, trips, crew)
        print(f"✅ Created {len(shift_logs)} shift logs\n")
        
        # Create running logs
        print("📝 Creating running logs...")
        running_logs = create_running_logs(token, trips, crew)
        print(f"✅ Created {len(running_logs)} running logs\n")
        
        # Create engine logs
        print("⚙️  Creating engine logs...")
        engine_logs = create_engine_logs(token, trips)
        print(f"✅ Created {len(engine_logs)} engine logs\n")
        
        # Create documents
        print("📄 Creating documents...")
        documents = create_documents(token, vessels)
        print(f"✅ Created {len(documents)} documents\n")
        
        print("=" * 60)
        print("✅ TEST DATA POPULATION COMPLETE!")
        print("=" * 60)
        print("\nSummary:")
        print(f"  - {len(vessels)} Vessels")
        print(f"  - {len(crew)} Crew Members")
        print(f"  - {len(trips)} Trips")
        print(f"  - {len(allocations)} Crew Allocations")
        print(f"  - {len(shift_logs)} Shift Logs")
        print(f"  - {len(running_logs)} Running Logs")
        print(f"  - {len(engine_logs)} Engine Logs")
        print(f"  - {len(documents)} Documents")
        print("\n🎉 Ready for testing!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
