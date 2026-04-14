"""
backend/scheduler.py
====================
APScheduler background job that sends daily reminders at 9 PM
to users who haven't completed today's session.

Integrated into app.py via lifespan context manager.

Requires Firebase Admin SDK:
  pip install firebase-admin
  Download serviceAccountKey.json from Firebase Console →
  Project Settings → Service Accounts → Generate new private key
  Save as backend/serviceAccountKey.json
"""

import logging
import os
from datetime import datetime, timezone

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

log = logging.getLogger("asana-ai.scheduler")

# ── Firebase Admin (lazy import so app still starts if not configured) ────────
def _get_firestore():
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")
        if not os.path.exists(key_path):
            log.warning("serviceAccountKey.json not found — daily reminders disabled.")
            return None

        if not firebase_admin._apps:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)

        return firestore.client()
    except ImportError:
        log.warning("firebase-admin not installed — daily reminders disabled.")
        return None
    except Exception as e:
        log.error("Firebase init failed: %s", e)
        return None


async def send_daily_reminders():
    """
    Called every day at 21:00 (9 PM local server time).
    Fetches all users from Firestore, checks if they practiced today,
    sends a reminder to those who haven't.
    """
    from notifications import send_skip_reminder_email, send_skip_reminder_telegram

    log.info("Running daily reminder job...")
    db = _get_firestore()
    if db is None:
        return

    today = datetime.now().strftime("%A")    # e.g. "Monday"
    today_str = datetime.now().date().isoformat()   # e.g. "2025-04-09"

    try:
        users_ref = db.collection("users")
        users     = users_ref.stream()

        reminded = 0
        for user_doc in users:
            data    = user_doc.to_dict()
            uid     = user_doc.id
            email   = data.get("email", "")
            name    = data.get("firstName", "Yogi")
            tg_id   = data.get("telegramChatId", "")

            # Check if they practiced today
            last_practice = data.get("lastPracticeDate", "")
            if last_practice == today_str:
                continue   # already done today — no reminder

            # Check if they even have a schedule for today
            schedule = data.get("weeklySchedule", [])
            today_day_idx = (datetime.now().weekday())  # 0=Monday
            today_schedule = next(
                (d for d in schedule if d.get("day") == today_day_idx),
                None,
            )
            if not today_schedule or today_schedule.get("isRest"):
                continue   # it's their rest day

            asanas = today_schedule.get("asanas", [])
            payload = {
                "asanaCount":       len(asanas),
                "estimatedMinutes": max(1, len(asanas) * 1),
            }

            if email:
                send_skip_reminder_email(email, name, payload)
            if tg_id:
                await send_skip_reminder_telegram(str(tg_id), name, payload)

            reminded += 1

        log.info("Daily reminders sent to %d users.", reminded)

    except Exception as e:
        log.error("Daily reminder job failed: %s", e)


def create_scheduler() -> AsyncIOScheduler:
    """Create and configure the scheduler. Call start() on it after creation."""
    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")   # change to your timezone
    scheduler.add_job(
        send_daily_reminders,
        trigger=CronTrigger(hour=21, minute=0),   # 9:00 PM every day
        id="daily_reminders",
        replace_existing=True,
    )
    return scheduler
