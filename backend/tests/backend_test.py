"""
DodotX backend regression + bug-fix verification tests.
Covers:
- Auth (login/signup, per-account rate limit, cross-account isolation)
- Admin verify-demo (seed integrity)
- Family verify-code / verify-pin / join-child
- Visitor view
- Task creation validation (BUG4)
- AI suggest-tasks category fix (BUG2)
- AI adjust-difficulty (BUG1)
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://family-quest-15.preview.emergentagent.com").rstrip("/")

REVIEW_EMAIL = "review@dodotx.net"
REVIEW_PASSWORD = "Review123!"
TEST_EMAIL = "parent@test.com"
TEST_PASSWORD = "Parent123!"
REVIEW_CODE = "REVIEW"
TEST_CODE = "TEST01"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def review_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": REVIEW_EMAIL, "password": REVIEW_PASSWORD})
    assert r.status_code == 200, f"Review login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def test_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, f"Test parent login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


# ---------- health / seed ----------
class TestHealthAndSeed:
    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json().get("database") == "connected"

    def test_verify_demo_seed(self, api):
        r = api.get(f"{BASE_URL}/api/admin/verify-demo")
        assert r.status_code == 200
        d = r.json()
        assert d.get("exists") is True
        assert d.get("password_valid") is True
        assert d.get("family_code") == "REVIEW"
        assert d.get("children_count") == 2
        assert d.get("tasks_count") == 12


# ---------- AUTH ----------
class TestAuth:
    def test_review_login_success(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": REVIEW_EMAIL, "password": REVIEW_PASSWORD})
        assert r.status_code == 200
        j = r.json()
        assert "access_token" in j
        assert j["user"]["email"] == REVIEW_EMAIL
        assert j["user"]["role"] == "parent"

    def test_test_parent_login_success(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == TEST_EMAIL

    def test_signup_new_user(self, api):
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@example.com"
        r = api.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email, "password": "Passw0rd!", "name": "New Tester"
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert "access_token" in j
        assert j["user"]["email"] == email


# ---------- BUG3: per-account rate limit ----------
class TestLoginRateLimitPerAccount:
    """
    11 rapid logins to a THROWAWAY email → 11th must 429.
    A DIFFERENT email must still succeed while the first is throttled
    (proves per-account, not per-IP/global).
    """
    def test_per_account_login_rate_limit(self, api):
        throwaway = f"ratelimit_test_{uuid.uuid4().hex[:6]}@x.com"
        statuses = []
        for _ in range(11):
            r = api.post(f"{BASE_URL}/api/auth/login", json={"email": throwaway, "password": "wrongpass"})
            statuses.append(r.status_code)
        # First 10 → 401 (not found), 11th → 429
        assert statuses[-1] == 429, f"Expected 429 on 11th attempt, got {statuses}"
        # At least one earlier attempt should be 401 (not all 429)
        assert 401 in statuses[:10], f"Expected 401s before rate limit: {statuses}"

        # While throwaway is locked, review account must still login
        r2 = api.post(f"{BASE_URL}/api/auth/login", json={"email": REVIEW_EMAIL, "password": REVIEW_PASSWORD})
        assert r2.status_code == 200, f"Cross-account isolation broken: review login got {r2.status_code} {r2.text}"


# ---------- BUG4: TaskCreate validation ----------
class TestTaskCreateValidation:
    def test_task_missing_required_fields_returns_422(self, api, review_token):
        headers = {"Authorization": f"Bearer {review_token}"}
        r = api.post(f"{BASE_URL}/api/tasks", json={"title": "x"}, headers=headers)
        assert r.status_code == 422, f"Expected 422, got {r.status_code} {r.text}"

    def test_task_valid_full_body_returns_200(self, api, review_token):
        headers = {"Authorization": f"Bearer {review_token}"}
        payload = {
            "title": "TEST_Task_regression",
            "pts": 15,
            "cat": "learning",
            "icon": "📘",
            "modes": {"daily": True, "vacation": False}
        }
        r = api.post(f"{BASE_URL}/api/tasks", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        task = r.json()
        assert task["title"] == "TEST_Task_regression"
        assert task["pts"] == 15
        assert task["cat"] == "learning"
        task_id = task["id"]

        # Cleanup
        d = api.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=headers)
        assert d.status_code == 200


# ---------- Family + Visitor + Join ----------
class TestFamilyFlows:
    def test_verify_code_review(self, api):
        r = api.post(f"{BASE_URL}/api/family/verify-code", json={"code": "REVIEW"})
        assert r.status_code == 200
        j = r.json()
        assert "family_id" in j
        assert j["family_name"] == "Demo Family"

    def test_verify_code_test01(self, api):
        r = api.post(f"{BASE_URL}/api/family/verify-code", json={"code": "TEST01"})
        assert r.status_code == 200
        assert r.json()["family_name"] == "Test Family"

    def test_visitor_review(self, api):
        r = api.get(f"{BASE_URL}/api/visitor/REVIEW")
        assert r.status_code == 200
        j = r.json()
        assert j["family_name"] == "Demo Family"
        assert len(j["children"]) == 2
        names = sorted([c["name"] for c in j["children"]])
        assert names == ["Emma", "Liam"]

    def test_join_child_review(self, api):
        r = api.post(f"{BASE_URL}/api/family/join-child", json={
            "family_code": "REVIEW", "child_name": f"TEST_kid_{uuid.uuid4().hex[:4]}"
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert "access_token" in j
        assert j["user"]["role"] == "child"

    def test_verify_pin_1234(self, api, review_token):
        headers = {"Authorization": f"Bearer {review_token}"}
        # Endpoint uses query param `pin`
        r = api.post(f"{BASE_URL}/api/family/verify-pin?pin=1234", headers=headers)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True


# ---------- BUG1 & BUG2: AI endpoints ----------
class TestAIEndpoints:
    def test_adjust_difficulty_returns_200(self, api, review_token):
        headers = {"Authorization": f"Bearer {review_token}"}
        r = api.post(f"{BASE_URL}/api/ai/adjust-difficulty", json={}, headers=headers, timeout=90)
        # If LLM key hits an issue, we still expect 200 for the "unhashable dict" fix to be proven
        assert r.status_code == 200, f"BUG1: expected 200, got {r.status_code}: {r.text[:300]}"
        j = r.json()
        assert isinstance(j, dict)

    def test_suggest_tasks_valid_categories(self, api, review_token):
        headers = {"Authorization": f"Bearer {review_token}"}
        payload = {
            "child_age": 8,
            "interests": ["home", "cooking", "music"],  # includes 'home' to trigger BUG2 scenario
            "goals": "Build responsibility around the house",
            "current_tasks_count": 3,
        }
        r = api.post(f"{BASE_URL}/api/ai/suggest-tasks", json=payload, headers=headers, timeout=90)
        assert r.status_code == 200, f"BUG2: expected 200, got {r.status_code}: {r.text[:300]}"
        tasks = r.json()
        assert isinstance(tasks, list) and len(tasks) > 0
        valid = {"learning", "active", "creative", "chores", "health", "social"}
        for t in tasks:
            assert t["cat"] in valid, f"Invalid cat: {t}"
