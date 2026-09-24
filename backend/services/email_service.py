import asyncio
import logging
import smtplib
import httpx
import os
import base64
from datetime import datetime, timezone
from email.message import EmailMessage
from config import settings

logger = logging.getLogger(__name__)


async def _send_via_resend(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str = "",
    attachments: list = None
) -> bool:
    """
    Envía un correo electrónico de forma asíncrona mediante la API REST de Resend con soporte para adjuntos.
    """
    if not settings.RESEND_API_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            payload = {
                "from": settings.RESEND_FROM_EMAIL or "Guionbajo <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            }
            if text_body:
                payload["text"] = text_body
            if attachments:
                payload["attachments"] = attachments

            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                logger.info(f"[EmailService/Resend] Correo enviado exitosamente a {to_email} | ID: {data.get('id')}")
                return True
            else:
                err_text = resp.text
                try:
                    err_json = resp.json()
                    err_text = err_json.get("message", err_text)
                except Exception:
                    pass

                if resp.status_code == 403 and "testing emails" in err_text:
                    logger.warning(
                        f"\n⚠️  [RESEND 403 FORBIDDEN] Resend con 'onboarding@resend.dev' solo permite enviar a tu propio correo ({settings.NOTIFICATION_EMAIL}).\n"
                        f"    Para enviar a otros destinatarios ({to_email}), puedes:\n"
                        f"    1) Configurar tu Gmail (SMTP_USER y SMTP_PASSWORD de 16 letras) en backend/.env (¡funciona con cualquier correo y es gratis!).\n"
                        f"    2) O verificar un dominio web propio en https://resend.com/domains.\n"
                    )
                else:
                    logger.warning(f"[EmailService/Resend] Error HTTP {resp.status_code} al enviar a {to_email}: {err_text}")
                return False
    except Exception as e:
        logger.error(f"[EmailService/Resend] Excepción al enviar correo a {to_email}: {e}")
        return False


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


async def send_email_async(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str = "",
    attachments: list = None
) -> bool:
    """
    Envía correo usando Resend y Gmail SMTP como respaldo automático inteligente.
    Si el destinatario es diferente a NOTIFICATION_EMAIL y el remitente de Resend es el de prueba (onboarding@resend.dev),
    se utiliza directamente Gmail SMTP para evitar el error 403 Forbidden y garantizar entrega al 100%.
    """
    clean_to = to_email.lower().strip()
    is_notification_owner = (clean_to == settings.NOTIFICATION_EMAIL.lower().strip())
    is_resend_test_domain = "onboarding@resend.dev" in (settings.RESEND_FROM_EMAIL or "")

    # Si Resend está en dominio de prueba y el destinatario es un alumno diferente, usar directamente Gmail SMTP
    if settings.SMTP_USER and settings.SMTP_PASSWORD and not is_notification_owner and is_resend_test_domain:
        logger.info(f"[EmailService] Enviando correo a {to_email} vía Gmail SMTP...")
        sent = await asyncio.to_thread(_send_email_sync, to_email, subject, html_body, text_body)
        if sent:
            return True

    # Intentar con Resend
    if settings.RESEND_API_KEY:
        sent = await _send_via_resend(to_email, subject, html_body, text_body, attachments=attachments)
        if sent:
            return True
        logger.info("[EmailService] Resend no completó el envío; intentando vía SMTP...")

    # Fallback final a SMTP
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_body, text_body)


