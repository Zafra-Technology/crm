# Email Configuration for Client Onboarding

## Django Settings Configuration

Add the following settings to your Django `settings.py` file to enable email functionality for client onboarding:

```python
# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # or your SMTP server
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'  # Your email address
EMAIL_HOST_PASSWORD = 'your-app-password'  # Your app password (not regular password)
DEFAULT_FROM_EMAIL = 'your-email@gmail.com'

# Company Information for Email Templates
COMPANY_NAME = 'RVR Engineering'
SUPPORT_EMAIL = 'support@rvrengineering.com'
LOGIN_URL = 'https://yourdomain.com'  # Your frontend login URL
```

## Gmail Setup (if using Gmail)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password in `EMAIL_HOST_PASSWORD`

## Alternative Email Providers

### SendGrid
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = 'your-sendgrid-api-key'
```

### AWS SES
```python
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_SES_REGION_NAME = 'us-east-1'
AWS_SES_REGION_ENDPOINT = 'email.us-east-1.amazonaws.com'
AWS_ACCESS_KEY_ID = 'your-access-key'
AWS_SECRET_ACCESS_KEY = 'your-secret-key'
```

## Testing Email Configuration

You can test the email configuration by running:

```python
from django.core.mail import send_mail
from django.conf import settings

send_mail(
    'Test Subject',
    'Test message',
    settings.DEFAULT_FROM_EMAIL,
    ['test@example.com'],
    fail_silently=False,
)
```

## Security Considerations

1. **Never commit email credentials to version control**
2. **Use environment variables for sensitive data**:
   ```python
   import os
   
   EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
   EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
   ```

3. **Use .env file for local development**:
   ```bash
   # .env
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   ```

## Email Template Customization

The email template is defined in `backend/accounts/api.py` in the `send_client_credentials` function. You can customize:

- Company name: `COMPANY_NAME` setting
- Support email: `SUPPORT_EMAIL` setting  
- Login URL: `LOGIN_URL` setting
- Email subject and body format

## Troubleshooting

### Common Issues:

1. **"SMTPAuthenticationError"**: Check your email credentials and app password
2. **"Connection refused"**: Check your network and SMTP server settings
3. **"Timeout"**: Increase EMAIL_TIMEOUT setting
4. **"SSL/TLS errors"**: Verify EMAIL_USE_TLS and EMAIL_USE_SSL settings

### Debug Mode:
```python
# Add to settings.py for debugging
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Prints to console
# or
EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = '/tmp/app-messages'  # Saves to file
```
