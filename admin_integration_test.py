#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class AdminIntegrationTester:
    def __init__(self, base_url="https://maritime-sms-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.owner_token = None
        self.owner_id = None
        self.master_token = None
        self.master_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        auth_token = token or self.owner_token
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def setup_users(self):
        """Login as both users"""
        # Login as owner
        login_data = {"email": "brian@hover.com.au", "password": "Hover2024!"}
        success, response = self.run_test("Owner Login", "POST", "auth/login", 200, data=login_data)
        if success and 'token' in response:
            self.owner_token = response['token']
            self.owner_id = response['user']['id']
        
        # Login as master
        login_data = {"email": "master@test.com", "password": "Test123!"}
        success, response = self.run_test("Master Login", "POST", "auth/login", 200, data=login_data)
        if success and 'token' in response:
            self.master_token = response['token']
            self.master_id = response['user']['id']
        
        return self.owner_token and self.master_token

    def test_force_logout_integration(self):
        """Test complete force logout integration"""
        print("\n🔄 Testing Force Logout Integration...")
        
        # Step 1: Get all sessions
        success, sessions = self.run_test("Get All Sessions", "GET", "admin/sessions", 200)
        if not success:
            return False
        
        # Step 2: Find master's session
        master_session = None
        for session in sessions:
            if session.get('user', {}).get('email') == 'master@test.com':
                master_session = session
                break
        
        if not master_session:
            self.log_test("Find Master Session", False, "Master session not found")
            return False
        
        self.log_test("Find Master Session", True)
        
        # Step 3: Force logout master's session
        success, response = self.run_test(
            "Force Logout Master Session", 
            "DELETE", 
            f"admin/sessions/{master_session['id']}", 
            200
        )
        
        if not success:
            return False
        
        # Step 4: Verify master can't use old token
        success, response = self.run_test(
            "Master Token Invalid After Force Logout", 
            "GET", 
            "auth/me", 
            401,  # Should be unauthorized
            token=self.master_token
        )
        
        if success:
            self.log_test("Force Logout Invalidated Token", True)
            return True
        
        return False

    def test_password_reset_integration(self):
        """Test password reset integration with audit and session cleanup"""
        print("\n🔑 Testing Password Reset Integration...")
        
        # Step 1: Reset master's password
        success, response = self.run_test(
            "Admin Reset Master Password", 
            "POST", 
            f"admin/users/{self.master_id}/reset-password", 
            200,
            data="NewTestPassword123!"
        )
        
        if not success:
            return False
        
        # Step 2: Verify old password doesn't work
        login_data = {"email": "master@test.com", "password": "Test123!"}
        success, response = self.run_test(
            "Old Password Invalid After Reset", 
            "POST", 
            "auth/login", 
            401,  # Should fail
            data=login_data
        )
        
        if success:
            self.log_test("Old Password Properly Invalidated", True)
        else:
            return False
        
        # Step 3: Verify new password works
        login_data = {"email": "master@test.com", "password": "NewTestPassword123!"}
        success, response = self.run_test(
            "New Password Works After Reset", 
            "POST", 
            "auth/login", 
            200,
            data=login_data
        )
        
        if success:
            self.log_test("New Password Works", True)
            # Update master token
            self.master_token = response['token']
            return True
        
        return False

    def test_audit_trail_completeness(self):
        """Test that all admin actions are properly audited"""
        print("\n📋 Testing Audit Trail Completeness...")
        
        success, response = self.run_test("Get Audit Logs", "GET", "admin/audit-logs", 200)
        if not success:
            return False
        
        logs = response.get('logs', [])
        actions = [log.get('action') for log in logs]
        
        # Check for expected actions
        expected_actions = ['change_account_status', 'reset_password', 'force_logout']
        found_actions = []
        
        for expected in expected_actions:
            if expected in actions:
                found_actions.append(expected)
                self.log_test(f"Audit Log Contains {expected}", True)
            else:
                self.log_test(f"Audit Log Contains {expected}", False, f"Action {expected} not found in audit logs")
        
        if len(found_actions) == len(expected_actions):
            self.log_test("All Admin Actions Audited", True)
            return True
        
        return False

    def test_activity_logging_completeness(self):
        """Test that user activities are properly logged"""
        print("\n📝 Testing Activity Logging Completeness...")
        
        # Check owner's activity logs
        success, response = self.run_test(
            "Get Owner Activity Logs", 
            "GET", 
            f"admin/users/{self.owner_id}/activity-logs", 
            200
        )
        
        if not success:
            return False
        
        activities = [log.get('activity_type') for log in response]
        
        # Check for login activities
        if 'login' in activities:
            self.log_test("Login Activities Logged", True)
        else:
            self.log_test("Login Activities Logged", False, "No login activities found")
            return False
        
        # Check master's activity logs
        success, response = self.run_test(
            "Get Master Activity Logs", 
            "GET", 
            f"admin/users/{self.master_id}/activity-logs", 
            200
        )
        
        if success:
            activities = [log.get('activity_type') for log in response]
            if 'force_logout' in activities:
                self.log_test("Force Logout Activities Logged", True)
                return True
            else:
                self.log_test("Force Logout Activities Logged", False, "No force_logout activities found")
        
        return False

    def test_session_cleanup_on_status_change(self):
        """Test that sessions are cleaned up when account status changes"""
        print("\n🧹 Testing Session Cleanup on Status Change...")
        
        # Step 1: Ensure master is logged in
        login_data = {"email": "master@test.com", "password": "NewTestPassword123!"}
        success, response = self.run_test("Master Login for Cleanup Test", "POST", "auth/login", 200, data=login_data)
        if not success:
            return False
        
        master_token = response['token']
        
        # Step 2: Suspend master account
        status_data = {"status": "suspended", "reason": "Testing session cleanup"}
        success, response = self.run_test(
            "Suspend Master for Session Cleanup", 
            "POST", 
            f"admin/users/{self.master_id}/status", 
            200,
            data=status_data
        )
        
        if not success:
            return False
        
        # Step 3: Verify master's token is invalid
        success, response = self.run_test(
            "Master Token Invalid After Suspension", 
            "GET", 
            "auth/me", 
            403,  # Should be forbidden
            token=master_token
        )
        
        if success:
            self.log_test("Sessions Cleaned Up on Status Change", True)
            
            # Reactivate for cleanup
            status_data = {"status": "active", "reason": "Cleanup test complete"}
            self.run_test("Reactivate Master After Test", "POST", f"admin/users/{self.master_id}/status", 200, data=status_data)
            
            return True
        
        return False

    def run_integration_tests(self):
        """Run comprehensive integration tests"""
        print("🚀 Starting Admin Panel Integration Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Setup
        if not self.setup_users():
            print("❌ Failed to setup test users")
            return 1
        
        # Run integration tests
        self.test_force_logout_integration()
        self.test_password_reset_integration()
        self.test_audit_trail_completeness()
        self.test_activity_logging_completeness()
        self.test_session_cleanup_on_status_change()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Integration Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All integration tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} integration tests failed")
            return 1

def main():
    tester = AdminIntegrationTester()
    return tester.run_integration_tests()

if __name__ == "__main__":
    sys.exit(main())