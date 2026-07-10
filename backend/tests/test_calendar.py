"""Backend tests for Calendar/Streak feature (GET /api/progress/{child_id}/calendar).

Reviews per problem statement:
- Emma should have current_streak=8, longest_streak=8, 7-day milestone earned
- Liam should have current_streak=2, longest_streak=3, NO milestones earned
- Days map should include both 'complete' and 'partial' statuses for Emma
- daily_task_total is 8
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://family-quest-15.preview.emergentagent.com").rstrip("/")

REVIEW_EMAIL = "review@dodotx.net"
REVIEW_PASSWORD = "Review123!"


@pytest.fixture(scope="module")
def parent_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": REVIEW_EMAIL, "password": REVIEW_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"No token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(parent_token):
    return {"Authorization": f"Bearer {parent_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def children(auth_headers):
    r = requests.get(f"{BASE_URL}/api/children", headers=auth_headers, timeout=15)
    assert r.status_code == 200, f"children fetch failed: {r.text}"
    ch = r.json()
    assert isinstance(ch, list) and len(ch) >= 2
    emma = next((c for c in ch if c["name"] == "Emma"), None)
    liam = next((c for c in ch if c["name"] == "Liam"), None)
    assert emma and liam, "Emma or Liam not found in REVIEW family"
    return {"emma": emma, "liam": liam}


class TestCalendarEndpoint:
    def test_calendar_requires_auth(self):
        # Random-ish id — endpoint should require auth first
        r = requests.get(f"{BASE_URL}/api/progress/anyid/calendar", timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_emma_calendar_shape_and_streak(self, auth_headers, children):
        emma = children["emma"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{emma['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # shape
        for k in ("days", "current_streak", "longest_streak", "complete_days", "daily_task_total", "milestones", "child_id"):
            assert k in data, f"missing key {k} in {list(data.keys())}"
        assert data["child_id"] == emma["id"]
        assert data["daily_task_total"] == 8, f"expected 8 daily tasks, got {data['daily_task_total']}"
        # streak expectations per seed
        assert data["current_streak"] == 8, f"Emma current_streak expected 8 got {data['current_streak']}"
        assert data["longest_streak"] == 8, f"Emma longest_streak expected 8 got {data['longest_streak']}"
        assert data["complete_days"] == 8, f"Emma complete_days expected 8 got {data['complete_days']}"

    def test_emma_days_has_complete_and_partial(self, auth_headers, children):
        emma = children["emma"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{emma['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200
        days = r.json()["days"]
        statuses = {v["status"] for v in days.values()}
        assert "complete" in statuses, f"Emma missing 'complete' days. statuses={statuses}"
        assert "partial" in statuses, f"Emma missing 'partial' days. statuses={statuses}"
        # today should be complete
        today = datetime.utcnow().date().isoformat()
        assert today in days, f"today {today} not in Emma days"
        assert days[today]["status"] == "complete"
        assert days[today]["completed"] == 8
        assert days[today]["total"] == 8

    def test_emma_milestones(self, auth_headers, children):
        emma = children["emma"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{emma['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        ms = {m["days"]: m for m in r.json()["milestones"]}
        assert set(ms.keys()) == {7, 14, 30, 60, 100}, f"unexpected milestones: {ms.keys()}"
        assert ms[7]["earned"] is True, "Emma 7-day milestone should be earned"
        for d in (14, 30, 60, 100):
            assert ms[d]["earned"] is False, f"Emma {d}-day milestone should NOT be earned"

    def test_liam_broken_streak(self, auth_headers, children):
        liam = children["liam"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{liam['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["current_streak"] == 2, f"Liam current_streak expected 2 got {data['current_streak']}"
        assert data["longest_streak"] == 3, f"Liam longest_streak expected 3 got {data['longest_streak']}"
        assert data["complete_days"] == 5, f"Liam complete_days expected 5 got {data['complete_days']}"

    def test_liam_no_milestones(self, auth_headers, children):
        liam = children["liam"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{liam['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        for m in r.json()["milestones"]:
            assert m["earned"] is False, f"Liam should have NO milestones earned; {m['days']} is earned"

    def test_liam_gap_day_not_in_completions_map(self, auth_headers, children):
        """The gap day (today-2) should NOT be present in days map because it has zero completions."""
        liam = children["liam"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{liam['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        days = r.json()["days"]
        gap_day = (datetime.utcnow().date() - timedelta(days=2)).isoformat()
        # The gap day is simply omitted (seed did not write it). Grid renders it as empty/none.
        assert gap_day not in days, f"gap day {gap_day} unexpectedly present: {days.get(gap_day)}"


class TestNoRegressions:
    def test_progress_endpoint_still_works(self, auth_headers, children):
        emma = children["emma"]
        r = requests.get(f"{BASE_URL}/api/progress/{emma['id']}", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["child"]["name"] == "Emma"
        assert "points" in data and "trophies" in data and "rewards" in data

    def test_tasks_list(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        tasks = r.json()
        assert isinstance(tasks, list) and len(tasks) > 0

    def test_family_me(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/family", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("code") == "REVIEW"
