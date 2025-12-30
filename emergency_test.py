#!/usr/bin/env python3
"""
Emergency API Testing Script
Tests the emergency API endpoints as requested in the review
"""

import requests
import json
import sys
from datetime import datetime

class EmergencyAPITester:
    def __init__(self, base_url="https://nautical-ops-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test credentials from review request
        self.admin_credentials = {"email": "admin@test.com", "password": "Admin123!"}

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name} - {error}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def login(self):
        """Login with admin credentials"""
        print("🔐 Logging in...")
        
        success, response, status = self.make_request(
            'POST', 'auth/login', 
            data=self.admin_credentials,
            expected_status=200
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            user_data = response.get('user', {})
            self.log_test("Admin Login", True, f"Logged in as {user_data.get('email')}")
            return True
        else:
            self.log_test("Admin Login", False, error=f"Status: {status}, Response: {response}")
            return False

    def test_emergency_endpoints(self):
        """Test all emergency API endpoints"""
        print("\n🚨 Testing Emergency API Endpoints...")
        
        # Test 1: GET /api/emergency/contacts
        print("\n1. Testing GET /api/emergency/contacts")
        success, contacts_response, status = self.make_request('GET', 'emergency/contacts')
        if success and isinstance(contacts_response, list):
            self.log_test("GET /api/emergency/contacts", True, f"Retrieved {len(contacts_response)} emergency contacts")
            
            # Verify data structure
            if contacts_response:
                contact = contacts_response[0]
                has_required_fields = 'name' in contact and 'phone_primary' in contact
                if has_required_fields:
                    self.log_test("Emergency Contacts - Required Fields", True, 
                                f"Sample: {contact.get('name')} - {contact.get('phone_primary')}")
                else:
                    self.log_test("Emergency Contacts - Required Fields", False, 
                                error=f"Missing required fields. Available: {list(contact.keys())}")
            else:
                self.log_test("Emergency Contacts - Data Check", True, "No contacts found (empty list)")
        else:
            self.log_test("GET /api/emergency/contacts", False, error=f"Status: {status}")
        
        # Test 2: GET /api/emergency/procedures
        print("\n2. Testing GET /api/emergency/procedures")
        success, procedures_response, status = self.make_request('GET', 'emergency/procedures')
        if success and isinstance(procedures_response, list):
            self.log_test("GET /api/emergency/procedures", True, f"Retrieved {len(procedures_response)} emergency procedures")
            
            # Verify data structure
            if procedures_response:
                procedure = procedures_response[0]
                has_required_fields = 'title' in procedure and 'emergency_type' in procedure
                if has_required_fields:
                    self.log_test("Emergency Procedures - Required Fields", True, 
                                f"Sample: {procedure.get('title')} - {procedure.get('emergency_type')}")
                else:
                    self.log_test("Emergency Procedures - Required Fields", False, 
                                error=f"Missing required fields. Available: {list(procedure.keys())}")
            else:
                self.log_test("Emergency Procedures - Data Check", True, "No procedures found (empty list)")
        else:
            self.log_test("GET /api/emergency/procedures", False, error=f"Status: {status}")
        
        # Test 3: GET /api/emergency/drills
        print("\n3. Testing GET /api/emergency/drills")
        success, drills_response, status = self.make_request('GET', 'emergency/drills')
        if success and isinstance(drills_response, list):
            self.log_test("GET /api/emergency/drills", True, f"Retrieved {len(drills_response)} emergency drills")
            
            # Verify data structure
            if drills_response:
                drill = drills_response[0]
                self.log_test("Emergency Drills - Data Structure", True, 
                            f"Sample drill has {len(drill.keys())} fields")
            else:
                self.log_test("Emergency Drills - Data Check", True, "No drills found (empty list)")
        else:
            self.log_test("GET /api/emergency/drills", False, error=f"Status: {status}")
        
        # Test 4: GET /api/vessels
        print("\n4. Testing GET /api/vessels")
        success, vessels_response, status = self.make_request('GET', 'vessels')
        if success and isinstance(vessels_response, list):
            self.log_test("GET /api/vessels", True, f"Retrieved {len(vessels_response)} vessels")
            
            if vessels_response:
                vessel = vessels_response[0]
                vessel_id = vessel.get('id')
                vessel_name = vessel.get('vessel_name', 'Unknown')
                self.log_test("Vessel ID Available", True, f"Sample vessel: {vessel_name} (ID: {vessel_id})")
            else:
                self.log_test("Vessel ID Available", False, error="No vessels available")
        else:
            self.log_test("GET /api/vessels", False, error=f"Status: {status}")
        
        # Print summary with counts and sample data
        print("\n📊 Emergency API Test Summary:")
        print("=" * 50)
        
        if success and isinstance(contacts_response, list):
            print(f"Emergency Contacts: {len(contacts_response)}")
            if contacts_response:
                contact = contacts_response[0]
                print(f"  Sample Contact: {contact.get('name', 'N/A')} - {contact.get('phone_primary', 'N/A')}")
        
        if success and isinstance(procedures_response, list):
            print(f"Emergency Procedures: {len(procedures_response)}")
            if procedures_response:
                procedure = procedures_response[0]
                print(f"  Sample Procedure: {procedure.get('title', 'N/A')} ({procedure.get('emergency_type', 'N/A')})")
        
        if success and isinstance(drills_response, list):
            print(f"Emergency Drills: {len(drills_response)}")
            if drills_response:
                drill = drills_response[0]
                print(f"  Sample Drill: {drill.get('drill_type', 'N/A')} on {drill.get('drill_date', 'N/A')}")
        
        if success and isinstance(vessels_response, list):
            print(f"Vessels Available: {len(vessels_response)}")
            if vessels_response:
                vessel = vessels_response[0]
                print(f"  Sample Vessel: {vessel.get('vessel_name', 'N/A')} (ID: {vessel.get('id', 'N/A')})")

    def run_tests(self):
        """Run all emergency API tests"""
        print("🚀 Starting Emergency API Testing")
        print(f"🌐 Testing against: {self.api_url}")
        print("=" * 70)
        
        # Login first
        if not self.login():
            print("❌ Login failed - cannot continue with tests")
            return False
        
        # Run emergency endpoint tests
        self.test_emergency_endpoints()
        
        # Print final summary
        print("\n" + "=" * 70)
        print(f"📊 Final Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All emergency API tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = EmergencyAPITester()
    success = tester.run_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())