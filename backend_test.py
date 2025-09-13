#!/usr/bin/env python3
"""
ConnectVault CRM Backend Authentication Testing
Tests the core authentication endpoints and JWT token handling
"""

import requests
import json
import time
import os
from datetime import datetime, timezone

# Load environment variables
BACKEND_URL = "https://connectvault-crm.preview.emergentagent.com/api"

class BackendAuthTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_user_data = {
            "full_name": "John Smith",
            "username": f"testuser_{int(time.time())}",
            "email": f"testuser_{int(time.time())}@example.com",
            "password": "SecurePassword123!",
            "role": "user"
        }
        self.access_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_user_registration(self):
        """Test POST /api/auth/register endpoint"""
        print("\n=== Testing User Registration ===")
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=self.test_user_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "successfully" in data["message"].lower():
                    self.log_result(
                        "User Registration", 
                        True, 
                        "User registered successfully",
                        {"response": data, "status_code": response.status_code}
                    )
                    return True
                else:
                    self.log_result(
                        "User Registration", 
                        False, 
                        "Unexpected response format",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "User Registration", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "User Registration", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def test_duplicate_registration(self):
        """Test duplicate user registration should fail"""
        print("\n=== Testing Duplicate Registration ===")
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=self.test_user_data,
                timeout=30
            )
            
            if response.status_code == 400:
                data = response.json()
                if "already exists" in data.get("detail", "").lower():
                    self.log_result(
                        "Duplicate Registration Prevention", 
                        True, 
                        "Correctly rejected duplicate registration",
                        {"response": data, "status_code": response.status_code}
                    )
                    return True
                else:
                    self.log_result(
                        "Duplicate Registration Prevention", 
                        False, 
                        "Wrong error message for duplicate registration",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Duplicate Registration Prevention", 
                    False, 
                    f"Should have failed with 400, got {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Duplicate Registration Prevention", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def test_user_login(self):
        """Test POST /api/auth/login endpoint"""
        print("\n=== Testing User Login ===")
        
        login_data = {
            "username": self.test_user_data["username"],
            "password": self.test_user_data["password"]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=login_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.access_token = data["access_token"]
                    token_type = data["token_type"]
                    
                    # Verify token format
                    if token_type.lower() == "bearer" and len(self.access_token) > 50:
                        self.log_result(
                            "User Login", 
                            True, 
                            "Login successful, JWT token received",
                            {
                                "token_type": token_type,
                                "token_length": len(self.access_token),
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "User Login", 
                            False, 
                            "Invalid token format received",
                            {"response": data, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "User Login", 
                        False, 
                        "Missing access_token or token_type in response",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "User Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "User Login", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        print("\n=== Testing Invalid Login ===")
        
        invalid_login_data = {
            "username": self.test_user_data["username"],
            "password": "WrongPassword123!"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=invalid_login_data,
                timeout=30
            )
            
            if response.status_code == 401:
                data = response.json()
                if "invalid" in data.get("detail", "").lower():
                    self.log_result(
                        "Invalid Login Prevention", 
                        True, 
                        "Correctly rejected invalid credentials",
                        {"response": data, "status_code": response.status_code}
                    )
                    return True
                else:
                    self.log_result(
                        "Invalid Login Prevention", 
                        False, 
                        "Wrong error message for invalid login",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Invalid Login Prevention", 
                    False, 
                    f"Should have failed with 401, got {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Invalid Login Prevention", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def test_dashboard_summary_with_token(self):
        """Test GET /api/dashboard/summary with valid JWT token"""
        print("\n=== Testing Dashboard Summary (Protected Endpoint) ===")
        
        if not self.access_token:
            self.log_result(
                "Dashboard Summary", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(
                f"{self.base_url}/dashboard/summary",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["total_contacts", "tasks_due_today", "active_promo_links", "commission_summary"]
                
                if all(field in data for field in expected_fields):
                    self.log_result(
                        "Dashboard Summary", 
                        True, 
                        "Dashboard summary retrieved successfully",
                        {
                            "response": data,
                            "status_code": response.status_code,
                            "fields_present": list(data.keys())
                        }
                    )
                    return True
                else:
                    missing_fields = [field for field in expected_fields if field not in data]
                    self.log_result(
                        "Dashboard Summary", 
                        False, 
                        f"Missing expected fields: {missing_fields}",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Dashboard Summary", 
                    False, 
                    f"Dashboard request failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Dashboard Summary", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def test_dashboard_summary_without_token(self):
        """Test GET /api/dashboard/summary without JWT token"""
        print("\n=== Testing Dashboard Summary Without Token ===")
        
        try:
            response = requests.get(
                f"{self.base_url}/dashboard/summary",
                timeout=30
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Dashboard Summary Without Token", 
                    True, 
                    "Correctly rejected request without token",
                    {"status_code": response.status_code}
                )
                return True
            else:
                self.log_result(
                    "Dashboard Summary Without Token", 
                    False, 
                    f"Should have failed with 401, got {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Dashboard Summary Without Token", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def test_dashboard_summary_with_invalid_token(self):
        """Test GET /api/dashboard/summary with invalid JWT token"""
        print("\n=== Testing Dashboard Summary With Invalid Token ===")
        
        invalid_token = "invalid.jwt.token.here"
        headers = {
            "Authorization": f"Bearer {invalid_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(
                f"{self.base_url}/dashboard/summary",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Dashboard Summary With Invalid Token", 
                    True, 
                    "Correctly rejected request with invalid token",
                    {"status_code": response.status_code}
                )
                return True
            else:
                self.log_result(
                    "Dashboard Summary With Invalid Token", 
                    False, 
                    f"Should have failed with 401, got {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Dashboard Summary With Invalid Token", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def test_health_check(self):
        """Test GET /api/health endpoint"""
        print("\n=== Testing Health Check ===")
        
        try:
            response = requests.get(
                f"{self.base_url}/health",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "ok":
                    self.log_result(
                        "Health Check", 
                        True, 
                        "Health check passed",
                        {"response": data, "status_code": response.status_code}
                    )
                    return True
                else:
                    self.log_result(
                        "Health Check", 
                        False, 
                        "Unexpected health check response",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Health Check", 
                    False, 
                    f"Health check failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Health Check", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting ConnectVault CRM Backend Authentication Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Test User: {self.test_user_data['username']}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_duplicate_registration,
            self.test_user_login,
            self.test_invalid_login,
            self.test_dashboard_summary_with_token,
            self.test_dashboard_summary_without_token,
            self.test_dashboard_summary_with_invalid_token
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__}: Unexpected error - {str(e)}")
                failed += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        
        if failed == 0:
            print("🎉 All tests passed! Authentication system is working correctly.")
        else:
            print("⚠️  Some tests failed. Please review the issues above.")
        
        return failed == 0

def main():
    """Main test execution"""
    tester = BackendAuthTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())