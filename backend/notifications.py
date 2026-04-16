"""
backend/notifications.py
========================
Handles email (SMTP) and Telegram notifications.

Environment variables required (add to backend/.env):
  SMTP_HOST         e.g. smtp.gmail.com
  SMTP_PORT         587
  SMTP_USER         your@gmail.com
  SMTP_PASS         your_gmail_app_password  (not your normal password)
  SMTP_FROM_NAME    PosePerfect

  TELEGRAM_BOT_TOKEN   from @BotFather on Telegram

For Gmail app password:
  Google Account → Security → 2-Step Verification → App passwords

CHANGES in this version:
  - send_email() now logs a clearer warning that includes the recipient and
    whether the issue is missing config vs. SMTP failure — makes debugging easier.
  - All public send_* functions return True/False consistently.
  - send_admin_email / send_admin_telegram added for Admin panel messaging.
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger("asana-ai.notifications")

# ── Config ────────────────────────────────────────────────────────────────────
# Resend (HTTP email API — works on Render free tier)
# Sign up free at https://resend.com → get API key → verify your sender email
RESEND_API_KEY    = os.getenv("RESEND_API_KEY",    "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "")   # e.g. noreply@yourdomain.com

# SMTP fallback (works locally, BLOCKED on Render free tier)
SMTP_HOST      = os.getenv("SMTP_HOST",      "smtp.gmail.com")
SMTP_PORT      = int(os.getenv("SMTP_PORT",  "587"))
SMTP_USER      = os.getenv("SMTP_USER",      "")
SMTP_PASS      = os.getenv("SMTP_PASS",      "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "PosePerfect")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
# NOTE: Do NOT build TELEGRAM_API here at module load time —
# the token may not be in the environment yet. Built lazily inside send_telegram().

# ── Duolingo-style skip messages ──────────────────────────────────────────────
SKIP_MESSAGES = [
    "Hey {name}! 🧘 Your mat is waiting. Just 5 minutes today — that's all it takes to keep your streak alive!",
    "{name}, your body remembers every session 🌟 Come back to your practice — even one asana counts!",
    "Streaks are built one day at a time, {name} 🔥 Don't let today break yours. Your schedule is ready!",
    "{name}, even Arjuna rested — but he always came back 🏹 Your yoga session is waiting for you!",
    "A river carves stone not by force but by persistence 💧 {name}, a short session today keeps your momentum going!",
    "{name} 🌅 Morning or night — your asanas don't care when, just that you show up. Let's go!",
    "Your future self will thank you, {name} 🙏 Today's session: {asana_count} asanas, ~{duration} minutes. You've got this!",
]

COMPLETION_MESSAGES = [
    "🎉 Great session, {name}! {completed}/{total} asanas done with {accuracy}% accuracy. Keep it up!",
    "🧘 {name} crushed it today! {accuracy}% accuracy across {completed} asanas. Streak: {streak} days 🔥",
    "✨ Beautiful practice, {name}! Your dedication is showing — {accuracy}% accuracy today.",
]

PARTIAL_MESSAGES = [
    "💪 {name} started strong — {completed}/{total} asanas done ({accuracy}% accuracy). Resume anytime today!",
    "🌱 Progress > perfection, {name}! {completed}/{total} asanas completed. Pick up where you left off!",
]


def _scorecard_html(data: dict) -> str:
    """Generate a beautiful HTML email scorecard."""
    name        = data.get("userName", "Yogi")
    completed   = data.get("completedAsanas", [])
    skipped     = data.get("skippedAsanas",   [])
    accuracies  = data.get("accuracies",      {})
    avg_acc     = data.get("avgAccuracy",     0)
    duration    = data.get("durationSec",     0)
    streak      = data.get("streak",          0)
    day_name    = data.get("dayName",         "Today")
    status      = data.get("status",          "completed")
    date_str    = data.get("date",            "")

    mins = duration // 60
    secs = duration % 60
    dur_label = f"{mins}m {secs}s" if secs else f"{mins}m"

    rows_html = ""
    for slug, display in completed:
        acc = accuracies.get(slug, 0)
        bar_color = "#10B981" if acc >= 90 else "#7C6FCD" if acc >= 70 else "#F59E0B"
        rows_html += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
            <span style="font-size:13px;color:#111827;font-weight:600;">{display}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;text-align:right;">
            <span style="font-size:13px;font-weight:700;color:{bar_color};">{acc}%</span>
            <div style="background:#F3F4F6;border-radius:4px;height:6px;width:80px;
                        display:inline-block;margin-left:8px;vertical-align:middle;">
              <div style="background:{bar_color};height:6px;border-radius:4px;
                          width:{acc}%;"></div>
            </div>
          </td>
        </tr>"""

    for slug, display in skipped:
        rows_html += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
            <span style="font-size:13px;color:#9CA3AF;font-weight:600;">
              ⏭ {display}
            </span>
            <span style="font-size:11px;color:#9CA3AF;margin-left:6px;">skipped</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;text-align:right;">
            <span style="font-size:11px;color:#9CA3AF;">—</span>
          </td>
        </tr>"""

    status_label = "Session Complete ✅" if status == "completed" else "Session Ended Early ⏸"
    header_color = "#7C6FCD" if status == "completed" else "#6458B4"

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:20px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:{header_color};padding:32px 36px;">
            <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.75);
                      font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
              {date_str} · {day_name}
            </p>
            <h1 style="margin:0 0 4px;font-size:28px;font-weight:800;color:#fff;">
              {status_label}
            </h1>
            <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.85);">
              Great work, {name}!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr>
                <td align="center" style="background:rgba(255,255,255,0.15);
                    border-radius:12px;padding:12px 8px;">
                  <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">{avg_acc}%</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.7);
                             text-transform:uppercase;letter-spacing:0.06em;">Accuracy</p>
                </td>
                <td width="12"></td>
                <td align="center" style="background:rgba(255,255,255,0.15);
                    border-radius:12px;padding:12px 8px;">
                  <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">{dur_label}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.7);
                             text-transform:uppercase;letter-spacing:0.06em;">Duration</p>
                </td>
                <td width="12"></td>
                <td align="center" style="background:rgba(255,255,255,0.15);
                    border-radius:12px;padding:12px 8px;">
                  <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">{streak}🔥</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.7);
                             text-transform:uppercase;letter-spacing:0.06em;">Day Streak</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px;">
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.1em;
                      text-transform:uppercase;color:#9CA3AF;">Pose Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              {rows_html}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 32px;border-top:1px solid #F3F4F6;">
           <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;">
def _send_via_resend(to: str, subject: str, html_body: str, from_email: str):
    """
    Send via Resend HTTP API (works on Render free tier).
    Returns (True, None) on success, (False, reason) on failure.
    """
    try:
        import resend as _resend
        _resend.api_key = RESEND_API_KEY
        resp = _resend.Emails.send({
            "from":    from_email,
            "to":      [to],
            "subject": subject,
            "html":    html_body,
        })
        # Resend returns {"id": "..."} on success
        if getattr(resp, "id", None) or (isinstance(resp, dict) and resp.get("id")):
            log.info("[Resend] Email sent to %s (id=%s)", to, getattr(resp, 'id', resp.get('id')))
            return True, None
        reason = f"Resend returned unexpected response: {resp}"
        log.error(reason)
        return False, reason
    except Exception as e:
        reason = f"Resend error: {e}"
        log.error("[Resend] Failed for %s: %s", to, reason)
        return False, reason


def _send_via_smtp(to: str, subject: str, html_body: str):
    """
    Send via SMTP (works locally, blocked on Render free tier).
    Returns (True, None) on success, (False, reason) on failure.
    """
    if not SMTP_USER or not SMTP_PASS:
        return False, "SMTP_USER/SMTP_PASS not configured."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"]      = to
    msg.attach(MIMEText(html_body, "html"))
    try:
        if SMTP_PORT == 465:
            import ssl as _ssl
            ctx = _ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10, context=ctx) as s:
                s.login(SMTP_USER, SMTP_PASS)
                s.sendmail(SMTP_USER, to, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
                s.ehlo(); s.starttls(); s.ehlo()
                s.login(SMTP_USER, SMTP_PASS)
                s.sendmail(SMTP_USER, to, msg.as_string())
        log.info("[SMTP] Email sent to %s", to)
        return True, None
    except smtplib.SMTPAuthenticationError:
        return False, "SMTP auth failed — use a Gmail App Password, not your regular password."
    except (TimeoutError, smtplib.SMTPConnectError, OSError) as e:
        return False, f"SMTP connection failed: {e} (port {SMTP_PORT} may be blocked by your host)"
    except Exception as e:
        return False, f"SMTP error: {e}"


def _send_email_sync(to: str, subject: str, html_body: str):
    """
    Send an HTML email.
    Strategy: Resend (HTTP API) first — works on Render.
              Falls back to SMTP if RESEND_API_KEY is not set (local dev).
    Returns (True, None) | (False, reason_string).
    """
    if RESEND_API_KEY:
        from_addr = RESEND_FROM_EMAIL or f"PosePerfect <onboarding@resend.dev>"
        return _send_via_resend(to, subject, html_body, from_addr)

    # Fallback: SMTP (local dev only — Render blocks port 587)
    log.warning(
        "RESEND_API_KEY not set — falling back to SMTP. "
        "On Render, set RESEND_API_KEY to send emails (SMTP port 587 is blocked)."
    )
    return _send_via_smtp(to, subject, html_body)


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Synchronous wrapper — returns True/False (discards reason)."""
    ok, _ = _send_email_sync(to, subject, html_body)
    return ok


