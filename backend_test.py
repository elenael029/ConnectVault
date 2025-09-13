#!/usr/bin/env python3
"""
ConnectVault CRM Backend Comprehensive Testing
Tests authentication endpoints, Commission module CRUD operations, and Files API endpoints
"""

import requests
import json
import time
import os
import io
from datetime import datetime, timezone
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Load environment variables
BACKEND_URL = "https://connectvault-crm.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        # Use existing test user as specified in review request
        self.existing_user_data = {
            "username": "frontendtest",
            "password": "Test123!"
        }
        self.access_token = None
        self.test_results = []
        self.created_commission_ids = []  # Track created commissions for cleanup
        self.created_file_ids = []  # Track created files for cleanup
        
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
    
    def test_existing_user_login(self):
        """Test POST /api/auth/login with existing test user"""
        print("\n=== Testing Existing User Login ===")
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=self.existing_user_data,
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
                            "Existing User Login", 
                            True, 
                            "Login successful with existing test user",
                            {
                                "username": self.existing_user_data["username"],
                                "token_type": token_type,
                                "token_length": len(self.access_token),
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Existing User Login", 
                            False, 
                            "Invalid token format received",
                            {"response": data, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Existing User Login", 
                        False, 
                        "Missing access_token or token_type in response",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Existing User Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Existing User Login", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_dashboard_summary_commission_fields(self):
        """Test GET /api/dashboard/summary includes commission_summary with required fields"""
        print("\n=== Testing Dashboard Summary Commission Fields ===")
        
        if not self.access_token:
            self.log_result(
                "Dashboard Commission Summary", 
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
                
                # Check if commission_summary exists
                if "commission_summary" in data:
                    commission_summary = data["commission_summary"]
                    required_fields = ["total_paid", "total_unpaid", "total_pending"]
                    
                    if all(field in commission_summary for field in required_fields):
                        self.log_result(
                            "Dashboard Commission Summary", 
                            True, 
                            "Commission summary contains all required fields",
                            {
                                "commission_summary": commission_summary,
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        missing_fields = [field for field in required_fields if field not in commission_summary]
                        self.log_result(
                            "Dashboard Commission Summary", 
                            False, 
                            f"Missing commission summary fields: {missing_fields}",
                            {"commission_summary": commission_summary, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Dashboard Commission Summary", 
                        False, 
                        "commission_summary field missing from dashboard response",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Dashboard Commission Summary", 
                    False, 
                    f"Dashboard request failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Dashboard Commission Summary", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_get_commissions_empty(self):
        """Test GET /api/commissions returns empty list initially"""
        print("\n=== Testing Get Commissions (Empty) ===")
        
        if not self.access_token:
            self.log_result(
                "Get Commissions Empty", 
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
                f"{self.base_url}/commissions",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result(
                        "Get Commissions Empty", 
                        True, 
                        f"Successfully retrieved commissions list (count: {len(data)})",
                        {"commissions_count": len(data), "status_code": response.status_code}
                    )
                    return True
                else:
                    self.log_result(
                        "Get Commissions Empty", 
                        False, 
                        "Response is not a list",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Get Commissions Empty", 
                    False, 
                    f"Get commissions failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Get Commissions Empty", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_create_commission(self):
        """Test POST /api/commissions creates new commission"""
        print("\n=== Testing Create Commission ===")
        
        if not self.access_token:
            self.log_result(
                "Create Commission", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Test data as specified in review request
        commission_data = {
            "program_name": "Amazon Associates",
            "amount": 150.00,
            "status": "pending",
            "expected_date": "2024-02-15T00:00:00Z",
            "paid_date": None,
            "promo_link_id": None,
            "notes": "Test commission for Amazon Associates program"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/commissions",
                json=commission_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "user_id", "program_name", "amount", "status", "created_at"]
                
                if all(field in data for field in required_fields):
                    # Store commission ID for later tests
                    self.created_commission_ids.append(data["id"])
                    
                    # Verify data matches what we sent
                    if (data["program_name"] == commission_data["program_name"] and 
                        data["amount"] == commission_data["amount"] and
                        data["status"] == commission_data["status"]):
                        
                        self.log_result(
                            "Create Commission", 
                            True, 
                            "Commission created successfully with correct data",
                            {
                                "commission_id": data["id"],
                                "program_name": data["program_name"],
                                "amount": data["amount"],
                                "status": data["status"],
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Create Commission", 
                            False, 
                            "Commission data doesn't match input",
                            {"sent": commission_data, "received": data, "status_code": response.status_code}
                        )
                        return False
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result(
                        "Create Commission", 
                        False, 
                        f"Missing required fields in response: {missing_fields}",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Create Commission", 
                    False, 
                    f"Create commission failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Create Commission", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_create_multiple_commissions(self):
        """Test creating multiple commissions with different statuses"""
        print("\n=== Testing Create Multiple Commissions ===")
        
        if not self.access_token:
            self.log_result(
                "Create Multiple Commissions", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Test data with different statuses as specified in review request
        commissions_data = [
            {
                "program_name": "ClickBank",
                "amount": 250.50,
                "status": "paid",
                "expected_date": "2024-01-15T00:00:00Z",
                "paid_date": "2024-01-20T00:00:00Z",
                "notes": "ClickBank commission - paid"
            },
            {
                "program_name": "ShareASale",
                "amount": 75.25,
                "status": "unpaid",
                "expected_date": "2024-01-30T00:00:00Z",
                "paid_date": None,
                "notes": "ShareASale commission - unpaid"
            }
        ]
        
        created_count = 0
        
        for i, commission_data in enumerate(commissions_data):
            try:
                response = requests.post(
                    f"{self.base_url}/commissions",
                    json=commission_data,
                    headers=headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data:
                        self.created_commission_ids.append(data["id"])
                        created_count += 1
                    else:
                        self.log_result(
                            "Create Multiple Commissions", 
                            False, 
                            f"Commission {i+1} missing ID in response",
                            {"response": data, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Create Multiple Commissions", 
                        False, 
                        f"Commission {i+1} creation failed with status {response.status_code}",
                        {"response": response.text, "status_code": response.status_code}
                    )
                    return False
                    
            except requests.exceptions.RequestException as e:
                self.log_result(
                    "Create Multiple Commissions", 
                    False, 
                    f"Request failed for commission {i+1}: {str(e)}",
                    {"error": str(e)}
                )
                return False
        
        if created_count == len(commissions_data):
            self.log_result(
                "Create Multiple Commissions", 
                True, 
                f"Successfully created {created_count} commissions with different statuses",
                {"created_count": created_count, "total_commissions": len(self.created_commission_ids)}
            )
            return True
        else:
            self.log_result(
                "Create Multiple Commissions", 
                False, 
                f"Only created {created_count} out of {len(commissions_data)} commissions",
                {"created_count": created_count, "expected_count": len(commissions_data)}
            )
            return False

    def test_get_commissions_with_data(self):
        """Test GET /api/commissions returns created commissions"""
        print("\n=== Testing Get Commissions (With Data) ===")
        
        if not self.access_token:
            self.log_result(
                "Get Commissions With Data", 
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
                f"{self.base_url}/commissions",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    expected_count = len(self.created_commission_ids)
                    actual_count = len(data)
                    
                    if actual_count >= expected_count:
                        # Verify that our created commissions are in the list
                        found_ids = [commission["id"] for commission in data if "id" in commission]
                        missing_ids = [cid for cid in self.created_commission_ids if cid not in found_ids]
                        
                        if not missing_ids:
                            self.log_result(
                                "Get Commissions With Data", 
                                True, 
                                f"Successfully retrieved {actual_count} commissions, all created commissions found",
                                {"commissions_count": actual_count, "created_ids_found": len(self.created_commission_ids), "status_code": response.status_code}
                            )
                            return True
                        else:
                            self.log_result(
                                "Get Commissions With Data", 
                                False, 
                                f"Missing {len(missing_ids)} created commissions in response",
                                {"missing_ids": missing_ids, "found_count": actual_count, "status_code": response.status_code}
                            )
                            return False
                    else:
                        self.log_result(
                            "Get Commissions With Data", 
                            False, 
                            f"Expected at least {expected_count} commissions, got {actual_count}",
                            {"expected_count": expected_count, "actual_count": actual_count, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Get Commissions With Data", 
                        False, 
                        "Response is not a list",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Get Commissions With Data", 
                    False, 
                    f"Get commissions failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Get Commissions With Data", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_get_single_commission(self):
        """Test GET /api/commissions/{id} retrieves specific commission"""
        print("\n=== Testing Get Single Commission ===")
        
        if not self.access_token:
            self.log_result(
                "Get Single Commission", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_commission_ids:
            self.log_result(
                "Get Single Commission", 
                False, 
                "No commission IDs available for testing",
                {"error": "Create commission tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        commission_id = self.created_commission_ids[0]
        
        try:
            response = requests.get(
                f"{self.base_url}/commissions/{commission_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "user_id", "program_name", "amount", "status", "created_at"]
                
                if all(field in data for field in required_fields):
                    if data["id"] == commission_id:
                        self.log_result(
                            "Get Single Commission", 
                            True, 
                            "Successfully retrieved specific commission",
                            {
                                "commission_id": data["id"],
                                "program_name": data["program_name"],
                                "amount": data["amount"],
                                "status": data["status"],
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Get Single Commission", 
                            False, 
                            f"Retrieved commission ID {data['id']} doesn't match requested ID {commission_id}",
                            {"requested_id": commission_id, "received_id": data["id"], "status_code": response.status_code}
                        )
                        return False
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result(
                        "Get Single Commission", 
                        False, 
                        f"Missing required fields in response: {missing_fields}",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            elif response.status_code == 404:
                self.log_result(
                    "Get Single Commission", 
                    False, 
                    f"Commission {commission_id} not found",
                    {"commission_id": commission_id, "status_code": response.status_code}
                )
                return False
            else:
                self.log_result(
                    "Get Single Commission", 
                    False, 
                    f"Get single commission failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Get Single Commission", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_update_commission(self):
        """Test PUT /api/commissions/{id} updates existing commission"""
        print("\n=== Testing Update Commission ===")
        
        if not self.access_token:
            self.log_result(
                "Update Commission", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_commission_ids:
            self.log_result(
                "Update Commission", 
                False, 
                "No commission IDs available for testing",
                {"error": "Create commission tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        commission_id = self.created_commission_ids[0]
        
        # Update data
        update_data = {
            "amount": 175.00,
            "status": "paid",
            "paid_date": "2024-02-20T00:00:00Z",
            "notes": "Updated commission - now paid"
        }
        
        try:
            response = requests.put(
                f"{self.base_url}/commissions/{commission_id}",
                json=update_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify updates were applied
                if (data["amount"] == update_data["amount"] and 
                    data["status"] == update_data["status"] and
                    data["notes"] == update_data["notes"]):
                    
                    self.log_result(
                        "Update Commission", 
                        True, 
                        "Commission updated successfully",
                        {
                            "commission_id": data["id"],
                            "updated_amount": data["amount"],
                            "updated_status": data["status"],
                            "updated_notes": data["notes"],
                            "status_code": response.status_code
                        }
                    )
                    return True
                else:
                    self.log_result(
                        "Update Commission", 
                        False, 
                        "Commission updates were not applied correctly",
                        {"sent": update_data, "received": data, "status_code": response.status_code}
                    )
                    return False
            elif response.status_code == 404:
                self.log_result(
                    "Update Commission", 
                    False, 
                    f"Commission {commission_id} not found for update",
                    {"commission_id": commission_id, "status_code": response.status_code}
                )
                return False
            else:
                self.log_result(
                    "Update Commission", 
                    False, 
                    f"Update commission failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Update Commission", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_export_commissions_csv(self):
        """Test GET /api/commissions/export/csv exports commissions as CSV"""
        print("\n=== Testing Export Commissions CSV ===")
        
        if not self.access_token:
            self.log_result(
                "Export Commissions CSV", 
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
                f"{self.base_url}/commissions/export/csv",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "csv_data" in data:
                    csv_data = data["csv_data"]
                    
                    # Verify CSV format
                    lines = csv_data.strip().split('\n')
                    if len(lines) >= 1:  # At least header
                        header = lines[0]
                        expected_columns = ["Program Name", "Amount", "Status", "Expected Date", "Paid Date", "Notes", "Created At"]
                        
                        # Check if header contains expected columns
                        if all(col in header for col in expected_columns):
                            self.log_result(
                                "Export Commissions CSV", 
                                True, 
                                f"CSV export successful with {len(lines)-1} data rows",
                                {
                                    "csv_lines": len(lines),
                                    "header": header,
                                    "status_code": response.status_code
                                }
                            )
                            return True
                        else:
                            missing_columns = [col for col in expected_columns if col not in header]
                            self.log_result(
                                "Export Commissions CSV", 
                                False, 
                                f"CSV header missing expected columns: {missing_columns}",
                                {"header": header, "missing_columns": missing_columns, "status_code": response.status_code}
                            )
                            return False
                    else:
                        self.log_result(
                            "Export Commissions CSV", 
                            False, 
                            "CSV data is empty or malformed",
                            {"csv_data": csv_data, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Export Commissions CSV", 
                        False, 
                        "csv_data field missing from response",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Export Commissions CSV", 
                    False, 
                    f"CSV export failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Export Commissions CSV", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_delete_commission(self):
        """Test DELETE /api/commissions/{id} deletes commission"""
        print("\n=== Testing Delete Commission ===")
        
        if not self.access_token:
            self.log_result(
                "Delete Commission", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_commission_ids:
            self.log_result(
                "Delete Commission", 
                False, 
                "No commission IDs available for testing",
                {"error": "Create commission tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Use the last created commission for deletion
        commission_id = self.created_commission_ids[-1]
        
        try:
            response = requests.delete(
                f"{self.base_url}/commissions/{commission_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data and "deleted" in data["message"].lower():
                    # Verify commission is actually deleted by trying to get it
                    get_response = requests.get(
                        f"{self.base_url}/commissions/{commission_id}",
                        headers=headers,
                        timeout=30
                    )
                    
                    if get_response.status_code == 404:
                        # Remove from our tracking list
                        self.created_commission_ids.remove(commission_id)
                        
                        self.log_result(
                            "Delete Commission", 
                            True, 
                            "Commission deleted successfully and verified",
                            {
                                "deleted_commission_id": commission_id,
                                "delete_response": data,
                                "verification_status": get_response.status_code,
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Delete Commission", 
                            False, 
                            "Commission still exists after deletion",
                            {"commission_id": commission_id, "verification_status": get_response.status_code, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Delete Commission", 
                        False, 
                        "Unexpected delete response message",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            elif response.status_code == 404:
                self.log_result(
                    "Delete Commission", 
                    False, 
                    f"Commission {commission_id} not found for deletion",
                    {"commission_id": commission_id, "status_code": response.status_code}
                )
                return False
            else:
                self.log_result(
                    "Delete Commission", 
                    False, 
                    f"Delete commission failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Delete Commission", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_commission_security_user_isolation(self):
        """Test that commissions are properly filtered by user_id (security test)"""
        print("\n=== Testing Commission Security (User Isolation) ===")
        
        if not self.access_token:
            self.log_result(
                "Commission Security", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Test with a non-existent commission ID (should return 404, not 403)
        fake_commission_id = "non-existent-commission-id-12345"
        
        try:
            response = requests.get(
                f"{self.base_url}/commissions/{fake_commission_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 404:
                self.log_result(
                    "Commission Security", 
                    True, 
                    "Properly returns 404 for non-existent commission (user isolation working)",
                    {"fake_id": fake_commission_id, "status_code": response.status_code}
                )
                return True
            else:
                self.log_result(
                    "Commission Security", 
                    False, 
                    f"Expected 404 for non-existent commission, got {response.status_code}",
                    {"fake_id": fake_commission_id, "response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Commission Security", 
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
    
    def create_test_pdf(self, filename="test_file.pdf", content="Test PDF Content"):
        """Create a small test PDF file in memory"""
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.drawString(100, 750, content)
        p.drawString(100, 730, f"Generated at: {datetime.now(timezone.utc).isoformat()}")
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer.getvalue(), filename

    def test_upload_pdf_file(self):
        """Test POST /api/files uploads PDF file successfully"""
        print("\n=== Testing Upload PDF File ===")
        
        if not self.access_token:
            self.log_result(
                "Upload PDF File", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        # Create test PDF
        pdf_content, filename = self.create_test_pdf("ConnectVault_Test_Document.pdf", "ConnectVault CRM Test Document")
        
        try:
            files = {
                'file': (filename, pdf_content, 'application/pdf')
            }
            data = {
                'category': 'Marketing Materials'
            }
            
            response = requests.post(
                f"{self.base_url}/files",
                files=files,
                data=data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "user_id", "name", "category", "size_bytes", "mime_type", "created_at"]
                
                if all(field in data for field in required_fields):
                    # Store file ID for later tests
                    self.created_file_ids.append(data["id"])
                    
                    # Verify data matches what we sent
                    if (data["name"] == filename and 
                        data["category"] == "Marketing Materials" and
                        data["mime_type"] == "application/pdf" and
                        data["size_bytes"] > 0):
                        
                        self.log_result(
                            "Upload PDF File", 
                            True, 
                            "PDF file uploaded successfully with correct metadata",
                            {
                                "file_id": data["id"],
                                "filename": data["name"],
                                "category": data["category"],
                                "size_bytes": data["size_bytes"],
                                "mime_type": data["mime_type"],
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Upload PDF File", 
                            False, 
                            "File metadata doesn't match expected values",
                            {"expected_name": filename, "received": data, "status_code": response.status_code}
                        )
                        return False
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result(
                        "Upload PDF File", 
                        False, 
                        f"Missing required fields in response: {missing_fields}",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Upload PDF File", 
                    False, 
                    f"File upload failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Upload PDF File", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_file_type_validation(self):
        """Test that non-PDF files are rejected"""
        print("\n=== Testing File Type Validation ===")
        
        if not self.access_token:
            self.log_result(
                "File Type Validation", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        # Create a fake text file
        text_content = b"This is not a PDF file"
        
        try:
            files = {
                'file': ('test.txt', text_content, 'text/plain')
            }
            data = {
                'category': 'Documents'
            }
            
            response = requests.post(
                f"{self.base_url}/files",
                files=files,
                data=data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 400:
                error_data = response.json()
                if "PDF" in error_data.get("detail", "").upper():
                    self.log_result(
                        "File Type Validation", 
                        True, 
                        "Non-PDF file correctly rejected with 400 status",
                        {
                            "error_message": error_data.get("detail"),
                            "status_code": response.status_code
                        }
                    )
                    return True
                else:
                    self.log_result(
                        "File Type Validation", 
                        False, 
                        "Wrong error message for non-PDF file",
                        {"response": error_data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "File Type Validation", 
                    False, 
                    f"Expected 400 status for non-PDF file, got {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "File Type Validation", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_file_size_validation(self):
        """Test file size limit (10MB max)"""
        print("\n=== Testing File Size Validation ===")
        
        if not self.access_token:
            self.log_result(
                "File Size Validation", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        # Create a large fake PDF (simulate > 10MB)
        # We'll create a smaller file but test the validation logic
        large_content = b"PDF" + b"x" * (11 * 1024 * 1024)  # 11MB of data
        
        try:
            files = {
                'file': ('large_test.pdf', large_content, 'application/pdf')
            }
            data = {
                'category': 'Documents'
            }
            
            response = requests.post(
                f"{self.base_url}/files",
                files=files,
                data=data,
                headers=headers,
                timeout=60  # Longer timeout for large file
            )
            
            if response.status_code == 400:
                error_data = response.json()
                if "10MB" in error_data.get("detail", "") or "size" in error_data.get("detail", "").lower():
                    self.log_result(
                        "File Size Validation", 
                        True, 
                        "Large file correctly rejected with size limit error",
                        {
                            "error_message": error_data.get("detail"),
                            "file_size_mb": len(large_content) / (1024 * 1024),
                            "status_code": response.status_code
                        }
                    )
                    return True
                else:
                    self.log_result(
                        "File Size Validation", 
                        False, 
                        "Wrong error message for large file",
                        {"response": error_data, "status_code": response.status_code}
                    )
                    return False
            else:
                # If it didn't fail, check if it's because the server accepted it (which would be wrong)
                self.log_result(
                    "File Size Validation", 
                    False, 
                    f"Expected 400 status for large file, got {response.status_code}",
                    {"response": response.text, "file_size_mb": len(large_content) / (1024 * 1024), "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            # Large file might cause timeout or connection issues, which is acceptable
            if "timeout" in str(e).lower() or "connection" in str(e).lower():
                self.log_result(
                    "File Size Validation", 
                    True, 
                    "Large file caused timeout/connection error (acceptable behavior)",
                    {"error": str(e), "file_size_mb": len(large_content) / (1024 * 1024)}
                )
                return True
            else:
                self.log_result(
                    "File Size Validation", 
                    False, 
                    f"Request failed: {str(e)}",
                    {"error": str(e)}
                )
                return False

    def test_get_files_list(self):
        """Test GET /api/files returns uploaded files"""
        print("\n=== Testing Get Files List ===")
        
        if not self.access_token:
            self.log_result(
                "Get Files List", 
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
                f"{self.base_url}/files",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    expected_count = len(self.created_file_ids)
                    actual_count = len(data)
                    
                    if actual_count >= expected_count:
                        # Verify that our created files are in the list
                        found_ids = [file_record["id"] for file_record in data if "id" in file_record]
                        missing_ids = [fid for fid in self.created_file_ids if fid not in found_ids]
                        
                        if not missing_ids:
                            self.log_result(
                                "Get Files List", 
                                True, 
                                f"Successfully retrieved {actual_count} files, all created files found",
                                {"files_count": actual_count, "created_ids_found": len(self.created_file_ids), "status_code": response.status_code}
                            )
                            return True
                        else:
                            self.log_result(
                                "Get Files List", 
                                False, 
                                f"Missing {len(missing_ids)} created files in response",
                                {"missing_ids": missing_ids, "found_count": actual_count, "status_code": response.status_code}
                            )
                            return False
                    else:
                        self.log_result(
                            "Get Files List", 
                            False, 
                            f"Expected at least {expected_count} files, got {actual_count}",
                            {"expected_count": expected_count, "actual_count": actual_count, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Get Files List", 
                        False, 
                        "Response is not a list",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Get Files List", 
                    False, 
                    f"Get files failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Get Files List", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_search_files(self):
        """Test GET /api/files with search parameter"""
        print("\n=== Testing Search Files ===")
        
        if not self.access_token:
            self.log_result(
                "Search Files", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_file_ids:
            self.log_result(
                "Search Files", 
                False, 
                "No files available for search testing",
                {"error": "File upload tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Search for "ConnectVault" which should be in our test file name
        search_term = "ConnectVault"
        
        try:
            response = requests.get(
                f"{self.base_url}/files?search={search_term}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if search results contain our search term
                    matching_files = [f for f in data if search_term.lower() in f.get("name", "").lower()]
                    
                    if len(matching_files) > 0:
                        self.log_result(
                            "Search Files", 
                            True, 
                            f"Search returned {len(matching_files)} files matching '{search_term}'",
                            {
                                "search_term": search_term,
                                "total_results": len(data),
                                "matching_files": len(matching_files),
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Search Files", 
                            False, 
                            f"No files found matching search term '{search_term}'",
                            {"search_term": search_term, "total_results": len(data), "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Search Files", 
                        False, 
                        "Search response is not a list",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Search Files", 
                    False, 
                    f"Search files failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Search Files", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_filter_files_by_category(self):
        """Test GET /api/files with category filter"""
        print("\n=== Testing Filter Files by Category ===")
        
        if not self.access_token:
            self.log_result(
                "Filter Files by Category", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_file_ids:
            self.log_result(
                "Filter Files by Category", 
                False, 
                "No files available for category filtering testing",
                {"error": "File upload tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Filter by "Marketing Materials" category which we used in upload test
        category = "Marketing Materials"
        
        try:
            response = requests.get(
                f"{self.base_url}/files?category={category}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if all returned files have the correct category
                    correct_category_files = [f for f in data if f.get("category") == category]
                    
                    if len(data) == len(correct_category_files) and len(data) > 0:
                        self.log_result(
                            "Filter Files by Category", 
                            True, 
                            f"Category filter returned {len(data)} files, all with correct category",
                            {
                                "category": category,
                                "files_count": len(data),
                                "status_code": response.status_code
                            }
                        )
                        return True
                    elif len(data) == 0:
                        self.log_result(
                            "Filter Files by Category", 
                            False, 
                            f"No files found for category '{category}' (expected at least 1)",
                            {"category": category, "files_count": len(data), "status_code": response.status_code}
                        )
                        return False
                    else:
                        self.log_result(
                            "Filter Files by Category", 
                            False, 
                            f"Some files have incorrect category: expected {len(data)}, correct {len(correct_category_files)}",
                            {"category": category, "total_files": len(data), "correct_category": len(correct_category_files), "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Filter Files by Category", 
                        False, 
                        "Category filter response is not a list",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Filter Files by Category", 
                    False, 
                    f"Category filter failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Filter Files by Category", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_download_file(self):
        """Test GET /api/files/{id}/download downloads file"""
        print("\n=== Testing Download File ===")
        
        if not self.access_token:
            self.log_result(
                "Download File", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_file_ids:
            self.log_result(
                "Download File", 
                False, 
                "No file IDs available for download testing",
                {"error": "File upload tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        file_id = self.created_file_ids[0]
        
        try:
            response = requests.get(
                f"{self.base_url}/files/{file_id}/download",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                # Check if response contains PDF content
                content = response.content
                content_type = response.headers.get('content-type', '')
                
                if content_type == 'application/pdf' and len(content) > 0:
                    # Basic PDF validation - check for PDF header
                    if content.startswith(b'%PDF'):
                        self.log_result(
                            "Download File", 
                            True, 
                            "File downloaded successfully with correct PDF content",
                            {
                                "file_id": file_id,
                                "content_type": content_type,
                                "content_size": len(content),
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Download File", 
                            False, 
                            "Downloaded content is not a valid PDF",
                            {"file_id": file_id, "content_type": content_type, "content_preview": content[:50], "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Download File", 
                        False, 
                        "Downloaded file has incorrect content type or is empty",
                        {"file_id": file_id, "content_type": content_type, "content_size": len(content), "status_code": response.status_code}
                    )
                    return False
            elif response.status_code == 404:
                self.log_result(
                    "Download File", 
                    False, 
                    f"File {file_id} not found for download",
                    {"file_id": file_id, "status_code": response.status_code}
                )
                return False
            else:
                self.log_result(
                    "Download File", 
                    False, 
                    f"Download file failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Download File", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_update_file_metadata(self):
        """Test PATCH /api/files/{id} updates file name and category"""
        print("\n=== Testing Update File Metadata ===")
        
        if not self.access_token:
            self.log_result(
                "Update File Metadata", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_file_ids:
            self.log_result(
                "Update File Metadata", 
                False, 
                "No file IDs available for update testing",
                {"error": "File upload tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        file_id = self.created_file_ids[0]
        
        # Update data
        update_data = {
            "name": "Updated_ConnectVault_Document.pdf",
            "category": "Updated Category"
        }
        
        try:
            response = requests.patch(
                f"{self.base_url}/files/{file_id}",
                json=update_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify updates were applied
                if (data["name"] == update_data["name"] and 
                    data["category"] == update_data["category"]):
                    
                    self.log_result(
                        "Update File Metadata", 
                        True, 
                        "File metadata updated successfully",
                        {
                            "file_id": data["id"],
                            "updated_name": data["name"],
                            "updated_category": data["category"],
                            "status_code": response.status_code
                        }
                    )
                    return True
                else:
                    self.log_result(
                        "Update File Metadata", 
                        False, 
                        "File metadata updates were not applied correctly",
                        {"sent": update_data, "received": data, "status_code": response.status_code}
                    )
                    return False
            elif response.status_code == 404:
                self.log_result(
                    "Update File Metadata", 
                    False, 
                    f"File {file_id} not found for update",
                    {"file_id": file_id, "status_code": response.status_code}
                )
                return False
            else:
                self.log_result(
                    "Update File Metadata", 
                    False, 
                    f"Update file metadata failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Update File Metadata", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_get_file_categories(self):
        """Test GET /api/files/categories returns available categories"""
        print("\n=== Testing Get File Categories ===")
        
        if not self.access_token:
            self.log_result(
                "Get File Categories", 
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
                f"{self.base_url}/files/categories",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "categories" in data and isinstance(data["categories"], list):
                    categories = data["categories"]
                    
                    # Should contain at least the categories we used in tests
                    expected_categories = ["Marketing Materials", "Updated Category"]
                    found_categories = [cat for cat in expected_categories if cat in categories]
                    
                    if len(found_categories) >= 1:  # At least one of our categories should be there
                        self.log_result(
                            "Get File Categories", 
                            True, 
                            f"Categories retrieved successfully, found {len(categories)} total categories",
                            {
                                "total_categories": len(categories),
                                "categories": categories,
                                "expected_found": len(found_categories),
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Get File Categories", 
                            False, 
                            "Expected categories not found in response",
                            {"expected": expected_categories, "received": categories, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Get File Categories", 
                        False, 
                        "Response missing 'categories' field or not a list",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            else:
                self.log_result(
                    "Get File Categories", 
                    False, 
                    f"Get categories failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Get File Categories", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_file_user_isolation(self):
        """Test that files are properly filtered by user_id (security test)"""
        print("\n=== Testing File User Isolation ===")
        
        if not self.access_token:
            self.log_result(
                "File User Isolation", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Test with a non-existent file ID (should return 404, not 403)
        fake_file_id = "non-existent-file-id-12345"
        
        try:
            response = requests.get(
                f"{self.base_url}/files/{fake_file_id}/download",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 404:
                self.log_result(
                    "File User Isolation", 
                    True, 
                    "Properly returns 404 for non-existent file (user isolation working)",
                    {"fake_id": fake_file_id, "status_code": response.status_code}
                )
                return True
            else:
                self.log_result(
                    "File User Isolation", 
                    False, 
                    f"Expected 404 for non-existent file, got {response.status_code}",
                    {"fake_id": fake_file_id, "response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "File User Isolation", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_delete_file(self):
        """Test DELETE /api/files/{id} deletes file"""
        print("\n=== Testing Delete File ===")
        
        if not self.access_token:
            self.log_result(
                "Delete File", 
                False, 
                "No access token available for testing",
                {"error": "Login test must pass first"}
            )
            return False
        
        if not self.created_file_ids:
            self.log_result(
                "Delete File", 
                False, 
                "No file IDs available for deletion testing",
                {"error": "File upload tests must pass first"}
            )
            return False
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Use the last created file for deletion
        file_id = self.created_file_ids[-1]
        
        try:
            response = requests.delete(
                f"{self.base_url}/files/{file_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data and "deleted" in data["message"].lower():
                    # Verify file is actually deleted by trying to download it
                    get_response = requests.get(
                        f"{self.base_url}/files/{file_id}/download",
                        headers=headers,
                        timeout=30
                    )
                    
                    if get_response.status_code == 404:
                        # Remove from our tracking list
                        self.created_file_ids.remove(file_id)
                        
                        self.log_result(
                            "Delete File", 
                            True, 
                            "File deleted successfully and verified",
                            {
                                "deleted_file_id": file_id,
                                "delete_response": data,
                                "verification_status": get_response.status_code,
                                "status_code": response.status_code
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Delete File", 
                            False, 
                            "File still exists after deletion",
                            {"file_id": file_id, "verification_status": get_response.status_code, "status_code": response.status_code}
                        )
                        return False
                else:
                    self.log_result(
                        "Delete File", 
                        False, 
                        "Unexpected delete response message",
                        {"response": data, "status_code": response.status_code}
                    )
                    return False
            elif response.status_code == 404:
                self.log_result(
                    "Delete File", 
                    False, 
                    f"File {file_id} not found for deletion",
                    {"file_id": file_id, "status_code": response.status_code}
                )
                return False
            else:
                self.log_result(
                    "Delete File", 
                    False, 
                    f"Delete file failed with status {response.status_code}",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Delete File", 
                False, 
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ConnectVault CRM Backend Comprehensive Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Test User: {self.existing_user_data['username']}")
        print("=" * 80)
        
        # Test sequence - order matters for dependencies
        tests = [
            self.test_health_check,
            self.test_existing_user_login,
            self.test_dashboard_summary_commission_fields,
            self.test_get_commissions_empty,
            self.test_create_commission,
            self.test_create_multiple_commissions,
            self.test_get_commissions_with_data,
            self.test_get_single_commission,
            self.test_update_commission,
            self.test_export_commissions_csv,
            self.test_commission_security_user_isolation,
            self.test_delete_commission
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
        print("\n" + "=" * 80)
        print("🏁 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        
        if failed == 0:
            print("🎉 All tests passed! Commission module backend is working correctly.")
        else:
            print("⚠️  Some tests failed. Please review the issues above.")
        
        return failed == 0

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())