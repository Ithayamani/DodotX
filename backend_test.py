#!/usr/bin/env python3
"""
Backend API Testing for DoneDash - Focus on Forgot Password Flow
Testing the forgot password and reset password endpoints
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://app-store-setup-2.preview.emergentagent.com"

# Test credentials from review request
TEST_EMAIL = "parent@test.com"
TEST_PASSWORD = "parent123"

class DoneDashAPITester:
    def __init__(self):
        self.session = None
        self.access_token = None
        self.base_url = BACKEND_URL
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def make_request(self, method, endpoint, data=None, headers=None, timeout=30):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}/api{endpoint}"
        
        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)
            
        if self.access_token and "Authorization" not in default_headers:
            default_headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            timeout_obj = aiohttp.ClientTimeout(total=timeout)
            async with self.session.request(
                method, url, 
                json=data if data else None,
                headers=default_headers,
                timeout=timeout_obj
            ) as response:
                response_text = await response.text()
                
                try:
                    response_data = json.loads(response_text) if response_text else {}
                except json.JSONDecodeError:
                    response_data = {"raw_response": response_text}
                
                return {
                    "status": response.status,
                    "data": response_data,
                    "headers": dict(response.headers)
                }
        except asyncio.TimeoutError:
            return {"status": 408, "data": {"error": "Request timeout"}}
        except Exception as e:
            return {"status": 500, "data": {"error": str(e)}}

    async def test_login(self):
        """Test fresh login with new JWT secret"""
        print("🔐 Testing Login (Fresh JWT Token)...")
        
        response = await self.make_request("POST", "/auth/login", {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response["status"] == 200:
            self.access_token = response["data"]["access_token"]
            user_info = response["data"]["user"]
            print(f"✅ Login successful! User: {user_info['name']} ({user_info['email']})")
            print(f"   Family ID: {user_info.get('family_id', 'None')}")
            return True
        else:
            print(f"❌ Login failed: {response['status']} - {response['data']}")
            return False

    async def test_family_get_with_z_suffix(self):
        """Test GET /api/family and verify code_generated_at has Z suffix"""
        print("\n📋 Testing Family GET (Z suffix verification)...")
        
        response = await self.make_request("GET", "/family")
        
        if response["status"] == 200:
            family_data = response["data"]
            code_generated_at = family_data.get("code_generated_at")
            
            print(f"✅ Family GET successful!")
            print(f"   Family: {family_data.get('name')}")
            print(f"   Code: {family_data.get('code')}")
            print(f"   code_generated_at: {code_generated_at}")
            
            if code_generated_at and code_generated_at.endswith('Z'):
                print("✅ code_generated_at has Z suffix - VERIFIED")
                return True
            else:
                print(f"❌ code_generated_at missing Z suffix: {code_generated_at}")
                return False
        else:
            print(f"❌ Family GET failed: {response['status']} - {response['data']}")
            return False

    async def test_ai_auto_routines(self):
        """Test POST /api/ai/auto-routines - Auto-generate routines"""
        print("\n🤖 Testing AI Auto-Generate Routines...")
        print("   NOTE: This calls OpenAI via Emergent LLM - may take 10-15 seconds")
        
        # Use longer timeout for LLM calls
        response = await self.make_request("POST", "/ai/auto-routines", timeout=30)
        
        if response["status"] == 200:
            result = response["data"]
            message = result.get("message", "")
            tasks = result.get("tasks", [])
            
            print(f"✅ AI Auto-Routines successful!")
            print(f"   Message: {message}")
            print(f"   Generated {len(tasks)} tasks")
            
            if tasks:
                print("   Sample tasks:")
                for i, task in enumerate(tasks[:3]):
                    print(f"     {i+1}. {task.get('title')} {task.get('icon')} ({task.get('stars')}pts)")
            
            # Verify tasks are saved by calling GET /api/tasks
            print("\n   Verifying tasks saved in database...")
            tasks_response = await self.make_request("GET", "/tasks")
            if tasks_response["status"] == 200:
                all_tasks = tasks_response["data"]
                print(f"✅ Database verification: {len(all_tasks)} total tasks found")
                return True
            else:
                print(f"❌ Database verification failed: {tasks_response['status']}")
                return False
        else:
            print(f"❌ AI Auto-Routines failed: {response['status']} - {response['data']}")
            return False

    async def test_ai_adjust_difficulty(self):
        """Test POST /api/ai/adjust-difficulty - Analyze and adjust task difficulty"""
        print("\n🎯 Testing AI Adjust Difficulty...")
        print("   NOTE: This calls OpenAI via Emergent LLM - may take 10-15 seconds")
        
        response = await self.make_request("POST", "/ai/adjust-difficulty", timeout=30)
        
        if response["status"] == 200:
            result = response["data"]
            analysis = result.get("analysis", "")
            suggestions = result.get("suggestions", [])
            
            print(f"✅ AI Adjust Difficulty successful!")
            print(f"   Analysis: {analysis}")
            print(f"   Suggestions: {len(suggestions)} recommendations")
            
            if suggestions:
                print("   Sample suggestions:")
                for i, suggestion in enumerate(suggestions[:3]):
                    action = suggestion.get("action", "")
                    title = suggestion.get("title", "")
                    icon = suggestion.get("icon", "")
                    pts = suggestion.get("pts", 0)
                    reason = suggestion.get("reason", "")
                    print(f"     {i+1}. {action.upper()}: {title} {icon} ({pts}pts) - {reason}")
            
            # Verify required fields
            required_fields = ["analysis", "suggestions"]
            missing_fields = [field for field in required_fields if field not in result]
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False
            
            # Verify suggestion structure
            for suggestion in suggestions:
                required_suggestion_fields = ["action", "title", "icon", "pts", "reason"]
                missing_suggestion_fields = [field for field in required_suggestion_fields if field not in suggestion]
                if missing_suggestion_fields:
                    print(f"❌ Suggestion missing fields: {missing_suggestion_fields}")
                    return False
            
            return True
        else:
            print(f"❌ AI Adjust Difficulty failed: {response['status']} - {response['data']}")
            return False

    async def test_forgot_password_existing_email(self):
        """Test POST /api/auth/forgot-password with existing email"""
        print("\n🔑 Testing Forgot Password - Existing Email...")
        
        response = await self.make_request("POST", "/auth/forgot-password", {
            "email": TEST_EMAIL
        }, headers={})  # No auth required
        
        if response["status"] == 200:
            message = response["data"].get("message", "")
            expected_message = "If an account exists with this email, a reset code has been sent."
            
            print(f"✅ Forgot password request successful!")
            print(f"   Message: {message}")
            
            if message == expected_message:
                print("✅ Correct security message returned (prevents email enumeration)")
                return True
            else:
                print(f"❌ Unexpected message. Expected: '{expected_message}'")
                return False
        else:
            print(f"❌ Forgot password failed: {response['status']} - {response['data']}")
            return False

    async def test_forgot_password_nonexistent_email(self):
        """Test POST /api/auth/forgot-password with non-existent email"""
        print("\n🔑 Testing Forgot Password - Non-existent Email...")
        
        response = await self.make_request("POST", "/auth/forgot-password", {
            "email": "nobody@test.com"
        }, headers={})  # No auth required
        
        if response["status"] == 200:
            message = response["data"].get("message", "")
            expected_message = "If an account exists with this email, a reset code has been sent."
            
            print(f"✅ Forgot password request successful!")
            print(f"   Message: {message}")
            
            if message == expected_message:
                print("✅ Same security message returned (prevents email enumeration)")
                return True
            else:
                print(f"❌ Unexpected message. Expected: '{expected_message}'")
                return False
        else:
            print(f"❌ Forgot password failed: {response['status']} - {response['data']}")
            return False

    async def test_reset_password_invalid_code(self):
        """Test POST /api/auth/reset-password with invalid code"""
        print("\n🔑 Testing Reset Password - Invalid Code...")
        
        response = await self.make_request("POST", "/auth/reset-password", {
            "email": TEST_EMAIL,
            "code": "000000",
            "new_password": "newpassword123"
        }, headers={})  # No auth required
        
        if response["status"] == 400:
            error_detail = response["data"].get("detail", "")
            expected_error = "Invalid or expired reset code"
            
            print(f"✅ Reset password correctly rejected!")
            print(f"   Error: {error_detail}")
            
            if error_detail == expected_error:
                print("✅ Correct error message returned")
                return True
            else:
                print(f"❌ Unexpected error. Expected: '{expected_error}'")
                return False
        else:
            print(f"❌ Reset password should have failed with 400, got: {response['status']} - {response['data']}")
            return False

    async def test_login_still_works(self):
        """Test that login still works after forgot password attempts"""
        print("\n🔐 Testing Login Still Works...")
        
        # Clear any existing token
        self.access_token = None
        
        response = await self.make_request("POST", "/auth/login", {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }, headers={})  # No auth required
        
        if response["status"] == 200:
            access_token = response["data"].get("access_token")
            user_info = response["data"].get("user", {})
            
            print(f"✅ Login still working correctly!")
            print(f"   User: {user_info.get('name')} ({user_info.get('email')})")
            print(f"   Token received: {'Yes' if access_token else 'No'}")
            
            if access_token:
                self.access_token = access_token  # Restore token for other tests
                return True
            else:
                print("❌ No access token received")
                return False
        else:
            print(f"❌ Login failed: {response['status']} - {response['data']}")
            return False

    async def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("=" * 80)
        print("🚀 DoneDash Backend API Testing - Forgot Password Flow")
        print("=" * 80)
        
        results = {}
        
        # Test 1: Fresh Login (to establish baseline)
        results["login"] = await self.test_login()
        if not results["login"]:
            print("\n❌ Cannot proceed without valid authentication")
            return results
        
        # Test 2: Forgot Password - Existing Email
        results["forgot_password_existing"] = await self.test_forgot_password_existing_email()
        
        # Test 3: Forgot Password - Non-existent Email
        results["forgot_password_nonexistent"] = await self.test_forgot_password_nonexistent_email()
        
        # Test 4: Reset Password - Invalid Code
        results["reset_password_invalid"] = await self.test_reset_password_invalid_code()
        
        # Test 5: Login Still Works
        results["login_still_works"] = await self.test_login_still_works()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
        
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed! Forgot password flow is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return results

async def main():
    """Main test runner"""
    async with DoneDashAPITester() as tester:
        results = await tester.run_all_tests()
        return results

if __name__ == "__main__":
    # Run the tests
    results = asyncio.run(main())
    
    # Exit with appropriate code
    all_passed = all(results.values()) if results else False
    exit(0 if all_passed else 1)