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