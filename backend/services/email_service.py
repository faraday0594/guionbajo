import asyncio
import logging
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from config import settings

logger = logging.getLogger(__name__)


def _send_email_sync(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """
    Envía un correo electrónico de forma sincrónica usando smtplib y TLS.
    Si las credenciales SMTP no están configuradas en .env, omite el envío de forma segura.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(
            f"[EmailService] Notificación omitida (credenciales SMTP no configuradas en .env). "
            f"Destinatario: {to_email} | Asunto: {subject}"
        )
        return False

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email

        # Versión de texto plano como respaldo
        fallback_text = text_body if text_body else subject
        msg.set_content(fallback_text)

        # Versión HTML enriquecida
        if html_body:
            msg.add_alternative(html_body, subtype="html")

        # Conexión SMTP con STARTTLS
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"[EmailService] Correo enviado exitosamente a {to_email} | Asunto: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EmailService] Error al enviar correo a {to_email}: {e}", exc_info=True)
        return False


async def send_email_async(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """
    Wrapper asíncrono para enviar correo sin bloquear el event loop de FastAPI.
    """
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_body, text_body)


def _render_base_email_template(title: str, badge_text: str, badge_color: str, content_html: str) -> str:
    """
    Plantilla HTML estilizada y moderna para notificaciones de Tutor AI.
    """
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #09090b;
                color: #f4f4f5;
                margin: 0;
                padding: 24px;
            }}
            .container {{
                max-width: 560px;
                margin: 0 auto;
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 16px;
                padding: 32px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
            }}
            .header {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                border-bottom: 1px solid #27272a;
                padding-bottom: 16px;
            }}
            .logo {{
                font-size: 20px;
                font-weight: 800;
                letter-spacing: -0.025em;
                color: #ffffff;
            }}
            .logo span {{
                color: #10b981;
            }}
            .badge {{
                display: inline-block;
                padding: 4px 12px;
                border-radius: 9999px;
                font-size: 12px;
                font-weight: 600;
                background-color: {badge_color};
                color: #ffffff;
            }}
            .title {{
                font-size: 22px;
                font-weight: 700;
                color: #ffffff;
                margin: 0 0 16px 0;
            }}
            .card {{
                background-color: #09090b;
                border: 1px solid #27272a;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
            }}
            .item {{
                display: flex;
                margin-bottom: 10px;
                font-size: 14px;
                line-height: 1.5;
            }}
            .item:last-child {{
                margin-bottom: 0;
            }}
            .label {{
                font-weight: 600;
                color: #a1a1aa;
                width: 140px;
                flex-shrink: 0;
            }}
            .value {{
                color: #ffffff;
                word-break: break-all;
            }}
            .footer {{
                margin-top: 24px;
                font-size: 12px;
                color: #71717a;
                text-align: center;
                border-top: 1px solid #27272a;
                padding-top: 16px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Tutor<span>AI</span></div>
                <div class="badge">{badge_text}</div>
            </div>
            <h1 class="title">{title}</h1>
            {content_html}
            <div class="footer">
                Notificación automática enviada a {settings.NOTIFICATION_EMAIL}.<br>
                Tutor AI &copy; {datetime.now(timezone.utc).year} - Sistema de Aprendizaje Inteligente
            </div>
        </div>
    </body>
    </html>
    """


async def notify_new_registration(
    user_name: str,
    user_email: str,
    native_language: str = "es",
    user_id: str = ""
) -> bool:
    """
    Notifica al administrador cuando un nuevo usuario se registra.
    """
    now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S UTC")
    subject = f"🎉 [Tutor AI] Nuevo usuario registrado: {user_name} ({user_email})"
    
    content_html = f"""
        <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 16px 0;">
            Un nuevo estudiante acaba de crear una cuenta en la plataforma:
        </p>
        <div class="card">
            <div class="item">
                <span class="label">👤 Nombre:</span>
                <span class="value"><strong>{user_name}</strong></span>
            </div>
            <div class="item">
                <span class="label">✉️ Correo:</span>
                <span class="value"><a href="mailto:{user_email}" style="color: #10b981; text-decoration: none;">{user_email}</a></span>
            </div>
            <div class="item">
                <span class="label">🌐 Idioma Nativo:</span>
                <span class="value">{native_language.upper()}</span>
            </div>
            <div class="item">
                <span class="label">🕒 Fecha y Hora:</span>
                <span class="value">{now_str}</span>
            </div>
            {f'<div class="item"><span class="label">🆔 ID Usuario:</span><span class="value" style="font-family: monospace; font-size: 12px; color: #a1a1aa;">{user_id}</span></div>' if user_id else ''}
        </div>
    """

    text_body = (
        f"Nuevo usuario registrado en Tutor AI:\n\n"
        f"- Nombre: {user_name}\n"
        f"- Email: {user_email}\n"
        f"- Idioma: {native_language}\n"
        f"- Fecha: {now_str}\n"
    )

    html_email = _render_base_email_template(
        title="Nuevo Usuario Registrado",
        badge_text="Nuevo Registro",
        badge_color="#10b981",
        content_html=content_html
    )

    return await send_email_async(
        to_email=settings.NOTIFICATION_EMAIL,
        subject=subject,
        html_body=html_email,
        text_body=text_body
    )


async def notify_user_login(
    user_name: str,
    user_email: str,
    ip_address: str = "Desconocida"
) -> bool:
    """
    Notifica al administrador cuando un usuario inicia sesión.
    """
    now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S UTC")
    display_name = user_name if user_name else user_email
    subject = f"🔐 [Tutor AI] Inicio de sesión: {display_name}"

    content_html = f"""
        <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 16px 0;">
            Se ha registrado un inicio de sesión en la plataforma:
        </p>
        <div class="card">
            <div class="item">
                <span class="label">👤 Usuario:</span>
                <span class="value"><strong>{display_name}</strong></span>
            </div>
            <div class="item">
                <span class="label">✉️ Correo:</span>
                <span class="value"><a href="mailto:{user_email}" style="color: #3b82f6; text-decoration: none;">{user_email}</a></span>
            </div>
            <div class="item">
                <span class="label">🌐 Dirección IP:</span>
                <span class="value" style="font-family: monospace;">{ip_address}</span>
            </div>
            <div class="item">
                <span class="label">🕒 Fecha y Hora:</span>
                <span class="value">{now_str}</span>
            </div>
        </div>
    """

    text_body = (
        f"Inicio de sesión en Tutor AI:\n\n"
        f"- Usuario: {display_name}\n"
        f"- Email: {user_email}\n"
        f"- IP: {ip_address}\n"
        f"- Fecha: {now_str}\n"
    )

    html_email = _render_base_email_template(
        title="Inicio de Sesión Detectado",
        badge_text="Login",
        badge_color="#3b82f6",
        content_html=content_html
    )

    return await send_email_async(
        to_email=settings.NOTIFICATION_EMAIL,
        subject=subject,
        html_body=html_email,
        text_body=text_body
    )
