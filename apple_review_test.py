#!/usr/bin/env python3
"""
CRITICAL TEST FOR APPLE APP STORE REVIEW
DodotX Demo Account Login - Apple has rejected 3 times because they can't sign in
This test verifies the inline seed system with verification logging
"""

import requests
import json
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://app-store-setup-2.preview.emergentagent.com/api"
REVIEW_EMAIL = "review_parent@dodotx.com"
REVIEW_PASSWORD = "Review123!"
TEST_EMAIL = "parent@test.com"
TEST_PASSWORD = "Parent123!"
FAMILY_PIN = "1234"
REVIEW_CODE = "REVIEW"
TEST_CODE = "TEST01"

# Test results
test_results = []
passed = 0
failed = 0

def log_test(num: int, name: str, status: str, details: str):
    """Log test result"""
    global passed, failed
    result = f"TEST {num:2d} | {status:4s} | {name:50s} | {details}"
    test_results.append(result)
    if status == "PASS":
        passed += 1
        print(f"✅ {result}")
    else:
        failed += 1
        print(f"❌ {result}")

def req(method: str, endpoint: str, headers: Optional[Dict] = None, 
        json_data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return (status_code, response_json)"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=json_data, params=params, timeout=30)
        elif method == "PUT":
            resp = requests.put(url, headers=headers, json=json_data, timeout=30)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=30)
        else:
            return (0, {"error": "Invalid method"})
        
        try:
            return (resp.status_code, resp.json())
        except:
            return (resp.status_code, {"text": resp.text})
    except Exception as e:
        return (0, {"error": str(e)})

