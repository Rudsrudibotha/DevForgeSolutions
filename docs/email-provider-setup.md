# Email provider setup

The application supports three transactional email providers through `NotificationService`:

- `resend`
- `postmark`
- `azure`

## Recommended provider for this app: Resend

Use Resend for the first production email setup because it has the simplest API-key configuration and the current code already supports it through `EMAIL_PROVIDER=resend`.

Required Azure App Service settings:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM=Kinder Care Hub <no-reply@your-verified-domain>
EMAIL_REPLY_TO=support@your-verified-domain
```

Operational requirements:

1. Verify the sending domain in Resend.
2. Add the DNS records Resend provides for SPF/DKIM/DMARC.
3. Use a sender address on that verified domain for `EMAIL_FROM`.
4. Test from the DevForge email status/test screen after the settings are saved.

## Alternative: Postmark

Postmark is a strong transactional-email option if deliverability and message activity tooling matter more than setup speed.

Required Azure App Service settings:

```text
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=<postmark-server-token>
POSTMARK_MESSAGE_STREAM=outbound
EMAIL_FROM=Kinder Care Hub <no-reply@your-verified-domain>
EMAIL_REPLY_TO=support@your-verified-domain
```

## Alternative: Azure Communication Services Email

Azure Communication Services Email keeps email inside Azure, but it requires a configured Email Communication resource, a connected Communication Services resource, and a usable verified sender domain.

Required Azure App Service settings:

```text
EMAIL_PROVIDER=azure
AZURE_COMMUNICATION_CONNECTION_STRING=<azure-communication-services-connection-string>
EMAIL_FROM=Kinder Care Hub <no-reply@your-verified-domain>
EMAIL_REPLY_TO=support@your-verified-domain
EMAIL_AZURE_WAIT_FOR_RESULT=true
```

## Current production status

If none of the provider-specific settings are present, the app logs the email instead of sending it and returns:

```json
{ "sent": false, "reason": "Email not configured" }
```