def _render_base_email_template(title: str, badge_text: str, badge_color: str, content_html: str) -> str:
    """
    Plantilla HTML estilizada y moderna para notificaciones de Guionbajo.
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
                color: #00d4ff;
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
                <div class="logo">Guion<span>bajo</span></div>
                <div class="badge">{badge_text}</div>
            </div>
            <h1 class="title">{title}</h1>
            {content_html}
            <div class="footer">
                Guionbajo &copy; {datetime.now(timezone.utc).year} — Tutor de Inglés con Inteligencia Artificial
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


async def send_registered_users_report(users_data: list) -> bool:
    """
    Envía un reporte por correo electrónico a megafer1994@gmail.com
    con la lista completa de usuarios registrados en la base de datos de la nube.
    """
    now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S UTC")
    count = len(users_data)
    subject = f"📊 [Tutor AI] Reporte de Usuarios Registrados en la Nube ({count} usuarios)"

    rows_html = ""
    for idx, u in enumerate(users_data, 1):
        name = u.get("name") or "Sin nombre"
        email = u.get("email") or ""
        sublevel = u.get("current_sublevel") or u.get("current_level") or "A1.1"
        xp = u.get("total_xp", 0)
        streak = u.get("streak_days", 0)
        created = u.get("created_at") or "Fecha no registrada"
        
        rows_html += f"""
        <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 12px 10px; color: #a1a1aa; text-align: center; font-weight: 600;">{idx}</td>
            <td style="padding: 12px 10px; color: #ffffff; font-weight: 700;">{name}</td>
            <td style="padding: 12px 10px;"><a href="mailto:{email}" style="color: #10b981; text-decoration: none; font-weight: 500;">{email}</a></td>
            <td style="padding: 12px 10px; color: #38bdf8; text-align: center; font-family: monospace;">{sublevel}</td>
            <td style="padding: 12px 10px; color: #fbbf24; text-align: center;">{xp} XP · 🔥 {streak}d</td>
            <td style="padding: 12px 10px; color: #71717a; font-size: 11px;">{created}</td>
        </tr>
        """

    content_html = f"""
        <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 16px 0;">
            A continuación se detalla la lista de todos los estudiantes y usuarios registrados en la plataforma:
        </p>
        <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; overflow-x: auto; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                <thead>
                    <tr style="background-color: #18181b; border-bottom: 2px solid #27272a; color: #a1a1aa;">
                        <th style="padding: 10px; text-align: center;">#</th>
                        <th style="padding: 10px;">Nombre</th>
                        <th style="padding: 10px;">Correo</th>
                        <th style="padding: 10px; text-align: center;">Nivel</th>
                        <th style="padding: 10px; text-align: center;">XP / Racha</th>
                        <th style="padding: 10px;">Fecha de Registro</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>
        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 12px; margin-top: 16px;">
            <span style="color: #a1a1aa; font-size: 13px;">
                📈 Total de estudiantes registrados: <strong style="color: #ffffff;">{count}</strong>
            </span>
        </div>
    """

    text_body = f"Reporte de usuarios registrados en Tutor AI ({count} usuarios):\n\n"
    for idx, u in enumerate(users_data, 1):
        text_body += f"{idx}. {u.get('name')} | {u.get('email')} | Nivel: {u.get('current_sublevel')} | XP: {u.get('total_xp')} | Fecha: {u.get('created_at')}\n"

    html_email = _render_base_email_template(
        title=f"Reporte de Usuarios Registrados ({count})",
        badge_text="Base de Datos",
        badge_color="#8b5cf6",
        content_html=content_html
    )

    return await send_email_async(
        to_email=settings.NOTIFICATION_EMAIL,
        subject=subject,
        html_body=html_email,
        text_body=text_body
    )


async def send_password_reset_email(to_email: str, reset_url: str, user_name: str = "") -> bool:
    """
    Despacha un correo electrónico con enlace seguro para restablecer la contraseña,
    con la identidad oficial de Guionbajo y el avatar en su versión clásica e inicial (Stage 0).
    Renderizado en HTML/CSS nativo para garantizar compatibilidad del 100% en Gmail y todos los clientes.
    """
    display_name = user_name if user_name else "Estudiante"
    subject = "Restablece tu contraseña - Guionbajo"

    # Avatar de Guionbajo Versión Inicial (Cabeza CRT, antena con bombillo de vacío, diales y ojos cian)
    avatar_html = """
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 20px auto;">
          <tr>
            <td align="center">
              <!-- Antena con Bombillo de Vacío -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <div style="width: 18px; height: 18px; border-radius: 50%; background: #00d4ff; box-shadow: 0 0 14px #00d4ff; border: 2px solid #ffffff; margin: 0 auto;"></div>
                    <div style="width: 4px; height: 16px; background: #64748b; margin: 0 auto;"></div>
                  </td>
                </tr>
              </table>

              <!-- Cabeza con Diales Laterales -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <!-- Dial Izquierdo -->
                  <td valign="middle" style="padding: 0;">
                    <div style="width: 6px; height: 26px; background: #475569; border-radius: 4px 0 0 4px; border: 1px solid #334155; border-right: none;"></div>
                  </td>

                  <!-- Chasis de Cabeza -->
                  <td valign="middle" style="padding: 0;">
                    <div style="width: 140px; height: 110px; background: #1e293b; border: 2px solid #475569; border-radius: 22px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); padding: 12px; box-sizing: border-box;">
                      <!-- Pantalla CRT Neón -->
                      <div style="width: 112px; height: 82px; background: #030712; border: 2px solid #00d4ff; border-radius: 14px; box-shadow: inset 0 0 14px rgba(0, 212, 255, 0.4), 0 0 12px rgba(0, 212, 255, 0.3); padding-top: 16px; box-sizing: border-box;">
                        <!-- Ojos Expresivos -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                          <tr>
                            <td style="padding: 0 9px;">
                              <div style="width: 15px; height: 20px; background: #00f0ff; border-radius: 5px; box-shadow: 0 0 12px #00f0ff;"></div>
                            </td>
                            <td style="padding: 0 9px;">
                              <div style="width: 15px; height: 20px; background: #00f0ff; border-radius: 5px; box-shadow: 0 0 12px #00f0ff;"></div>
                            </td>
                          </tr>
                        </table>
                        <!-- Sonrisa Amigable -->
                        <div style="width: 26px; height: 9px; border-bottom: 2.5px solid #00f0ff; border-radius: 0 0 14px 14px; margin: 8px auto 0 auto; box-shadow: 0 2px 6px rgba(0, 212, 255, 0.6);"></div>
                      </div>
                    </div>
                  </td>

                  <!-- Dial Derecho -->
                  <td valign="middle" style="padding: 0;">
                    <div style="width: 6px; height: 26px; background: #475569; border-radius: 0 4px 4px 0; border: 1px solid #334155; border-left: none;"></div>
                  </td>
                </tr>
              </table>

              <!-- Insignia -->
              <div style="margin-top: 14px;">
                <span style="display: inline-block; padding: 4px 16px; background: rgba(0, 212, 255, 0.12); border: 1px solid rgba(0, 212, 255, 0.35); border-radius: 9999px; color: #00d4ff; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                  🤖 Guionbajo • Tutor de Inglés
                </span>
              </div>
            </td>
          </tr>
        </table>
    """

    content_html = f"""
        {avatar_html}

        <p style="color: #f4f4f5; font-size: 16px; margin: 0 0 16px 0; text-align: center;">
            ¡Hola <strong>{display_name}</strong>! 👋
        </p>
        <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Guionbajo</strong>.
            Haz clic en el siguiente botón para elegir una nueva contraseña y continuar tu aprendizaje:
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #00d4ff 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 212, 255, 0.35);">
                Restablecer mi Contraseña
            </a>
        </div>
        <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p style="color: #a1a1aa; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0;">
                ⚠️ <strong>Nota de seguridad:</strong> Este enlace expirará automáticamente en <strong>30 minutos</strong> y solo puede ser utilizado una vez.
            </p>
            <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin: 0;">
                Si tú no solicitaste este cambio, puedes ignorar este correo con tranquilidad. Tu contraseña actual no se modificará.
            </p>
        </div>
        <p style="color: #71717a; font-size: 11px; margin-top: 24px; text-align: center;">
            Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
            <a href="{reset_url}" style="color: #38bdf8; word-break: break-all;">{reset_url}</a>
        </p>
    """

    text_body = (
        f"Hola {display_name},\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña en Guionbajo.\n"
        f"Para continuar, abre el siguiente enlace en tu navegador (válido por 30 minutos):\n\n"
        f"{reset_url}\n\n"
        f"Si no solicitaste este cambio, puedes ignorar este mensaje.\n"
    )

    html_email = _render_base_email_template(
        title="Restablecimiento de Contraseña",
        badge_text="Seguridad",
        badge_color="#38bdf8",
        content_html=content_html
    )

    return await send_email_async(
        to_email=to_email,
        subject=subject,
        html_body=html_email,
        text_body=text_body
    )


