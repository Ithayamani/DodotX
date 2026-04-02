#!/usr/bin/env python3
"""
DoneDash Backend API Testing - Forgot Password Flow with Real SMTP Email
Test the forgot-password endpoint to verify real email delivery via SMTP
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://app-store-setup-2.preview.emergentagent.com/api"
TEST_EMAIL = "parent@test.com"
TEST_PASSWORD = "parent123"
NON_EXISTENT_EMAIL = "nobody@test.com"

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"{'='*60}")

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def test_login():
    """Test 1: Login with parent@test.com / parent123 to confirm auth works"""
    print_test_header("Login Authentication Test")
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                print_result(True, f"Login successful for {TEST_EMAIL}")
                print(f"   User ID: {data['user']['id']}")
                print(f"   User Name: {data['user']['name']}")
                print(f"   Family ID: {data['user'].get('family_id', 'None')}")
                return data["access_token"]
            else:
                print_result(False, "Login response missing required fields")
                return None
        else:
            print_result(False, f"Login failed with status {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print_result(False, f"Login request failed: {str(e)}")
        return None

def test_forgot_password_existing_email():
    """Test 2: Call forgot-password with existing email"""
    print_test_header("Forgot Password - Existing Email Test")
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/forgot-password", json={
            "email": TEST_EMAIL
        })
        
        if response.status_code == 200:
            data = response.json()
            expected_message = "If an account exists with this email, a reset code has been sent."
            if data.get("message") == expected_message:
                print_result(True, f"Forgot password request successful for {TEST_EMAIL}")
                print(f"   Response: {data['message']}")
                return True
            else:
                print_result(False, f"Unexpected response message: {data.get('message')}")
                return False
        else:
            print_result(False, f"Forgot password failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_result(False, f"Forgot password request failed: {str(e)}")
        return False

def test_forgot_password_non_existent_email():
    """Test 3: Call forgot-password with non-existent email (security test)"""
    print_test_header("Forgot Password - Non-existent Email Test")
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/forgot-password", json={
            "email": NON_EXISTENT_EMAIL
        })
        
        if response.status_code == 200:
            data = response.json()
            expected_message = "If an account exists with this email, a reset code has been sent."
            if data.get("message") == expected_message:
                print_result(True, f"Security test passed - same message for non-existent email")
                print(f"   Response: {data['message']}")
                return True
            else:
                print_result(False, f"Security issue - different message for non-existent email: {data.get('message')}")
                return False
        else:
            print_result(False, f"Forgot password failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_result(False, f"Forgot password request failed: {str(e)}")
        return False

def check_backend_logs():
    """Test 4: Check backend logs for SMTP email confirmation"""
    print_test_header("Backend Logs Check for SMTP Email Delivery")
    
    try:
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            logs = result.stdout
            print("Recent backend logs:")
            print("-" * 40)
            print(logs)
            print("-" * 40)
            
            # Check for SMTP success message
            smtp_success = f"Password reset email sent to {TEST_EMAIL}" in logs
            smtp_fallback = f"PASSWORD RESET CODE for {TEST_EMAIL}:" in logs
            
            if smtp_success:
                print_result(True, "SMTP email delivery confirmed - real email sent!")
                print(f"   Found log: 'Password reset email sent to {TEST_EMAIL}'")
                return True, "smtp_success"
            elif smtp_fallback:
                print_result(False, "SMTP not working - code logged to console instead")
                print(f"   Found log: 'PASSWORD RESET CODE for {TEST_EMAIL}:'")
                return False, "smtp_fallback"
            else:
                print_result(False, "No relevant log entries found for forgot password")
                return False, "no_logs"
        else:
            print_result(False, f"Failed to read backend logs: {result.stderr}")
            return False, "log_error"
            
    except Exception as e:
        print_result(False, f"Error checking backend logs: {str(e)}")
        return False, "exception"

def get_reset_code_from_db():
    """Test 5: Get reset code from database for testing reset flow"""
    print_test_header("Database Reset Code Retrieval")
    
    try:
        # Connect to MongoDB to get the reset code
        from pymongo import MongoClient
        import os
        
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv('/app/backend/.env')
        
        mongo_url = os.environ['MONGO_URL']
        db_name = os.environ['DB_NAME']
        
        client = MongoClient(mongo_url)
        db = client[db_name]
        
        # Find the most recent reset code for our test email
        reset_record = db.password_resets.find_one(
            {"email": TEST_EMAIL.lower().strip(), "used": False},
            sort=[("expires_at", -1)]
        )
        
        if reset_record:
            code = reset_record["code"]
            expires_at = reset_record["expires_at"]
            print_result(True, f"Reset code retrieved from database: {code}")
            print(f"   Email: {reset_record['email']}")
            print(f"   Expires at: {expires_at}")
            print(f"   Used: {reset_record['used']}")
            return code
        else:
            print_result(False, "No reset code found in database")
            return None
            
    except Exception as e:
        print_result(False, f"Error retrieving reset code from database: {str(e)}")
        return None

def test_reset_password(reset_code):
    """Test 6: Test the full reset flow with the code from database"""
    print_test_header("Password Reset Flow Test")
    
    if not reset_code:
        print_result(False, "No reset code available for testing")
        return False
    
    try:
        # Test with the actual reset code
        response = requests.post(f"{BACKEND_URL}/auth/reset-password", json={
            "email": TEST_EMAIL,
            "code": reset_code,
            "new_password": TEST_PASSWORD  # Reset to same password for consistency
        })
        
        if response.status_code == 200:
            data = response.json()
            expected_message = "Password has been reset successfully. You can now sign in."
            if data.get("message") == expected_message:
                print_result(True, f"Password reset successful with code {reset_code}")
                print(f"   Response: {data['message']}")
                return True
            else:
                print_result(False, f"Unexpected reset response: {data.get('message')}")
                return False
        else:
            print_result(False, f"Password reset failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_result(False, f"Password reset request failed: {str(e)}")
        return False

def test_invalid_reset_code():
    """Test 7: Test reset with invalid code"""
    print_test_header("Invalid Reset Code Test")
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/reset-password", json={
            "email": TEST_EMAIL,
            "code": "000000",  # Invalid code
            "new_password": "newpassword123"
        })
        
        if response.status_code == 400:
            data = response.json()
            if "Invalid or expired reset code" in data.get("detail", ""):
                print_result(True, "Invalid reset code properly rejected")
                print(f"   Response: {data['detail']}")
                return True
            else:
                print_result(False, f"Unexpected error message: {data.get('detail')}")
                return False
        else:
            print_result(False, f"Expected 400 error, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_result(False, f"Invalid reset code test failed: {str(e)}")
        return False

def main():
    """Run all forgot password flow tests"""
    print("DoneDash Backend - Forgot Password Flow with Real SMTP Email Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Email: {TEST_EMAIL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    results = []
    
    # Test 1: Login to confirm auth works
    token = test_login()
    results.append(("Login Authentication", token is not None))
    
    if not token:
        print("\n❌ Cannot proceed without valid authentication")
        return
    
    # Test 2: Forgot password with existing email
    forgot_success = test_forgot_password_existing_email()
    results.append(("Forgot Password - Existing Email", forgot_success))
    
    # Wait a moment for the email to be processed
    time.sleep(2)
    
    # Test 3: Check backend logs for SMTP confirmation
    smtp_success, log_type = check_backend_logs()
    results.append(("SMTP Email Delivery", smtp_success))
    
    # Test 4: Forgot password with non-existent email (security)
    security_test = test_forgot_password_non_existent_email()
    results.append(("Security - Non-existent Email", security_test))
    
    # Test 5: Get reset code from database
    reset_code = get_reset_code_from_db()
    results.append(("Database Reset Code Retrieval", reset_code is not None))
    
    # Test 6: Test full reset flow
    if reset_code:
        reset_success = test_reset_password(reset_code)
        results.append(("Password Reset Flow", reset_success))
    
    # Test 7: Test invalid reset code
    invalid_test = test_invalid_reset_code()
    results.append(("Invalid Reset Code Rejection", invalid_test))
    
    # Final summary
    print(f"\n{'='*60}")
    print("FINAL TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if success:
            passed += 1
    
    print(f"\nOverall Result: {passed}/{total} tests passed")
    
    # Key verification message
    if smtp_success:
        print("\n🎉 KEY VERIFICATION: SMTP email delivery is working!")
        print("   Backend logs show 'Password reset email sent to...' confirming real email delivery")
    else:
        print("\n⚠️  KEY VERIFICATION: SMTP email delivery is NOT working")
        print("   Backend logs show 'PASSWORD RESET CODE for...' indicating fallback to console logging")
    
    return passed == total

if __name__ == "__main__":
    main()