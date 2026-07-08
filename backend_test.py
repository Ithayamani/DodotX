#!/usr/bin/env python3
"""
Backend API Testing for DodotX App - TestFlight Build Fix Verification
Tests all API flows against the DEPLOYED backend URL
"""

import requests
import json
from typing import Dict, Any

# DEPLOYED BACKEND URL (not localhost)
BACKEND_URL = "https://app-store-setup-2.preview.emergentagent.com/api"

# Test credentials from review request
REVIEW_PARENT_EMAIL = "review_parent@dodotx.com"
REVIEW_PARENT_PASSWORD = "Review123!"
REVIEW_FAMILY_CODE = "REVIEW"

# Test counters
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        status = "✅ PASS"
    else:
        tests_failed += 1
        status = "❌ FAIL"
    
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append(result)

def test_signup():
    """Test 1: POST /api/auth/signup"""
    print("\n=== Test 1: Signup ===")
    try:
        import time
        unique_email = f"testbuild{int(time.time())}@test.com"
        
        response = requests.post(
            f"{BACKEND_URL}/auth/signup",
            json={
                "name": "TestBuild",
                "email": unique_email,
                "password": "Build123!@"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                log_test("Signup", True, f"Status: {response.status_code}, Token received, email={unique_email}")
                return True
            else:
                log_test("Signup", False, f"Status: {response.status_code}, No access_token in response")
                return False
        else:
            log_test("Signup", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Signup", False, f"Exception: {str(e)}")
        return False

def test_login():
    """Test 2: POST /api/auth/login"""
    print("\n=== Test 2: Login ===")
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={
                "email": REVIEW_PARENT_EMAIL,
                "password": REVIEW_PARENT_PASSWORD
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                log_test("Login", True, f"Status: {response.status_code}, Token received")
                return data["access_token"]
            else:
                log_test("Login", False, f"Status: {response.status_code}, No access_token in response")
                return None
        else:
            log_test("Login", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Login", False, f"Exception: {str(e)}")
        return None

def test_verify_demo():
    """Test 3: GET /api/admin/verify-demo"""
    print("\n=== Test 3: Verify Demo Account ===")
    try:
        response = requests.get(
            f"{BACKEND_URL}/admin/verify-demo",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("exists") == True and data.get("password_valid") == True:
                log_test("Verify Demo", True, f"exists={data.get('exists')}, password_valid={data.get('password_valid')}")
                return True
            else:
                log_test("Verify Demo", False, f"exists={data.get('exists')}, password_valid={data.get('password_valid')}")
                return False
        else:
            log_test("Verify Demo", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Verify Demo", False, f"Exception: {str(e)}")
        return False

def test_verify_code():
    """Test 4: POST /api/family/verify-code"""
    print("\n=== Test 4: Verify Family Code ===")
    try:
        response = requests.post(
            f"{BACKEND_URL}/family/verify-code",
            json={"code": REVIEW_FAMILY_CODE},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "family_id" in data and "family_name" in data:
                log_test("Verify Code", True, f"Status: {response.status_code}, family_name={data.get('family_name')}")
                return True
            else:
                log_test("Verify Code", False, f"Status: {response.status_code}, Missing family_id or family_name")
                return False
        else:
            log_test("Verify Code", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Verify Code", False, f"Exception: {str(e)}")
        return False

def test_visitor_view():
    """Test 5: GET /api/visitor/REVIEW"""
    print("\n=== Test 5: Visitor View ===")
    try:
        response = requests.get(
            f"{BACKEND_URL}/visitor/{REVIEW_FAMILY_CODE}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "family_name" in data and "children" in data:
                log_test("Visitor View", True, f"Status: {response.status_code}, family_name={data.get('family_name')}, {len(data.get('children', []))} children")
                return True
            else:
                log_test("Visitor View", False, f"Status: {response.status_code}, Missing family_name or children data")
                return False
        else:
            log_test("Visitor View", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Visitor View", False, f"Exception: {str(e)}")
        return False

def test_join_child():
    """Test 6: POST /api/family/join-child"""
    print("\n=== Test 6: Join Child ===")
    try:
        response = requests.post(
            f"{BACKEND_URL}/family/join-child",
            json={
                "family_code": REVIEW_FAMILY_CODE,
                "child_name": "BuildTest"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "child_id" in data:
                log_test("Join Child", True, f"Status: {response.status_code}, access_token and child_id received")
                return data["access_token"]
            else:
                log_test("Join Child", False, f"Status: {response.status_code}, Missing access_token or child_id")
                return None
        else:
            log_test("Join Child", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Join Child", False, f"Exception: {str(e)}")
        return None

def test_child_api_access(child_token: str):
    """Test 7: Child can access APIs with JWT token"""
    print("\n=== Test 7: Child API Access ===")
    
    headers = {"Authorization": f"Bearer {child_token}"}
    
    # Test GET /family
    try:
        response = requests.get(
            f"{BACKEND_URL}/family",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            log_test("Child GET /family", True, f"Status: {response.status_code}")
        else:
            log_test("Child GET /family", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Child GET /family", False, f"Exception: {str(e)}")
    
    # Test GET /tasks
    try:
        response = requests.get(
            f"{BACKEND_URL}/tasks",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            log_test("Child GET /tasks", True, f"Status: {response.status_code}")
        else:
            log_test("Child GET /tasks", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Child GET /tasks", False, f"Exception: {str(e)}")

def test_parent_authenticated_apis(parent_token: str):
    """Test 8: Parent authenticated APIs"""
    print("\n=== Test 8: Parent Authenticated APIs ===")
    
    headers = {"Authorization": f"Bearer {parent_token}"}
    
    # Test GET /auth/me
    try:
        response = requests.get(
            f"{BACKEND_URL}/auth/me",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("email") == REVIEW_PARENT_EMAIL:
                log_test("Parent GET /auth/me", True, f"Status: {response.status_code}, email={data.get('email')}")
            else:
                log_test("Parent GET /auth/me", False, f"Email mismatch: {data.get('email')}")
        else:
            log_test("Parent GET /auth/me", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Parent GET /auth/me", False, f"Exception: {str(e)}")
    
    # Test GET /family
    try:
        response = requests.get(
            f"{BACKEND_URL}/family",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == REVIEW_FAMILY_CODE:
                log_test("Parent GET /family", True, f"Status: {response.status_code}, code={data.get('code')}")
            else:
                log_test("Parent GET /family", False, f"Code mismatch: {data.get('code')}")
        else:
            log_test("Parent GET /family", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Parent GET /family", False, f"Exception: {str(e)}")
    
    # Test POST /family/verify-pin
    try:
        response = requests.post(
            f"{BACKEND_URL}/family/verify-pin",
            headers=headers,
            params={"pin": "1234"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") == True:
                log_test("Parent PIN Verification", True, f"Status: {response.status_code}, success={data.get('success')}")
            else:
                log_test("Parent PIN Verification", False, f"success={data.get('success')}")
        else:
            log_test("Parent PIN Verification", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Parent PIN Verification", False, f"Exception: {str(e)}")
    
    # Test GET /children
    try:
        response = requests.get(
            f"{BACKEND_URL}/children",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Parent GET /children", True, f"Status: {response.status_code}, {len(data)} children")
            else:
                log_test("Parent GET /children", False, f"No children found")
        else:
            log_test("Parent GET /children", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Parent GET /children", False, f"Exception: {str(e)}")
    
    # Test GET /tasks
    try:
        response = requests.get(
            f"{BACKEND_URL}/tasks",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Parent GET /tasks", True, f"Status: {response.status_code}, {len(data)} tasks")
            else:
                log_test("Parent GET /tasks", False, f"No tasks found")
        else:
            log_test("Parent GET /tasks", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Parent GET /tasks", False, f"Exception: {str(e)}")
    
    # Test GET /rewards
    try:
        response = requests.get(
            f"{BACKEND_URL}/rewards",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Parent GET /rewards", True, f"Status: {response.status_code}, {len(data)} rewards")
            else:
                log_test("Parent GET /rewards", False, f"No rewards found")
        else:
            log_test("Parent GET /rewards", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Parent GET /rewards", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("=" * 80)
    print("DodotX Backend API Testing - TestFlight Build Fix Verification")
    print(f"Testing against: {BACKEND_URL}")
    print("=" * 80)
    
    # Test 1: Signup
    test_signup()
    
    # Test 2: Login
    parent_token = test_login()
    
    # Test 3: Verify Demo
    test_verify_demo()
    
    # Test 4: Verify Code
    test_verify_code()
    
    # Test 5: Visitor View
    test_visitor_view()
    
    # Test 6: Join Child
    child_token = test_join_child()
    
    # Test 7: Child API Access (if child token received)
    if child_token:
        test_child_api_access(child_token)
    
    # Test 8: Parent Authenticated APIs (if parent token received)
    if parent_token:
        test_parent_authenticated_apis(parent_token)
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {tests_passed + tests_failed}")
    print(f"Passed: {tests_passed}")
    print(f"Failed: {tests_failed}")
    print(f"Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
    print("=" * 80)
    
    if tests_failed > 0:
        print("\n❌ SOME TESTS FAILED - Review the details above")
        return 1
    else:
        print("\n✅ ALL TESTS PASSED - Backend URL configuration is working correctly!")
        return 0

if __name__ == "__main__":
    exit(main())
