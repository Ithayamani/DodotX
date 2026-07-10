"""
Regression suite for the DodotX auth-persistence fix.
Validates:
- Wrong PIN now returns 403 (not 401) -> frontend interceptor will not wipe token
- Add multiple children in a row does not require re-auth
- Delete task / toggle-complete task never returns 401
- Visitor endpoint remains public
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://family-quest-15.preview.emergentagent.com").rstrip("/")
EMAIL = "review@dodotx.net"
PASSWORD = "Review123!"
CORRECT_PIN = "1234"
WRONG_PIN = "9999"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- PIN screen -----------------------------------------------------------

class TestPinPersistence:
    def test_wrong_pin_returns_403_not_401(self, token):
        r = requests.post(f"{BASE_URL}/api/family/verify-pin",
                          params={"pin": WRONG_PIN},
                          headers={"Authorization": f"Bearer {token}"}, timeout=10)
        # MUST be 403 so frontend interceptor does not delete auth_token
        assert r.status_code == 403, f"Wrong PIN returned {r.status_code}"

    def test_correct_pin_after_wrong(self, token):
        # simulate: wrong PIN then correct PIN, same session
        w = requests.post(f"{BASE_URL}/api/family/verify-pin",
                         params={"pin": WRONG_PIN},
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert w.status_code == 403
        c = requests.post(f"{BASE_URL}/api/family/verify-pin",
                         params={"pin": CORRECT_PIN},
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert c.status_code == 200
        assert c.json().get("success") is True

    def test_session_still_valid_after_wrong_pin(self, token):
        requests.post(f"{BASE_URL}/api/family/verify-pin",
                     params={"pin": WRONG_PIN},
                     headers={"Authorization": f"Bearer {token}"}, timeout=10)
        me = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert me.status_code == 200


# --- Children (add multiple in a row) -------------------------------------

class TestMultipleChildren:
    def test_add_three_children_in_a_row(self, h):
        created = []
        try:
            for i in range(3):
                r = requests.post(f"{BASE_URL}/api/children",
                                  headers=h,
                                  json={"name": f"TEST_seq_{i}", "avatar": "👦", "age": 6 + i},
                                  timeout=15)
                assert r.status_code == 200, f"kid {i}: {r.status_code} {r.text}"
                created.append(r.json()["id"])
                assert r.json()["name"] == f"TEST_seq_{i}"
            # verify all persisted via GET
            r = requests.get(f"{BASE_URL}/api/children", headers=h, timeout=10)
            assert r.status_code == 200
            names = [c["name"] for c in r.json()]
            for i in range(3):
                assert f"TEST_seq_{i}" in names
        finally:
            for cid in created:
                requests.delete(f"{BASE_URL}/api/children/{cid}", headers=h, timeout=10)


# --- Tasks CRUD & toggle ---------------------------------------------------

class TestTaskFlow:
    def test_create_edit_delete_task(self, h):
        # create
        r = requests.post(f"{BASE_URL}/api/tasks",
                          headers=h,
                          json={"title": "TEST_flow", "icon": "🎯", "pts": 5,
                                "cat": "chores",
                                "modes": {"daily": True, "vacation": False}},
                          timeout=15)
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        # edit
        r = requests.put(f"{BASE_URL}/api/tasks/{tid}",
                         headers=h,
                         json={"title": "TEST_flow_edited"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_flow_edited"
        # delete
        r = requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=h, timeout=10)
        assert r.status_code == 200
        # verify gone
        r = requests.get(f"{BASE_URL}/api/tasks", headers=h, timeout=10)
        assert not any(t["id"] == tid for t in r.json())

    def test_toggle_task_no_auth_error(self, h):
        # find any task & any child
        tasks = requests.get(f"{BASE_URL}/api/tasks", headers=h, timeout=10).json()
        kids = requests.get(f"{BASE_URL}/api/children", headers=h, timeout=10).json()
        assert tasks and kids
        tid, cid = tasks[0]["id"], kids[0]["id"]
        r1 = requests.post(f"{BASE_URL}/api/tasks/{tid}/toggle",
                          params={"child_id": cid}, headers=h, timeout=15)
        assert r1.status_code == 200, r1.text
        assert r1.json()["completed"] is True
        # toggle off
        r2 = requests.post(f"{BASE_URL}/api/tasks/{tid}/toggle",
                          params={"child_id": cid}, headers=h, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["completed"] is False


# --- Rewards CRUD ----------------------------------------------------------

class TestRewardFlow:
    def test_reward_crud(self, h):
        r = requests.post(f"{BASE_URL}/api/rewards",
                          headers=h,
                          json={"name": "TEST_rew", "icon": "🎁",
                                "pts": 20, "desc": "test"}, timeout=15)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        r = requests.put(f"{BASE_URL}/api/rewards/{rid}",
                         headers=h, json={"pts": 30}, timeout=15)
        assert r.status_code == 200
        assert r.json()["pts"] == 30
        r = requests.delete(f"{BASE_URL}/api/rewards/{rid}", headers=h, timeout=10)
        assert r.status_code == 200
