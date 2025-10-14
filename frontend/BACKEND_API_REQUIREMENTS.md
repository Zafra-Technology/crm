# Backend API Requirements for Digital Marketing Client Onboarding

## Overview
The digital marketing dashboard requires two new backend API endpoints to support automatic client onboarding with password generation and email sending.

## Required API Endpoints

### 1. Client Onboarding Endpoint
**POST** `/api/auth/onboard-client`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "company": "Acme Corp"
}
```

**Response:**
```json
{
  "user": {
    "id": 123,
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "company_name": "Acme Corp",
    "role": "client",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "password": "Abc123Xy",
  "message": "Client onboarded successfully"
}
```

**Backend Implementation Requirements:**
- Generate a random 8-character password (letters and numbers)
- Create user account with role='client'
- Return the generated password in response
- Validate email uniqueness

### 2. Send Client Credentials Endpoint
**POST** `/api/auth/send-client-credentials`

**Request Body:**
```json
{
  "client_id": 123,
  "client_email": "john@example.com",
  "client_name": "John Doe", 
  "company_name": "Acme Corp",
  "password": "Abc123Xy"
}
```

**Response:**
```json
{
  "message": "Credentials sent successfully",
  "success": true
}
```

**Backend Implementation Requirements:**
- Send email using predefined template
- Use the following email template:

**Subject:** Welcome to [Your Company Name] — Your Client Account Details

**Body:**
```
Hello **{{client_name}}**,
Welcome to **[Your Company Name]**! Your client account has been successfully created by our Digital Marketing Team.

Here are your login credentials:

* **Company Name:** {{company_name}}
* **Email ID:** {{client_email}}
* **Password:** {{generated_password}}

You can log in to your dashboard here: [{{login_url}}]

Please change your password after your first login for security purposes.

If you need any help, contact us at **[[support@yourcompany.com](mailto:support@yourcompany.com)]**.

Best regards,
**The [Your Company Name] Team**
```

**Template Variables to Replace:**
- `{{client_name}}` - Client's full name
- `{{company_name}}` - Client's company name  
- `{{client_email}}` - Client's email address
- `{{generated_password}}` - Auto-generated password
- `{{login_url}}` - Login page URL (e.g., https://yourdomain.com)

## Email Configuration
- Configure SMTP settings for sending emails
- Use company branding in email template
- Ensure email delivery reliability
- Handle email sending errors gracefully

## Security Considerations
- Log all client onboarding activities
- Implement rate limiting for email sending
- Validate all input parameters
- Use secure password generation
- Consider email template injection prevention
