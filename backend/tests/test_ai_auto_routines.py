"""
Bug-fix verification for POST /api/ai/auto-routines.

Reported issue: RANDOM 500 errors from LLM returning invalid TaskCategory
(e.g. 'morning'/'home') or out-of-range pts (>100).

Fix should sanitize output before Pydantic validation. This suite:
1. Calls /api/ai/auto-routines multiple times back-to-back and asserts EVERY
   run returns 200 with a non-empty 'tasks' list (no 500).
2. Validates each returned task's schema (cat/pts/title/icon/modes).
3. Confirms task counts persist in DB (GET /api/tasks grows).
4. Adds a child WITH age and a child WITHOUT age and confirms the endpoint
   still returns 200 (age handling).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://family-quest-15.preview.emergentagent.com",
).rstrip("/")

REVIEW_EMAIL = "review@dodotx.net"
REVIEW_PASSWORD = "Review123!"

VALID_CATS = {"learning", "active", "creative", "chores", "health", "social"}


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(api):
    r = api.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": REVIEW_EMAIL, "password": REVIEW_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- helpers ----------
def _validate_task(t: dict):
    """Every returned/persisted routine must pass this."""
    assert isinstance(t, dict), f"task not a dict: {t}"
    assert isinstance(t.get("title"), str) and t["title"].strip(), f"empty title: {t}"
    assert t.get("cat") in VALID_CATS, f"invalid cat: {t.get('cat')} in {t}"
    pts = t.get("pts")
    assert isinstance(pts, int) and 1 <= pts <= 100, f"pts out of range: {pts} in {t}"
    assert isinstance(t.get("icon"), str) and t["icon"], f"missing icon in {t}"
    modes = t.get("modes")
    assert isinstance(modes, dict), f"modes not dict: {t}"
    assert isinstance(modes.get("daily"), bool), f"modes.daily not bool: {t}"
    assert isinstance(modes.get("vacation"), bool), f"modes.vacation not bool: {t}"


def _get_task_count(api, headers):
    r = api.get(f"{BASE_URL}/api/tasks", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    return len(r.json())


# ---------- tests ----------
class TestAutoRoutinesRandomFailure:
    """Run the endpoint 5 times back-to-back — none should 500."""

    def test_auto_routines_multiple_calls_no_500(self, api, auth_headers):
        results = []
        starting_count = _get_task_count(api, auth_headers)
        total_generated = 0

        for i in range(5):
            r = api.post(
                f"{BASE_URL}/api/ai/auto-routines",
                json={},
                headers=auth_headers,
                timeout=120,
            )
            results.append((i + 1, r.status_code, r.text[:300] if r.status_code != 200 else ""))
            assert r.status_code == 200, (
                f"Run #{i+1} returned {r.status_code}: {r.text[:400]}\n"
                f"All results so far: {results}"
            )
            body = r.json()
            assert "tasks" in body, f"Run #{i+1} missing 'tasks' key: {body}"
            tasks = body["tasks"]
            assert isinstance(tasks, list) and len(tasks) > 0, (
                f"Run #{i+1} returned empty tasks list: {body}"
            )
            assert len(tasks) <= 8, f"Run #{i+1} returned more than 8 tasks: {len(tasks)}"

            for t in tasks:
                _validate_task(t)

            total_generated += len(tasks)

        # Confirm persistence: GET /api/tasks should reflect all newly generated tasks
        ending_count = _get_task_count(api, auth_headers)
        assert ending_count >= starting_count + total_generated, (
            f"Persistence check failed: start={starting_count} end={ending_count} "
            f"generated={total_generated}. Results: {results}"
        )


class TestAutoRoutinesAgeHandling:
    """Add a child with age and a child without age, ensure endpoint still 200s."""

    def _create_child(self, api, headers, name, age=None):
        payload = {"name": name, "avatar": "🧒"}
        if age is not None:
            payload["age"] = age
        r = api.post(f"{BASE_URL}/api/children", json=payload, headers=headers, timeout=30)
        assert r.status_code == 200, f"Create child '{name}' failed: {r.status_code} {r.text}"
        return r.json()["id"]

    def test_auto_routines_with_and_without_age(self, api, auth_headers):
        created_ids = []
        try:
            # Child WITH age
            cid_with = self._create_child(
                api, auth_headers, f"TEST_kidage_{uuid.uuid4().hex[:4]}", age=6
            )
            created_ids.append(cid_with)

            # Child WITHOUT age (omit age field entirely)
            cid_noage = self._create_child(
                api, auth_headers, f"TEST_kidnoage_{uuid.uuid4().hex[:4]}", age=None
            )
            created_ids.append(cid_noage)

            # Verify at least one child has no age set (defensive check on model behavior)
            r_get = api.get(
                f"{BASE_URL}/api/children/{cid_noage}", headers=auth_headers, timeout=30
            )
            assert r_get.status_code == 200
            no_age_child = r_get.json()
            assert no_age_child.get("age") is None, (
                f"Expected age=None but got {no_age_child.get('age')} for {no_age_child}"
            )

            # Call auto-routines — must still succeed
            r = api.post(
                f"{BASE_URL}/api/ai/auto-routines",
                json={},
                headers=auth_headers,
                timeout=120,
            )
            assert r.status_code == 200, (
                f"auto-routines failed after mixed-age children: {r.status_code} {r.text[:400]}"
            )
            body = r.json()
            tasks = body.get("tasks", [])
            assert isinstance(tasks, list) and len(tasks) > 0, (
                f"Empty tasks after mixed-age children: {body}"
            )
            for t in tasks:
                _validate_task(t)

        finally:
            # Cleanup test children (best-effort)
            for cid in created_ids:
                try:
                    api.delete(
                        f"{BASE_URL}/api/children/{cid}",
                        headers=auth_headers,
                        timeout=30,
                    )
                except Exception:
                    pass
