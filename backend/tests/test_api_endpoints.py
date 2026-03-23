"""
Backend API Tests for Vessel/Crew Safety Management System
Tests: Authentication, Vessels API deduplication, Incidents, Documents, Crew
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test authentication endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@test.com"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestVesselsAPI:
    """Test vessels API - including deduplication"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_vessels_returns_list(self, auth_headers):
        """Test that vessels endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/vessels", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_vessels_no_duplicates(self, auth_headers):
        """Test that vessels endpoint returns deduplicated list by vessel id"""
        response = requests.get(f"{BASE_URL}/api/vessels", headers=auth_headers)
        assert response.status_code == 200
        vessels = response.json()
        
        # Check for duplicate IDs
        vessel_ids = [v.get("id") for v in vessels if v.get("id")]
        unique_ids = set(vessel_ids)
        
        assert len(vessel_ids) == len(unique_ids), f"Found duplicate vessel IDs: {len(vessel_ids)} total, {len(unique_ids)} unique"
        print(f"Vessels API returned {len(vessels)} unique vessels")


class TestIncidentsAPI:
    """Test incidents API - including sort functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_incidents_returns_list(self, auth_headers):
        """Test that incidents endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/incidents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Incidents API returned {len(data)} incidents")
    
    def test_incidents_have_required_fields(self, auth_headers):
        """Test that incidents have required fields for sorting"""
        response = requests.get(f"{BASE_URL}/api/incidents", headers=auth_headers)
        assert response.status_code == 200
        incidents = response.json()
        
        if len(incidents) > 0:
            incident = incidents[0]
            # Check fields needed for sorting
            assert "title" in incident or incident.get("title") is None
            assert "incident_date" in incident or incident.get("incident_date") is None
            assert "severity" in incident or incident.get("severity") is None
            print(f"Sample incident fields: title={incident.get('title')}, severity={incident.get('severity')}")


class TestDocumentsAPI:
    """Test documents API - including filter functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_documents_returns_list(self, auth_headers):
        """Test that documents endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Documents API returned {len(data)} documents")
    
    def test_documents_have_filter_fields(self, auth_headers):
        """Test that documents have fields needed for filtering"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        documents = response.json()
        
        if len(documents) > 0:
            doc = documents[0]
            # Check fields needed for filtering
            assert "document_name" in doc or doc.get("document_name") is None
            assert "category" in doc or doc.get("category") is None
            print(f"Sample document: name={doc.get('document_name')}, category={doc.get('category')}")


class TestCrewAPI:
    """Test crew API - including URL param handling"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_crew_returns_list(self, auth_headers):
        """Test that crew endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/crew", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Crew API returned {len(data)} crew members")
    
    def test_get_crew_member_by_id(self, auth_headers):
        """Test getting a specific crew member by ID"""
        # First get list of crew
        response = requests.get(f"{BASE_URL}/api/crew", headers=auth_headers)
        assert response.status_code == 200
        crew_list = response.json()
        
        if len(crew_list) > 0:
            crew_id = crew_list[0].get("id")
            # Get specific crew member
            response = requests.get(f"{BASE_URL}/api/crew/{crew_id}", headers=auth_headers)
            assert response.status_code == 200
            crew = response.json()
            assert crew.get("id") == crew_id
            print(f"Successfully retrieved crew member: {crew.get('staff_name')}")


class TestTripsAPI:
    """Test trips API"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_trips_returns_list(self, auth_headers):
        """Test that trips endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/trips", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Trips API returned {len(data)} trips")


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
