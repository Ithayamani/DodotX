#!/usr/bin/env python3
"""
DodotX Backend API Testing - Apple App Store Readiness
Tests account deletion, child join-family flow, and parent PIN flow
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://app-store-setup-2.preview.emergentagent.com/api"

# Test credentials from memory/test_credentials.md
PARENT_EMAIL = "parent@test.com"
PARENT_PASSWORD = "Parent123!"
PARENT_PIN = "1234"
FAMILY_CODE = "TEST01"
REVIEW_CODE = "REVIEW"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name: str):
        self.passed += 1
        print(f"{GREEN}✓{RESET} {test_name}")
    
    def add_fail(self, test_name: str, error: str):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"{RED}✗{RESET} {test_name}")
        print(f"  {RED}Error: {error}{RESET}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"Test Summary: {self.passed}/{total} passed")
        if self.failed > 0:
            print(f"{RED}Failed tests:{RESET}")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}\n")
        return self.failed == 0

def make_request(method: str, endpoint: str, data: Optional[Dict] = None, 
                 token: Optional[str] = None, params: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return (success, response_data, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, params=params, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, params=params, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, params=params, timeout=10)
        else:
            return False, {"error": f"Unsupported method: {method}"}, 0
        
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text}
        
        return response.status_code < 400, response_data, response.status_code
    except Exception as e:
        return False, {"error": str(e)}, 0

def test_parent_login(result: TestResult) -> Optional[str]:
    """Test 1: Parent Login"""
    print(f"\n{BLUE}Test 1: Parent Login{RESET}")
    success, data, status = make_request("POST", "/auth/login", {
        "email": PARENT_EMAIL,
        "password": PARENT_PASSWORD
    })
    
    if not success:
        result.add_fail("Parent Login", f"Status {status}: {data.get('detail', data)}")
        return None
    
    if "access_token" not in data:
        result.add_fail("Parent Login", "No access_token in response")
        return None
    
    if "user" not in data or data["user"].get("email") != PARENT_EMAIL:
        result.add_fail("Parent Login", "Invalid user data in response")
        return None
    
    result.add_pass("Parent Login")
    return data["access_token"]

def test_parent_pin_verification(result: TestResult, parent_token: str):
    """Test 2: Parent PIN Verification"""
    print(f"\n{BLUE}Test 2: Parent PIN Verification{RESET}")
    
    # Test correct PIN
    success, data, status = make_request("POST", "/family/verify-pin", 
                                        token=parent_token, params={"pin": PARENT_PIN})
    
    if not success or not data.get("success"):
        result.add_fail("Parent PIN Verification (correct PIN)", 
                       f"Status {status}: {data.get('detail', data)}")
    else:
        result.add_pass("Parent PIN Verification (correct PIN)")
    
    # Test wrong PIN
    success, data, status = make_request("POST", "/family/verify-pin", 
                                        token=parent_token, params={"pin": "9999"})
    
    if status == 401:
        result.add_pass("Parent PIN Verification (wrong PIN rejected)")
    else:
        result.add_fail("Parent PIN Verification (wrong PIN rejected)", 
                       f"Expected 401, got {status}")

def test_family_code_verification(result: TestResult):
    """Test 3: Family Code Verification"""
    print(f"\n{BLUE}Test 3: Family Code Verification{RESET}")
    success, data, status = make_request("POST", "/family/verify-code", {
        "code": FAMILY_CODE
    })
    
    if not success:
        result.add_fail("Family Code Verification", f"Status {status}: {data.get('detail', data)}")
        return
    
    required_fields = ["family_id", "family_name", "theme"]
    missing = [f for f in required_fields if f not in data]
    
    if missing:
        result.add_fail("Family Code Verification", f"Missing fields: {missing}")
    else:
        result.add_pass("Family Code Verification")

def test_child_join_family(result: TestResult) -> tuple:
    """Test 4: Child Join Family via Code (MOST IMPORTANT - JWT Token)"""
    print(f"\n{BLUE}Test 4: Child Join Family via Code (JWT Token){RESET}")
    
    import time
    child_name = f"TestKid_{int(time.time())}"
    
    success, data, status = make_request("POST", "/family/join-child", {
        "family_code": FAMILY_CODE,
        "child_name": child_name
    })
    
    if not success:
        result.add_fail("Child Join Family", f"Status {status}: {data.get('detail', data)}")
        return None, None
    
    # Check all required fields
    required_fields = ["child_id", "family_id", "message", "access_token", "token_type", "user"]
    missing = [f for f in required_fields if f not in data]
    
    if missing:
        result.add_fail("Child Join Family", f"Missing fields: {missing}")
        return None, None
    
    if data.get("token_type") != "bearer":
        result.add_fail("Child Join Family", f"Invalid token_type: {data.get('token_type')}")
        return None, None
    
    if not data.get("user", {}).get("role") == "child":
        result.add_fail("Child Join Family", f"Invalid user role: {data.get('user', {}).get('role')}")
        return None, None
    
    result.add_pass("Child Join Family (JWT Token Issued)")
    return data["access_token"], data["child_id"]

def test_child_api_access(result: TestResult, child_token: str, child_id: str):
    """Test 5-8: Child API Access with JWT Token"""
    print(f"\n{BLUE}Test 5-8: Child API Access with JWT Token{RESET}")
    
    # Test 5: GET /api/family
    success, data, status = make_request("GET", "/family", token=child_token)
    if success and "id" in data and "name" in data:
        result.add_pass("Child Access: GET /family")
    else:
        result.add_fail("Child Access: GET /family", f"Status {status}: {data.get('detail', data)}")
    
    # Test 6: GET /api/tasks
    success, data, status = make_request("GET", "/tasks", token=child_token)
    if success and isinstance(data, list):
        result.add_pass("Child Access: GET /tasks")
        # Store first task for toggle test
        task_id = data[0]["id"] if data else None
    else:
        result.add_fail("Child Access: GET /tasks", f"Status {status}: {data.get('detail', data)}")
        task_id = None
    
    # Test 7: GET /api/progress/{child_id}
    success, data, status = make_request("GET", f"/progress/{child_id}", token=child_token)
    if success and "points" in data and "child" in data:
        result.add_pass("Child Access: GET /progress/{child_id}")
    else:
        result.add_fail("Child Access: GET /progress/{child_id}", f"Status {status}: {data.get('detail', data)}")
    
    # Test 8: POST /api/tasks/{task_id}/toggle
    if task_id:
        success, data, status = make_request("POST", f"/tasks/{task_id}/toggle", 
                                            token=child_token, params={"child_id": child_id})
        if success and "success" in data and "points" in data:
            result.add_pass("Child Access: POST /tasks/{task_id}/toggle")
        else:
            result.add_fail("Child Access: POST /tasks/{task_id}/toggle", 
                           f"Status {status}: {data.get('detail', data)}")
    else:
        result.add_fail("Child Access: POST /tasks/{task_id}/toggle", "No task_id available")

def test_seed_data(result: TestResult, parent_token: str):
    """Test 9-11: Seed Data Verification"""
    print(f"\n{BLUE}Test 9-11: Seed Data Verification{RESET}")
    
    # Test 9: GET /api/tasks (8 tasks with correct fields)
    success, data, status = make_request("GET", "/tasks", token=parent_token)
    if not success:
        result.add_fail("Seed Data: Tasks", f"Status {status}: {data.get('detail', data)}")
    elif not isinstance(data, list):
        result.add_fail("Seed Data: Tasks", "Response is not a list")
    elif len(data) < 8:
        result.add_fail("Seed Data: Tasks", f"Expected 8 tasks, got {len(data)}")
    else:
        # Check task structure
        task = data[0]
        required_fields = ["title", "icon", "pts", "cat", "modes"]
        missing = [f for f in required_fields if f not in task]
        if missing:
            result.add_fail("Seed Data: Tasks", f"Missing fields in task: {missing}")
        elif not isinstance(task.get("modes"), dict):
            result.add_fail("Seed Data: Tasks", f"Invalid modes format: {type(task.get('modes'))}")
        elif "daily" not in task["modes"] or "vacation" not in task["modes"]:
            result.add_fail("Seed Data: Tasks", f"Missing daily/vacation in modes: {task['modes']}")
        else:
            result.add_pass("Seed Data: Tasks (8 tasks with correct fields)")
    
    # Test 10: GET /api/rewards (5 rewards with correct fields)
    success, data, status = make_request("GET", "/rewards", token=parent_token)
    if not success:
        result.add_fail("Seed Data: Rewards", f"Status {status}: {data.get('detail', data)}")
    elif not isinstance(data, list):
        result.add_fail("Seed Data: Rewards", "Response is not a list")
    elif len(data) < 5:
        result.add_fail("Seed Data: Rewards", f"Expected 5 rewards, got {len(data)}")
    else:
        # Check reward structure
        reward = data[0]
        required_fields = ["name", "icon", "pts", "desc"]
        missing = [f for f in required_fields if f not in reward]
        if missing:
            result.add_fail("Seed Data: Rewards", f"Missing fields in reward: {missing}")
        else:
            result.add_pass("Seed Data: Rewards (5 rewards with correct fields)")
    
    # Test 11: GET /api/children (at least 1 child - Alex)
    success, data, status = make_request("GET", "/children", token=parent_token)
    if not success:
        result.add_fail("Seed Data: Children", f"Status {status}: {data.get('detail', data)}")
    elif not isinstance(data, list):
        result.add_fail("Seed Data: Children", "Response is not a list")
    elif len(data) < 1:
        result.add_fail("Seed Data: Children", "Expected at least 1 child (Alex)")
    else:
        result.add_pass("Seed Data: Children (at least 1 child)")

def test_account_deletion_flow(result: TestResult):
    """Test 12-16: Account Deletion (Apple App Store Requirement)"""
    print(f"\n{BLUE}Test 12-16: Account Deletion Flow (Apple Requirement){RESET}")
    
    # Test 12: Create a new test account
    test_email = f"deltest_{int(time.time())}@test.com"
    test_password = "DelTest123!@"
    
    success, data, status = make_request("POST", "/auth/signup", {
        "name": "Delete Test User",
        "email": test_email,
        "password": test_password
    })
    
    if not success or "access_token" not in data:
        result.add_fail("Account Deletion: Create Test Account", 
                       f"Status {status}: {data.get('detail', data)}")
        return
    
    test_token = data["access_token"]
    result.add_pass("Account Deletion: Create Test Account")
    
    # Test 13: Verify account exists with GET /api/auth/me
    success, data, status = make_request("GET", "/auth/me", token=test_token)
    if not success or data.get("email") != test_email:
        result.add_fail("Account Deletion: Verify Account Exists", 
                       f"Status {status}: {data.get('detail', data)}")
        return
    
    result.add_pass("Account Deletion: Verify Account Exists")
    
    # Test 14: Delete the account
    success, data, status = make_request("DELETE", "/auth/delete-account", token=test_token)
    if not success:
        result.add_fail("Account Deletion: DELETE /auth/delete-account", 
                       f"Status {status}: {data.get('detail', data)}")
        return
    
    if "message" not in data or "deleted" not in data["message"].lower():
        result.add_fail("Account Deletion: DELETE /auth/delete-account", 
                       f"Missing or invalid deletion message: {data}")
        return
    
    result.add_pass("Account Deletion: DELETE /auth/delete-account")
    
    # Test 15: Verify account is deleted - GET /api/auth/me should return 401
    success, data, status = make_request("GET", "/auth/me", token=test_token)
    if status == 401:
        result.add_pass("Account Deletion: Verify Account Deleted (401)")
    else:
        result.add_fail("Account Deletion: Verify Account Deleted (401)", 
                       f"Expected 401, got {status}")
    
    # Test 16: Verify login fails with deleted account
    success, data, status = make_request("POST", "/auth/login", {
        "email": test_email,
        "password": test_password
    })
    
    if status == 401:
        result.add_pass("Account Deletion: Login Fails After Deletion")
    else:
        result.add_fail("Account Deletion: Login Fails After Deletion", 
                       f"Expected 401, got {status}")

def test_review_family_code(result: TestResult):
    """Test 17: Review Family Code Verification (for Apple reviewer)"""
    print(f"\n{BLUE}Test 17: Review Family Code Verification{RESET}")
    success, data, status = make_request("POST", "/family/verify-code", {
        "code": REVIEW_CODE
    })
    
    if not success:
        result.add_fail("Review Family Code", f"Status {status}: {data.get('detail', data)}")
        return
    
    required_fields = ["family_id", "family_name", "theme"]
    missing = [f for f in required_fields if f not in data]
    
    if missing:
        result.add_fail("Review Family Code", f"Missing fields: {missing}")
    else:
        result.add_pass("Review Family Code (REVIEW)")

def test_review_child_join(result: TestResult):
    """Test 18: Review Child Join (for Apple reviewer)"""
    print(f"\n{BLUE}Test 18: Review Child Join Flow{RESET}")
    
    child_name = f"ReviewKid_{int(time.time())}"
    
    success, data, status = make_request("POST", "/family/join-child", {
        "family_code": REVIEW_CODE,
        "child_name": child_name
    })
    
    if not success:
        result.add_fail("Review Child Join", f"Status {status}: {data.get('detail', data)}")
        return
    
    # Check all required fields
    required_fields = ["child_id", "family_id", "message", "access_token", "token_type"]
    missing = [f for f in required_fields if f not in data]
    
    if missing:
        result.add_fail("Review Child Join", f"Missing fields: {missing}")
    elif data.get("token_type") != "bearer":
        result.add_fail("Review Child Join", f"Invalid token_type: {data.get('token_type')}")
    else:
        result.add_pass("Review Child Join (REVIEW code with JWT)")

def main():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}DodotX Backend API Testing - Apple App Store Readiness{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Account: {PARENT_EMAIL}")
    print(f"Family Code: {FAMILY_CODE}")
    print(f"Review Code: {REVIEW_CODE}")
    
    result = TestResult()
    
    # Test 1: Parent Login
    parent_token = test_parent_login(result)
    if not parent_token:
        print(f"\n{RED}Cannot continue without parent token{RESET}")
        result.summary()
        return 1
    
    # Test 2: Parent PIN Verification
    test_parent_pin_verification(result, parent_token)
    
    # Test 3: Family Code Verification
    test_family_code_verification(result)
    
    # Test 4: Child Join Family (MOST IMPORTANT)
    child_token, child_id = test_child_join_family(result)
    if not child_token or not child_id:
        print(f"\n{YELLOW}Warning: Child token not available, skipping child API tests{RESET}")
    else:
        # Test 5-8: Child API Access
        test_child_api_access(result, child_token, child_id)
    
    # Test 9-11: Seed Data Verification
    test_seed_data(result, parent_token)
    
    # Test 12-16: Account Deletion (Apple App Store Requirement)
    test_account_deletion_flow(result)
    
    # Test 17: Review Family Code
    test_review_family_code(result)
    
    # Test 18: Review Child Join
    test_review_child_join(result)
    
    # Summary
    success = result.summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
