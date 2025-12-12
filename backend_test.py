#!/usr/bin/env python3
"""
AMSA Safety Management System - Comprehensive Backend API Testing
Tests all modules: Auth, Users, Vessels, Crew, Trips, Documents, Risk Assessment
"""

import requests
import json
import sys
import os
from datetime import datetime, timezone
from pathlib import Path
import tempfile

class AMSAComprehensiveTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from review request
        self.test_accounts = {
            "admin": {"email": "admin@test.com", "password": "Admin123!"},  # Owner - Full Access
            "master": {"email": "john.masters@aumonde.com", "password": "Master123!"},  # Master - Full Access
            "crew": {"email": "emma.wilson@aumonde.com", "password": "Crew123!"},  # Crew - View Access
            "inspector": {"email": "robert.taylor@amsa.gov.au", "password": "Inspector123!"}  # Inspector - Edit Access
        }
        
        # Store created resources for cleanup
        self.created_documents = []
        self.created_vessels = []
        self.created_crew = []
        self.created_trips = []
        self.created_risks = []
        self.created_users = []

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {error}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "error": error
        })

    def make_request(self, method, endpoint, data=None, files=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            # Remove Content-Type for file uploads
            headers.pop('Content-Type', None)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    # ============================================================================
    # AUTHENTICATION TESTS
    # ============================================================================

    def test_authentication(self):
        """Test login functionality with all test accounts"""
        print("\n🔐 Testing Authentication...")
        
        # Test admin login (Full access)
        success, response, status = self.make_request(
            'POST', 'auth/login', 
            data=self.test_accounts["admin"],
            expected_status=200
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            self.log_test("Admin Login (Full Access)", True, f"Logged in as {self.user_data.get('email')}")
            
            # Test /auth/me endpoint
            success, me_response, _ = self.make_request('GET', 'auth/me')
            if success:
                self.log_test("Get Current User (/auth/me)", True, f"User: {me_response.get('full_name')}")
            else:
                self.log_test("Get Current User (/auth/me)", False, error="Failed to get user info")
            
            return True
        else:
            self.log_test("Admin Login (Full Access)", False, error=f"Status: {status}, Response: {response}")
            return False

    def test_other_account_logins(self):
        """Test login with other account types"""
        print("\n👥 Testing Other Account Logins...")
        
        for account_type, credentials in [("master", self.test_accounts["master"]), 
                                        ("crew", self.test_accounts["crew"]), 
                                        ("inspector", self.test_accounts["inspector"])]:
            success, response, status = self.make_request(
                'POST', 'auth/login', 
                data=credentials,
                expected_status=200
            )
            
            if success and 'access_token' in response:
                user = response.get('user', {})
                access_level = user.get('access_level', 'Unknown')
                self.log_test(f"{account_type.title()} Login ({access_level} Access)", True, 
                            f"Logged in as {user.get('email')}")
            else:
                self.log_test(f"{account_type.title()} Login", False, 
                            error=f"Status: {status}, Response: {response}")

    # ============================================================================
    # DASHBOARD TESTS
    # ============================================================================

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n📊 Testing Dashboard...")
        
        success, response, status = self.make_request('GET', 'dashboard/stats')
        
        if success and isinstance(response, dict):
            expected_keys = ['trips', 'active_trips', 'vessels', 'crew_members', 'documents']
            has_all_keys = all(key in response for key in expected_keys)
            
            if has_all_keys:
                self.log_test("Dashboard Stats", True, 
                            f"Stats: {response['vessels']} vessels, {response['crew_members']} crew, {response['trips']} trips")
            else:
                self.log_test("Dashboard Stats", False, error=f"Missing keys in response: {response}")
        else:
            self.log_test("Dashboard Stats", False, error=f"Status: {status}")

    # ============================================================================
    # USER MANAGEMENT TESTS
    # ============================================================================

    def test_user_management(self):
        """Test user management endpoints"""
        print("\n👤 Testing User Management...")
        
        # Get all users
        success, response, status = self.make_request('GET', 'users')
        if success and isinstance(response, list):
            self.log_test("Get All Users", True, f"Retrieved {len(response)} users")
        else:
            self.log_test("Get All Users", False, error=f"Status: {status}")
        
        # Get activity logs
        success, response, status = self.make_request('GET', 'activity-logs')
        if success and isinstance(response, list):
            self.log_test("Get Activity Logs", True, f"Retrieved {len(response)} activity logs")
        else:
            self.log_test("Get Activity Logs", False, error=f"Status: {status}")
        
        # Get audit logs
        success, response, status = self.make_request('GET', 'audit-logs')
        if success and isinstance(response, list):
            self.log_test("Get Audit Logs", True, f"Retrieved {len(response)} audit logs")
        else:
            self.log_test("Get Audit Logs", False, error=f"Status: {status}")
        
        # Get sessions
        success, response, status = self.make_request('GET', 'sessions')
        if success and isinstance(response, list):
            self.log_test("Get Sessions", True, f"Retrieved {len(response)} sessions")
        else:
            self.log_test("Get Sessions", False, error=f"Status: {status}")

    # ============================================================================
    # VESSEL MANAGEMENT TESTS
    # ============================================================================

    def test_vessel_management(self):
        """Test vessel CRUD operations with new fields"""
        print("\n🚢 Testing Vessel Management...")
        
        # Get existing vessels
        success, response, status = self.make_request('GET', 'vessels')
        if success and isinstance(response, list):
            self.existing_vessels = response
            self.log_test("Get All Vessels", True, f"Retrieved {len(response)} vessels")
        else:
            self.log_test("Get All Vessels", False, error=f"Status: {status}")
            return False
        
        # Create new vessel with all new fields
        vessel_data = {
            "vessel_name": "Test Vessel AMSA",
            "registration_number": "TEST123",
            "vessel_type": "Passenger",
            "owner_name": "Test Owner",
            "owner_contact": "test@example.com",
            # New fields from Phase 2
            "boat_phone": "+61 400 123 456",
            "flag": "Australia",
            "port_of_registry": "Sydney",
            "imo_number": "IMO1234567",
            "mmsi_number": "503123456",
            "call_sign": "VKTEST",
            "ais_class": "A",
            "home_port": "Cairns",
            "length_at_waterline": 18.5,
            "air_draft": 12.0,
            "ce_category": "B",
            "length_overall": 20.0,
            "beam": 6.0,
            "draft": 2.5,
            "gross_tonnage": 50.0,
            "year_built": 2020,
            "max_passengers": 50,
            "max_crew": 5
        }
        
        success, response, status = self.make_request('POST', 'vessels', data=vessel_data)
        if success and 'id' in response:
            vessel_id = response['id']
            self.created_vessels.append(vessel_id)
            self.log_test("Create Vessel (with new fields)", True, f"Created vessel: {vessel_id}")
            
            # Test get single vessel
            success, get_response, _ = self.make_request('GET', f'vessels/{vessel_id}')
            if success and get_response.get('boat_phone') == vessel_data['boat_phone']:
                self.log_test("Get Single Vessel (verify new fields)", True, "New fields preserved")
            else:
                self.log_test("Get Single Vessel (verify new fields)", False, error="New fields not preserved")
            
            # Test update vessel
            update_data = vessel_data.copy()
            update_data['vessel_name'] = "Updated Test Vessel"
            update_data['ais_class'] = "B"  # Change AIS class
            
            success, update_response, _ = self.make_request('PUT', f'vessels/{vessel_id}', data=update_data)
            if success:
                self.log_test("Update Vessel", True, "Vessel updated successfully")
            else:
                self.log_test("Update Vessel", False, error="Failed to update vessel")
                
        else:
            self.log_test("Create Vessel (with new fields)", False, error=f"Status: {status}, Response: {response}")

    # ============================================================================
    # CREW MANAGEMENT TESTS
    # ============================================================================

    def test_crew_management(self):
        """Test crew CRUD operations with qualifications"""
        print("\n👥 Testing Crew Management...")
        
        # Get existing crew
        success, response, status = self.make_request('GET', 'crew')
        if success and isinstance(response, list):
            self.existing_crew = response
            self.log_test("Get All Crew", True, f"Retrieved {len(response)} crew members")
        else:
            self.log_test("Get All Crew", False, error=f"Status: {status}")
            return False
        
        # Create new crew member with qualifications
        crew_data = {
            "staff_name": "Test Crew Member",
            "email": "testcrew@example.com",
            "mobile": "+61 400 987 654",
            "default_position": "Deckhand",
            "role": "Crew",
            "qualifications": [
                {"name": "Basic Safety Training", "date": "2023-01-15"},
                {"name": "Marine Radio License", "date": "2023-02-20"}
            ],
            "experience": "5 years maritime experience",
            "license_number": "ML123456",
            "license_expiry": "2025-12-31",
            "medical_cert_expiry": "2024-06-30"
        }
        
        success, response, status = self.make_request('POST', 'crew', data=crew_data)
        if success and 'id' in response:
            crew_id = response['id']
            self.created_crew.append(crew_id)
            self.log_test("Create Crew Member (with qualifications)", True, f"Created crew: {crew_id}")
            
            # Test get single crew member
            success, get_response, _ = self.make_request('GET', f'crew/{crew_id}')
            if success and len(get_response.get('qualifications', [])) == 2:
                self.log_test("Get Single Crew (verify qualifications)", True, "Qualifications preserved")
            else:
                self.log_test("Get Single Crew (verify qualifications)", False, error="Qualifications not preserved")
            
            # Test update crew
            update_data = crew_data.copy()
            update_data['staff_name'] = "Updated Test Crew"
            update_data['qualifications'].append({"name": "Advanced Safety", "date": "2023-03-10"})
            
            success, update_response, _ = self.make_request('PUT', f'crew/{crew_id}', data=update_data)
            if success:
                self.log_test("Update Crew Member", True, "Crew updated successfully")
            else:
                self.log_test("Update Crew Member", False, error="Failed to update crew")
                
        else:
            self.log_test("Create Crew Member (with qualifications)", False, error=f"Status: {status}, Response: {response}")

    # ============================================================================
    # TRIP MANAGEMENT TESTS
    # ============================================================================

    def test_trip_management(self):
        """Test trip CRUD operations"""
        print("\n🗓️ Testing Trip Management...")
        
        # Get existing trips
        success, response, status = self.make_request('GET', 'trips')
        if success and isinstance(response, list):
            self.existing_trips = response
            self.log_test("Get All Trips", True, f"Retrieved {len(response)} trips")
        else:
            self.log_test("Get All Trips", False, error=f"Status: {status}")
            return False
        
        # Need a vessel for trip creation
        if not hasattr(self, 'existing_vessels') or not self.existing_vessels:
            self.log_test("Create Trip", False, error="No vessels available for trip creation")
            return False
        
        vessel = self.existing_vessels[0]
        
        # Create new trip
        trip_data = {
            "trip_name": "Test Safety Inspection Trip",
            "vessel_id": vessel['id'],
            "trip_type": "Inspection",
            "operating_area": "Port Phillip Bay",
            "depart_datetime": "2024-01-15T09:00:00Z",
            "arrival_datetime": "2024-01-15T17:00:00Z",
            "number_of_passengers": 10,
            "number_of_crew": 3
        }
        
        success, response, status = self.make_request('POST', 'trips', data=trip_data)
        if success and 'id' in response:
            trip_id = response['id']
            self.created_trips.append(trip_id)
            self.test_trip_id = trip_id  # Store for log tests
            self.log_test("Create Trip", True, f"Created trip: {trip_id}")
            
            # Test get single trip
            success, get_response, _ = self.make_request('GET', f'trips/{trip_id}')
            if success and get_response.get('trip_name') == trip_data['trip_name']:
                self.log_test("Get Single Trip", True, "Trip details correct")
            else:
                self.log_test("Get Single Trip", False, error="Trip details incorrect")
            
            # Test update trip
            update_data = trip_data.copy()
            update_data['trip_name'] = "Updated Test Trip"
            update_data['number_of_passengers'] = 15
            
            success, update_response, _ = self.make_request('PUT', f'trips/{trip_id}', data=update_data)
            if success:
                self.log_test("Update Trip", True, "Trip updated successfully")
            else:
                self.log_test("Update Trip", False, error="Failed to update trip")
                
        else:
            self.log_test("Create Trip", False, error=f"Status: {status}, Response: {response}")

    # ============================================================================
    # ALLOCATED CREW TESTS
    # ============================================================================

    def test_allocated_crew(self):
        """Test allocated crew functionality (NEW feature)"""
        print("\n👷 Testing Allocated Crew (NEW)...")
        
        if not hasattr(self, 'test_trip_id') or not hasattr(self, 'existing_crew'):
            self.log_test("Test Allocated Crew", False, error="No trip or crew available")
            return False
        
        if not self.existing_crew:
            self.log_test("Test Allocated Crew", False, error="No crew members available")
            return False
        
        crew_member = self.existing_crew[0]
        
        # Allocate crew to trip
        allocation_data = {
            "trip_id": self.test_trip_id,
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "position": "Master"
        }
        
        success, response, status = self.make_request('POST', 'allocated-crew', data=allocation_data)
        if success and 'id' in response:
            allocation_id = response['id']
            self.log_test("Allocate Crew to Trip", True, f"Allocated crew: {allocation_id}")
            
            # Get allocated crew for trip
            success, get_response, _ = self.make_request('GET', f'allocated-crew?trip_id={self.test_trip_id}')
            if success and isinstance(get_response, list) and len(get_response) > 0:
                self.log_test("Get Allocated Crew for Trip", True, f"Retrieved {len(get_response)} allocations")
            else:
                self.log_test("Get Allocated Crew for Trip", False, error="No allocations found")
            
            # Update allocation
            update_data = allocation_data.copy()
            update_data['position'] = "Chief Engineer"
            
            success, update_response, _ = self.make_request('PUT', f'allocated-crew/{allocation_id}', data=update_data)
            if success:
                self.log_test("Update Allocated Crew", True, "Allocation updated successfully")
            else:
                self.log_test("Update Allocated Crew", False, error="Failed to update allocation")
                
        else:
            self.log_test("Allocate Crew to Trip", False, error=f"Status: {status}, Response: {response}")

    # ============================================================================
    # TRIP LOGS TESTS
    # ============================================================================

    def test_trip_logs(self):
        """Test trip logging functionality"""
        print("\n📝 Testing Trip Logs...")
        
        if not hasattr(self, 'test_trip_id') or not hasattr(self, 'existing_crew'):
            self.log_test("Test Trip Logs", False, error="No trip or crew available")
            return False
        
        if not self.existing_crew:
            self.log_test("Test Trip Logs", False, error="No crew members available")
            return False
        
        crew_member = self.existing_crew[0]
        
        # Create crew shift log
        shift_log_data = {
            "trip_id": self.test_trip_id,
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "shift_start_datetime": "2024-01-15T09:00:00Z",
            "shift_stop_datetime": "2024-01-15T17:00:00Z",
            "task_performed": "Navigation and safety monitoring"
        }
        
        success, response, status = self.make_request('POST', 'trip-logs', data=shift_log_data)
        if success and 'id' in response:
            self.log_test("Create Crew Shift Log", True, f"Created shift log: {response['id']}")
        else:
            self.log_test("Create Crew Shift Log", False, error=f"Status: {status}")
        
        # Create running log
        running_log_data = {
            "trip_id": self.test_trip_id,
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "log_datetime": "2024-01-15T12:00:00Z",
            "activity": "Safety briefing conducted",
            "activity_details": "Conducted passenger safety briefing before departure"
        }
        
        success, response, status = self.make_request('POST', 'running-logs', data=running_log_data)
        if success and 'id' in response:
            self.log_test("Create Running Log", True, f"Created running log: {response['id']}")
        else:
            self.log_test("Create Running Log", False, error=f"Status: {status}")
        
        # Create engine running log (Port Engine and Starboard Engine)
        engine_log_data = {
            "trip_id": self.test_trip_id,
            "log_datetime": "2024-01-15T10:00:00Z",
            # Port Engine (engine1)
            "engine1_rpm": 1800.0,
            "engine1_water_temp": 85.5,
            "engine1_oil_temp": 90.0,
            "engine1_oil_pressure": 45.0,
            "engine1_fuel_level": 75.0,
            "engine1_engine_hrs_start": 1250.5,
            "engine1_engine_hrs_end": 1258.5,
            # Starboard Engine (engine2)
            "engine2_rpm": 1820.0,
            "engine2_water_temp": 87.0,
            "engine2_oil_temp": 92.0,
            "engine2_oil_pressure": 46.0,
            "engine2_fuel_level": 73.0,
            "engine2_engine_hrs_start": 1245.0,
            "engine2_engine_hrs_end": 1253.0
        }
        
        success, response, status = self.make_request('POST', 'engine-running-logs', data=engine_log_data)
        if success and 'id' in response:
            self.log_test("Create Engine Running Log (Port & Starboard)", True, f"Created engine log: {response['id']}")
        else:
            self.log_test("Create Engine Running Log (Port & Starboard)", False, error=f"Status: {status}")
        
        # Get trip logs
        success, response, status = self.make_request('GET', f'trip-logs?trip_id={self.test_trip_id}')
        if success and isinstance(response, list):
            self.log_test("Get Trip Logs", True, f"Retrieved {len(response)} trip logs")
        else:
            self.log_test("Get Trip Logs", False, error=f"Status: {status}")

    # ============================================================================
    # DOCUMENT MANAGEMENT TESTS
    # ============================================================================

    def test_document_management(self):
        """Test document management functionality"""
        print("\n📄 Testing Document Management...")
        
        # Get all documents
        success, response, status = self.make_request('GET', 'documents')
        if success and isinstance(response, list):
            self.log_test("Get All Documents", True, f"Retrieved {len(response)} documents")
        else:
            self.log_test("Get All Documents", False, error=f"Status: {status}")
        
        # Create document with URL
        doc_data = {
            "document_name": "Test Safety Manual",
            "category": "Safety",
            "file_url": "https://example.com/safety-manual.pdf",
            "file_type": "PDF",
            "description": "Test safety manual for AMSA system",
            "vessel_id": None  # Global document
        }
        
        success, response, status = self.make_request('POST', 'documents', data=doc_data)
        if success and 'id' in response:
            doc_id = response['id']
            self.created_documents.append(doc_id)
            self.log_test("Create Document", True, f"Created document: {doc_id}")
        else:
            self.log_test("Create Document", False, error=f"Status: {status}")

    # ============================================================================
    # RISK ASSESSMENT TESTS (NEW)
    # ============================================================================

    def test_risk_assessment(self):
        """Test risk assessment functionality (NEW feature)"""
        print("\n⚠️ Testing Risk Assessment (NEW)...")
        
        # Get existing risk assessments
        success, response, status = self.make_request('GET', 'risk-assessments')
        if success and isinstance(response, list):
            self.log_test("Get All Risk Assessments", True, f"Retrieved {len(response)} risk assessments")
        else:
            self.log_test("Get All Risk Assessments", False, error=f"Status: {status}")
        
        # Create new risk assessment with 5x5 risk matrix
        risk_data = {
            "activity_task": "Passenger embarkation",
            "location": "Main deck",
            "hazard": "Slippery deck surface",
            "risk_description": "Passengers may slip and fall during embarkation",
            "likelihood": "3",  # Possible
            "consequence": "4",  # Major
            "risk_level": "High",  # Auto-calculated: 3x4=12 (High)
            "risk_rating": "12",
            "control_measures": "Non-slip mats installed, crew assistance provided, safety briefing given",
            "residual_likelihood": "2",  # Unlikely (after controls)
            "residual_consequence": "3",  # Moderate (after controls)
            "residual_risk_level": "Medium",  # Auto-calculated: 2x3=6 (Medium)
            "residual_risk_rating": "6",
            "responsible_person": "Safety Officer",
            "review_date": "2024-06-15",
            "status": "Active",
            "notes": "Review effectiveness of control measures quarterly"
        }
        
        success, response, status = self.make_request('POST', 'risk-assessments', data=risk_data)
        if success and 'id' in response:
            risk_id = response['id']
            self.created_risks.append(risk_id)
            self.log_test("Create Risk Assessment (5x5 Matrix)", True, f"Created risk: {risk_id}")
            
            # Test get single risk assessment
            success, get_response, _ = self.make_request('GET', f'risk-assessments/{risk_id}')
            if success and get_response.get('risk_level') == 'High':
                self.log_test("Get Single Risk Assessment", True, "Risk matrix calculation correct")
            else:
                self.log_test("Get Single Risk Assessment", False, error="Risk matrix calculation incorrect")
            
            # Test update risk assessment
            update_data = risk_data.copy()
            update_data['status'] = 'Under Review'
            update_data['likelihood'] = '2'  # Change likelihood
            update_data['risk_level'] = 'Medium'  # Should be recalculated
            update_data['risk_rating'] = '8'
            
            success, update_response, _ = self.make_request('PUT', f'risk-assessments/{risk_id}', data=update_data)
            if success:
                self.log_test("Update Risk Assessment", True, "Risk assessment updated successfully")
            else:
                self.log_test("Update Risk Assessment", False, error="Failed to update risk assessment")
                
        else:
            self.log_test("Create Risk Assessment (5x5 Matrix)", False, error=f"Status: {status}, Response: {response}")

    # ============================================================================
    # ACCESS CONTROL TESTS
    # ============================================================================

    def test_access_control(self):
        """Test role-based access control"""
        print("\n🔒 Testing Access Control...")
        
        # Current user should have Full access (admin)
        access_level = self.user_data.get('access_level', 'Unknown')
        role = self.user_data.get('role', 'Unknown')
        
        self.log_test("Current User Access Level", True, f"Role: {role}, Access: {access_level}")
        
        # Test that admin can perform all operations
        if access_level == 'Full':
            self.log_test("Full Access Verification", True, "Admin has Full access for all operations")
        else:
            self.log_test("Full Access Verification", False, error=f"Admin should have Full access, got {access_level}")

    # ============================================================================
    # CLEANUP AND MAIN EXECUTION
    # ============================================================================

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created resources (only if user has Full access)
        if self.user_data.get('access_level') == 'Full':
            # Delete risk assessments
            for risk_id in self.created_risks[:]:
                success, _, _ = self.make_request('DELETE', f'risk-assessments/{risk_id}')
                if success:
                    self.created_risks.remove(risk_id)
                    print(f"   Deleted risk assessment: {risk_id}")
            
            # Delete documents
            for doc_id in self.created_documents[:]:
                success, _, _ = self.make_request('DELETE', f'documents/{doc_id}')
                if success:
                    self.created_documents.remove(doc_id)
                    print(f"   Deleted document: {doc_id}")
            
            # Delete trips
            for trip_id in self.created_trips[:]:
                success, _, _ = self.make_request('DELETE', f'trips/{trip_id}')
                if success:
                    self.created_trips.remove(trip_id)
                    print(f"   Deleted trip: {trip_id}")
            
            # Delete crew
            for crew_id in self.created_crew[:]:
                success, _, _ = self.make_request('DELETE', f'crew/{crew_id}')
                if success:
                    self.created_crew.remove(crew_id)
                    print(f"   Deleted crew: {crew_id}")
            
            # Delete vessels
            for vessel_id in self.created_vessels[:]:
                success, _, _ = self.make_request('DELETE', f'vessels/{vessel_id}')
                if success:
                    self.created_vessels.remove(vessel_id)
                    print(f"   Deleted vessel: {vessel_id}")

    def run_all_tests(self):
        """Run all AMSA system tests"""
        print("🚀 Starting AMSA Safety Management System Comprehensive Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 70)
        
        # Authentication is required for all other tests
        if not self.test_authentication():
            print("\n❌ Authentication failed - cannot continue with other tests")
            return False
        
        # Run all test modules
        test_methods = [
            self.test_other_account_logins,
            self.test_dashboard_stats,
            self.test_user_management,
            self.test_vessel_management,
            self.test_crew_management,
            self.test_trip_management,
            self.test_allocated_crew,  # NEW feature
            self.test_trip_logs,
            self.test_document_management,
            self.test_risk_assessment,  # NEW feature
            self.test_access_control,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_test(test_method.__name__, False, error=f"Exception: {str(e)}")
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = AMSAComprehensiveTester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())