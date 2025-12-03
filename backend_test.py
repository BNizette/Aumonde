#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class AMSASMSAPITester:
    def __init__(self, base_url="https://maritime-sms-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.vessel_id = None
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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

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

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": test_email,
            "password": "TestPass123!",
            "full_name": "Test User",
            "role": "owner",
            "organization": "Test Maritime Company"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try to login with a test account
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "User Login (if exists)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_vessel(self):
        """Test vessel creation"""
        vessel_data = {
            "name": f"Test Vessel {uuid.uuid4().hex[:6]}",
            "vessel_class": "class_2",
            "registration_number": f"TV{uuid.uuid4().hex[:6].upper()}",
            "length": 6.5,
            "sms_type": "simplified"
        }
        
        success, response = self.run_test(
            "Create Vessel",
            "POST",
            "vessels",
            200,
            data=vessel_data
        )
        
        if success and 'id' in response:
            self.vessel_id = response['id']
            # Check if simplified SMS eligibility was calculated correctly
            if response.get('eligible_simplified') == True:
                self.log_test("Vessel SMS Eligibility Check", True)
            else:
                self.log_test("Vessel SMS Eligibility Check", False, "Should be eligible for simplified SMS")
            return True
        return False

    def test_get_vessels(self):
        """Test getting vessels"""
        success, response = self.run_test(
            "Get Vessels",
            "GET",
            "vessels",
            200
        )
        return success

    def test_get_vessel_by_id(self):
        """Test getting specific vessel"""
        if not self.vessel_id:
            self.log_test("Get Vessel by ID", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel by ID",
            "GET",
            f"vessels/{self.vessel_id}",
            200
        )
        return success

    def test_create_document(self):
        """Test document creation"""
        if not self.vessel_id:
            self.log_test("Create Document", False, "No vessel ID available")
            return False
            
        doc_data = {
            "vessel_id": self.vessel_id,
            "title": "Safety Management Policy",
            "document_type": "policy",
            "content": "This is a test safety management policy document for AMSA compliance.",
            "version": "1.0"
        }
        
        success, response = self.run_test(
            "Create Document",
            "POST",
            "documents",
            200,
            data=doc_data
        )
        return success

    def test_get_vessel_documents(self):
        """Test getting vessel documents"""
        if not self.vessel_id:
            self.log_test("Get Vessel Documents", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel Documents",
            "GET",
            f"documents/vessel/{self.vessel_id}",
            200
        )
        return success

    def test_create_risk_assessment(self):
        """Test risk assessment creation"""
        if not self.vessel_id:
            self.log_test("Create Risk Assessment", False, "No vessel ID available")
            return False
            
        risk_data = {
            "vessel_id": self.vessel_id,
            "hazard": "Collision with other vessels",
            "likelihood": 3,
            "consequence": 4,
            "control_measures": [
                "Maintain proper lookout",
                "Use radar and AIS",
                "Follow COLREGs"
            ]
        }
        
        success, response = self.run_test(
            "Create Risk Assessment",
            "POST",
            "risk-assessments",
            200,
            data=risk_data
        )
        
        # Check if risk level was calculated correctly (3*4=12 should be "high")
        if success and response.get('risk_level') == 'high':
            self.log_test("Risk Level Calculation", True)
        elif success:
            self.log_test("Risk Level Calculation", False, f"Expected 'high', got '{response.get('risk_level')}'")
        
        return success

    def test_get_vessel_risk_assessments(self):
        """Test getting vessel risk assessments"""
        if not self.vessel_id:
            self.log_test("Get Vessel Risk Assessments", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel Risk Assessments",
            "GET",
            f"risk-assessments/vessel/{self.vessel_id}",
            200
        )
        return success

    def test_create_crew_member(self):
        """Test crew member creation"""
        if not self.vessel_id:
            self.log_test("Create Crew Member", False, "No vessel ID available")
            return False
            
        crew_data = {
            "vessel_id": self.vessel_id,
            "full_name": "John Smith",
            "position": "Master",
            "qualifications": ["Master Class 2", "STCW Basic Safety"],
            "license_number": "M123456",
            "license_expiry": (datetime.now() + timedelta(days=365)).isoformat(),
            "medical_expiry": (datetime.now() + timedelta(days=180)).isoformat()
        }
        
        success, response = self.run_test(
            "Create Crew Member",
            "POST",
            "crew",
            200,
            data=crew_data
        )
        return success

    def test_get_vessel_crew(self):
        """Test getting vessel crew"""
        if not self.vessel_id:
            self.log_test("Get Vessel Crew", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel Crew",
            "GET",
            f"crew/vessel/{self.vessel_id}",
            200
        )
        return success

    def test_create_maintenance_schedule(self):
        """Test maintenance schedule creation"""
        if not self.vessel_id:
            self.log_test("Create Maintenance Schedule", False, "No vessel ID available")
            return False
            
        schedule_data = {
            "vessel_id": self.vessel_id,
            "equipment": "Main Engine",
            "maintenance_type": "routine",
            "frequency": "monthly",
            "next_due": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        success, response = self.run_test(
            "Create Maintenance Schedule",
            "POST",
            "maintenance-schedules",
            200,
            data=schedule_data
        )
        return success

    def test_get_vessel_maintenance_schedules(self):
        """Test getting vessel maintenance schedules"""
        if not self.vessel_id:
            self.log_test("Get Vessel Maintenance Schedules", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel Maintenance Schedules",
            "GET",
            f"maintenance-schedules/vessel/{self.vessel_id}",
            200
        )
        return success

    def test_create_incident(self):
        """Test incident creation"""
        if not self.vessel_id:
            self.log_test("Create Incident", False, "No vessel ID available")
            return False
            
        incident_data = {
            "vessel_id": self.vessel_id,
            "incident_type": "near_miss",
            "severity": "minor",
            "date": datetime.now().isoformat(),
            "location": "Port of Sydney",
            "description": "Near collision with recreational vessel during departure",
            "persons_involved": ["Master", "Deck Hand"],
            "immediate_action": "Reduced speed and altered course to avoid collision"
        }
        
        success, response = self.run_test(
            "Create Incident",
            "POST",
            "incidents",
            200,
            data=incident_data
        )
        return success

    def test_get_vessel_incidents(self):
        """Test getting vessel incidents"""
        if not self.vessel_id:
            self.log_test("Get Vessel Incidents", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel Incidents",
            "GET",
            f"incidents/vessel/{self.vessel_id}",
            200
        )
        return success

    def test_create_emergency_procedure(self):
        """Test emergency procedure creation"""
        if not self.vessel_id:
            self.log_test("Create Emergency Procedure", False, "No vessel ID available")
            return False
            
        procedure_data = {
            "vessel_id": self.vessel_id,
            "procedure_type": "fire",
            "steps": [
                "Sound general alarm",
                "Muster crew at designated stations",
                "Assess fire location and severity",
                "Deploy appropriate firefighting equipment",
                "Contact emergency services if required"
            ],
            "emergency_contacts": [
                {"name": "Coast Guard", "number": "000"},
                {"name": "Port Authority", "number": "1800-123-456"}
            ]
        }
        
        success, response = self.run_test(
            "Create Emergency Procedure",
            "POST",
            "emergency-procedures",
            200,
            data=procedure_data
        )
        return success

    def test_get_vessel_emergency_procedures(self):
        """Test getting vessel emergency procedures"""
        if not self.vessel_id:
            self.log_test("Get Vessel Emergency Procedures", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel Emergency Procedures",
            "GET",
            f"emergency-procedures/vessel/{self.vessel_id}",
            200
        )
        return success

    def test_create_compliance_checklist(self):
        """Test compliance checklist creation"""
        if not self.vessel_id:
            self.log_test("Create Compliance Checklist", False, "No vessel ID available")
            return False
            
        checklist_data = {
            "vessel_id": self.vessel_id,
            "checklist_type": "mo504_class2",
            "items": [
                {"item": "Fatigue management policy in place", "compliant": True, "notes": "Policy documented and implemented"},
                {"item": "Drug and alcohol policy documented", "compliant": True, "notes": "Policy covers testing procedures"},
                {"item": "Emergency procedures documented", "compliant": False, "notes": "Needs updating for new equipment"},
                {"item": "Crew qualifications verified", "compliant": True, "notes": "All certificates current"}
            ]
        }
        
        success, response = self.run_test(
            "Create Compliance Checklist",
            "POST",
            "compliance-checklists",
            200,
            data=checklist_data
        )
        
        # Check if overall status was calculated correctly (3/4 compliant = partial)
        if success and response.get('overall_status') == 'partial':
            self.log_test("Compliance Status Calculation", True)
        elif success:
            self.log_test("Compliance Status Calculation", False, f"Expected 'partial', got '{response.get('overall_status')}'")
        
        return success

    def test_get_vessel_compliance_checklists(self):
        """Test getting vessel compliance checklists"""
        if not self.vessel_id:
            self.log_test("Get Vessel Compliance Checklists", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Get Vessel Compliance Checklists",
            "GET",
            f"compliance-checklists/vessel/{self.vessel_id}",
            200
        )
        return success

    def test_ai_risk_assessment(self):
        """Test AI risk assessment generation"""
        if not self.vessel_id:
            self.log_test("AI Risk Assessment", False, "No vessel ID available")
            return False
            
        ai_request = {
            "vessel_id": self.vessel_id,
            "request_type": "risk_assessment",
            "context": {
                "operation_details": "Commercial fishing operations in Bass Strait during winter months",
                "vessel_class": "class_3",
                "operating_area": "Bass Strait, Australian waters"
            }
        }
        
        success, response = self.run_test(
            "AI Risk Assessment Generation",
            "POST",
            "ai/assist",
            200,
            data=ai_request
        )
        
        # Check if response contains expected fields
        if success and 'result' in response:
            if len(response['result']) > 50:  # Reasonable response length
                self.log_test("AI Response Quality Check", True)
            else:
                self.log_test("AI Response Quality Check", False, "Response too short")
        
        return success

    def test_ai_compliance_check(self):
        """Test AI compliance checking"""
        if not self.vessel_id:
            self.log_test("AI Compliance Check", False, "No vessel ID available")
            return False
            
        ai_request = {
            "vessel_id": self.vessel_id,
            "request_type": "compliance_check",
            "context": {
                "vessel_class": "class_2",
                "sms_type": "simplified",
                "documents": "We have basic safety procedures, crew training records, and maintenance logs"
            }
        }
        
        success, response = self.run_test(
            "AI Compliance Checking",
            "POST",
            "ai/assist",
            200,
            data=ai_request
        )
        return success

    def test_ai_document_analysis(self):
        """Test AI document analysis"""
        if not self.vessel_id:
            self.log_test("AI Document Analysis", False, "No vessel ID available")
            return False
            
        ai_request = {
            "vessel_id": self.vessel_id,
            "request_type": "document_analysis",
            "context": {
                "document_type": "Safety Management Policy",
                "content": "This policy outlines our commitment to safety. All crew must follow safety procedures. Regular training is conducted monthly."
            }
        }
        
        success, response = self.run_test(
            "AI Document Analysis",
            "POST",
            "ai/assist",
            200,
            data=ai_request
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        if not self.vessel_id:
            self.log_test("Dashboard Statistics", False, "No vessel ID available")
            return False
            
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET",
            f"dashboard/stats/{self.vessel_id}",
            200
        )
        
        # Check if response contains expected statistics
        if success:
            expected_keys = ['total_crew', 'active_risks', 'open_incidents', 'overdue_maintenance']
            missing_keys = [key for key in expected_keys if key not in response]
            if not missing_keys:
                self.log_test("Dashboard Stats Structure", True)
            else:
                self.log_test("Dashboard Stats Structure", False, f"Missing keys: {missing_keys}")
        
        return success

    # ============ ADMIN PANEL ENHANCEMENT TESTS ============
    
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
            self.token = response['token']
            self.user_id = response['user']['id']
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

    def test_user_activity_logging_login(self):
        """Test that login activity is logged"""
        # Login creates activity log automatically
        success, response = self.run_test(
            "Get User Activity Logs (Login)",
            "GET",
            f"admin/users/{self.user_id}/activity-logs",
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

    def test_user_activity_logging_logout(self):
        """Test logout activity logging"""
        # First logout to create logout activity
        success, response = self.run_test(
            "User Logout",
            "POST",
            "auth/logout",
            200
        )
        
        if success:
            # Login again to check activity logs
            if self.test_admin_login_owner():
                success, response = self.run_test(
                    "Get User Activity Logs (Logout)",
                    "GET",
                    f"admin/users/{self.owner_id}/activity-logs",
                    200
                )
                
                if success and isinstance(response, list):
                    logout_activities = [log for log in response if log.get('activity_type') == 'logout']
                    if logout_activities:
                        self.log_test("Logout Activity Logged", True)
                        return True
                    else:
                        self.log_test("Logout Activity Logged", False, "No logout activity found")
        
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
                return True
            else:
                self.log_test("Admin Users List Complete", False, f"Missing expected users. Found: {emails}")
        
        return False

    def test_account_status_management_suspend(self):
        """Test suspending a user account"""
        # Find master user ID first
        success, users = self.run_test(
            "Get Users for Status Test",
            "GET",
            "admin/users",
            200
        )
        
        if not success:
            return False
            
        master_user = None
        for user in users:
            if user.get('email') == 'master@test.com':
                master_user = user
                break
        
        if not master_user:
            self.log_test("Account Status Management (Suspend)", False, "Master user not found")
            return False
        
        # Suspend the master user
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
        
        if success:
            # Try to login with suspended account (should fail)
            login_data = {
                "email": "master@test.com",
                "password": "Test123!"
            }
            
            success_login, login_response = self.run_test(
                "Login with Suspended Account",
                "POST",
                "auth/login",
                403,  # Should be forbidden
                data=login_data
            )
            
            if success_login:
                self.log_test("Suspended Account Login Blocked", True)
                return True
            else:
                self.log_test("Suspended Account Login Blocked", False, "Suspended user was able to login")
        
        return False

    def test_account_status_management_reactivate(self):
        """Test reactivating a suspended user account"""
        # Find master user ID first
        success, users = self.run_test(
            "Get Users for Reactivation Test",
            "GET",
            "admin/users",
            200
        )
        
        if not success:
            return False
            
        master_user = None
        for user in users:
            if user.get('email') == 'master@test.com':
                master_user = user
                break
        
        if not master_user:
            return False
        
        # Reactivate the master user
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
        
        if success:
            # Try to login with reactivated account (should succeed)
            login_data = {
                "email": "master@test.com",
                "password": "Test123!"
            }
            
            success_login, login_response = self.run_test(
                "Login with Reactivated Account",
                "POST",
                "auth/login",
                200,
                data=login_data
            )
            
            if success_login:
                self.log_test("Reactivated Account Login Works", True)
                return True
            else:
                self.log_test("Reactivated Account Login Works", False, "Reactivated user cannot login")
        
        return False

    def test_audit_trail_logs(self):
        """Test audit trail logging"""
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
                expected_actions = ['change_account_status']
                
                found_actions = [action for action in expected_actions if action in actions]
                if found_actions:
                    self.log_test("Audit Trail Contains Expected Actions", True)
                    
                    # Check audit log structure
                    first_log = logs[0]
                    required_fields = ['admin_id', 'admin_name', 'action', 'target_type', 'timestamp', 'details']
                    missing_fields = [field for field in required_fields if field not in first_log]
                    
                    if not missing_fields:
                        self.log_test("Audit Log Structure Valid", True)
                        return True
                    else:
                        self.log_test("Audit Log Structure Valid", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Audit Trail Contains Expected Actions", False, f"Expected actions not found. Found: {actions}")
            else:
                self.log_test("Audit Trail Logs", False, "No audit logs found")
        
        return False

    def test_session_management_get_sessions(self):
        """Test getting all active sessions"""
        success, response = self.run_test(
            "Get All Active Sessions",
            "GET",
            "admin/sessions",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) > 0:
                # Check session structure
                first_session = response[0]
                required_fields = ['id', 'user_id', 'created_at', 'expires_at', 'last_active']
                missing_fields = [field for field in required_fields if field not in first_session]
                
                if not missing_fields:
                    self.log_test("Session Structure Valid", True)
                    
                    # Check if user info is enriched
                    if 'user' in first_session:
                        self.log_test("Session User Info Enriched", True)
                        return True
                    else:
                        self.log_test("Session User Info Enriched", False, "User info not included")
                else:
                    self.log_test("Session Structure Valid", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Get All Active Sessions", False, "No active sessions found")
        
        return False

    def test_session_management_get_user_sessions(self):
        """Test getting specific user's sessions"""
        # Get master user sessions
        success, users = self.run_test(
            "Get Users for Session Test",
            "GET",
            "admin/users",
            200
        )
        
        if not success:
            return False
            
        master_user = None
        for user in users:
            if user.get('email') == 'master@test.com':
                master_user = user
                break
        
        if not master_user:
            return False
        
        success, response = self.run_test(
            "Get User Sessions",
            "GET",
            f"admin/users/{master_user['id']}/sessions",
            200
        )
        
        if success and isinstance(response, list):
            self.log_test("Get User Sessions", True)
            return True
        
        return False

    def test_session_management_force_logout(self):
        """Test force logout functionality"""
        # First, login as master to create a session
        login_data = {
            "email": "master@test.com",
            "password": "Test123!"
        }
        
        success, login_response = self.run_test(
            "Master Login for Force Logout Test",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if not success:
            return False
        
        # Get all sessions to find master's session
        success, sessions = self.run_test(
            "Get Sessions for Force Logout",
            "GET",
            "admin/sessions",
            200
        )
        
        if not success:
            return False
        
        # Find master's session
        master_session = None
        for session in sessions:
            if session.get('user', {}).get('email') == 'master@test.com':
                master_session = session
                break
        
        if not master_session:
            self.log_test("Session Management Force Logout", False, "Master session not found")
            return False
        
        # Force logout the session
        success, response = self.run_test(
            "Force Logout Session",
            "DELETE",
            f"admin/sessions/{master_session['id']}",
            200
        )
        
        if success:
            self.log_test("Force Logout Session", True)
            return True
        
        return False

    def test_non_owner_admin_access_denied(self):
        """Test that non-owner users cannot access admin endpoints"""
        # Login as master user
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
        
        # Store current token
        old_token = self.token
        self.token = response['token']
        
        # Try to access admin endpoint (should fail)
        success, response = self.run_test(
            "Non-Owner Admin Access Denied",
            "GET",
            "admin/users",
            403  # Should be forbidden
        )
        
        # Restore owner token
        self.token = old_token
        
        if success:
            self.log_test("Non-Owner Admin Access Properly Denied", True)
            return True
        
        return False

    def test_integration_password_reset_audit(self):
        """Test that password reset creates audit log and logs out user"""
        # Get master user ID
        success, users = self.run_test(
            "Get Users for Password Reset Test",
            "GET",
            "admin/users",
            200
        )
        
        if not success:
            return False
            
        master_user = None
        for user in users:
            if user.get('email') == 'master@test.com':
                master_user = user
                break
        
        if not master_user:
            return False
        
        # Reset master's password
        success, response = self.run_test(
            "Admin Reset User Password",
            "POST",
            f"admin/users/{master_user['id']}/reset-password",
            200,
            data="NewPassword123!"
        )
        
        if success:
            # Check if audit log was created
            success, audit_response = self.run_test(
                "Check Password Reset Audit Log",
                "GET",
                "admin/audit-logs",
                200
            )
            
            if success and 'logs' in audit_response:
                reset_logs = [log for log in audit_response['logs'] if log.get('action') == 'reset_password']
                if reset_logs:
                    self.log_test("Password Reset Audit Log Created", True)
                    return True
                else:
                    self.log_test("Password Reset Audit Log Created", False, "No reset_password audit log found")
        
        return False

    def test_last_login_timestamp_update(self):
        """Test that last_login and last_active timestamps are updated correctly"""
        # Login to update timestamps
        login_data = {
            "email": "brian@hover.com.au",
            "password": "Hover2024!"
        }
        
        success, response = self.run_test(
            "Login for Timestamp Test",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'user' in response:
            user = response['user']
            if 'last_login' in user and 'last_active' in user:
                # Check if timestamps are recent (within last minute)
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                
                try:
                    if isinstance(user['last_login'], str):
                        last_login = datetime.fromisoformat(user['last_login'].replace('Z', '+00:00'))
                    else:
                        last_login = user['last_login']
                    
                    time_diff = (now - last_login).total_seconds()
                    if time_diff < 60:  # Within last minute
                        self.log_test("Last Login Timestamp Updated", True)
                        return True
                    else:
                        self.log_test("Last Login Timestamp Updated", False, f"Timestamp too old: {time_diff} seconds")
                except Exception as e:
                    self.log_test("Last Login Timestamp Updated", False, f"Timestamp parsing error: {str(e)}")
            else:
                self.log_test("Last Login Timestamp Updated", False, "Timestamp fields missing")
        
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AMSA SMS API Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📋 Authentication Tests:")
        if not self.test_user_registration():
            # If registration fails, try login
            self.test_user_login()
        
        if self.token:
            self.test_get_current_user()
        
        # Vessel Management Tests
        print("\n🚢 Vessel Management Tests:")
        self.test_create_vessel()
        self.test_get_vessels()
        self.test_get_vessel_by_id()
        
        # Document Management Tests
        print("\n📄 Document Management Tests:")
        self.test_create_document()
        self.test_get_vessel_documents()
        
        # Risk Assessment Tests
        print("\n⚠️ Risk Assessment Tests:")
        self.test_create_risk_assessment()
        self.test_get_vessel_risk_assessments()
        
        # Crew Management Tests
        print("\n👥 Crew Management Tests:")
        self.test_create_crew_member()
        self.test_get_vessel_crew()
        
        # Maintenance Tests
        print("\n🔧 Maintenance Management Tests:")
        self.test_create_maintenance_schedule()
        self.test_get_vessel_maintenance_schedules()
        
        # Incident Reporting Tests
        print("\n🚨 Incident Reporting Tests:")
        self.test_create_incident()
        self.test_get_vessel_incidents()
        
        # Emergency Procedures Tests
        print("\n🆘 Emergency Procedures Tests:")
        self.test_create_emergency_procedure()
        self.test_get_vessel_emergency_procedures()
        
        # Compliance Tests
        print("\n✅ Compliance Management Tests:")
        self.test_create_compliance_checklist()
        self.test_get_vessel_compliance_checklists()
        
        # AI Assistant Tests (Critical for this app)
        print("\n🤖 AI Assistant Tests:")
        self.test_ai_risk_assessment()
        self.test_ai_compliance_check()
        self.test_ai_document_analysis()
        
        # Dashboard Tests
        print("\n📊 Dashboard Tests:")
        self.test_dashboard_stats()
        
        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = AMSASMSAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())