async def send_email_async(to: str, subject: str, html_body: str):
    """Async wrapper — returns (success, reason). Runs in a thread."""
    import asyncio




async def send_session_email(to: str, data: dict):
    name    = data.get("userName", "Yogi")
    status  = data.get("status", "completed")
    subject = (
        f"🧘 {name}, your session scorecard is ready!"
        if status == "completed"
        else f"⏸ {name}, your PosePerfect session was paused"
    )
    return await send_email_async(to, subject, _scorecard_html(data))


async def send_skip_reminder_email(to: str, name: str, data: dict) -> bool:
    import random
    msg_template = random.choice(SKIP_MESSAGES)
    msg = msg_template.format(
        name=name,
        asana_count=data.get("asanaCount", 3),
        duration=data.get("estimatedMinutes", 10),
    )

    html = f"""
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F9FAFB;padding:40px 20px;">
  <table width="520" align="center" style="background:#fff;border-radius:20px;
         overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:#7C6FCD;padding:32px 36px;text-align:center;">
        <p style="font-size:48px;margin:0;">🧘</p>
        <h2 style="color:#fff;margin:12px 0 4px;font-size:22px;">Your mat is waiting, {name}!</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 36px;">
        <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 24px;">{msg}</p>
        <a href="https://poseperfect.app/schedule"
           style="display:inline-block;background:#7C6FCD;color:#fff;padding:14px 28px;
                  border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
          Open My Schedule →
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 36px 28px;border-top:1px solid #F3F4F6;">
        <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
          PosePerfect · <a href="#" style="color:#7C6FCD;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body></html>"""

    return await send_email_async(to, f"🧘 {name}, don't break your streak today!", html)


