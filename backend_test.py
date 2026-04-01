#!/usr/bin/env python3
"""
KidQuest Backend API Testing Script
Tests all critical backend endpoints for the KidQuest application
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend .env
BACKEND_URL = "https://app-store-setup-2.preview.emergentagent.com/api"

# Test credentials from review request
TEST_EMAIL = "parent@test.com"
TEST_PASSWORD = "parent123"
TEST_NAME = "Test Parent"

# Test data
TEST_FAMILY = {
    "name": "Test Family",
    "pin": "1234", 
    "theme": "football"
}

TEST_CHILD = {
    "name": "Alex",
    "avatar": "👦",
    "age": 8
}

class KidQuestAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.family_id = None
        self.child_id = None
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BACKEND_URL}{endpoint}"
        
        # Add auth header if token available
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                return False, f"Unsupported method: {method}", 0
                
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", 0
    
    def test_health_endpoint(self):
        """Test 1: Health endpoint"""
        success, data, status_code = self.make_request("GET", "/health")
        
        if success and isinstance(data, dict) and data.get("status") == "healthy":
            self.log_result("Health Check", True, f"Status: {data.get('status')}, Database: {data.get('database')}")
        else:
            self.log_result("Health Check", False, f"Status code: {status_code}", data)
    
    def test_signup(self):
        """Test 2: User signup"""
        signup_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        }
        
        success, data, status_code = self.make_request("POST", "/auth/signup", signup_data)
        
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            user_info = data.get("user", {})
            self.log_result("User Signup", True, 
                          f"User created: {user_info.get('name')} ({user_info.get('email')})")
        else:
            # If user already exists, try to continue with login
            if status_code == 400 and "already registered" in str(data):
                self.log_result("User Signup", True, "User already exists (continuing with login)")
                return
            self.log_result("User Signup", False, f"Status code: {status_code}", data)
    
    def test_login(self):
        """Test 3: User login"""
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        success, data, status_code = self.make_request("POST", "/auth/login", login_data)
        
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            user_info = data.get("user", {})
            self.family_id = user_info.get("family_id")
            self.log_result("User Login", True, 
                          f"Login successful: {user_info.get('name')} (Family ID: {self.family_id})")
        else:
            self.log_result("User Login", False, f"Status code: {status_code}", data)
    
    def test_family_creation(self):
        """Test 4: Family creation"""
        if not self.auth_token:
            self.log_result("Family Creation", False, "No auth token available")
            return
            
        # Skip if user already has a family
        if self.family_id:
            self.log_result("Family Creation", True, "User already has a family (skipping creation)")
            return
            
        success, data, status_code = self.make_request("POST", "/family", TEST_FAMILY)
        
        if success and isinstance(data, dict) and "id" in data:
            self.family_id = data["id"]
            self.log_result("Family Creation", True, 
                          f"Family created: {data.get('name')} (ID: {self.family_id})")
        else:
            self.log_result("Family Creation", False, f"Status code: {status_code}", data)
    
    def test_get_family(self):
        """Test 5: Get family"""
        if not self.auth_token:
            self.log_result("Get Family", False, "No auth token available")
            return
            
        success, data, status_code = self.make_request("GET", "/family")
        
        if success and isinstance(data, dict) and "id" in data:
            self.family_id = data["id"]
            self.log_result("Get Family", True, 
                          f"Family retrieved: {data.get('name')} (Theme: {data.get('theme')})")
        else:
            self.log_result("Get Family", False, f"Status code: {status_code}", data)
    
    def test_create_child(self):
        """Test 6: Create child"""
        if not self.auth_token:
            self.log_result("Create Child", False, "No auth token available")
            return
            
        success, data, status_code = self.make_request("POST", "/children", TEST_CHILD)
        
        if success and isinstance(data, dict) and "id" in data:
            self.child_id = data["id"]
            self.log_result("Create Child", True, 
                          f"Child created: {data.get('name')} {data.get('avatar')} (Age: {data.get('age')})")
        else:
            self.log_result("Create Child", False, f"Status code: {status_code}", data)
    
    def test_get_children(self):
        """Test 7: Get children"""
        if not self.auth_token:
            self.log_result("Get Children", False, "No auth token available")
            return
            
        success, data, status_code = self.make_request("GET", "/children")
        
        if success and isinstance(data, list):
            children_count = len(data)
            children_names = [child.get('name', 'Unknown') for child in data]
            self.log_result("Get Children", True, 
                          f"Retrieved {children_count} children: {', '.join(children_names)}")
        else:
            self.log_result("Get Children", False, f"Status code: {status_code}", data)
    
    def test_get_tasks(self):
        """Test 8: Get tasks (should return 8 default tasks)"""
        if not self.auth_token:
            self.log_result("Get Tasks", False, "No auth token available")
            return
            
        success, data, status_code = self.make_request("GET", "/tasks")
        
        if success and isinstance(data, list):
            tasks_count = len(data)
            expected_count = 8
            
            if tasks_count == expected_count:
                task_titles = [task.get('title', 'Unknown') for task in data[:3]]  # Show first 3
                self.log_result("Get Tasks", True, 
                              f"Retrieved {tasks_count} default tasks (expected {expected_count}). Examples: {', '.join(task_titles)}...")
            else:
                self.log_result("Get Tasks", False, 
                              f"Expected {expected_count} default tasks, got {tasks_count}")
        else:
            self.log_result("Get Tasks", False, f"Status code: {status_code}", data)
    
    def test_get_rewards(self):
        """Test 9: Get rewards (should return 5 default rewards)"""
        if not self.auth_token:
            self.log_result("Get Rewards", False, "No auth token available")
            return
            
        success, data, status_code = self.make_request("GET", "/rewards")
        
        if success and isinstance(data, list):
            rewards_count = len(data)
            expected_count = 5
            
            if rewards_count == expected_count:
                reward_titles = [reward.get('title', 'Unknown') for reward in data[:3]]  # Show first 3
                self.log_result("Get Rewards", True, 
                              f"Retrieved {rewards_count} default rewards (expected {expected_count}). Examples: {', '.join(reward_titles)}...")
            else:
                self.log_result("Get Rewards", False, 
                              f"Expected {expected_count} default rewards, got {rewards_count}")
        else:
            self.log_result("Get Rewards", False, f"Status code: {status_code}", data)
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting KidQuest Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Email: {TEST_EMAIL}")
        print("=" * 60)
        print()
        
        # Run tests in order
        self.test_health_endpoint()
        self.test_signup()
        self.test_login()
        self.test_family_creation()
        self.test_get_family()
        self.test_create_child()
        self.test_get_children()
        self.test_get_tasks()
        self.test_get_rewards()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if result["success"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        # Show failed tests
        failed_tests = [result for result in self.results if not result["success"]]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        return passed == total

if __name__ == "__main__":
    tester = KidQuestAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)