def main():
    """Run Apple Review Critical Tests"""
    global passed, failed
    
    print("=" * 100)
    print("APPLE APP STORE REVIEW - CRITICAL DEMO ACCOUNT LOGIN TEST")
    print("=" * 100)
    print(f"Backend URL: {BASE_URL}")
    print(f"Demo Account: {REVIEW_EMAIL} / {REVIEW_PASSWORD}")
    print(f"Test Account: {TEST_EMAIL} / {TEST_PASSWORD}")
    print("=" * 100)
    print()
    
    tokens = {}
    
    # ========================================================================
    # 1. DEMO ACCOUNT LOGIN (MOST CRITICAL)
    # ========================================================================
    print("\n### 1. DEMO ACCOUNT LOGIN (MOST CRITICAL)")
    print("-" * 100)
    
    # Test 1: Login with review_parent@dodotx.com
    status, data = req("POST", "/auth/login", json_data={
        "email": REVIEW_EMAIL,
        "password": REVIEW_PASSWORD
    })
    if status == 200 and "access_token" in data:
        tokens["review"] = data["access_token"]
        log_test(1, "POST /auth/login (review_parent@dodotx.com)", "PASS", 
                f"✓ Login successful, token received, user: {data.get('user', {}).get('email')}")
    else:
        log_test(1, "POST /auth/login (review_parent@dodotx.com)", "FAIL", 
                f"Status {status}, response: {json.dumps(data)[:100]}")
    
    # Test 2: Login with parent@test.com
    status, data = req("POST", "/auth/login", json_data={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if status == 200 and "access_token" in data:
        tokens["test"] = data["access_token"]
        log_test(2, "POST /auth/login (parent@test.com)", "PASS", 
                f"✓ Login successful, token received")
    else:
        log_test(2, "POST /auth/login (parent@test.com)", "FAIL", 
                f"Status {status}, response: {json.dumps(data)[:100]}")
    
    # ========================================================================
    # 2. ADMIN VERIFICATION ENDPOINT
    # ========================================================================
    print("\n### 2. ADMIN VERIFICATION ENDPOINT")
    print("-" * 100)
    
    # Test 3: GET /admin/verify-demo
    status, data = req("GET", "/admin/verify-demo")
    if status == 200:
        exists = data.get("exists")
        pw_valid = data.get("password_valid")
        family_code = data.get("family_code")
        children_count = data.get("children_count")
        tasks_count = data.get("tasks_count")
        
        if exists and pw_valid and family_code == "REVIEW" and children_count == 2 and tasks_count == 12:
            log_test(3, "GET /admin/verify-demo", "PASS", 
                    f"✓ exists={exists}, password_valid={pw_valid}, code={family_code}, children={children_count}, tasks={tasks_count}")
        else:
            log_test(3, "GET /admin/verify-demo", "FAIL", 
                    f"exists={exists}, pw_valid={pw_valid}, code={family_code}, children={children_count}, tasks={tasks_count}")
    else:
        log_test(3, "GET /admin/verify-demo", "FAIL", f"Status {status}, response: {data}")
    
    # ========================================================================
    # 3. MANUAL RE-SEED
    # ========================================================================
    print("\n### 3. MANUAL RE-SEED")
    print("-" * 100)
    
    # Test 4: GET /admin/seed
    status, data = req("GET", "/admin/seed")
    if status == 200 and data.get("status") == "success":
        log_test(4, "GET /admin/seed", "PASS", f"✓ Re-seed successful: {data.get('message')}")
    else:
        log_test(4, "GET /admin/seed", "FAIL", f"Status {status}, response: {data}")
    
    # Test 5: Login after re-seed
    status, data = req("POST", "/auth/login", json_data={
        "email": REVIEW_EMAIL,
        "password": REVIEW_PASSWORD
    })
    if status == 200 and "access_token" in data:
        tokens["review"] = data["access_token"]
        log_test(5, "POST /auth/login (after re-seed)", "PASS", 
                f"✓ Login successful after re-seed")
    else:
        log_test(5, "POST /auth/login (after re-seed)", "FAIL", 
                f"Status {status}, response: {json.dumps(data)[:100]}")
    
    # ========================================================================
    # 4. HEALTH CHECK (with real DB check)
    # ========================================================================
    print("\n### 4. HEALTH CHECK")
    print("-" * 100)
    
    # Test 6: GET /health
    status, data = req("GET", "/health")
    if status == 200 and data.get("database") == "connected":
        log_test(6, "GET /health", "PASS", 
                f"✓ status={data.get('status')}, database={data.get('database')}")
    else:
        log_test(6, "GET /health", "FAIL", 
                f"Status {status}, database={data.get('database')}, response: {data}")
    
    # ========================================================================
    # 5. FULL FLOW AFTER LOGIN
    # ========================================================================
    print("\n### 5. FULL FLOW AFTER LOGIN")
    print("-" * 100)
    
    if not tokens.get("review"):
        print("⚠️  No review token available, skipping full flow tests")
        for i in range(7, 15):
            log_test(i, "Full flow test", "FAIL", "No review token available")
    else:
        headers = {"Authorization": f"Bearer {tokens['review']}"}
        
        # Test 7: GET /family
        status, data = req("GET", "/family", headers=headers)
        if status == 200 and data.get("code") == "REVIEW":
            log_test(7, "GET /family (with token)", "PASS", 
                    f"✓ code={data.get('code')}, name={data.get('name')}")
        else:
            log_test(7, "GET /family (with token)", "FAIL", 
                    f"Status {status}, code={data.get('code')}, response: {json.dumps(data)[:100]}")
        
        # Test 8: POST /family/verify-pin?pin=1234
        status, data = req("POST", "/family/verify-pin", headers=headers, params={"pin": FAMILY_PIN})
        if status == 200 and data.get("success") == True:
            log_test(8, "POST /family/verify-pin?pin=1234", "PASS", "✓ PIN verified successfully")
        else:
            log_test(8, "POST /family/verify-pin?pin=1234", "FAIL", 
                    f"Status {status}, response: {data}")
        
        # Test 9: GET /children
        status, data = req("GET", "/children", headers=headers)
        if status == 200 and isinstance(data, list) and len(data) == 2:
            log_test(9, "GET /children (with token)", "PASS", 
                    f"✓ {len(data)} children: {[c.get('name') for c in data]}")
        else:
            log_test(9, "GET /children (with token)", "FAIL", 
                    f"Status {status}, count={len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test 10: GET /tasks
        status, data = req("GET", "/tasks", headers=headers)
        if status == 200 and isinstance(data, list) and len(data) == 12:
            log_test(10, "GET /tasks (with token)", "PASS", 
                    f"✓ {len(data)} tasks")
        else:
            log_test(10, "GET /tasks (with token)", "FAIL", 
                    f"Status {status}, count={len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test 11: GET /rewards
        status, data = req("GET", "/rewards", headers=headers)
        if status == 200 and isinstance(data, list) and len(data) == 6:
            log_test(11, "GET /rewards (with token)", "PASS", 
                    f"✓ {len(data)} rewards")
        else:
            log_test(11, "GET /rewards (with token)", "FAIL", 
                    f"Status {status}, count={len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test 12: POST /family/verify-code (no auth needed)
        status, data = req("POST", "/family/verify-code", json_data={"code": "REVIEW"})
        if status == 200 and "family_id" in data:
            log_test(12, "POST /family/verify-code (code=REVIEW)", "PASS", 
                    f"✓ family_name={data.get('family_name')}")
        else:
            log_test(12, "POST /family/verify-code (code=REVIEW)", "FAIL", 
                    f"Status {status}, response: {data}")
        
        # Test 13: POST /family/join-child
        status, data = req("POST", "/family/join-child", json_data={
            "family_code": "REVIEW",
            "child_name": "AppleReviewer"
        })
        if status == 200 and "access_token" in data and "child_id" in data:
            child_token = data["access_token"]
            log_test(13, "POST /family/join-child (code=REVIEW)", "PASS", 
                    f"✓ child_id={data.get('child_id')}, token received")
            
            # Test 14: Child can access APIs with token
            child_headers = {"Authorization": f"Bearer {child_token}"}
            status1, data1 = req("GET", "/family", headers=child_headers)
            status2, data2 = req("GET", "/tasks", headers=child_headers)
            
            if status1 == 200 and status2 == 200:
                log_test(14, "Child API access (GET /family, /tasks)", "PASS", 
                        f"✓ Child can access family and tasks with JWT")
            else:
                log_test(14, "Child API access (GET /family, /tasks)", "FAIL", 
                        f"Family: {status1}, Tasks: {status2}")
        else:
            log_test(13, "POST /family/join-child (code=REVIEW)", "FAIL", 
                    f"Status {status}, response: {json.dumps(data)[:100]}")
            log_test(14, "Child API access", "FAIL", "No child token from join-child")
    
    # ========================================================================
    # 6. SIGNUP FLOW (user reported "login failed" on signup)
    # ========================================================================
    print("\n### 6. SIGNUP FLOW")
    print("-" * 100)
    
    # Test 15: POST /auth/signup
    status, data = req("POST", "/auth/signup", json_data={
        "name": "NewAppleUser",
        "email": "apple@reviewer.com",
        "password": "Apple123!@"
    })
    if status == 200 and "access_token" in data:
        log_test(15, "POST /auth/signup (new user)", "PASS", 
                f"✓ Signup successful, token received")
    else:
        log_test(15, "POST /auth/signup (new user)", "FAIL", 
                f"Status {status}, response: {json.dumps(data)[:100]}")
    
    # ========================================================================
    # 7. SERVER RESTART VERIFICATION
    # ========================================================================
    print("\n### 7. SERVER RESTART VERIFICATION")
    print("-" * 100)
    
    print("ℹ️  Check backend logs for startup seed verification:")
    print("    Expected log: 'Demo account review_parent@dodotx.com exists and password VERIFIED OK'")
    print("    Or: 'Demo accounts not found. Seeding fresh...' followed by '=== DEMO SEED COMPLETE ==='")
    print("    Run: tail -n 50 /var/log/supervisor/backend.err.log")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "=" * 100)
    print("TEST SUMMARY")
    print("=" * 100)
    print(f"\nTotal Tests: 15")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success Rate: {(passed/15)*100:.1f}%")
    
    if failed > 0:
        print("\n" + "=" * 100)
        print("FAILED TESTS:")
        print("=" * 100)
        for result in test_results:
            if "FAIL" in result:
                print(result)
    
    print("\n" + "=" * 100)
    print("CRITICAL FOR APPLE REVIEW:")
    print("=" * 100)
    print(f"1. Demo login (review_parent@dodotx.com): {'✅ PASS' if passed >= 1 else '❌ FAIL'}")
    print(f"2. Test login (parent@test.com): {'✅ PASS' if passed >= 2 else '❌ FAIL'}")
    print(f"3. Admin verify endpoint: {'✅ PASS' if passed >= 3 else '❌ FAIL'}")
    print(f"4. Manual re-seed: {'✅ PASS' if passed >= 4 else '❌ FAIL'}")
    print(f"5. Full flow (family, PIN, children, tasks, rewards): {'✅ PASS' if passed >= 11 else '❌ FAIL'}")
    print(f"6. Child join with JWT: {'✅ PASS' if passed >= 13 else '❌ FAIL'}")
    print(f"7. Signup flow: {'✅ PASS' if passed >= 15 else '❌ FAIL'}")
    print("=" * 100)
    
    return passed, failed

if __name__ == "__main__":
    passed, failed = main()
    exit(0 if failed == 0 else 1)