# ── Admin custom message ──────────────────────────────────────────────────────
async def send_admin_email(to: str, name: str, subject: str, message: str) -> bool:
    """Send a free-form admin message via email (non-blocking via thread pool)."""
    html = f"""
<!DOCTYPE html><html>
<body style="font-family:Arial,sans-serif;background:#F9FAFB;padding:40px 20px;">
  <table width="520" align="center" style="background:#fff;border-radius:20px;
         overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:#7C6FCD;padding:28px 36px;">
        <h2 style="color:#fff;margin:0;font-size:22px;">PosePerfect</h2>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">
          A message for you, {name}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 36px;">
        <p style="font-size:15px;color:#374151;line-height:1.8;white-space:pre-wrap;margin:0;">
{message}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 36px 28px;border-top:1px solid #F3F4F6;">
        <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
          PosePerfect · <a href="https://poseperfect.app" style="color:#7C6FCD;">Open App</a>
        </p>
      </td>
    </tr>
  </table>
</body></html>"""
    return await send_email_async(to, subject, html)


async def send_admin_telegram(chat_id: str, name: str, message: str) -> bool:
    """Send a free-form admin message via Telegram."""
    text = f"📢 <b>Message from PosePerfect</b>\n\nHi <b>{name}</b>!\n\n{message}"
    return await send_telegram(chat_id, text)


