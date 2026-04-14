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
SMTP_HOST      = os.getenv("SMTP_HOST",      "smtp.gmail.com")
SMTP_PORT      = int(os.getenv("SMTP_PORT",  "587"))
SMTP_USER      = os.getenv("SMTP_USER",      "")
SMTP_PASS      = os.getenv("SMTP_PASS",      "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "PosePerfect")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_API       = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

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
              Keep practising · <a href="https://poseperfect.app"
              style="color:#7C6FCD;text-decoration:none;">PosePerfect</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Email ─────────────────────────────────────────────────────────────────────
def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send an HTML email. Returns True on success, False on failure."""
    if not SMTP_USER or not SMTP_PASS:
        log.warning(
            "Email NOT sent to %s — SMTP_USER/SMTP_PASS are not set in .env. "
            "Add your Gmail credentials to backend/.env to enable email notifications.",
            to,
        )
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
        msg["To"]      = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to, msg.as_string())

        log.info("Email sent to %s — subject: %s", to, subject)
        return True
    except smtplib.SMTPAuthenticationError:
        log.error(
            "Email SMTP authentication failed for %s — "
            "check that SMTP_PASS is a Gmail App Password, not your regular password. "
            "Generate one at: Google Account → Security → 2-Step Verification → App passwords",
            to,
        )
        return False
    except smtplib.SMTPException as e:
        log.error("Email SMTP error for %s: %s", to, e)
        return False
    except Exception as e:
        log.error("Email unexpected error for %s: %s", to, e)
        return False


def send_session_email(to: str, data: dict) -> bool:
    name    = data.get("userName", "Yogi")
    status  = data.get("status", "completed")
    subject = (
        f"🧘 {name}, your session scorecard is ready!"
        if status == "completed"
        else f"⏸ {name}, your PosePerfect session was paused"
    )
    return send_email(to, subject, _scorecard_html(data))


def send_skip_reminder_email(to: str, name: str, data: dict) -> bool:
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

    return send_email(to, f"🧘 {name}, don't break your streak today!", html)


# ── Admin custom message ──────────────────────────────────────────────────────
def send_admin_email(to: str, name: str, subject: str, message: str) -> bool:
    """Send a free-form admin message via email."""
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
    return send_email(to, subject, html)


async def send_admin_telegram(chat_id: str, name: str, message: str) -> bool:
    """Send a free-form admin message via Telegram."""
    text = f"📢 <b>Message from PosePerfect</b>\n\nHi <b>{name}</b>!\n\n{message}"
    return await send_telegram(chat_id, text)


# ── Telegram ──────────────────────────────────────────────────────────────────
async def send_telegram(chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
    """Send a Telegram message. Returns True on success."""
    if not TELEGRAM_BOT_TOKEN:
        log.warning(
            "Telegram NOT sent to chat_id=%s — TELEGRAM_BOT_TOKEN is not set in .env. "
            "Create a bot via @BotFather on Telegram and add the token to backend/.env.",
            chat_id,
        )
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
                timeout=10,
            )
            if r.status_code == 200:
                log.info("Telegram message sent to chat_id=%s", chat_id)
                return True
            log.error(
                "Telegram error %d for chat_id=%s: %s — "
                "Make sure the user has started a conversation with the bot first.",
                r.status_code, chat_id, r.text,
            )
            return False
    except Exception as e:
        log.error("Telegram failed for chat_id=%s: %s", chat_id, e)
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

    lines += ["", "Keep practising! 🙏 <a href='https://poseperfect.app'>Open App</a>"]
    return "\n".join(lines)


def _skip_telegram_text(name: str, data: dict) -> str:
    import random
    msg_template = random.choice(SKIP_MESSAGES)
    msg = msg_template.format(
        name=name,
        asana_count=data.get("asanaCount", 3),
        duration=data.get("estimatedMinutes", 10),
    )
    return f"{msg}\n\n<a href='https://poseperfect.app/schedule'>📅 Open Schedule</a>"


async def send_session_telegram(chat_id: str, data: dict) -> bool:
    return await send_telegram(chat_id, _session_telegram_text(data))


async def send_skip_reminder_telegram(chat_id: str, name: str, data: dict) -> bool:
    return await send_telegram(chat_id, _skip_telegram_text(name, data))
