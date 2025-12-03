#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class AdminPanelTester:
    def __init__(self, base_url="https://maritime-sms-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.owner_token = None
        self.owner_id = None
        self.master_token = None
        self.master_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Use specific token if provided, otherwise use owner token
        auth_token = token or self.owner_token
        if auth_token:
            test_headers['Authorization'] = f'Bearer {auth_token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=15)

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

    def test_admin_login_owner(self):
        """Test login with owner credentials"""
        login_data = {
            "email": "brian@hover.com.au",
            "password": "Hover2024!"
        }
        
        success, response = self.run_test(
            "Admin Login (Owner)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.owner_token = response['token']
            self.owner_id = response['user']['id']
            return True
        return False

    def test_admin_login_master(self):
        """Test login with master credentials"""
        login_data = {
            "email": "master@test.com",
            "password": "Test123!"
        }
        
        success, response = self.run_test(
            "Admin Login (Master)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.master_token = response['token']
            self.master_id = response['user']['id']
            return True
        return False

    def test_user_activity_logging(self):
        """Test user activity logging"""
        success, response = self.run_test(
            "Get User Activity Logs",
            "GET",
            f"admin/users/{self.owner_id}/activity-logs",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check if login activity exists
            login_activities = [log for log in response if log.get('activity_type') == 'login']
            if login_activities:
                self.log_test("Login Activity Logged", True)
                return True
            else:
                self.log_test("Login Activity Logged", False, "No login activity found")
        
        return False

    def test_get_all_users_admin(self):
        """Test getting all users as admin"""
        success, response = self.run_test(
            "Get All Users (Admin)",
            "GET",
            "admin/users",
            200
        )
        
        if success and isinstance(response, list):
            # Should contain at least owner and master users
            emails = [user.get('email') for user in response]
            if 'brian@hover.com.au' in emails and 'master@test.com' in emails:
                self.log_test("Admin Users List Complete", True)
                return True, response
            else:
                self.log_test("Admin Users List Complete", False, f"Missing expected users. Found: {emails}")
        
        return False, []

    def test_account_status_management(self):
        """Test account status management"""
        # Get users first
        success, users = self.test_get_all_users_admin()
        if not success:
            return False
            
        master_user = None
        for user in users:
            if user.get('email') == 'master@test.com':
                master_user = user
                break
        
        if not master_user:
            self.log_test("Account Status Management", False, "Master user not found")
            return False
        
        # Test 1: Suspend the master user
        status_data = {
            "status": "suspended",
            "reason": "Testing suspension functionality"
        }
        
        success, response = self.run_test(
            "Suspend User Account",
            "POST",
            f"admin/users/{master_user['id']}/status",
            200,
            data=status_data
        )
        
        if not success:
            return False
        
        # Test 2: Try to login with suspended account (should fail)
        login_data = {
            "email": "master@test.com",
            "password": "Test123!"
        }
        
        success_login, login_response = self.run_test(
            "Login with Suspended Account (Should Fail)",
            "POST",
            "auth/login",
            403,  # Should be forbidden
            data=login_data
        )
        
        if not success_login:
            self.log_test("Suspended Account Login Blocked", False, "Expected 403 but got different status")
            return False
        
        # Test 3: Reactivate the master user
        status_data = {
            "status": "active",
            "reason": "Testing reactivation functionality"
        }
        
        success, response = self.run_test(
            "Reactivate User Account",
            "POST",
            f"admin/users/{master_user['id']}/status",
            200,
            data=status_data
        )
        
        if not success:
            return False
        
        # Test 4: Try to login with reactivated account (should succeed)
        success_login, login_response = self.run_test(
            "Login with Reactivated Account (Should Work)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success_login:
            self.log_test("Account Status Management Complete", True)
            return True
        
        return False

    def test_audit_trail(self):
        """Test audit trail functionality"""
        success, response = self.run_test(
            "Get Audit Trail Logs",
            "GET",
            "admin/audit-logs",
            200
        )
        
        if success and 'logs' in response:
            logs = response['logs']
            if isinstance(logs, list) and len(logs) > 0:
                # Check for expected audit actions
                actions = [log.get('action') for log in logs]
                
                # Check audit log structure
                first_log = logs[0]
                required_fields = ['admin_id', 'admin_name', 'action', 'target_type', 'timestamp', 'details']
                missing_fields = [field for field in required_fields if field not in first_log]
                
                if not missing_fields:
                    self.log_test("Audit Log Structure Valid", True)
                    
                    # Check for status change actions
                    status_actions = [log for log in logs if log.get('action') == 'change_account_status']
                    if status_actions:
                        self.log_test("Account Status Changes Audited", True)
                        return True
                    else:
                        self.log_test("Account Status Changes Audited", False, "No status change audit logs found")
                else:
                    self.log_test("Audit Log Structure Valid", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Audit Trail Logs", False, "No audit logs found")
        
        return False

    def test_session_management(self):
        """Test session management functionality"""
        # Test 1: Get all active sessions
        success, response = self.run_test(
            "Get All Active Sessions",
            "GET",
            "admin/sessions",
            200
        )
        
        if not success:
            return False
        
        sessions = response
        if not isinstance(sessions, list) or len(sessions) == 0:
            self.log_test("Session Management", False, "No active sessions found")
            return False
        
        # Check session structure
        first_session = sessions[0]
        required_fields = ['id', 'user_id', 'created_at', 'expires_at', 'last_active']
        missing_fields = [field for field in required_fields if field not in first_session]
        
        if missing_fields:
            self.log_test("Session Structure Valid", False, f"Missing fields: {missing_fields}")
            return False
        
        self.log_test("Session Structure Valid", True)
        
        # Test 2: Get specific user's sessions
        success, users = self.test_get_all_users_admin()
        if success:
            master_user = None
            for user in users:
                if user.get('email') == 'master@test.com':
                    master_user = user
                    break
            
            if master_user:
                success, response = self.run_test(
                    "Get User Sessions",
                    "GET",
                    f"admin/users/{master_user['id']}/sessions",
                    200
                )
                
                if success:
                    self.log_test("Session Management Complete", True)
                    return True
        
        return False

    def test_non_owner_access_denied(self):
        """Test that non-owner users cannot access admin endpoints"""
        # Login as master user first
        login_data = {
            "email": "master@test.com",
            "password": "Test123!"
        }
        
        success, response = self.run_test(
            "Master Login for Access Test",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if not success:
            return False
        
        master_token = response['token']
        
        # Try to access admin endpoint with master token (should fail)
        success, response = self.run_test(
            "Non-Owner Admin Access (Should Fail)",
            "GET",
            "admin/users",
            403,  # Should be forbidden
            token=master_token
        )
        
        if success:
            self.log_test("Non-Owner Admin Access Properly Denied", True)
            return True
        
        return False

    def run_admin_tests(self):
        """Run focused admin panel tests"""
        print("🚀 Starting Admin Panel Enhancement Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test 1: Admin Authentication
        print("\n🔐 Admin Authentication Tests:")
        if not self.test_admin_login_owner():
            print("❌ Cannot proceed without owner login")
            return 1
        
        self.test_admin_login_master()
        
        # Test 2: User Activity Logging
        print("\n📝 User Activity Logging Tests:")
        self.test_user_activity_logging()
        
        # Test 3: Account Status Management
        print("\n👤 Account Status Management Tests:")
        self.test_account_status_management()
        
        # Test 4: Audit Trail
        print("\n📋 Audit Trail Tests:")
        self.test_audit_trail()
        
        # Test 5: Session Management
        print("\n🔗 Session Management Tests:")
        self.test_session_management()
        
        # Test 6: Access Control
        print("\n🛡️ Access Control Tests:")
        self.test_non_owner_access_denied()
        
        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 Admin Panel Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All admin panel tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} admin panel tests failed")
            
            # Show failed tests
            failed_tests = [result for result in self.test_results if not result['success']]
            if failed_tests:
                print("\nFailed Tests:")
                for test in failed_tests:
                    print(f"  - {test['test']}: {test['details']}")
            
            return 1

def main():
    tester = AdminPanelTester()
    return tester.run_admin_tests()

if __name__ == "__main__":
    sys.exit(main())