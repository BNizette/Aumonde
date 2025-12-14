#!/usr/bin/env python3
"""
Manual Log Entry Feature Testing - Specific test for review request
Tests manual vessel log entry and manual crew shift log entry features
"""

import requests
import json
import sys
from datetime import datetime

class ManualLogTester:
    def __init__(self):
        # Get API URL from frontend .env
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    self.base_url = line.split('=')[1].strip()
                    break
        
        self.api_url = f"{self.base_url}/api"
        self.token = None
        
        # Test credentials from review request
        self.admin_credentials = {"email": "admin@test.com", "password": "Admin123!"}

    def login(self):
        """Login and get token"""
        response = requests.post(f"{self.api_url}/auth/login", json=self.admin_credentials)
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            print(f"✅ Login successful as {data['user']['email']}")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False

    def get_headers(self):
        """Get headers with authorization"""
        return {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}

    def test_manual_vessel_log_entry(self):
        """Test manual vessel log entry as described in review request"""
        print("\n🚢 Testing Manual Vessel Log Entry API...")
        
        # Get first crew member ID
        crew_response = requests.get(f"{self.api_url}/crew", headers=self.get_headers())
        if crew_response.status_code != 200 or not crew_response.json():
            print("❌ No crew members available")
            return False
        
        crew_id = crew_response.json()[0]['id']
        print(f"Using crew ID: {crew_id}")
        
        # Get first vessel ID
        vessel_response = requests.get(f"{self.api_url}/vessels", headers=self.get_headers())
        if vessel_response.status_code != 200 or not vessel_response.json():
            print("❌ No vessels available")
            return False
        
        vessel_id = vessel_response.json()[0]['id']
        print(f"Using vessel ID: {vessel_id}")
        
        # Test 1: Create running log WITHOUT trip_id (manual entry)
        manual_log_data = {
            "crew_id": crew_id,
            "crew_name": "Test Crew",
            "vessel_id": vessel_id,
            "log_datetime": "2024-12-14T10:00:00",
            "category": "Safety",
            "activity": "Manual safety inspection",
            "activity_details": "Checked all safety equipment"
        }
        
        response = requests.post(f"{self.api_url}/running-logs", 
                               json=manual_log_data, headers=self.get_headers())
        
        if response.status_code == 200:
            log_id = response.json()['id']
            print(f"✅ Manual vessel log created: {log_id}")
            
            # Test 2: Verify the log was created by fetching vessel logs
            vessel_logs_response = requests.get(f"{self.api_url}/running-logs?vessel_id={vessel_id}", 
                                              headers=self.get_headers())
            
            if vessel_logs_response.status_code == 200:
                vessel_logs = vessel_logs_response.json()
                manual_log_found = any(log['id'] == log_id for log in vessel_logs)
                
                if manual_log_found:
                    print(f"✅ Manual log found in vessel logs ({len(vessel_logs)} total logs)")
                    return True
                else:
                    print("❌ Manual log not found in vessel logs")
                    return False
            else:
                print(f"❌ Failed to fetch vessel logs: {vessel_logs_response.status_code}")
                return False
        else:
            print(f"❌ Failed to create manual vessel log: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    def test_manual_crew_shift_log_entry(self):
        """Test manual crew shift log entry as described in review request"""
        print("\n👥 Testing Manual Crew Shift Log Entry API...")
        
        # Get first crew member ID
        crew_response = requests.get(f"{self.api_url}/crew", headers=self.get_headers())
        if crew_response.status_code != 200 or not crew_response.json():
            print("❌ No crew members available")
            return False
        
        crew_data = crew_response.json()[0]
        crew_id = crew_data['id']
        crew_name = crew_data['staff_name']
        print(f"Using crew: {crew_name} (ID: {crew_id})")
        
        # Test: Create crew shift log WITHOUT trip_id (manual entry)
        manual_shift_data = {
            "crew_id": crew_id,
            "crew_name": crew_name,
            "shift_start_datetime": "2024-12-14T08:00:00",
            "shift_stop_datetime": "2024-12-14T16:00:00",
            "task_performed": "Maintenance and inspection duties"
        }
        
        response = requests.post(f"{self.api_url}/trip-logs", 
                               json=manual_shift_data, headers=self.get_headers())
        
        if response.status_code == 200:
            shift_id = response.json()['id']
            print(f"✅ Manual crew shift created: {shift_id}")
            
            # Verify the crew shift was created
            all_shifts_response = requests.get(f"{self.api_url}/trip-logs", 
                                             headers=self.get_headers())
            
            if all_shifts_response.status_code == 200:
                all_shifts = all_shifts_response.json()
                manual_shift_found = any(shift['id'] == shift_id for shift in all_shifts)
                
                if manual_shift_found:
                    print(f"✅ Manual shift found in crew shifts ({len(all_shifts)} total shifts)")
                    return True
                else:
                    print("❌ Manual shift not found in crew shifts")
                    return False
            else:
                print(f"❌ Failed to fetch crew shifts: {all_shifts_response.status_code}")
                return False
        else:
            print(f"❌ Failed to create manual crew shift: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    def test_data_validation(self):
        """Test data validation for manual entries"""
        print("\n✅ Testing Data Validation...")
        
        # Test missing required fields
        invalid_data = {
            "crew_name": "Test Crew",
            "log_datetime": "2024-12-14T10:00:00",
            "activity": "Test activity"
            # Missing crew_id (required)
        }
        
        response = requests.post(f"{self.api_url}/running-logs", 
                               json=invalid_data, headers=self.get_headers())
        
        if response.status_code == 422:
            print("✅ Validation correctly rejected missing crew_id")
            return True
        else:
            print(f"❌ Validation failed: expected 422, got {response.status_code}")
            return False

    def run_tests(self):
        """Run all manual log entry tests"""
        print("🚀 Starting Manual Log Entry Feature Tests")
        print(f"API URL: {self.api_url}")
        print("=" * 60)
        
        if not self.login():
            return False
        
        tests = [
            self.test_manual_vessel_log_entry,
            self.test_manual_crew_shift_log_entry,
            self.test_data_validation
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        print("\n" + "=" * 60)
        print(f"📊 Manual Log Entry Tests: {passed}/{total} passed")
        
        if passed == total:
            print("🎉 All manual log entry tests passed!")
            return True
        else:
            print(f"⚠️ {total - passed} tests failed")
            return False

if __name__ == "__main__":
    tester = ManualLogTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)