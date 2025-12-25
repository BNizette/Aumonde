#!/usr/bin/env python3
"""
Backend API Verification After Frontend Refactoring
Tests specific APIs mentioned in the review request for VesselDetailsDialog and CrewDetailsDialog
"""

import requests
import json
import sys

class RefactoredDialogTester:
    def __init__(self, base_url="https://vessel-tracker-hub.preview.emergentagent.com"):
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
            print(f"❌ {name}")
            if error:
                print(f"   Error: {error}")

    def make_request(self, method, endpoint, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json={}, headers=headers)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def authenticate(self):
        """Authenticate with admin credentials"""
        print("🔐 Authenticating...")
        
        success, response, status = self.make_request('POST', 'auth/login')
        url = f"{self.api_url}/auth/login"
        
        try:
            response = requests.post(url, json=self.admin_credentials)
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.token = data['access_token']
                    user = data.get('user', {})
                    self.log_test("Authentication", True, f"Logged in as {user.get('email')}")
                    return True
            
            self.log_test("Authentication", False, error=f"Status: {response.status_code}")
            return False
            
        except Exception as e:
            self.log_test("Authentication", False, error=str(e))
            return False

    def test_vessel_apis(self):
        """Test vessel-related APIs used by VesselDetailsDialog"""
        print("\n🚢 Testing Vessel APIs (VesselDetailsDialog)...")
        
        # 1. GET /api/vessels - List all vessels
        success, vessels, status = self.make_request('GET', 'vessels')
        if success and isinstance(vessels, list):
            self.log_test("GET /api/vessels", True, f"Retrieved {len(vessels)} vessels")
            
            if vessels:
                vessel = vessels[0]
                vessel_id = vessel['id']
                vessel_name = vessel.get('vessel_name', 'Unknown')
                
                # 2. GET /api/vessels/{id}/running-logs - Get running logs for a vessel
                success, running_logs, status = self.make_request('GET', f'vessels/{vessel_id}/running-logs')
                if success:
                    self.log_test("GET /api/vessels/{id}/running-logs", True, 
                                f"Retrieved {len(running_logs)} running logs for {vessel_name}")
                else:
                    # Try alternative endpoint
                    success, running_logs, status = self.make_request('GET', f'running-logs?vessel_id={vessel_id}')
                    if success:
                        self.log_test("GET /api/running-logs?vessel_id={id} (alternative)", True, 
                                    f"Retrieved {len(running_logs)} running logs for {vessel_name}")
                    else:
                        self.log_test("GET /api/vessels/{id}/running-logs", False, 
                                    error=f"Status: {status} - Endpoint may not exist")
                
                # 3. GET /api/vessels/{id}/staff-logs - Get staff logs for a vessel
                success, staff_logs, status = self.make_request('GET', f'vessels/{vessel_id}/staff-logs')
                if success:
                    self.log_test("GET /api/vessels/{id}/staff-logs", True, 
                                f"Retrieved {len(staff_logs)} staff logs for {vessel_name}")
                else:
                    # Try alternative endpoint
                    success, staff_logs, status = self.make_request('GET', f'trip-logs?vessel_id={vessel_id}')
                    if success:
                        self.log_test("GET /api/trip-logs?vessel_id={id} (alternative)", True, 
                                    f"Retrieved {len(staff_logs)} staff logs for {vessel_name}")
                    else:
                        self.log_test("GET /api/vessels/{id}/staff-logs", False, 
                                    error=f"Status: {status} - Endpoint may not exist")
            else:
                self.log_test("Vessel API Testing", False, error="No vessels available for testing")
        else:
            self.log_test("GET /api/vessels", False, error=f"Status: {status}")

    def test_crew_apis(self):
        """Test crew-related APIs used by CrewDetailsDialog"""
        print("\n👥 Testing Crew APIs (CrewDetailsDialog)...")
        
        # 1. GET /api/crew - List all crew
        success, crew_list, status = self.make_request('GET', 'crew')
        if success and isinstance(crew_list, list):
            self.log_test("GET /api/crew", True, f"Retrieved {len(crew_list)} crew members")
            
            if crew_list:
                crew = crew_list[0]
                crew_id = crew['id']
                crew_name = crew.get('staff_name', 'Unknown')
                
                # 2. GET /api/crew/{id}/trips - Get trips for a crew member
                success, trips, status = self.make_request('GET', f'crew/{crew_id}/trips')
                if success:
                    self.log_test("GET /api/crew/{id}/trips", True, 
                                f"Retrieved {len(trips)} trips for {crew_name}")
                else:
                    # Try alternative endpoint
                    success, trips, status = self.make_request('GET', f'trips?crew_id={crew_id}')
                    if success:
                        self.log_test("GET /api/trips?crew_id={id} (alternative)", True, 
                                    f"Retrieved {len(trips)} trips for {crew_name}")
                    else:
                        self.log_test("GET /api/crew/{id}/trips", False, 
                                    error=f"Status: {status} - Endpoint may not exist")
                
                # 3. GET /api/crew/{id}/shifts - Get shifts for a crew member
                success, shifts, status = self.make_request('GET', f'crew/{crew_id}/shifts')
                if success:
                    self.log_test("GET /api/crew/{id}/shifts", True, 
                                f"Retrieved {len(shifts)} shifts for {crew_name}")
                else:
                    # Try alternative endpoint
                    success, shifts, status = self.make_request('GET', f'trip-logs?crew_id={crew_id}')
                    if success:
                        self.log_test("GET /api/trip-logs?crew_id={id} (alternative)", True, 
                                    f"Retrieved {len(shifts)} shifts for {crew_name}")
                    else:
                        self.log_test("GET /api/crew/{id}/shifts", False, 
                                    error=f"Status: {status} - Endpoint may not exist")
                
                # 4. GET /api/crew/{crew_name}/drill-records - Get drill records for crew
                success, drill_records, status = self.make_request('GET', f'crew/{crew_name}/drill-records')
                if success:
                    self.log_test("GET /api/crew/{crew_name}/drill-records", True, 
                                f"Retrieved {len(drill_records)} drill records for {crew_name}")
                else:
                    self.log_test("GET /api/crew/{crew_name}/drill-records", False, 
                                error=f"Status: {status} - Endpoint may not exist")
                
                # 5. GET /api/crew/{crew_name}/training-records - Get training records for crew
                success, training_records, status = self.make_request('GET', f'crew/{crew_name}/training-records')
                if success:
                    self.log_test("GET /api/crew/{crew_name}/training-records", True, 
                                f"Retrieved {len(training_records)} training records for {crew_name}")
                else:
                    self.log_test("GET /api/crew/{crew_name}/training-records", False, 
                                error=f"Status: {status} - Endpoint may not exist")
            else:
                self.log_test("Crew API Testing", False, error="No crew members available for testing")
        else:
            self.log_test("GET /api/crew", False, error=f"Status: {status}")

    def test_supporting_apis(self):
        """Test supporting APIs used by dialogs"""
        print("\n🔧 Testing Supporting APIs...")
        
        # 1. GET /api/risk-assessments - Risk assessments
        success, risk_assessments, status = self.make_request('GET', 'risk-assessments')
        if success:
            self.log_test("GET /api/risk-assessments", True, 
                        f"Retrieved {len(risk_assessments)} risk assessments")
        else:
            self.log_test("GET /api/risk-assessments", False, error=f"Status: {status}")
        
        # 2. GET /api/maintenance - Maintenance records
        success, maintenance, status = self.make_request('GET', 'maintenance')
        if success:
            self.log_test("GET /api/maintenance", True, 
                        f"Retrieved {len(maintenance)} maintenance records")
        else:
            self.log_test("GET /api/maintenance", False, error=f"Status: {status}")
        
        # 3. GET /api/incidents - Incidents
        success, incidents, status = self.make_request('GET', 'incidents')
        if success:
            self.log_test("GET /api/incidents", True, 
                        f"Retrieved {len(incidents)} incidents")
        else:
            self.log_test("GET /api/incidents", False, error=f"Status: {status}")
        
        # 4. GET /api/trips - Trips list
        success, trips, status = self.make_request('GET', 'trips')
        if success:
            self.log_test("GET /api/trips", True, 
                        f"Retrieved {len(trips)} trips")
        else:
            self.log_test("GET /api/trips", False, error=f"Status: {status}")

    def run_tests(self):
        """Run all tests"""
        print("🚀 Backend API Verification After Frontend Refactoring")
        print(f"Backend URL: {self.base_url}")
        print("Testing APIs used by VesselDetailsDialog and CrewDetailsDialog")
        print("=" * 70)
        
        if not self.authenticate():
            print("\n❌ Authentication failed - cannot continue")
            return False
        
        # Run specific tests for refactored dialog components
        self.test_vessel_apis()
        self.test_crew_apis()
        self.test_supporting_apis()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend APIs are working correctly!")
            return True
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  {failed} tests failed - some endpoints may not exist or need implementation")
            return False

def main():
    """Main test execution"""
    tester = RefactoredDialogTester()
    success = tester.run_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())