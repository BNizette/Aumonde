#!/usr/bin/env python3
"""
Focused test for backup import functionality as requested
Tests: Admin login, JSON validation, import endpoint, response verification
"""

import requests
import json
import os
from datetime import datetime

class BackupImportTester:
    def __init__(self):
        self.base_url = "https://maritime-hub-11.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        
    def login_admin(self):
        """Login as admin user"""
        print("🔐 Testing Admin Login...")
        
        login_data = {
            "email": "admin@test.com",
            "password": "Admin123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.token = data['access_token']
                    user = data.get('user', {})
                    print(f"✅ Admin login successful")
                    print(f"   User: {user.get('full_name')} ({user.get('email')})")
                    print(f"   Role: {user.get('role')}")
                    print(f"   Access Level: {user.get('access_level')}")
                    return True
                else:
                    print(f"❌ Login failed: No access token in response")
                    return False
            else:
                print(f"❌ Login failed: Status {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def validate_export_file(self):
        """Validate the users_export.json file structure"""
        print("\n📄 Validating users_export.json file...")
        
        export_file = "/app/users_export.json"
        
        if not os.path.exists(export_file):
            print(f"❌ File not found: {export_file}")
            return False
        
        print(f"✅ File exists: {export_file}")
        
        try:
            with open(export_file, 'r') as f:
                data = json.load(f)
            
            # Check structure
            if "collections" not in data:
                print("❌ Missing 'collections' key in JSON")
                return False
            
            if "users" not in data["collections"]:
                print("❌ Missing 'users' collection")
                return False
            
            users = data["collections"]["users"]
            user_count = len(users)
            
            print(f"✅ Valid JSON structure")
            print(f"   Collections: {list(data['collections'].keys())}")
            print(f"   User count: {user_count}")
            
            # Check expected count
            if user_count == 13:
                print(f"✅ Correct user count (13)")
            else:
                print(f"⚠️  Unexpected user count: {user_count} (expected 13)")
            
            # Check datetime fields
            print("\n🕐 Checking datetime field formats...")
            datetime_issues = []
            
            for i, user in enumerate(users[:3]):  # Check first 3 users
                email = user.get('email', f'user_{i}')
                for field in ['created_at', 'last_login', 'last_active']:
                    if field in user and user[field] is not None:
                        value = user[field]
                        try:
                            # Try ISO format first
                            if 'T' in str(value):
                                datetime.fromisoformat(str(value).replace('Z', '+00:00'))
                            else:
                                # Try other format
                                datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S.%f")
                            print(f"   ✅ {email}.{field}: {value}")
                        except ValueError:
                            datetime_issues.append(f"{email}.{field}: {value}")
                            print(f"   ❌ {email}.{field}: {value}")
            
            if not datetime_issues:
                print("✅ All datetime fields are properly formatted")
            else:
                print(f"❌ Datetime format issues: {len(datetime_issues)}")
            
            return True
            
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ File validation error: {str(e)}")
            return False
    
    def test_import_endpoint(self):
        """Test the backup import endpoint"""
        print("\n💾 Testing backup import endpoint...")
        
        if not self.token:
            print("❌ No authentication token available")
            return False
        
        export_file = "/app/users_export.json"
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            
            with open(export_file, 'rb') as f:
                files = {'file': ('users_export.json', f, 'application/json')}
                
                response = requests.post(
                    f"{self.api_url}/backup/import",
                    files=files,
                    headers=headers
                )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Import successful")
                print(f"   Response: {json.dumps(data, indent=2)}")
                
                # Check response structure
                if "message" in data:
                    message = data["message"]
                    if "Database restored successfully" in message:
                        print(f"✅ Correct success message: '{message}'")
                    else:
                        print(f"⚠️  Unexpected message: '{message}'")
                
                if "collections_restored" in data:
                    restored = data["collections_restored"]
                    users_restored = restored.get("users", 0)
                    print(f"✅ Collections restored: {restored}")
                    
                    if users_restored == 13:
                        print(f"✅ Correct user count restored: {users_restored}")
                    else:
                        print(f"⚠️  Unexpected user count restored: {users_restored} (expected 13)")
                
                return True
            else:
                print(f"❌ Import failed: Status {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Import test error: {str(e)}")
            return False
    
    def verify_import_result(self):
        """Verify the import was successful by checking user count"""
        print("\n🔍 Verifying import results...")
        
        if not self.token:
            print("❌ No authentication token available")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            
            # Check backup info
            response = requests.get(f"{self.api_url}/backup/info", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                collections = data.get("collections", {})
                total_users = collections.get("users", 0)
                
                print(f"✅ Backup info retrieved")
                print(f"   Total users in database: {total_users}")
                
                # Check if we can get users list
                response = requests.get(f"{self.api_url}/users", headers=headers)
                if response.status_code == 200:
                    users = response.json()
                    print(f"✅ Users list retrieved: {len(users)} users")
                    
                    # Show some imported users
                    print("   Sample imported users:")
                    for user in users[:5]:
                        print(f"     - {user.get('full_name')} ({user.get('email')}) - {user.get('role')}")
                
                return True
            else:
                print(f"❌ Backup info failed: Status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Verification error: {str(e)}")
            return False
    
    def run_test(self):
        """Run the complete backup import test"""
        print("🚀 Starting Backup Import Test")
        print("=" * 60)
        
        success = True
        
        # Step 1: Login as admin
        if not self.login_admin():
            return False
        
        # Step 2: Validate export file
        if not self.validate_export_file():
            success = False
        
        # Step 3: Test import endpoint
        if not self.test_import_endpoint():
            success = False
        
        # Step 4: Verify results
        if not self.verify_import_result():
            success = False
        
        print("\n" + "=" * 60)
        if success:
            print("🎉 All backup import tests passed!")
        else:
            print("⚠️  Some tests failed")
        
        return success

if __name__ == "__main__":
    tester = BackupImportTester()
    success = tester.run_test()
    exit(0 if success else 1)