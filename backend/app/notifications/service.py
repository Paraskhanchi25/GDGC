import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def build_email_bodies(title: str, message: str, recipient_name: str = "Student") -> tuple[str, str]:
    """Return (plain_text, html) email templates."""
    plain = (
        f"Hi {recipient_name},\n\n"
        f"{title}\n"
        f"{'-' * len(title)}\n"
        f"{message}\n\n"
        "View details in your PULSE dashboard.\n"
        "— PULSE Student Financial Intelligence"
    )
    html = f"""<!DOCTYPE html>
<html>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #F5F2EC; color: #292724; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #FCFBF8; border: 1px solid #D9D4CB; border-radius: 10px; padding: 24px;">
    <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #82776C; margin: 0 0 8px;">PULSE Financial Intelligence</p>
    <h2 style="font-size: 20px; color: #443A33; margin: 0 0 12px;">{title}</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #292724; margin: 0 0 20px;">{message}</p>
    <hr style="border: none; border-top: 1px solid #D9D4CB; margin: 20px 0;" />
    <p style="font-size: 12px; color: #82776C; margin: 0;">You received this because email notifications are enabled in your PULSE preferences.</p>
  </div>
</body>
</html>"""
    return plain, html


def send_smtp_notification(to_email: str, title: str, message: str, recipient_name: str = "Student") -> dict:
    """
    Send an email notification via configured SMTP server.
    Never raises on delivery failure so financial operations are never blocked.
    """
    settings = get_settings()
    if not settings.SMTP_HOST.strip() or not to_email.strip():
        return {"sent": False, "reason": "SMTP not configured"}

    plain, html = build_email_bodies(title, message, recipient_name)
    msg = EmailMessage()
    msg["Subject"] = f"PULSE: {title}"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Sent SMTP notification '%s' to %s", title, to_email)
        return {"sent": True}
    except Exception as exc:
        logger.warning("SMTP delivery failed (%s): %s", type(exc).__name__, title)
        return {"sent": False, "reason": type(exc).__name__}
