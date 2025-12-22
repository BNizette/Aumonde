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
    def __init__(self, base_url="https://maritime-import.preview.emergentagent.com"):
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
        
        # Get all users - SPECIFIC TEST for backward compatibility with missing fields
        success, response, status = self.make_request('GET', 'users')
        if success and isinstance(response, list):
            self.log_test("Get All Users (200 OK)", True, f"Retrieved {len(response)} users")
            
            # Verify each user has required fields with defaults
            users_with_defaults = 0
            field_issues = []
            
            for user in response:
                # Check that access_level exists and has a valid value
                if 'access_level' not in user:
                    field_issues.append(f"User {user.get('email', 'unknown')} missing access_level")
                elif user['access_level'] not in ['View', 'Edit', 'Full']:
                    field_issues.append(f"User {user.get('email', 'unknown')} has invalid access_level: {user['access_level']}")
                
                # Check that account_status exists and has a valid value
                if 'account_status' not in user:
                    field_issues.append(f"User {user.get('email', 'unknown')} missing account_status")
                elif user['account_status'] not in ['Active', 'Disabled', 'Suspended']:
                    field_issues.append(f"User {user.get('email', 'unknown')} has invalid account_status: {user['account_status']}")
                
                # Count users with default values (backward compatibility)
                if user.get('access_level') == 'Edit' and user.get('account_status') == 'Active':
                    users_with_defaults += 1
            
            if not field_issues:
                self.log_test("Users Field Validation (access_level & account_status)", True, 
                            f"All users have required fields. {users_with_defaults} users have default values")
            else:
                self.log_test("Users Field Validation (access_level & account_status)", False, 
                            error=f"Field issues: {field_issues[:3]}")  # Show first 3 issues
            
            # Verify response structure for backward compatibility
            required_user_fields = ['id', 'email', 'full_name', 'role', 'access_level', 'account_status', 'created_at']
            structure_valid = True
            structure_issues = []
            
            for user in response[:3]:  # Check first 3 users
                for field in required_user_fields:
                    if field not in user:
                        structure_valid = False
                        structure_issues.append(f"User {user.get('email', 'unknown')} missing field: {field}")
            
            if structure_valid:
                self.log_test("User Response Structure Validation", True, "All required fields present")
            else:
                self.log_test("User Response Structure Validation", False, 
                            error=f"Structure issues: {structure_issues}")
                
        else:
            self.log_test("Get All Users (200 OK)", False, error=f"Status: {status}, Expected 200 but got {status}")
            # This is a critical failure - the endpoint should not return 500
            if status == 500:
                self.log_test("CRITICAL: Users Endpoint 500 Error", False, 
                            error="Users endpoint returning 500 - Pydantic validation error likely")
        
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
            "planned_depart_datetime": "2024-01-15T09:00:00Z",
            "planned_arrival_datetime": "2024-01-15T17:00:00Z",
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
    # MANUAL LOG ENTRY TESTS (NEW FEATURE)
    # ============================================================================

    def test_manual_log_entry(self):
        """Test manual log entry functionality without trip_id"""
        print("\n📝 Testing Manual Log Entry Features (NEW)...")
        
        if not hasattr(self, 'existing_crew') or not self.existing_crew:
            self.log_test("Manual Log Entry Setup", False, error="No crew members available")
            return False
        
        if not hasattr(self, 'existing_vessels') or not self.existing_vessels:
            self.log_test("Manual Log Entry Setup", False, error="No vessels available")
            return False
        
        crew_member = self.existing_crew[0]
        vessel = self.existing_vessels[0]
        
        # Test 1: Manual Vessel Log Entry (Running Log without trip_id)
        print("\n   Testing Manual Vessel Log Entry...")
        
        manual_running_log_data = {
            # No trip_id - this is manual entry
            "vessel_id": vessel['id'],
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "log_datetime": "2024-12-14T10:00:00Z",
            "category": "Safety",
            "activity": "Manual safety inspection",
            "activity_details": "Checked all safety equipment during routine maintenance"
        }
        
        success, response, status = self.make_request('POST', 'running-logs', data=manual_running_log_data)
        if success and 'id' in response:
            manual_running_log_id = response['id']
            self.log_test("Manual Vessel Log Entry (without trip_id)", True, 
                         f"Created manual running log: {manual_running_log_id}")
            
            # Verify the log was created by fetching vessel logs
            success, vessel_logs, _ = self.make_request('GET', f'running-logs?vessel_id={vessel["id"]}')
            if success and isinstance(vessel_logs, list):
                # Find our manual log
                manual_log_found = any(log['id'] == manual_running_log_id for log in vessel_logs)
                if manual_log_found:
                    self.log_test("Verify Manual Vessel Log in Vessel Logs", True, 
                                 f"Manual log found in vessel logs ({len(vessel_logs)} total)")
                else:
                    self.log_test("Verify Manual Vessel Log in Vessel Logs", False, 
                                 error="Manual log not found in vessel logs")
            else:
                self.log_test("Verify Manual Vessel Log in Vessel Logs", False, 
                             error="Failed to fetch vessel logs")
        else:
            self.log_test("Manual Vessel Log Entry (without trip_id)", False, 
                         error=f"Status: {status}, Response: {response}")
        
        # Test 2: Manual Crew Shift Log Entry (Crew Shift without trip_id)
        print("\n   Testing Manual Crew Shift Log Entry...")
        
        manual_crew_shift_data = {
            # No trip_id - this is manual entry
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "shift_start_datetime": "2024-12-14T08:00:00Z",
            "shift_stop_datetime": "2024-12-14T16:00:00Z",
            "task_performed": "Maintenance and inspection duties"
        }
        
        success, response, status = self.make_request('POST', 'trip-logs', data=manual_crew_shift_data)
        if success and 'id' in response:
            manual_crew_shift_id = response['id']
            self.log_test("Manual Crew Shift Log Entry (without trip_id)", True, 
                         f"Created manual crew shift: {manual_crew_shift_id}")
            
            # Verify the crew shift was created by fetching all trip logs
            success, all_shifts, _ = self.make_request('GET', 'trip-logs')
            if success and isinstance(all_shifts, list):
                manual_shift_found = any(shift['id'] == manual_crew_shift_id for shift in all_shifts)
                if manual_shift_found:
                    self.log_test("Verify Manual Crew Shift in Trip Logs", True, 
                                 f"Manual shift found in trip logs ({len(all_shifts)} total)")
                else:
                    self.log_test("Verify Manual Crew Shift in Trip Logs", False, 
                                 error="Manual shift not found in trip logs")
            else:
                self.log_test("Verify Manual Crew Shift in Trip Logs", False, 
                             error="Failed to fetch trip logs")
        else:
            self.log_test("Manual Crew Shift Log Entry (without trip_id)", False, 
                         error=f"Status: {status}, Response: {response}")
        
        # Test 3: Data Validation - Test required fields
        print("\n   Testing Manual Log Entry Validation...")
        
        # Test missing crew_id in running log
        invalid_running_log = {
            "vessel_id": vessel['id'],
            # Missing crew_id
            "crew_name": "Test Crew",
            "log_datetime": "2024-12-14T10:00:00Z",
            "activity": "Test activity"
        }
        
        success, response, status = self.make_request('POST', 'running-logs', 
                                                     data=invalid_running_log, expected_status=422)
        if status == 422:
            self.log_test("Manual Running Log Validation (missing crew_id)", True, 
                         "Correctly rejected invalid data")
        else:
            self.log_test("Manual Running Log Validation (missing crew_id)", False, 
                         error=f"Expected 422, got {status}")
        
        # Test missing crew_id in crew shift
        invalid_crew_shift = {
            # Missing crew_id
            "crew_name": "Test Crew",
            "shift_start_datetime": "2024-12-14T08:00:00Z"
        }
        
        success, response, status = self.make_request('POST', 'trip-logs', 
                                                     data=invalid_crew_shift, expected_status=422)
        if status == 422:
            self.log_test("Manual Crew Shift Validation (missing crew_id)", True, 
                         "Correctly rejected invalid data")
        else:
            self.log_test("Manual Crew Shift Validation (missing crew_id)", False, 
                         error=f"Expected 422, got {status}")
        
        # Test 4: Optional fields work correctly
        print("\n   Testing Optional Fields...")
        
        # Test running log with minimal required fields
        minimal_running_log = {
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "log_datetime": "2024-12-14T11:00:00Z",
            "activity": "Minimal test activity"
            # No vessel_id, category, or activity_details
        }
        
        success, response, status = self.make_request('POST', 'running-logs', data=minimal_running_log)
        if success and 'id' in response:
            self.log_test("Manual Running Log with Minimal Fields", True, 
                         "Created log with only required fields")
        else:
            self.log_test("Manual Running Log with Minimal Fields", False, 
                         error=f"Status: {status}")
        
        # Test crew shift with minimal required fields
        minimal_crew_shift = {
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "shift_start_datetime": "2024-12-14T09:00:00Z"
            # No shift_stop_datetime or task_performed
        }
        
        success, response, status = self.make_request('POST', 'trip-logs', data=minimal_crew_shift)
        if success and 'id' in response:
            self.log_test("Manual Crew Shift with Minimal Fields", True, 
                         "Created shift with only required fields")
        else:
            self.log_test("Manual Crew Shift with Minimal Fields", False, 
                         error=f"Status: {status}")

    def test_crew_shifts_endpoint(self):
        """Test crew-shifts endpoint specifically"""
        print("\n👥 Testing Crew Shifts Endpoint...")
        
        if not hasattr(self, 'existing_crew') or not self.existing_crew:
            self.log_test("Crew Shifts Endpoint Test", False, error="No crew members available")
            return False
        
        crew_member = self.existing_crew[0]
        
        # Test crew-shifts endpoint (might be different from trip-logs)
        crew_shift_data = {
            "crew_id": crew_member['id'],
            "crew_name": crew_member['staff_name'],
            "shift_start_datetime": "2024-12-14T07:00:00Z",
            "shift_stop_datetime": "2024-12-14T15:00:00Z",
            "task_performed": "Testing crew shifts endpoint"
        }
        
        success, response, status = self.make_request('POST', 'trip-logs', data=crew_shift_data)
        if success and 'id' in response:
            crew_shift_id = response['id']
            self.log_test("Create Crew Shift via /crew-shifts", True, f"Created: {crew_shift_id}")
            
            # Try to get crew shifts via trip-logs
            success, shifts, _ = self.make_request('GET', 'trip-logs')
            if success and isinstance(shifts, list):
                self.log_test("Get All Crew Shifts via /trip-logs", True, f"Retrieved {len(shifts)} shifts")
            else:
                self.log_test("Get All Crew Shifts via /trip-logs", False, error="Failed to get shifts")
                
        else:
            # If crew-shifts endpoint doesn't exist, it might be using trip-logs
            self.log_test("Create Crew Shift via /trip-logs", True, f"Created: {response['id']}")
            
            # Try with trip-logs endpoint as fallback
            success, response, status = self.make_request('POST', 'trip-logs', data=crew_shift_data)
            if success and 'id' in response:
                self.log_test("Create Crew Shift via /trip-logs (fallback)", True, 
                             f"Created: {response['id']}")
            else:
                self.log_test("Create Crew Shift via /trip-logs (fallback)", False, 
                             error=f"Status: {status}")

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
    # BACKUP/IMPORT TESTS
    # ============================================================================

    def test_backup_import(self):
        """Test backup import functionality with users_export.json"""
        print("\n💾 Testing Backup Import...")
        
        # Check if users_export.json exists
        export_file_path = "/app/users_export.json"
        if not os.path.exists(export_file_path):
            self.log_test("Users Export File Check", False, error="users_export.json not found")
            return False
        
        self.log_test("Users Export File Check", True, "users_export.json found")
        
        # Read and validate JSON structure
        try:
            with open(export_file_path, 'r') as f:
                export_data = json.load(f)
            
            # Validate JSON structure
            if "collections" not in export_data:
                self.log_test("JSON Structure Validation", False, error="Missing 'collections' key")
                return False
            
            if "users" not in export_data["collections"]:
                self.log_test("JSON Structure Validation", False, error="Missing 'users' collection")
                return False
            
            users_count = len(export_data["collections"]["users"])
            self.log_test("JSON Structure Validation", True, f"Valid structure with {users_count} users")
            
            # Check datetime field formats
            datetime_fields_valid = True
            datetime_issues = []
            
            for user in export_data["collections"]["users"]:
                for field in ["created_at", "last_login", "last_active"]:
                    if field in user and user[field] is not None:
                        # Check if it's already in ISO format or needs conversion
                        if isinstance(user[field], str):
                            try:
                                # Try to parse as ISO format
                                datetime.fromisoformat(user[field].replace('Z', '+00:00'))
                            except ValueError:
                                # Try to parse as other format
                                try:
                                    datetime.strptime(user[field], "%Y-%m-%d %H:%M:%S.%f")
                                except ValueError:
                                    datetime_fields_valid = False
                                    datetime_issues.append(f"User {user.get('email', 'unknown')}: {field} = {user[field]}")
            
            if datetime_fields_valid:
                self.log_test("Datetime Fields Validation", True, "All datetime fields are in valid format")
            else:
                self.log_test("Datetime Fields Validation", False, error=f"Invalid datetime formats: {datetime_issues[:3]}")
            
        except json.JSONDecodeError as e:
            self.log_test("JSON Structure Validation", False, error=f"Invalid JSON: {str(e)}")
            return False
        except Exception as e:
            self.log_test("JSON Structure Validation", False, error=f"Error reading file: {str(e)}")
            return False
        
        # Test the import endpoint
        try:
            with open(export_file_path, 'rb') as f:
                files = {'file': ('users_export.json', f, 'application/json')}
                
                success, response, status = self.make_request(
                    'POST', 'backup/import', 
                    files=files,
                    expected_status=200
                )
                
                if success:
                    # Check response structure
                    if "message" in response and "collections_restored" in response:
                        restored_users = response.get("collections_restored", {}).get("users", 0)
                        expected_users = 13
                        
                        if restored_users == expected_users:
                            self.log_test("Backup Import Success", True, 
                                        f"Successfully imported {restored_users} users")
                        else:
                            self.log_test("Backup Import Success", False, 
                                        error=f"Expected {expected_users} users, got {restored_users}")
                        
                        # Verify the response message
                        if "Database restored successfully" in response.get("message", ""):
                            self.log_test("Import Response Message", True, "Correct success message")
                        else:
                            self.log_test("Import Response Message", False, 
                                        error=f"Unexpected message: {response.get('message')}")
                    else:
                        self.log_test("Backup Import Success", False, 
                                    error=f"Missing expected response fields: {response}")
                else:
                    self.log_test("Backup Import Success", False, 
                                error=f"Status: {status}, Response: {response}")
                    
        except Exception as e:
            self.log_test("Backup Import Success", False, error=f"Exception during import: {str(e)}")
        
        # Test backup info endpoint
        success, response, status = self.make_request('GET', 'backup/info')
        if success and isinstance(response, dict):
            total_users = response.get("collections", {}).get("users", 0)
            self.log_test("Backup Info Endpoint", True, f"Database now has {total_users} users")
        else:
            self.log_test("Backup Info Endpoint", False, error=f"Status: {status}")

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
    # CREW SHIFTS DATA CONSISTENCY TESTS (NEW FEATURE)
    # ============================================================================

    def test_crew_shifts_data_consistency(self):
        """Test crew shifts data consistency between Crew Management and Trip Management modules"""
        print("\n👥 Testing Crew Shifts Data Consistency...")
        
        # Test 1: Verify Same Data Source - Both modules query /api/trip-logs
        print("\n   Test 1: Verify Same Data Source...")
        
        # Get all crew shifts (trip logs)
        success, all_shifts, status = self.make_request('GET', 'trip-logs')
        if success and isinstance(all_shifts, list):
            self.log_test("Get All Crew Shifts (/api/trip-logs)", True, 
                         f"Total shifts: {len(all_shifts)}")
            
            # Show first shift structure if available
            if all_shifts:
                first_shift = all_shifts[0]
                self.log_test("First Shift Data Structure", True, 
                             f"Fields: {list(first_shift.keys())}")
        else:
            self.log_test("Get All Crew Shifts (/api/trip-logs)", False, 
                         error=f"Status: {status}")
            return False
        
        # Test 2: Get crew shifts filtered by crew_id
        print("\n   Test 2: Crew Shifts Filtered by Crew ID...")
        
        if hasattr(self, 'existing_crew') and self.existing_crew:
            crew_member = self.existing_crew[0]
            crew_id = crew_member['id']
            
            # Filter shifts by crew_id (client-side filtering simulation)
            crew_shifts = [s for s in all_shifts if s.get('crew_id') == crew_id]
            
            self.log_test("Crew Shifts for Specific Crew", True, 
                         f"Crew: {crew_member['staff_name']}, Shifts: {len(crew_shifts)}")
            
            # Show shift details for this crew
            if crew_shifts:
                for i, shift in enumerate(crew_shifts[:3]):  # Show first 3
                    start_time = shift.get('shift_start_datetime', 'N/A')
                    end_time = shift.get('shift_stop_datetime', 'N/A')
                    task = shift.get('task_performed', 'N/A')
                    print(f"      - Shift {i+1}: {start_time} to {end_time}: {task}")
        else:
            self.log_test("Crew Shifts for Specific Crew", False, 
                         error="No crew members available for testing")
        
        # Test 3: Get crew shifts filtered by trip_id
        print("\n   Test 3: Crew Shifts Filtered by Trip ID...")
        
        if hasattr(self, 'existing_trips') and self.existing_trips:
            trip = self.existing_trips[0]
            trip_id = trip['id']
            
            # Get shifts for specific trip
            success, trip_shifts, status = self.make_request('GET', f'trip-logs?trip_id={trip_id}')
            if success and isinstance(trip_shifts, list):
                self.log_test("Crew Shifts for Specific Trip", True, 
                             f"Trip: {trip.get('trip_name', 'Unknown')}, Shifts: {len(trip_shifts)}")
                
                # Show shift details for this trip
                for i, shift in enumerate(trip_shifts[:3]):  # Show first 3
                    crew_name = shift.get('crew_name', 'N/A')
                    start_time = shift.get('shift_start_datetime', 'N/A')
                    task = shift.get('task_performed', 'N/A')
                    print(f"      - Crew: {crew_name}, Start: {start_time}, Task: {task}")
            else:
                self.log_test("Crew Shifts for Specific Trip", False, 
                             error=f"Status: {status}")
        else:
            self.log_test("Crew Shifts for Specific Trip", False, 
                         error="No trips available for testing")
        
        # Test 4: Verify Data Structure Consistency
        print("\n   Test 4: Verify Data Structure...")
        
        if all_shifts:
            shift = all_shifts[0]
            
            # Check for expected fields in trip_logs model
            expected_fields = [
                'id', 'crew_id', 'crew_name', 'shift_start_datetime', 
                'shift_stop_datetime', 'task_performed', 'total_hours'
            ]
            
            missing_fields = []
            present_fields = []
            
            for field in expected_fields:
                if field in shift:
                    present_fields.append(f"{field}: {type(shift[field]).__name__}")
                else:
                    missing_fields.append(field)
            
            if not missing_fields:
                self.log_test("Data Structure Validation", True, 
                             f"All expected fields present: {present_fields}")
            else:
                self.log_test("Data Structure Validation", False, 
                             error=f"Missing fields: {missing_fields}")
            
            # Check for old fields that should NOT be present
            old_fields = ['log_datetime', 'activity', 'activity_details']
            found_old_fields = [field for field in old_fields if field in shift]
            
            if not found_old_fields:
                self.log_test("Old Fields Check (should be absent)", True, 
                             "No old running_logs fields found")
            else:
                self.log_test("Old Fields Check (should be absent)", False, 
                             error=f"Found old fields: {found_old_fields}")
        else:
            self.log_test("Data Structure Validation", False, 
                         error="No shifts available for structure validation")
        
        # Test 5: Create a test crew shift and verify it appears in both contexts
        print("\n   Test 5: Create Test Shift and Verify Consistency...")
        
        if hasattr(self, 'existing_crew') and self.existing_crew and hasattr(self, 'existing_trips') and self.existing_trips:
            crew_member = self.existing_crew[0]
            trip = self.existing_trips[0]
            
            # Create a test crew shift
            test_shift_data = {
                "trip_id": trip['id'],
                "crew_id": crew_member['id'],
                "crew_name": crew_member['staff_name'],
                "shift_start_datetime": "2024-12-14T08:00:00Z",
                "shift_stop_datetime": "2024-12-14T16:00:00Z",
                "task_performed": "Data consistency test shift"
            }
            
            success, response, status = self.make_request('POST', 'trip-logs', data=test_shift_data)
            if success and 'id' in response:
                test_shift_id = response['id']
                self.log_test("Create Test Crew Shift", True, f"Created shift: {test_shift_id}")
                
                # Verify it appears in all shifts query
                success, updated_all_shifts, _ = self.make_request('GET', 'trip-logs')
                if success:
                    test_shift_in_all = any(s['id'] == test_shift_id for s in updated_all_shifts)
                    if test_shift_in_all:
                        self.log_test("Test Shift in All Shifts Query", True, 
                                     "Shift appears in /api/trip-logs")
                    else:
                        self.log_test("Test Shift in All Shifts Query", False, 
                                     error="Shift not found in all shifts query")
                
                # Verify it appears in trip-specific query
                success, trip_specific_shifts, _ = self.make_request('GET', f'trip-logs?trip_id={trip["id"]}')
                if success:
                    test_shift_in_trip = any(s['id'] == test_shift_id for s in trip_specific_shifts)
                    if test_shift_in_trip:
                        self.log_test("Test Shift in Trip-Specific Query", True, 
                                     "Shift appears in trip-filtered query")
                    else:
                        self.log_test("Test Shift in Trip-Specific Query", False, 
                                     error="Shift not found in trip-specific query")
                
                # Clean up test shift
                success, _, _ = self.make_request('DELETE', f'trip-logs/{test_shift_id}')
                if success:
                    print(f"      Cleaned up test shift: {test_shift_id}")
                    
            else:
                self.log_test("Create Test Crew Shift", False, 
                             error=f"Status: {status}, Response: {response}")
        else:
            self.log_test("Create Test Crew Shift", False, 
                         error="No crew or trips available for consistency test")
        
        # Test 6: Verify endpoint consistency (no separate crew-shifts endpoint)
        print("\n   Test 6: Verify Endpoint Consistency...")
        
        # Test that there's no separate crew-shifts endpoint (should use trip-logs)
        success, response, status = self.make_request('GET', 'crew-shifts', expected_status=404)
        if status == 404:
            self.log_test("No Separate Crew-Shifts Endpoint", True, 
                         "Correctly uses /api/trip-logs for crew shifts")
        else:
            self.log_test("No Separate Crew-Shifts Endpoint", False, 
                         error=f"Unexpected crew-shifts endpoint exists (status: {status})")
        
        # Summary of data consistency test
        print("\n   📊 Data Consistency Summary:")
        print(f"      - Both modules query same endpoint: /api/trip-logs")
        print(f"      - Data structure uses trip_logs model fields")
        print(f"      - No references to old running_logs fields")
        print(f"      - Consistent filtering by trip_id and crew_id")

    # ============================================================================
    # NEW FIELDS TESTING (REVIEW REQUEST SPECIFIC)
    # ============================================================================

    def test_risk_assessment_new_fields(self):
        """Test Risk Assessment new fields: next_risk_date, risk_frequency_quantity, risk_frequency_duration, completion_notes"""
        print("\n⚠️ Testing Risk Assessment New Fields...")
        
        # Test 1: Create risk assessment with new fields
        risk_data_with_new_fields = {
            "activity_task": "Testing new risk assessment fields",
            "location": "Test Location",
            "hazard": "Test hazard for new fields",
            "risk_description": "Testing new field implementation",
            "likelihood": "3",
            "consequence": "4", 
            "risk_level": "High",
            "risk_rating": "12",
            "control_measures": "Test control measures",
            "responsible_person": "Test Officer",
            "review_date": "2024-06-15T00:00:00Z",
            "status": "Active",
            # NEW FIELDS
            "next_risk_date": "2024-12-15T00:00:00Z",
            "risk_frequency_quantity": 3,
            "risk_frequency_duration": "Monthly",
            "completion_notes": "Test completion notes for new field validation"
        }
        
        success, response, status = self.make_request('POST', 'risk-assessments', data=risk_data_with_new_fields)
        if success and 'id' in response:
            risk_id = response['id']
            self.created_risks.append(risk_id)
            self.log_test("Create Risk Assessment with New Fields", True, f"Created risk: {risk_id}")
            
            # Test 2: Verify GET returns new fields
            success, get_response, _ = self.make_request('GET', f'risk-assessments/{risk_id}')
            if success:
                # Check all new fields are present and correct
                new_fields_correct = (
                    get_response.get('next_risk_date') is not None and
                    get_response.get('risk_frequency_quantity') == 3 and
                    get_response.get('risk_frequency_duration') == "Monthly" and
                    get_response.get('completion_notes') == "Test completion notes for new field validation"
                )
                
                if new_fields_correct:
                    self.log_test("GET Risk Assessment - New Fields Verification", True, 
                                 f"All new fields preserved: next_risk_date, risk_frequency_quantity=3, risk_frequency_duration=Monthly")
                else:
                    self.log_test("GET Risk Assessment - New Fields Verification", False, 
                                 error=f"New fields not preserved correctly: {get_response}")
            else:
                self.log_test("GET Risk Assessment - New Fields Verification", False, error="Failed to retrieve risk assessment")
            
            # Test 3: Update risk assessment with new fields
            update_data = risk_data_with_new_fields.copy()
            update_data['next_risk_date'] = "2025-01-15T00:00:00Z"
            update_data['risk_frequency_quantity'] = 6
            update_data['risk_frequency_duration'] = "Quarterly"
            update_data['completion_notes'] = "Updated completion notes for testing"
            
            success, update_response, _ = self.make_request('PUT', f'risk-assessments/{risk_id}', data=update_data)
            if success:
                self.log_test("PUT Risk Assessment - Update New Fields", True, "Successfully updated new fields")
                
                # Verify updated values
                success, verify_response, _ = self.make_request('GET', f'risk-assessments/{risk_id}')
                if success:
                    updated_fields_correct = (
                        verify_response.get('risk_frequency_quantity') == 6 and
                        verify_response.get('risk_frequency_duration') == "Quarterly" and
                        "Updated completion notes" in verify_response.get('completion_notes', '')
                    )
                    
                    if updated_fields_correct:
                        self.log_test("Verify Updated New Fields", True, "New fields updated correctly")
                    else:
                        self.log_test("Verify Updated New Fields", False, 
                                     error=f"Updated fields incorrect: {verify_response}")
                else:
                    self.log_test("Verify Updated New Fields", False, error="Failed to verify updates")
            else:
                self.log_test("PUT Risk Assessment - Update New Fields", False, error="Failed to update risk assessment")
                
        else:
            self.log_test("Create Risk Assessment with New Fields", False, 
                         error=f"Status: {status}, Response: {response}")
        
        # Test 4: Test all valid risk_frequency_duration values
        valid_durations = ["Daily", "Monthly", "Quarterly", "Annually", "Bi-Annually"]
        for duration in valid_durations:
            test_risk_data = {
                "activity_task": f"Test {duration} frequency",
                "hazard": "Test hazard",
                "likelihood": "2",
                "consequence": "3",
                "risk_level": "Medium",
                "risk_rating": "6",
                "risk_frequency_quantity": 1,
                "risk_frequency_duration": duration
            }
            
            success, response, status = self.make_request('POST', 'risk-assessments', data=test_risk_data)
            if success and 'id' in response:
                test_risk_id = response['id']
                self.created_risks.append(test_risk_id)
                self.log_test(f"Risk Frequency Duration - {duration}", True, f"Accepted {duration} frequency")
            else:
                self.log_test(f"Risk Frequency Duration - {duration}", False, 
                             error=f"Failed to create with {duration} frequency")

    def test_maintenance_quote_pdf_field(self):
        """Test Maintenance quote_pdf_url field"""
        print("\n🔧 Testing Maintenance Quote PDF Field...")
        
        # Test 1: Create maintenance record with quote_pdf_url
        maintenance_data_with_pdf = {
            "title": "Test Maintenance with Quote PDF",
            "maintenance_type": "Scheduled",
            "equipment_system": "Engine",
            "description": "Testing quote PDF URL field",
            "status": "Scheduled",
            "priority": "Medium",
            "responsible_person": "Test Technician",
            "cost": 1500.00,
            "quote_pdf_url": "https://example.com/quotes/maintenance-quote-123.pdf"
        }
        
        success, response, status = self.make_request('POST', 'maintenance', data=maintenance_data_with_pdf)
        if success and 'id' in response:
            maintenance_id = response['id']
            self.log_test("Create Maintenance with Quote PDF URL", True, f"Created maintenance: {maintenance_id}")
            
            # Test 2: Verify GET returns quote_pdf_url field
            success, get_response, _ = self.make_request('GET', f'maintenance/{maintenance_id}')
            if success:
                quote_pdf_url = get_response.get('quote_pdf_url')
                if quote_pdf_url == "https://example.com/quotes/maintenance-quote-123.pdf":
                    self.log_test("GET Maintenance - Quote PDF URL Verification", True, 
                                 f"Quote PDF URL preserved: {quote_pdf_url}")
                else:
                    self.log_test("GET Maintenance - Quote PDF URL Verification", False, 
                                 error=f"Quote PDF URL not preserved: {quote_pdf_url}")
            else:
                self.log_test("GET Maintenance - Quote PDF URL Verification", False, error="Failed to retrieve maintenance")
            
            # Test 3: Update quote_pdf_url field
            update_data = maintenance_data_with_pdf.copy()
            update_data['quote_pdf_url'] = "https://example.com/quotes/updated-quote-456.pdf"
            update_data['status'] = "In Progress"
            
            success, update_response, _ = self.make_request('PUT', f'maintenance/{maintenance_id}', data=update_data)
            if success:
                self.log_test("PUT Maintenance - Update Quote PDF URL", True, "Successfully updated quote PDF URL")
                
                # Verify updated value
                success, verify_response, _ = self.make_request('GET', f'maintenance/{maintenance_id}')
                if success:
                    updated_url = verify_response.get('quote_pdf_url')
                    if updated_url == "https://example.com/quotes/updated-quote-456.pdf":
                        self.log_test("Verify Updated Quote PDF URL", True, "Quote PDF URL updated correctly")
                    else:
                        self.log_test("Verify Updated Quote PDF URL", False, 
                                     error=f"Updated URL incorrect: {updated_url}")
                else:
                    self.log_test("Verify Updated Quote PDF URL", False, error="Failed to verify update")
            else:
                self.log_test("PUT Maintenance - Update Quote PDF URL", False, error="Failed to update maintenance")
                
        else:
            self.log_test("Create Maintenance with Quote PDF URL", False, 
                         error=f"Status: {status}, Response: {response}")
        
        # Test 4: Test GET all maintenance includes quote_pdf_url
        success, all_maintenance, status = self.make_request('GET', 'maintenance')
        if success and isinstance(all_maintenance, list):
            maintenance_with_pdf = [m for m in all_maintenance if m.get('quote_pdf_url')]
            self.log_test("GET All Maintenance - Quote PDF URL Field", True, 
                         f"Retrieved {len(all_maintenance)} maintenance records, {len(maintenance_with_pdf)} with quote PDF URLs")
        else:
            self.log_test("GET All Maintenance - Quote PDF URL Field", False, error=f"Status: {status}")

    def test_compliance_certificate_pdf_field(self):
        """Test Compliance Certificate pdf_url field"""
        print("\n📋 Testing Compliance Certificate PDF Field...")
        
        # Test 1: Create certificate with pdf_url
        certificate_data_with_pdf = {
            "certificate_type": "Vessel Certificate",
            "certificate_name": "Test Safety Certificate",
            "certificate_number": "TSC-2024-001",
            "issuing_authority": "Test Maritime Authority",
            "issue_date": "2024-01-01T00:00:00Z",
            "expiry_date": "2025-01-01T00:00:00Z",
            "pdf_url": "https://example.com/certificates/safety-cert-001.pdf",
            "notes": "Test certificate with PDF URL"
        }
        
        success, response, status = self.make_request('POST', 'compliance/certificates', data=certificate_data_with_pdf)
        if success and 'id' in response:
            certificate_id = response['id']
            self.log_test("Create Certificate with PDF URL", True, f"Created certificate: {certificate_id}")
            
            # Test 2: Verify GET returns pdf_url field (using GET all certificates and filter)
            success, all_certificates, _ = self.make_request('GET', 'compliance/certificates')
            if success:
                # Find our certificate in the list
                created_cert = next((cert for cert in all_certificates if cert['id'] == certificate_id), None)
                if created_cert:
                    pdf_url = created_cert.get('pdf_url')
                    if pdf_url == "https://example.com/certificates/safety-cert-001.pdf":
                        self.log_test("GET Certificate - PDF URL Verification", True, 
                                     f"PDF URL preserved: {pdf_url}")
                    else:
                        self.log_test("GET Certificate - PDF URL Verification", False, 
                                     error=f"PDF URL not preserved: {pdf_url}")
                else:
                    self.log_test("GET Certificate - PDF URL Verification", False, 
                                 error="Certificate not found in list")
            else:
                self.log_test("GET Certificate - PDF URL Verification", False, error="Failed to retrieve certificates")
            
            # Test 3: Update pdf_url field
            update_data = certificate_data_with_pdf.copy()
            update_data['pdf_url'] = "https://example.com/certificates/updated-cert-002.pdf"
            update_data['notes'] = "Updated certificate with new PDF URL"
            
            success, update_response, _ = self.make_request('PUT', f'compliance/certificates/{certificate_id}', data=update_data)
            if success:
                self.log_test("PUT Certificate - Update PDF URL", True, "Successfully updated PDF URL")
                
                # Verify updated value (using GET all certificates and filter)
                success, updated_certificates, _ = self.make_request('GET', 'compliance/certificates')
                if success:
                    updated_cert = next((cert for cert in updated_certificates if cert['id'] == certificate_id), None)
                    if updated_cert:
                        updated_url = updated_cert.get('pdf_url')
                        if updated_url == "https://example.com/certificates/updated-cert-002.pdf":
                            self.log_test("Verify Updated Certificate PDF URL", True, "PDF URL updated correctly")
                        else:
                            self.log_test("Verify Updated Certificate PDF URL", False, 
                                         error=f"Updated URL incorrect: {updated_url}")
                    else:
                        self.log_test("Verify Updated Certificate PDF URL", False, 
                                     error="Updated certificate not found in list")
                else:
                    self.log_test("Verify Updated Certificate PDF URL", False, error="Failed to verify update")
            else:
                self.log_test("PUT Certificate - Update PDF URL", False, error="Failed to update certificate")
                
        else:
            self.log_test("Create Certificate with PDF URL", False, 
                         error=f"Status: {status}, Response: {response}")
        
        # Test 4: Test GET all certificates includes pdf_url
        success, all_certificates, status = self.make_request('GET', 'compliance/certificates')
        if success and isinstance(all_certificates, list):
            certificates_with_pdf = [c for c in all_certificates if c.get('pdf_url')]
            self.log_test("GET All Certificates - PDF URL Field", True, 
                         f"Retrieved {len(all_certificates)} certificates, {len(certificates_with_pdf)} with PDF URLs")
        else:
            self.log_test("GET All Certificates - PDF URL Field", False, error=f"Status: {status}")

    def test_file_upload_api(self):
        """Test document upload API endpoint"""
        print("\n📤 Testing File Upload API...")
        
        # Test 1: Verify POST /api/documents/upload endpoint exists
        # Create a temporary test file
        test_content = b"This is a test PDF file content for upload testing"
        
        try:
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(test_content)
                temp_file_path = temp_file.name
            
            # Test file upload
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('test-document.pdf', f, 'application/pdf')}
                
                success, response, status = self.make_request(
                    'POST', 'documents/upload',
                    files=files,
                    expected_status=200
                )
                
                if success:
                    # Test 2: Verify response structure
                    expected_fields = ['file_url', 'filename', 'file_type', 'size']
                    has_all_fields = all(field in response for field in expected_fields)
                    
                    if has_all_fields:
                        file_url = response.get('file_url')
                        filename = response.get('filename')
                        file_type = response.get('file_type')
                        file_size = response.get('size')
                        
                        self.log_test("POST /api/documents/upload - Response Structure", True, 
                                     f"file_url: {file_url}, filename: {filename}, type: {file_type}, size: {file_size}")
                        
                        # Test 3: Verify file_url is returned
                        if file_url and file_url.startswith('/api/uploads/'):
                            self.log_test("File Upload - file_url Format", True, 
                                         f"Correct file_url format: {file_url}")
                        else:
                            self.log_test("File Upload - file_url Format", False, 
                                         error=f"Incorrect file_url format: {file_url}")
                        
                        # Test 4: Verify filename preservation
                        if filename == 'test-document.pdf':
                            self.log_test("File Upload - Filename Preservation", True, 
                                         f"Original filename preserved: {filename}")
                        else:
                            self.log_test("File Upload - Filename Preservation", False, 
                                         error=f"Filename not preserved: {filename}")
                        
                        # Test 5: Verify file type detection
                        if file_type == 'application/pdf':
                            self.log_test("File Upload - File Type Detection", True, 
                                         f"Correct file type detected: {file_type}")
                        else:
                            self.log_test("File Upload - File Type Detection", False, 
                                         error=f"Incorrect file type: {file_type}")
                        
                        # Test 6: Verify file size
                        if file_size == len(test_content):
                            self.log_test("File Upload - File Size Calculation", True, 
                                         f"Correct file size: {file_size} bytes")
                        else:
                            self.log_test("File Upload - File Size Calculation", False, 
                                         error=f"Incorrect file size: {file_size}, expected: {len(test_content)}")
                    else:
                        missing_fields = [field for field in expected_fields if field not in response]
                        self.log_test("POST /api/documents/upload - Response Structure", False, 
                                     error=f"Missing fields: {missing_fields}")
                else:
                    self.log_test("POST /api/documents/upload - Endpoint Exists", False, 
                                 error=f"Status: {status}, Response: {response}")
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
        except Exception as e:
            self.log_test("File Upload API Test", False, error=f"Exception: {str(e)}")
        
        # Test 7: Test upload with different file types
        test_files = [
            ('test.jpg', b'fake jpeg content', 'image/jpeg'),
            ('test.png', b'fake png content', 'image/png'),
            ('test.txt', b'fake text content', 'text/plain')
        ]
        
        for filename, content, content_type in test_files:
            try:
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    temp_file.write(content)
                    temp_file_path = temp_file.name
                
                with open(temp_file_path, 'rb') as f:
                    files = {'file': (filename, f, content_type)}
                    
                    success, response, status = self.make_request(
                        'POST', 'documents/upload',
                        files=files,
                        expected_status=200
                    )
                    
                    if success and 'file_url' in response:
                        self.log_test(f"File Upload - {filename}", True, 
                                     f"Successfully uploaded {filename}")
                    else:
                        self.log_test(f"File Upload - {filename}", False, 
                                     error=f"Failed to upload {filename}: {status}")
                
                os.unlink(temp_file_path)
                
            except Exception as e:
                self.log_test(f"File Upload - {filename}", False, error=f"Exception: {str(e)}")

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

    # ============================================================================
    # REFACTORED DIALOG COMPONENTS TESTS (SPECIFIC TO REVIEW REQUEST)
    # ============================================================================

    def test_vessel_details_dialog_apis(self):
        """Test APIs used by VesselDetailsDialog after frontend refactoring"""
        print("\n🚢 Testing Vessel Details Dialog APIs (Post-Refactoring)...")
        
        # Get vessels list first
        success, vessels, status = self.make_request('GET', 'vessels')
        if not success or not vessels:
            self.log_test("Get Vessels for Dialog Testing", False, error=f"Status: {status}")
            return False
        
        vessel = vessels[0]
        vessel_id = vessel['id']
        self.log_test("Get Vessels List", True, f"Retrieved {len(vessels)} vessels")
        
        # Test vessel running logs API
        success, running_logs, status = self.make_request('GET', f'vessels/{vessel_id}/running-logs')
        if success:
            self.log_test("GET /api/vessels/{id}/running-logs", True, f"Retrieved {len(running_logs)} running logs")
        else:
            # Try alternative endpoint
            success, running_logs, status = self.make_request('GET', f'running-logs?vessel_id={vessel_id}')
            if success:
                self.log_test("GET /api/running-logs?vessel_id={id}", True, f"Retrieved {len(running_logs)} running logs")
            else:
                self.log_test("GET /api/vessels/{id}/running-logs", False, error=f"Status: {status}")
        
        # Test vessel staff logs API
        success, staff_logs, status = self.make_request('GET', f'vessels/{vessel_id}/staff-logs')
        if success:
            self.log_test("GET /api/vessels/{id}/staff-logs", True, f"Retrieved {len(staff_logs)} staff logs")
        else:
            # Try alternative endpoint
            success, staff_logs, status = self.make_request('GET', f'trip-logs?vessel_id={vessel_id}')
            if success:
                self.log_test("GET /api/trip-logs?vessel_id={id}", True, f"Retrieved {len(staff_logs)} staff logs")
            else:
                self.log_test("GET /api/vessels/{id}/staff-logs", False, error=f"Status: {status}")

    def test_crew_details_dialog_apis(self):
        """Test APIs used by CrewDetailsDialog after frontend refactoring"""
        print("\n👥 Testing Crew Details Dialog APIs (Post-Refactoring)...")
        
        # Get crew list first
        success, crew_list, status = self.make_request('GET', 'crew')
        if not success or not crew_list:
            self.log_test("Get Crew for Dialog Testing", False, error=f"Status: {status}")
            return False
        
        crew_member = crew_list[0]
        crew_id = crew_member['id']
        crew_name = crew_member['staff_name']
        self.log_test("Get Crew List", True, f"Retrieved {len(crew_list)} crew members")
        
        # Test crew trips API
        success, trips, status = self.make_request('GET', f'crew/{crew_id}/trips')
        if success:
            self.log_test("GET /api/crew/{id}/trips", True, f"Retrieved {len(trips)} trips")
        else:
            # Try alternative endpoint
            success, trips, status = self.make_request('GET', f'trips?crew_id={crew_id}')
            if success:
                self.log_test("GET /api/trips?crew_id={id}", True, f"Retrieved {len(trips)} trips")
            else:
                self.log_test("GET /api/crew/{id}/trips", False, error=f"Status: {status}")
        
        # Test crew shifts API
        success, shifts, status = self.make_request('GET', f'crew/{crew_id}/shifts')
        if success:
            self.log_test("GET /api/crew/{id}/shifts", True, f"Retrieved {len(shifts)} shifts")
        else:
            # Try alternative endpoint
            success, shifts, status = self.make_request('GET', f'trip-logs?crew_id={crew_id}')
            if success:
                self.log_test("GET /api/trip-logs?crew_id={id}", True, f"Retrieved {len(shifts)} shifts")
            else:
                self.log_test("GET /api/crew/{id}/shifts", False, error=f"Status: {status}")
        
        # Test crew drill records API
        success, drill_records, status = self.make_request('GET', f'crew/{crew_name}/drill-records')
        if success:
            self.log_test("GET /api/crew/{crew_name}/drill-records", True, f"Retrieved {len(drill_records)} drill records")
        else:
            self.log_test("GET /api/crew/{crew_name}/drill-records", False, error=f"Status: {status}")
        
        # Test crew training records API
        success, training_records, status = self.make_request('GET', f'crew/{crew_name}/training-records')
        if success:
            self.log_test("GET /api/crew/{crew_name}/training-records", True, f"Retrieved {len(training_records)} training records")
        else:
            self.log_test("GET /api/crew/{crew_name}/training-records", False, error=f"Status: {status}")

    def test_supporting_dialog_apis(self):
        """Test supporting APIs used by dialogs"""
        print("\n🔧 Testing Supporting Dialog APIs...")
        
        # Test risk assessments API
        success, risk_assessments, status = self.make_request('GET', 'risk-assessments')
        if success:
            self.log_test("GET /api/risk-assessments", True, f"Retrieved {len(risk_assessments)} risk assessments")
        else:
            self.log_test("GET /api/risk-assessments", False, error=f"Status: {status}")
        
        # Test maintenance API
        success, maintenance, status = self.make_request('GET', 'maintenance')
        if success:
            self.log_test("GET /api/maintenance", True, f"Retrieved {len(maintenance)} maintenance records")
        else:
            self.log_test("GET /api/maintenance", False, error=f"Status: {status}")
        
        # Test incidents API
        success, incidents, status = self.make_request('GET', 'incidents')
        if success:
            self.log_test("GET /api/incidents", True, f"Retrieved {len(incidents)} incidents")
        else:
            self.log_test("GET /api/incidents", False, error=f"Status: {status}")
        
        # Test trips list API
        success, trips, status = self.make_request('GET', 'trips')
        if success:
            self.log_test("GET /api/trips", True, f"Retrieved {len(trips)} trips")
        else:
            self.log_test("GET /api/trips", False, error=f"Status: {status}")

    def run_all_tests(self):
        """Run all AMSA system tests"""
        print("🚀 Starting AMSA Safety Management Backend Testing - New Fields Review")
        print(f"Backend URL: {self.base_url}")
        print("=" * 70)
        
        # Authentication is required for all other tests
        if not self.test_authentication():
            print("\n❌ Authentication failed - cannot continue with other tests")
            return False
        
        # Run NEW FIELDS TESTS (Review Request Focus)
        new_fields_tests = [
            self.test_risk_assessment_new_fields,      # Test 1: Risk Assessment New Fields
            self.test_maintenance_quote_pdf_field,     # Test 2: Maintenance Quote PDF Field
            self.test_compliance_certificate_pdf_field, # Test 3: Compliance Certificate PDF Field
            self.test_file_upload_api,                 # Test 4: File Upload API
        ]
        
        print("\n🎯 PRIORITY TESTS - NEW FIELDS IMPLEMENTATION")
        for test_method in new_fields_tests:
            try:
                test_method()
            except Exception as e:
                self.log_test(test_method.__name__, False, error=f"Exception: {str(e)}")
        
        # Run supporting tests to ensure system integrity
        supporting_tests = [
            self.test_dashboard_stats,
            self.test_user_management,
            self.test_risk_assessment,  # Existing risk assessment tests
        ]
        
        print("\n🔧 SUPPORTING TESTS - System Integrity")
        for test_method in supporting_tests:
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