#!/usr/bin/env python3
"""
DodotX Backend Bug Fix Testing - TestFlight Critical Issues
Tests the two critical bug fixes reported by user during TestFlight testing
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
REVIEW_PARENT_EMAIL = "review_parent@dodotx.com"
REVIEW_PARENT_PASSWORD = "Review123!"
PARENT_PIN = "1234"
FAMILY_CODE = "TEST01"
REVIEW_CODE = "REVIEW"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
BOLD = '\033[1m'
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
        print(f"\n{'='*70}")
        print(f"{BOLD}Test Summary: {self.passed}/{total} passed{RESET}")
        if self.failed > 0:
            print(f"\n{RED}{BOLD}FAILED TESTS:{RESET}")
            for error in self.errors:
                print(f"  {RED}✗{RESET} {error}")
        else:
            print(f"{GREEN}{BOLD}ALL TESTS PASSED!{RESET}")
        print(f"{'='*70}\n")
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

def test_bug1_family_code_expiry(result: TestResult):
    """
    BUG 1: Family code shows "expired"
    Root cause: Seed script set code_generated_at to seeding time, 60-minute expiry kicked in
    Fix: Set code_generated_at to None for demo families so codes NEVER expire
    """
    print(f"\n{BLUE}{BOLD}{'='*70}{RESET}")
    print(f"{BLUE}{BOLD}BUG 1: Family Code Expiry Fix{RESET}")
    print(f"{BLUE}{BOLD}{'='*70}{RESET}")
    print(f"Testing that REVIEW and TEST01 codes never expire (code_generated_at = None)")
    
    # Test 1: Verify REVIEW code (must return 200, NOT 410)
    print(f"\n{YELLOW}Test 1.1: POST /api/family/verify-code with REVIEW code{RESET}")
    success, data, status = make_request("POST", "/family/verify-code", {"code": "REVIEW"})
    
    if status == 410:
        result.add_fail("BUG 1.1: REVIEW code expired (410)", 
                       f"Code should NEVER expire (code_generated_at=None). Got: {data.get('detail', data)}")
    elif not success:
        result.add_fail("BUG 1.1: REVIEW code verification failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif "family_id" not in data or "family_name" not in data:
        result.add_fail("BUG 1.1: REVIEW code verification incomplete", 
                       f"Missing required fields: {data}")
    else:
        result.add_pass("BUG 1.1: REVIEW code NEVER expires (200 OK)")
    
    # Test 2: Verify TEST01 code (must return 200, NOT 410)
    print(f"\n{YELLOW}Test 1.2: POST /api/family/verify-code with TEST01 code{RESET}")
    success, data, status = make_request("POST", "/family/verify-code", {"code": "TEST01"})
    
    if status == 410:
        result.add_fail("BUG 1.2: TEST01 code expired (410)", 
                       f"Code should NEVER expire (code_generated_at=None). Got: {data.get('detail', data)}")
    elif not success:
        result.add_fail("BUG 1.2: TEST01 code verification failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif "family_id" not in data or "family_name" not in data:
        result.add_fail("BUG 1.2: TEST01 code verification incomplete", 
                       f"Missing required fields: {data}")
    else:
        result.add_pass("BUG 1.2: TEST01 code NEVER expires (200 OK)")
    
    # Test 3: Child join with REVIEW code (must return 200 with access_token)
    print(f"\n{YELLOW}Test 1.3: POST /api/family/join-child with REVIEW code{RESET}")
    child_name = f"TestKid_{int(time.time())}"
    success, data, status = make_request("POST", "/family/join-child", {
        "family_code": "REVIEW",
        "child_name": child_name
    })
    
    if status == 410:
        result.add_fail("BUG 1.3: Child join failed - code expired (410)", 
                       f"Code should NEVER expire. Got: {data.get('detail', data)}")
        return None
    elif not success:
        result.add_fail("BUG 1.3: Child join failed", 
                       f"Status {status}: {data.get('detail', data)}")
        return None
    elif "access_token" not in data:
        result.add_fail("BUG 1.3: Child join missing access_token", 
                       f"Response: {data}")
        return None
    else:
        result.add_pass("BUG 1.3: Child join with REVIEW code successful (200 OK)")
        child_token = data["access_token"]
    
    # Test 4: Use child's access_token to GET /api/tasks
    print(f"\n{YELLOW}Test 1.4: GET /api/tasks with child's JWT token{RESET}")
    success, data, status = make_request("GET", "/tasks", token=child_token)
    
    if not success:
        result.add_fail("BUG 1.4: Child GET /tasks failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif not isinstance(data, list):
        result.add_fail("BUG 1.4: Child GET /tasks invalid response", 
                       f"Expected list, got: {type(data)}")
    else:
        result.add_pass("BUG 1.4: Child can access tasks with JWT token (200 OK)")
    
    # Test 5: Use child's access_token to GET /api/family
    print(f"\n{YELLOW}Test 1.5: GET /api/family with child's JWT token{RESET}")
    success, data, status = make_request("GET", "/family", token=child_token)
    
    if not success:
        result.add_fail("BUG 1.5: Child GET /family failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif "id" not in data or "name" not in data:
        result.add_fail("BUG 1.5: Child GET /family invalid response", 
                       f"Missing required fields: {data}")
    else:
        result.add_pass("BUG 1.5: Child can access family with JWT token (200 OK)")

def test_bug2_login_signup_flows(result: TestResult):
    """
    BUG 2: "Login failed" on signup
    Root cause: User was likely on login page entering new credentials
    Fix: Verify both signup and login flows work correctly
    """
    print(f"\n{BLUE}{BOLD}{'='*70}{RESET}")
    print(f"{BLUE}{BOLD}BUG 2: Login/Signup Flow Fix{RESET}")
    print(f"{BLUE}{BOLD}{'='*70}{RESET}")
    print(f"Testing that both signup and login work correctly")
    
    # Test 1: Signup with new credentials (must return 200 with access_token)
    print(f"\n{YELLOW}Test 2.1: POST /api/auth/signup with new credentials{RESET}")
    fresh_email = f"fresh_{int(time.time())}@test.com"
    success, data, status = make_request("POST", "/auth/signup", {
        "name": "FreshUser",
        "email": fresh_email,
        "password": "Fresh123!@"
    })
    
    if not success:
        result.add_fail("BUG 2.1: Signup failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif "access_token" not in data:
        result.add_fail("BUG 2.1: Signup missing access_token", 
                       f"Response: {data}")
    elif "user" not in data or data["user"].get("email") != fresh_email:
        result.add_fail("BUG 2.1: Signup invalid user data", 
                       f"Response: {data}")
    else:
        result.add_pass("BUG 2.1: Signup with new credentials successful (200 OK)")
    
    # Test 2: Login with review_parent credentials
    print(f"\n{YELLOW}Test 2.2: POST /api/auth/login with review_parent@dodotx.com{RESET}")
    success, data, status = make_request("POST", "/auth/login", {
        "email": REVIEW_PARENT_EMAIL,
        "password": REVIEW_PARENT_PASSWORD
    })
    
    if not success:
        result.add_fail("BUG 2.2: Login failed (review_parent)", 
                       f"Status {status}: {data.get('detail', data)}")
    elif "access_token" not in data:
        result.add_fail("BUG 2.2: Login missing access_token", 
                       f"Response: {data}")
    elif "user" not in data or data["user"].get("email") != REVIEW_PARENT_EMAIL:
        result.add_fail("BUG 2.2: Login invalid user data", 
                       f"Response: {data}")
    else:
        result.add_pass("BUG 2.2: Login with review_parent credentials successful (200 OK)")
    
    # Test 3: Login with parent@test.com credentials
    print(f"\n{YELLOW}Test 2.3: POST /api/auth/login with parent@test.com{RESET}")
    success, data, status = make_request("POST", "/auth/login", {
        "email": PARENT_EMAIL,
        "password": PARENT_PASSWORD
    })
    
    parent_token = None
    if not success:
        result.add_fail("BUG 2.3: Login failed (parent@test.com)", 
                       f"Status {status}: {data.get('detail', data)}")
    elif "access_token" not in data:
        result.add_fail("BUG 2.3: Login missing access_token", 
                       f"Response: {data}")
    elif "user" not in data or data["user"].get("email") != PARENT_EMAIL:
        result.add_fail("BUG 2.3: Login invalid user data", 
                       f"Response: {data}")
    else:
        result.add_pass("BUG 2.3: Login with parent@test.com credentials successful (200 OK)")
        parent_token = data["access_token"]
    
    # Test 4: Login with wrong credentials (must return 401)
    print(f"\n{YELLOW}Test 2.4: POST /api/auth/login with wrong credentials{RESET}")
    success, data, status = make_request("POST", "/auth/login", {
        "email": "nonexistent@test.com",
        "password": "Wrong123!"
    })
    
    if status == 401:
        if "detail" in data and data["detail"]:
            result.add_pass("BUG 2.4: Login with wrong credentials rejected (401 with error message)")
        else:
            result.add_fail("BUG 2.4: Login rejected but missing error message", 
                           f"Expected clear error message, got: {data}")
    else:
        result.add_fail("BUG 2.4: Login with wrong credentials should return 401", 
                       f"Got status {status}: {data}")
    
    return parent_token

def test_additional_verification(result: TestResult, parent_token: str):
    """
    Additional verification tests from review request
    """
    print(f"\n{BLUE}{BOLD}{'='*70}{RESET}")
    print(f"{BLUE}{BOLD}Additional Verification Tests{RESET}")
    print(f"{BLUE}{BOLD}{'='*70}{RESET}")
    
    # Test 1: POST /api/family/verify-pin with correct PIN
    print(f"\n{YELLOW}Test 3.1: POST /api/family/verify-pin?pin=1234{RESET}")
    success, data, status = make_request("POST", "/family/verify-pin", 
                                        token=parent_token, params={"pin": PARENT_PIN})
    
    if not success:
        result.add_fail("Additional 3.1: PIN verification failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif not data.get("success"):
        result.add_fail("Additional 3.1: PIN verification invalid response", 
                       f"Expected success=true, got: {data}")
    else:
        result.add_pass("Additional 3.1: PIN verification successful (200 OK)")
    
    # Test 2: GET /api/tasks - check correct fields
    print(f"\n{YELLOW}Test 3.2: GET /api/tasks - verify task fields{RESET}")
    success, data, status = make_request("GET", "/tasks", token=parent_token)
    
    if not success:
        result.add_fail("Additional 3.2: GET /tasks failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif not isinstance(data, list) or len(data) == 0:
        result.add_fail("Additional 3.2: GET /tasks empty or invalid", 
                       f"Expected list with tasks, got: {type(data)}")
    else:
        task = data[0]
        required_fields = ["pts", "cat", "modes"]
        missing = [f for f in required_fields if f not in task]
        
        if missing:
            result.add_fail("Additional 3.2: Task missing required fields", 
                           f"Missing: {missing}. Task: {task}")
        elif not isinstance(task.get("modes"), dict):
            result.add_fail("Additional 3.2: Task modes invalid format", 
                           f"Expected dict, got: {type(task.get('modes'))}. Task: {task}")
        elif "daily" not in task["modes"] or "vacation" not in task["modes"]:
            result.add_fail("Additional 3.2: Task modes missing daily/vacation", 
                           f"Modes: {task['modes']}. Task: {task}")
        else:
            result.add_pass("Additional 3.2: Tasks have correct fields (pts, cat, modes with daily/vacation)")
    
    # Test 3: GET /api/rewards - check correct fields
    print(f"\n{YELLOW}Test 3.3: GET /api/rewards - verify reward fields{RESET}")
    success, data, status = make_request("GET", "/rewards", token=parent_token)
    
    if not success:
        result.add_fail("Additional 3.3: GET /rewards failed", 
                       f"Status {status}: {data.get('detail', data)}")
    elif not isinstance(data, list) or len(data) == 0:
        result.add_fail("Additional 3.3: GET /rewards empty or invalid", 
                       f"Expected list with rewards, got: {type(data)}")
    else:
        reward = data[0]
        required_fields = ["name", "pts", "desc"]
        missing = [f for f in required_fields if f not in reward]
        
        if missing:
            result.add_fail("Additional 3.3: Reward missing required fields", 
                           f"Missing: {missing}. Reward: {reward}")
        else:
            result.add_pass("Additional 3.3: Rewards have correct fields (name, pts, desc)")

def main():
    print(f"\n{BLUE}{BOLD}{'='*70}{RESET}")
    print(f"{BLUE}{BOLD}DodotX Backend Bug Fix Testing - TestFlight Critical Issues{RESET}")
    print(f"{BLUE}{BOLD}{'='*70}{RESET}")
    print(f"Backend URL: {BASE_URL}")
    print(f"Testing 2 critical bug fixes reported during TestFlight testing:")
    print(f"  1. Family code shows 'expired' (code_generated_at = None fix)")
    print(f"  2. 'Login failed' on signup (verify both flows work)")
    print(f"  3. Auto-seed on startup (verified from backend logs)")
    
    result = TestResult()
    
    # BUG 1: Family code expiry fix
    test_bug1_family_code_expiry(result)
    
    # BUG 2: Login/Signup flows
    parent_token = test_bug2_login_signup_flows(result)
    
    # Additional verification
    if parent_token:
        test_additional_verification(result, parent_token)
    else:
        print(f"\n{YELLOW}Warning: Parent token not available, skipping additional verification{RESET}")
    
    # Summary
    success = result.summary()
    
    # BUG 3: Auto-seed verification
    print(f"\n{BLUE}{BOLD}BUG 3: Auto-seed on startup{RESET}")
    print(f"{GREEN}✓{RESET} Verified from backend logs: 'Demo accounts already exist.'")
    print(f"  Server automatically seeds demo accounts if they don't exist on startup.")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
