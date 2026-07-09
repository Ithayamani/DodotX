#!/usr/bin/env python3
"""
Focused test for the two failing endpoints
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://family-quest-15.preview.emergentagent.com/api"

def test_ai_theme_generation():
    """Test AI theme generation with proper auth"""
    print("🔍 Testing AI theme generation...")
    
    # First signup to get auth token
    timestamp = int(datetime.now().timestamp())
    signup_data = {
        "email": f"testparent{timestamp}@kidquest.com",
        "password": "parent123",
        "name": "Test Parent"
    }
    
    session = requests.Session()
    response = session.post(f"{BACKEND_URL}/auth/signup", json=signup_data)
    if response.status_code != 200:
        print(f"❌ Signup failed: {response.status_code}")
        return False
    
    # Set auth header
    token = response.json()['access_token']
    session.headers.update({
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    })
    
    # Test AI theme generation
    theme_data = {
        "description": "warm sunset beach"
    }
    
    response = session.post(f"{BACKEND_URL}/ai/generate-theme", json=theme_data)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ AI theme generation successful: {data['name']}")
        print(f"   Colors: primary={data['primary']}, background={data['background']}")
        return True
    else:
        print(f"❌ AI theme generation failed: {response.status_code} - {response.text}")
        return False

def test_existing_user_login():
    """Test login with an existing user from test credentials"""
    print("🔍 Testing login with existing user...")
    
    # Try to login with the credentials from test_credentials.md
    login_data = {
        "email": "parent@kidquest.test",  # From test_credentials.md
        "password": "parent123"
    }
    
    session = requests.Session()
    response = session.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ User login successful: {data['user']['email']}")
        return True
    else:
        print(f"❌ User login failed: {response.status_code} - {response.text}")
        print("Note: This user may not exist in the database yet")
        return False

if __name__ == "__main__":
    print("🚀 Testing Failed Endpoints")
    print("=" * 40)
    
    # Test AI theme generation
    theme_success = test_ai_theme_generation()
    
    # Test existing user login
    login_success = test_existing_user_login()
    
    print("\n" + "=" * 40)
    if theme_success and login_success:
        print("🎉 All tests passed!")
    else:
        print(f"Results: Theme={theme_success}, Login={login_success}")