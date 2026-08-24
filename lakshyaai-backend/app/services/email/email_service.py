import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("lakshyaai.email")


def get_verification_url(raw_token: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
    return f"{frontend_url}/verify-email?token={raw_token}"


def build_verification_html(full_name: str, verification_url: str) -> str:
    first_name = full_name.split()[0] if full_name else "there"
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your LakshyaAI account</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0d0f17;
      color: #e2e8f0;
      margin: 0;
      padding: 24px;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #151824;
      border: 1px solid #23283a;
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }}
    .logo-badge {{
      display: inline-block;
      background: linear-gradient(135deg, #9333ea, #3b82f6);
      color: #ffffff;
      font-weight: 800;
      font-size: 18px;
      padding: 6px 14px;
      border-radius: 10px;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
    }}
    h1 {{
      font-size: 24px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 16px 0;
    }}
    p {{
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px 0;
    }}
    .btn-container {{
      margin: 32px 0;
      text-align: center;
    }}
    .btn {{
      display: inline-block;
      background: linear-gradient(135deg, #9333ea, #3b82f6);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(147, 51, 234, 0.35);
    }}
    .raw-link {{
      background-color: #0d0f17;
      border: 1px solid #1e2436;
      border-radius: 8px;
      padding: 12px;
      word-break: break-all;
      font-size: 12px;
      color: #60a5fa;
      margin-top: 16px;
    }}
    .footer {{
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid #1e2436;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">🎯 LakshyaAI</div>
    <h1>Verify your email address</h1>
    <p>Hi {first_name},</p>
    <p>Welcome to <strong>LakshyaAI</strong>! Please verify your email address to activate your account and access your personalized career onboarding workspace.</p>
    
    <div class="btn-container">
      <a href="{verification_url}" class="btn" target="_blank">Verify Email Address</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      This link will expire in <strong>24 hours</strong>. If you did not create a LakshyaAI account, you can safely ignore this email.
    </p>

    <div class="raw-link">
      If the button above does not work, copy and paste this URL into your browser:<br>
      <a href="{verification_url}" style="color: #60a5fa; text-decoration: none;">{verification_url}</a>
    </div>

    <div class="footer">
      © {os.getenv("APP_NAME", "LakshyaAI")} • Next-Generation AI Career Intelligence Platform
    </div>
  </div>
</body>
</html>
"""


def send_verification_email(email: str, full_name: str, raw_token: str) -> bool:
    """
    Sends an email verification link.
    If SMTP credentials exist in environment, sends live email over TLS/SSL.
    Otherwise, logs the verification link to the console for frictionless development.
    """
    verification_url = get_verification_url(raw_token)

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user or "no-reply@lakshyaai.com")

    # Always log the link to console during development/testing
    print("\n" + "=" * 70)
    print(f"[EMAIL VERIFICATION LINK] For: {email}")
    print(f"URL: {verification_url}")
    print("=" * 70 + "\n")

    if not (smtp_host and smtp_user and smtp_password):
        logger.info(
            "SMTP credentials not configured. Verification email link generated locally for %s: %s",
            email,
            verification_url,
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify your LakshyaAI Account"
        msg["From"] = f"LakshyaAI <{from_email}>"
        msg["To"] = email

        plain_text = f"Hi {full_name},\n\nPlease verify your LakshyaAI email address by visiting this URL:\n{verification_url}\n\nThis link expires in 24 hours."
        html_content = build_verification_html(full_name, verification_url)

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.starttls()

        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, [email], msg.as_string())
        server.quit()

        logger.info("Successfully sent verification email to %s", email)
        return True
    except Exception as exc:
        logger.error("Failed to send verification email to %s via SMTP: %s", email, exc)
        return False
