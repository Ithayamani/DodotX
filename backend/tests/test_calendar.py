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


class TestVacationMode:
    """Vacation-mode calendar/streak tests.
    Family REVIEW currently: vacation_mode=True, 2026-07-13 → 2026-07-19 (future range).
    daily_task_total=8, vacation_task_total=7.
    Emma's completions are on daily-mode days (early July) — future vacation window
    must NOT affect past streak.
    """

    def test_calendar_response_shape_vacation_fields(self, auth_headers, children):
        emma = children["emma"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{emma['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # New fields required by review
        assert "vacation" in data, f"missing 'vacation' key: {list(data.keys())}"
        assert "vacation_task_total" in data, "missing 'vacation_task_total'"
        assert "daily_task_total" in data, "missing 'daily_task_total'"
        vac = data["vacation"]
        for k in ("active", "start", "end"):
            assert k in vac, f"vacation missing key {k}: {vac}"
        assert vac["active"] is True, f"vacation.active should be True, got {vac}"
        assert vac["start"] == "2026-07-13", f"vacation.start expected 2026-07-13, got {vac['start']}"
        assert vac["end"] == "2026-07-19", f"vacation.end expected 2026-07-19, got {vac['end']}"
        assert data["daily_task_total"] == 8
        assert data["vacation_task_total"] == 7, f"expected 7 vacation tasks, got {data['vacation_task_total']}"

    def test_future_vacation_does_not_break_streak(self, auth_headers, children):
        """Emma's completions are on daily-mode days — future vacation range must not affect streak."""
        emma = children["emma"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{emma['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        data = r.json()
        assert data["current_streak"] == 8, f"Emma current_streak expected 8, got {data['current_streak']}"
        assert data["longest_streak"] == 8, f"Emma longest_streak expected 8, got {data['longest_streak']}"

    def test_vacation_days_flagged_true_if_present(self, auth_headers, children):
        """Days inside 07-13..07-19 must have vacation:true. Absence is OK (no completions).
        Days outside must have vacation:false."""
        emma = children["emma"]
        r = requests.get(
            f"{BASE_URL}/api/progress/{emma['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        days = r.json()["days"]
        for d, v in days.items():
            assert "vacation" in v, f"day {d} missing 'vacation' flag: {v}"
            in_range = "2026-07-13" <= d <= "2026-07-19"
            assert v["vacation"] is in_range, f"day {d} vacation flag mismatch: {v['vacation']} (in_range={in_range})"

    def test_vacation_completion_edge_controlled(self, auth_headers, children):
        """Controlled edge test: temporarily set vacation to cover Emma's last 3 completed days,
        confirm those days become 'partial' (she only did 5 of 7 vacation tasks on those daily days)
        and streak drops. Then restore vacation to 2026-07-13..2026-07-19."""
        emma = children["emma"]

        # Snapshot current family vacation config (should be the future range).
        fam_r = requests.get(f"{BASE_URL}/api/family", headers=auth_headers, timeout=15)
        assert fam_r.status_code == 200
        original = fam_r.json()
        orig_start = original.get("vacation_start_date")
        orig_end = original.get("vacation_end_date")
        orig_mode = original.get("vacation_mode")

        # Pick last 3 completed days for Emma (from calendar days map).
        cal_r = requests.get(
            f"{BASE_URL}/api/progress/{emma['id']}/calendar",
            headers=auth_headers,
            timeout=15,
        )
        days = cal_r.json()["days"]
        complete_days_sorted = sorted([d for d, v in days.items() if v["status"] == "complete"])
        assert len(complete_days_sorted) >= 3, f"Need >=3 complete days to run edge test, got {complete_days_sorted}"
        last3 = complete_days_sorted[-3:]
        edge_start, edge_end = last3[0], last3[-1]

        try:
            # Temporarily flip vacation dates to cover Emma's last 3 completed daily days.
            upd = requests.put(
                f"{BASE_URL}/api/family",
                headers=auth_headers,
                json={
                    "vacation_mode": True,
                    "vacation_start_date": edge_start,
                    "vacation_end_date": edge_end,
                },
                timeout=15,
            )
            assert upd.status_code in (200, 204), f"family PUT failed: {upd.status_code} {upd.text}"

            cal_r2 = requests.get(
                f"{BASE_URL}/api/progress/{emma['id']}/calendar",
                headers=auth_headers,
                timeout=15,
            )
            assert cal_r2.status_code == 200, cal_r2.text
            data2 = cal_r2.json()
            assert data2["vacation"]["active"] is True
            assert data2["vacation"]["start"] == edge_start
            assert data2["vacation"]["end"] == edge_end
            days2 = data2["days"]

            # Each of the last 3 days must now be flagged vacation:true AND become 'partial'
            # (she completed 5 daily tasks; only 2 of the 7 vacation-mode task ids were common
            #  → intersection < 7, so status is partial, not complete).
            for d in last3:
                assert d in days2, f"expected day {d} to still be in days map"
                assert days2[d]["vacation"] is True, f"day {d} should be vacation:true after edit"
                assert days2[d]["total"] == 7, f"day {d} total should be 7 (vacation tasks), got {days2[d]['total']}"
                assert days2[d]["status"] == "partial", (
                    f"day {d} expected partial under vacation, got {days2[d]['status']} "
                    f"(completed={days2[d]['completed']}/{days2[d]['total']})"
                )

            # Streak must drop (last 3 days were the streak's tail).
            assert data2["current_streak"] < 8, (
                f"streak should drop when last completed days become partial, got {data2['current_streak']}"
            )
        finally:
            # Restore to future vacation range 2026-07-13 → 2026-07-19 (or original if it was that).
            restore_payload = {
                "vacation_mode": bool(orig_mode) if orig_mode is not None else True,
                "vacation_start_date": orig_start or "2026-07-13",
                "vacation_end_date": orig_end or "2026-07-19",
            }
            restore = requests.put(
                f"{BASE_URL}/api/family",
                headers=auth_headers,
                json=restore_payload,
                timeout=15,
            )
            assert restore.status_code in (200, 204), f"restore failed: {restore.status_code} {restore.text}"

            # Sanity: streak back to 8.
            cal_r3 = requests.get(
                f"{BASE_URL}/api/progress/{emma['id']}/calendar",
                headers=auth_headers,
                timeout=15,
            )
            d3 = cal_r3.json()
            assert d3["current_streak"] == 8, f"post-restore streak != 8: got {d3['current_streak']}"
            assert d3["vacation"]["start"] == "2026-07-13"
            assert d3["vacation"]["end"] == "2026-07-19"

    def test_progress_streak_matches_calendar_current_streak(self, auth_headers, children):
        """Regression: GET /api/progress/{id} 'streak' must match GET /api/progress/{id}/calendar current_streak."""
        emma = children["emma"]
        p = requests.get(f"{BASE_URL}/api/progress/{emma['id']}", headers=auth_headers, timeout=15).json()
        c = requests.get(f"{BASE_URL}/api/progress/{emma['id']}/calendar", headers=auth_headers, timeout=15).json()
        assert p["streak"] == c["current_streak"] == 8, (
            f"streak mismatch: progress={p['streak']} vs calendar={c['current_streak']}"
        )


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
