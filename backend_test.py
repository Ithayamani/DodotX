#!/usr/bin/env python3
"""
KidQuest Backend API Security Features Test
Testing specific security features: JWT authentication, family code regeneration, and expiry logic
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://app-store-setup-2.preview.emergentagent.com/api"

# Test credentials from review request
TEST_EMAIL = "parent@test.com"
TEST_PASSWORD = "parent123"

class KidQuestAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token = None
        self.family_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {"Content-Type": "application/json"}
            
        if self.access_token and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.access_token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_fresh_login(self):
        """Test 1: Fresh login with new JWT secret"""
        print("\n=== Test 1: Fresh Login ===")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response is None:
            self.log_result("Fresh Login", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.access_token = data["access_token"]
                self.family_id = data["user"].get("family_id")
                self.log_result("Fresh Login", True, 
                               f"Successfully logged in. User ID: {data['user']['id']}, Family ID: {self.family_id}",
                               {"user_info": data["user"]})
                return True
            else:
                self.log_result("Fresh Login", False, "Missing access_token or user in response", data)
                return False
        else:
            self.log_result("Fresh Login", False, 
                           f"Login failed with status {response.status_code}: {response.text}")
            return False
    
    def test_family_code_regeneration(self):
        """Test 2: Family code regeneration"""
        print("\n=== Test 2: Family Code Regeneration ===")
        
        if not self.access_token:
            self.log_result("Family Code Regeneration", False, "No access token available")
            return None
            
        response = self.make_request("POST", "/family/regenerate-code")
        
        if response is None:
            self.log_result("Family Code Regeneration", False, "Request failed")
            return None
            
        if response.status_code == 200:
            data = response.json()
            required_fields = ["code", "generated_at", "expires_at"]
            
            if all(field in data for field in required_fields):
                # Verify timestamps are valid
                try:
                    generated_at = datetime.fromisoformat(data["generated_at"].replace('Z', '+00:00'))
                    expires_at = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
                    
                    # Check if expiry is approximately 60 minutes from generation
                    expected_expiry = generated_at + timedelta(minutes=60)
                    time_diff = abs((expires_at - expected_expiry).total_seconds())
                    
                    if time_diff < 5:  # Allow 5 seconds tolerance
                        self.log_result("Family Code Regeneration", True,
                                       f"New code generated: {data['code']}, expires in 60 minutes",
                                       data)
                        return data["code"]
                    else:
                        self.log_result("Family Code Regeneration", False,
                                       f"Expiry time incorrect. Expected ~60 min, got {time_diff}s difference")
                        return None
                        
                except ValueError as e:
                    self.log_result("Family Code Regeneration", False, f"Invalid timestamp format: {e}")
                    return None
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Family Code Regeneration", False, 
                               f"Missing required fields: {missing}", data)
                return None
        else:
            self.log_result("Family Code Regeneration", False,
                           f"Request failed with status {response.status_code}: {response.text}")
            return None
    
    def test_verify_new_code(self, family_code):
        """Test 3: Verify the new family code works"""
        print("\n=== Test 3: Verify New Code ===")
        
        if not family_code:
            self.log_result("Verify New Code", False, "No family code to test")
            return False
            
        verify_data = {"code": family_code}
        
        # Don't use authorization header for code verification (public endpoint)
        response = self.make_request("POST", "/family/verify-code", verify_data, 
                                   headers={"Content-Type": "application/json"})
        
        if response is None:
            self.log_result("Verify New Code", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            required_fields = ["family_id", "family_name", "theme"]
            
            if all(field in data for field in required_fields):
                self.log_result("Verify New Code", True,
                               f"Code verified successfully. Family: {data['family_name']}, Theme: {data['theme']}",
                               data)
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Verify New Code", False,
                               f"Missing required fields: {missing}", data)
                return False
        else:
            self.log_result("Verify New Code", False,
                           f"Code verification failed with status {response.status_code}: {response.text}")
            return False
    
    def test_get_family_with_code_generated_at(self):
        """Test 4: Get family and verify code_generated_at field"""
        print("\n=== Test 4: Get Family (verify code_generated_at) ===")
        
        if not self.access_token:
            self.log_result("Get Family", False, "No access token available")
            return False
            
        response = self.make_request("GET", "/family")
        
        if response is None:
            self.log_result("Get Family", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            
            if "code_generated_at" in data:
                try:
                    # Verify the timestamp is valid and recent
                    code_generated_at = datetime.fromisoformat(data["code_generated_at"].replace('Z', '+00:00'))
                    now = datetime.utcnow()
                    time_diff = abs((now - code_generated_at).total_seconds())
                    
                    # Should be recent (within last few minutes)
                    if time_diff < 300:  # 5 minutes tolerance
                        self.log_result("Get Family", True,
                                       f"Family data includes code_generated_at: {data['code_generated_at']}",
                                       {"code_generated_at": data["code_generated_at"], 
                                        "family_name": data.get("name", "Unknown")})
                        return True
                    else:
                        self.log_result("Get Family", False,
                                       f"code_generated_at is too old: {time_diff}s ago")
                        return False
                        
                except ValueError as e:
                    self.log_result("Get Family", False, f"Invalid code_generated_at format: {e}")
                    return False
            else:
                self.log_result("Get Family", False, "Missing code_generated_at field", data)
                return False
        else:
            self.log_result("Get Family", False,
                           f"Get family failed with status {response.status_code}: {response.text}")
            return False
    
    def test_vacation_mode_toggle(self):
        """Test 5: Full family update (vacation mode toggle)"""
        print("\n=== Test 5: Vacation Mode Toggle ===")
        
        if not self.access_token:
            self.log_result("Vacation Mode Toggle", False, "No access token available")
            return False
        
        # Test 5a: Enable vacation mode
        print("5a: Enabling vacation mode...")
        enable_data = {
            "vacation_mode": True,
            "vacation_start_date": "2025-07-01",
            "vacation_end_date": "2025-07-10"
        }
        
        response = self.make_request("PUT", "/family", enable_data)
        
        if response is None:
            self.log_result("Vacation Mode Enable", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if (data.get("vacation_mode") == True and 
                data.get("vacation_start_date") == "2025-07-01" and
                data.get("vacation_end_date") == "2025-07-10"):
                self.log_result("Vacation Mode Enable", True,
                               "Vacation mode enabled successfully with dates")
            else:
                self.log_result("Vacation Mode Enable", False,
                               "Vacation mode data not updated correctly", data)
                return False
        else:
            self.log_result("Vacation Mode Enable", False,
                           f"Enable failed with status {response.status_code}: {response.text}")
            return False
        
        # Test 5b: Disable vacation mode
        print("5b: Disabling vacation mode...")
        disable_data = {
            "vacation_mode": False,
            "vacation_start_date": None,
            "vacation_end_date": None
        }
        
        response = self.make_request("PUT", "/family", disable_data)
        
        if response is None:
            self.log_result("Vacation Mode Disable", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if (data.get("vacation_mode") == False and 
                data.get("vacation_start_date") is None and
                data.get("vacation_end_date") is None):
                self.log_result("Vacation Mode Disable", True,
                               "Vacation mode disabled successfully with null dates")
                return True
            else:
                self.log_result("Vacation Mode Disable", False,
                               "Vacation mode disable data not updated correctly", data)
                return False
        else:
            self.log_result("Vacation Mode Disable", False,
                           f"Disable failed with status {response.status_code}: {response.text}")
            return False
    
    def run_all_tests(self):
        """Run all security feature tests"""
        print("🚀 Starting KidQuest Backend Security Features Test")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test 1: Fresh login
        if not self.test_fresh_login():
            print("\n❌ Login failed - cannot proceed with other tests")
            return self.generate_summary()
        
        # Test 2: Family code regeneration
        new_code = self.test_family_code_regeneration()
        
        # Test 3: Verify new code works
        self.test_verify_new_code(new_code)
        
        # Test 4: Get family with code_generated_at
        self.test_get_family_with_code_generated_at()
        
        # Test 5: Vacation mode toggle
        self.test_vacation_mode_toggle()
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed/total*100) if total > 0 else 0,
            "results": self.test_results
        }

if __name__ == "__main__":
    tester = KidQuestAPITester()
    summary = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if summary["failed"] == 0 else 1)