# ── Telegram ──────────────────────────────────────────────────────────────────
async def send_telegram(chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
    """Send a Telegram message. Returns True on success."""
    # Guard: empty string is falsy in Python but some callers may pass ""
    if not chat_id or not chat_id.strip():
        log.warning("Telegram skipped — chat_id is empty or None.")
        return False

    # Lazily resolve the token so we always get the live env var value
    token = os.getenv("TELEGRAM_BOT_TOKEN", "") or TELEGRAM_BOT_TOKEN
    if not token:
        log.warning(
            "Telegram NOT sent to chat_id=%s — TELEGRAM_BOT_TOKEN is not set. "
            "Create a bot via @BotFather and add the token to your environment variables.",
            chat_id,
        )
        return False

    api_url = f"https://api.telegram.org/bot{token}/sendMessage"

    try:
        import asyncio
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                api_url,
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )

            if r.status_code == 200:
                log.info("Telegram sent to chat_id=%s", chat_id)
                return True

            # Rate limited — wait and retry once
            if r.status_code == 429:
                retry_after = r.json().get("parameters", {}).get("retry_after", 2)
                log.warning("Telegram rate-limited (429) — retrying after %ds", retry_after)
                await asyncio.sleep(retry_after)
                r2 = await client.post(
                    api_url,
                    json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
                )
                if r2.status_code == 200:
                    log.info("Telegram sent to chat_id=%s (after retry)", chat_id)
                    return True
                log.error("Telegram retry failed %d: %s", r2.status_code, r2.text[:200])
                return False

            # 400 usually means bad parse_mode HTML — fall back to plain text
            if r.status_code == 400:
                log.warning(
                    "Telegram 400 for chat_id=%s (likely HTML parse error) — "
                    "retrying as plain text. Error: %s",
                    chat_id, r.text[:200],
                )
                import re as _re
                plain = _re.sub(r"<[^>]+>", "", text)   # strip HTML tags
                r3 = await client.post(
                    api_url,
                    json={"chat_id": chat_id, "text": plain},  # no parse_mode
                )
                if r3.status_code == 200:
                    log.info("Telegram plain-text fallback sent to chat_id=%s", chat_id)
                    return True
                log.error("Telegram plain fallback failed %d: %s", r3.status_code, r3.text[:200])
                return False

            log.error(
                "Telegram error %d for chat_id=%s: %s\n"
                "Common causes: (1) user hasn't sent /start to the bot, "
                "(2) bot token is wrong, (3) chat_id is wrong.",
                r.status_code, chat_id, r.text[:300],
            )
            return False

    except httpx.TimeoutException:
        log.error("Telegram request timed out for chat_id=%s", chat_id)
        return False
    except Exception as e:
        log.error("Telegram unexpected error for chat_id=%s: %s", chat_id, e)
        return False


def _session_telegram_text(data: dict) -> str:
    name       = data.get("userName", "Yogi")
    completed  = data.get("completedAsanas", [])
    skipped    = data.get("skippedAsanas",   [])
    avg_acc    = data.get("avgAccuracy",     0)
    duration   = data.get("durationSec",     0)
    streak     = data.get("streak",          0)
    status     = data.get("status",          "completed")
    accuracies = data.get("accuracies",      {})

    mins = duration // 60
    secs = duration % 60
    dur  = f"{mins}m {secs}s" if secs else f"{mins}m"

    header = "✅ <b>Session Complete!</b>" if status == "completed" else "⏸ <b>Session Paused</b>"

    lines = [
        header, "",
        f"👤 <b>{name}</b>",
        f"📊 Avg Accuracy: <b>{avg_acc}%</b>",
        f"⏱ Duration: <b>{dur}</b>",
        f"🔥 Streak: <b>{streak} days</b>",
        "", "<b>Pose Breakdown:</b>",
    ]

    for slug, display in completed:
        acc = accuracies.get(slug, 0)
        bar = "🟢" if acc >= 90 else "🟡" if acc >= 70 else "🔴"
        lines.append(f"  {bar} {display}: {acc}%")

    for slug, display in skipped:
        lines.append(f"  ⏭ {display}: <i>skipped</i>")

    lines += ["", "Keep practising! 🙏 <a href=\"https://poseperfect.app\">Open App</a>"]
    return "\n".join(lines)


def _skip_telegram_text(name: str, data: dict) -> str:
    import random
    msg_template = random.choice(SKIP_MESSAGES)
    msg = msg_template.format(
        name=name,
        asana_count=data.get("asanaCount", 3),
        duration=data.get("estimatedMinutes", 10),
    )
    return f"{msg}\n\n<a href=\"https://poseperfect.app/schedule\">📅 Open Schedule</a>"


async def send_session_telegram(chat_id: str, data: dict) -> bool:
    return await send_telegram(chat_id, _session_telegram_text(data))


async def send_skip_reminder_telegram(chat_id: str, name: str, data: dict) -> bool:
    return await send_telegram(chat_id, _skip_telegram_text(name, data))
