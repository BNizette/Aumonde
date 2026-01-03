#!/usr/bin/env python3
"""
Focused test for UserResponse Pydantic validation fix
Tests the specific deployment fix for missing account_status and access_level fields
"""

import requests
import json
import sys

def test_user_response_validation():
    """Test UserResponse Pydantic validation fix"""
    base_url = "https://nautical-hub-4.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Testing UserResponse Pydantic Validation Fix")
    print("=" * 60)
    
    # Step 1: Login as admin
    print("1. Logging in as admin...")
    login_data = {"email": "admin@test.com", "password": "Admin123!"}
    
    try:
        response = requests.post(f"{api_url}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            token = token_data['access_token']
            user = token_data['user']
            print(f"   ✅ Login successful - User: {user['email']}")
            print(f"   ✅ Access Level: {user.get('access_level', 'Missing')}")
            print(f"   ✅ Account Status: {user.get('account_status', 'Missing')}")
        else:
            print(f"   ❌ Login failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Login error: {str(e)}")
        return False
    
    # Step 2: Call GET /api/users endpoint
    print("\n2. Testing GET /api/users endpoint...")
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(f"{api_url}/users", headers=headers)
        status_code = response.status_code
        
        print(f"   Status Code: {status_code}")
        
        if status_code == 200:
            print("   ✅ SUCCESS: Endpoint returned 200 OK (not 500 Internal Server Error)")
            
            # Step 3: Verify response structure
            users = response.json()
            print(f"   Retrieved {len(users)} users")
            
            # Step 4: Verify all users have required fields with defaults
            print("\n3. Verifying user field validation...")
            
            field_validation_passed = True
            users_with_defaults = 0
            field_issues = []
            
            for i, user in enumerate(users):
                user_email = user.get('email', f'user_{i}')
                
                # Check access_level field
                if 'access_level' not in user:
                    field_issues.append(f"User {user_email}: missing access_level")
                    field_validation_passed = False
                elif user['access_level'] not in ['View', 'Edit', 'Full']:
                    field_issues.append(f"User {user_email}: invalid access_level '{user['access_level']}'")
                    field_validation_passed = False
                
                # Check account_status field
                if 'account_status' not in user:
                    field_issues.append(f"User {user_email}: missing account_status")
                    field_validation_passed = False
                elif user['account_status'] not in ['Active', 'Disabled', 'Suspended']:
                    field_issues.append(f"User {user_email}: invalid account_status '{user['account_status']}'")
                    field_validation_passed = False
                
                # Count users with default values (backward compatibility indicator)
                if user.get('access_level') == 'Edit' and user.get('account_status') == 'Active':
                    users_with_defaults += 1
                
                # Show first few users for verification
                if i < 3:
                    print(f"   User {i+1}: {user_email}")
                    print(f"     - access_level: {user.get('access_level', 'MISSING')}")
                    print(f"     - account_status: {user.get('account_status', 'MISSING')}")
            
            if field_validation_passed:
                print(f"   ✅ SUCCESS: All users have required fields")
                print(f"   ✅ {users_with_defaults} users have default values (Edit/Active)")
                print("   ✅ Pydantic validation error has been resolved")
                return True
            else:
                print(f"   ❌ FAILED: Field validation issues found:")
                for issue in field_issues[:5]:  # Show first 5 issues
                    print(f"     - {issue}")
                return False
                
        elif status_code == 500:
            print("   ❌ CRITICAL FAILURE: Endpoint returned 500 Internal Server Error")
            print("   ❌ This indicates the Pydantic validation fix is NOT working")
            try:
                error_response = response.json()
                print(f"   Error details: {error_response}")
            except:
                print(f"   Raw error: {response.text}")
            return False
        else:
            print(f"   ❌ Unexpected status code: {status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Request error: {str(e)}")
        return False

def main():
    """Main test execution"""
    success = test_user_response_validation()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 UserResponse Pydantic Validation Fix: VERIFIED WORKING")
        print("✅ Deployment blocker has been resolved")
        return 0
    else:
        print("❌ UserResponse Pydantic Validation Fix: FAILED")
        print("❌ Deployment blocker still exists")
        return 1

if __name__ == "__main__":
    sys.exit(main())