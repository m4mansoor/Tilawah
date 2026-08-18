"""Email sending: uses SMTP when configured, otherwise logs to console (dev)."""
from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText

from .config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        logger.info("DEV EMAIL | to=%s | subject=%s | %s", to, subject, body)
        return

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
