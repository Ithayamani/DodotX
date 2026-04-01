#!/usr/bin/env python3
"""
KidQuest Backend API Test Suite
Focus: Vacation Mode Toggle Fix and Core Features
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://app-store-setup-2.preview.emergentagent.com/api"

# Test credentials from review request
TEST_EMAIL = "parent@test.com"
TEST_PASSWORD = "parent123"

class KidQuestTester:
    def __init__(self):
        self.token = None
        self.family_id = None
        self.child_id = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def authenticate(self):
        """Login and get authentication token"""
        self.log("🔐 Authenticating user...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.family_id = data["user"].get("family_id")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    'Authorization': f'Bearer {self.token}'
                })
                
                self.log(f"✅ Authentication successful. Family ID: {self.family_id}")
                return True
            else:
                self.log(f"❌ Authentication failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication error: {str(e)}", "ERROR")
            return False
    
    def test_vacation_mode_enable(self):
        """Test vacation mode enable with dates"""
        self.log("🏖️ Testing vacation mode enable...")
        
        vacation_data = {
            "vacation_mode": True,
            "vacation_start_date": "2025-06-01",
            "vacation_end_date": "2025-06-08"
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/family", json=vacation_data)
            
            if response.status_code == 200:
                family_data = response.json()
                
                # Verify vacation mode is enabled
                if (family_data.get("vacation_mode") == True and 
                    family_data.get("vacation_start_date") == "2025-06-01" and
                    family_data.get("vacation_end_date") == "2025-06-08"):
                    self.log("✅ Vacation mode enabled successfully with correct dates")
                    return True
                else:
                    self.log(f"❌ Vacation mode data mismatch: {family_data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Vacation mode enable failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Vacation mode enable error: {str(e)}", "ERROR")
            return False
    
    def test_vacation_mode_disable(self):
        """Test vacation mode disable with null clearing"""
        self.log("🏠 Testing vacation mode disable with null clearing...")
        
        disable_data = {
            "vacation_mode": False,
            "vacation_start_date": None,
            "vacation_end_date": None
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/family", json=disable_data)
            
            if response.status_code == 200:
                family_data = response.json()
                
                # Verify vacation mode is disabled and dates are null
                if (family_data.get("vacation_mode") == False and 
                    family_data.get("vacation_start_date") is None and
                    family_data.get("vacation_end_date") is None):
                    self.log("✅ Vacation mode disabled successfully with null dates")
                    return True
                else:
                    self.log(f"❌ Vacation mode disable data mismatch: {family_data}", "ERROR")
                    self.log(f"   vacation_mode: {family_data.get('vacation_mode')}")
                    self.log(f"   vacation_start_date: {family_data.get('vacation_start_date')}")
                    self.log(f"   vacation_end_date: {family_data.get('vacation_end_date')}")
                    return False
            else:
                self.log(f"❌ Vacation mode disable failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Vacation mode disable error: {str(e)}", "ERROR")
            return False
    
    def test_verify_null_dates(self):
        """Verify dates are actually null after disable by fetching family data"""
        self.log("🔍 Verifying dates are null in database...")
        
        try:
            response = self.session.get(f"{BASE_URL}/family")
            
            if response.status_code == 200:
                family_data = response.json()
                
                # Verify vacation mode is disabled and dates are null
                if (family_data.get("vacation_mode") == False and 
                    family_data.get("vacation_start_date") is None and
                    family_data.get("vacation_end_date") is None):
                    self.log("✅ Database verification: dates are properly null")
                    return True
                else:
                    self.log(f"❌ Database verification failed: {family_data}", "ERROR")
                    self.log(f"   vacation_mode: {family_data.get('vacation_mode')}")
                    self.log(f"   vacation_start_date: {family_data.get('vacation_start_date')}")
                    self.log(f"   vacation_end_date: {family_data.get('vacation_end_date')}")
                    return False
            else:
                self.log(f"❌ Family data fetch failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Database verification error: {str(e)}", "ERROR")
            return False
    
    def test_profile_picture_update(self):
        """Test parent profile picture update"""
        self.log("📸 Testing parent profile picture update...")
        
        profile_data = {
            "parent_profile_picture": "data:image/jpeg;base64,test123"
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/family", json=profile_data)
            
            if response.status_code == 200:
                family_data = response.json()
                
                # Verify profile picture is updated
                if family_data.get("parent_profile_picture") == "data:image/jpeg;base64,test123":
                    self.log("✅ Parent profile picture updated successfully")
                    return True
                else:
                    self.log(f"❌ Profile picture update failed: {family_data.get('parent_profile_picture')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Profile picture update failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Profile picture update error: {str(e)}", "ERROR")
            return False
    
    def test_ai_theme_generation(self):
        """Test AI theme generation"""
        self.log("🎨 Testing AI theme generation...")
        
        theme_data = {
            "description": "ocean sunset"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/ai/generate-theme", json=theme_data)
            
            if response.status_code == 200:
                theme_result = response.json()
                
                # Verify theme has required fields
                required_fields = ["name", "primary", "background", "card", "text", "accent"]
                if all(field in theme_result for field in required_fields):
                    self.log(f"✅ AI theme generated successfully: {theme_result['name']}")
                    self.log(f"   Colors: primary={theme_result['primary']}, background={theme_result['background']}")
                    return True
                else:
                    self.log(f"❌ AI theme missing required fields: {theme_result}", "ERROR")
                    return False
            else:
                self.log(f"❌ AI theme generation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ AI theme generation error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting KidQuest Backend API Tests")
        self.log(f"   Backend URL: {BASE_URL}")
        self.log(f"   Test Email: {TEST_EMAIL}")
        
        results = {}
        
        # Authentication is required for all tests
        if not self.authenticate():
            self.log("❌ Authentication failed - cannot proceed with tests", "ERROR")
            return False
        
        # Test vacation mode enable
        results["vacation_enable"] = self.test_vacation_mode_enable()
        
        # Test vacation mode disable with null clearing
        results["vacation_disable"] = self.test_vacation_mode_disable()
        
        # Verify dates are null in database
        results["verify_null_dates"] = self.test_verify_null_dates()
        
        # Test profile picture update
        results["profile_picture"] = self.test_profile_picture_update()
        
        # Test AI theme generation
        results["ai_theme"] = self.test_ai_theme_generation()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📊 TEST RESULTS SUMMARY")
        self.log("="*60)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed! Vacation mode fix is working correctly.")
            return True
        else:
            self.log("⚠️  Some tests failed. Please check the errors above.")
            return False

def main():
    """Main test execution"""
    tester = KidQuestTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()