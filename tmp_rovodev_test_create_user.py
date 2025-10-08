#!/usr/bin/env python
"""
Test user creation API
"""
import os
import sys
import django
import requests
import json

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_management.settings')

def test_user_creation():
    """Test user creation API"""
    try:
        django.setup()
        from accounts.models import StaffUserAuth, ROLE_CHOICES
        
        # First, login as admin to get token
        login_data = {
            'email': 'admin@test.com',
            'password': 'admin123'
        }
        
        print("🔍 Logging in as admin...")
        login_response = requests.post(
            'http://127.0.0.1:8000/api/auth/login',
            json=login_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
        
        login_result = login_response.json()
        token = login_result['token']
        print(f"✅ Login successful, token: {token[:30]}...")
        
        # Test user creation
        print("\n🔍 Testing user creation...")
        user_data = {
            'email': 'testuser@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'company_name': 'Test Company',
            'role': 'client',
            'mobile_number': '+1234567890'
        }
        
        create_response = requests.post(
            'http://127.0.0.1:8000/api/auth/users',
            json=user_data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }
        )
        
        print(f"Status: {create_response.status_code}")
        print(f"Response: {create_response.text}")
        
        if create_response.status_code == 200:
            result = create_response.json()
            print(f"✅ User created successfully!")
            print(f"   Email: {result.get('email')}")
            print(f"   Role: {result.get('role_display')}")
        else:
            print(f"❌ User creation failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("Testing User Creation API...")
    print("=" * 50)
    test_user_creation()