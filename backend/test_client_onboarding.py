#!/usr/bin/env python3
"""
Test script for client onboarding functionality.
Run this script to test the new client onboarding endpoints.
"""

import os
import sys
import django
import requests
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import ROLE_CHOICES

User = get_user_model()

def test_client_onboarding():
    """Test the client onboarding flow"""
    
    # Configuration
    BASE_URL = "http://localhost:8000/api/auth"
    
    # Test data
    test_client = {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "company": "Acme Corporation"
    }
    
    print("🧪 Testing Client Onboarding Flow")
    print("=" * 50)
    
    # Step 1: Create a digital marketing user for testing
    print("\n1. Creating test digital marketing user...")
    try:
        # Check if test user already exists
        dm_user, created = User.objects.get_or_create(
            email="dm@test.com",
            defaults={
                'first_name': 'Digital',
                'last_name': 'Marketing',
                'role': ROLE_CHOICES.DIGITAL_MARKETING,
                'is_active': True
            }
        )
        if created:
            dm_user.set_password('testpassword123')
            dm_user.save()
            print("✅ Test digital marketing user created")
        else:
            print("✅ Test digital marketing user already exists")
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        return
    
    # Step 2: Login as digital marketing user
    print("\n2. Logging in as digital marketing user...")
    login_data = {
        "email": "dm@test.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        if response.status_code == 200:
            token = response.json()['token']
            headers = {'Authorization': f'Bearer {token}'}
            print("✅ Login successful")
        else:
            print(f"❌ Login failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Step 3: Test client onboarding
    print("\n3. Testing client onboarding...")
    try:
        response = requests.post(
            f"{BASE_URL}/onboard-client", 
            json=test_client,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Client onboarding successful")
            print(f"   - Client ID: {result['user']['id']}")
            print(f"   - Generated Password: {result['password']}")
            print(f"   - Message: {result['message']}")
            
            client_id = result['user']['id']
            generated_password = result['password']
            
            # Step 4: Test sending credentials
            print("\n4. Testing credential sending...")
            credentials_data = {
                "client_id": client_id,
                "client_email": test_client['email'],
                "client_name": test_client['name'],
                "company_name": test_client['company'],
                "password": generated_password
            }
            
            response = requests.post(
                f"{BASE_URL}/send-client-credentials",
                json=credentials_data,
                headers=headers
            )
            
            if response.status_code == 200:
                print("✅ Credentials sent successfully")
                print(f"   - Message: {response.json()['message']}")
            else:
                print(f"❌ Failed to send credentials: {response.text}")
                
        else:
            print(f"❌ Client onboarding failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error during onboarding: {e}")
    
    # Step 5: Verify client was created
    print("\n5. Verifying client creation...")
    try:
        client = User.objects.get(email=test_client['email'])
        print(f"✅ Client found in database:")
        print(f"   - Name: {client.full_name}")
        print(f"   - Email: {client.email}")
        print(f"   - Company: {client.company_name}")
        print(f"   - Role: {client.role}")
        print(f"   - Active: {client.is_active}")
        
        # Step 6: Test client login
        print("\n6. Testing client login...")
        login_test_data = {
            "email": test_client['email'],
            "password": generated_password
        }
        
        try:
            response = requests.post(f"{BASE_URL}/test-client-login", json=login_test_data)
            if response.status_code == 200:
                result = response.json()
                if result['success']:
                    print("✅ Client login test successful")
                    print(f"   - Token generated: {result['token'][:20]}...")
                    print(f"   - User ID: {result['user']['id']}")
                else:
                    print(f"❌ Client login test failed: {result['message']}")
            else:
                print(f"❌ Client login test failed: {response.text}")
        except Exception as e:
            print(f"❌ Error testing client login: {e}")
        
        # Clean up test data
        print("\n7. Cleaning up test data...")
        client.delete()
        print("✅ Test client deleted")
        
    except User.DoesNotExist:
        print("❌ Client not found in database")
    except Exception as e:
        print(f"❌ Error verifying client: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Test completed!")

if __name__ == "__main__":
    test_client_onboarding()
