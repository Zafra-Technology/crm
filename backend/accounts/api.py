from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.shortcuts import get_object_or_404
from ninja import Router, Query, File
from ninja.files import UploadedFile
from ninja.errors import HttpError
from ninja.security import HttpBearer
from typing import List
import jwt
from django.conf import settings
from datetime import datetime, timedelta
from django.db import models

from .models import StaffUserAuth, ROLE_CHOICES
from .serializers import (
    UserCreateSchema, UserUpdateSchema, UserResponseSchema,
    LoginSchema, LoginResponseSchema, PasswordChangeSchema, AdminSetPasswordSchema,
    MessageResponseSchema, RoleChoicesSchema, EmailSendSchema,
    ClientOnboardingSchema, SendCredentialsSchema
)

router = Router()


class AuthBearer(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            user = StaffUserAuth.objects.get(id=user_id)
            return user
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, StaffUserAuth.DoesNotExist) as e:
            return None


auth = AuthBearer()


def create_jwt_token(user):
    """Create JWT token for user"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def _normalize_user_payload(data):
    """Normalize incoming user payload for nullable/choice fields and omit empty aadhar."""
    cleaned = data.copy()
    # Coerce empty strings to None for standard nullable fields
    nullable_fields = {'aadhar_number', 'pan_number', 'date_of_birth', 'date_of_joining', 'date_of_exit', 'profile_pic'}
    for field in nullable_fields:
        if field in cleaned and cleaned[field] == "":
            cleaned[field] = None

    # Omit aadhar_number if None/empty to avoid writing null into DB
    if 'aadhar_number' in cleaned and (cleaned['aadhar_number'] is None or cleaned['aadhar_number'] == ""):
        cleaned.pop('aadhar_number', None)
    # Omit pan_number if None/empty to avoid writing null into DB
    if 'pan_number' in cleaned and (cleaned['pan_number'] is None or cleaned['pan_number'] == ""):
        cleaned.pop('pan_number', None)

    # Remove keys that are None or empty strings entirely to avoid null writes
    cleaned = {k: v for k, v in cleaned.items() if v is not None and v != ""}
    
    # Validate role choice, fallback to default client
    allowed_roles = {choice[0] for choice in ROLE_CHOICES.choices}
    role = cleaned.get('role')
    if role is None or role not in allowed_roles:
        cleaned['role'] = ROLE_CHOICES.CLIENT

    return cleaned


def _create_user_safe(user_data, password):
    """Safely create user with proper error handling"""
    try:
        
        # Ensure required fields have defaults
        defaults = {
            'first_name': user_data.get('first_name', ''),
            'last_name': user_data.get('last_name', ''),
            'mobile_number': user_data.get('mobile_number', ''),
            'company_name': user_data.get('company_name', ''),
            'role': user_data.get('role'),
            'address': user_data.get('address', ''),
            'city': user_data.get('city', ''),
            'state': user_data.get('state', ''),
            'country': user_data.get('country', ''),
            'pincode': user_data.get('pincode', ''),
        }
        
        # Merge with provided data
        final_data = {**defaults, **user_data}
        
        # Validate role
        if not final_data.get('role'):
            raise ValueError("Role is required for user creation")
        
        new_user = StaffUserAuth.objects.create_user(
            password=password,
            **final_data
        )
        return new_user
        
    except Exception as e:
        raise


## Note: Duplicate definition removed above and consolidated


@router.post("/login", response=LoginResponseSchema)
def login(request, data: LoginSchema):
    """User login endpoint"""
    try:
        user = StaffUserAuth.objects.get(email=data.email)
        if user.check_password(data.password) and user.is_active:
            token = create_jwt_token(user)
            return LoginResponseSchema(
                user=UserResponseSchema.from_orm(user),
                token=token,
                message="Login successful"
            )
        else:
            raise HttpError(401, "Invalid credentials")
    except StaffUserAuth.DoesNotExist:
        raise HttpError(404, "User not found")


@router.post("/register", response=UserResponseSchema)
def register(request, data: UserCreateSchema):
    """User registration endpoint"""
    try:
        # Check if user already exists
        if StaffUserAuth.objects.filter(email=data.email).exists():
            raise HttpError(400, "User with this email already exists")
        
        # Create user
        user_data = _normalize_user_payload(data.dict())
        password = user_data.pop('password')
        
        user = StaffUserAuth.objects.create_user(
            password=password,
            **user_data
        )
        
        return UserResponseSchema.from_orm(user)
    except Exception as e:
        raise HttpError(400, str(e))


@router.get("/me", response=UserResponseSchema, auth=auth)
def get_current_user(request):
    """Get current user information"""
    return UserResponseSchema.from_orm(request.auth)


@router.put("/me", response=UserResponseSchema, auth=auth)
def update_current_user(request, data: UserUpdateSchema):
    """Update current user information"""
    user = request.auth
    
    for field, value in data.dict(exclude_unset=True).items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    user.save()
    return UserResponseSchema.from_orm(user)


@router.post("/change-password", response=MessageResponseSchema, auth=auth)
def change_password(request, data: PasswordChangeSchema):
    """Change user password"""
    user = request.auth
    
    if not user.check_password(data.old_password):
        raise HttpError(400, "Invalid old password")
    
    user.set_password(data.new_password)
    user.save()
    
    return MessageResponseSchema(message="Password changed successfully")


@router.get("/users", response=List[UserResponseSchema], auth=auth)
def list_users(request):
    """List users (admin and project manager access)"""
    try:
        user = request.auth
        
        # Get query parameters manually from request
        role = request.GET.get('role', None)
        search = request.GET.get('search', None)
        
        
        # Check permissions
        if not (user.is_admin() or user.is_project_manager() or user.is_superuser or user.role == ROLE_CHOICES.DIGITAL_MARKETING):
            raise HttpError(403, "Permission denied")
        
        queryset = StaffUserAuth.objects.all()
        
        # Filter by role if provided
        if role and role.strip():
            queryset = queryset.filter(role=role)
        
        # Search functionality
        if search and search.strip():
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(company_name__icontains=search)
            )
        
        # Project managers should see designers, admins, and optionally clients
        if user.is_project_manager() and not user.is_superuser:
            queryset = queryset.filter(role__in=[
                ROLE_CHOICES.DESIGNER,
                ROLE_CHOICES.SENIOR_DESIGNER,
                ROLE_CHOICES.AUTO_CAD_DRAFTER,
                ROLE_CHOICES.ADMIN,
                ROLE_CHOICES.ASSISTANT_PROJECT_MANAGER,
                ROLE_CHOICES.PROJECT_MANAGER,
                ROLE_CHOICES.CLIENT
            ])

        # Digital marketing users can only view clients
        if user.role == ROLE_CHOICES.DIGITAL_MARKETING and not user.is_superuser and not user.is_admin():
            queryset = queryset.filter(role=ROLE_CHOICES.CLIENT)
        
        users_list = list(queryset)
        
        result = [UserResponseSchema.from_orm(u) for u in users_list]
        return result
        
    except Exception as e:
        raise HttpError(500, f"Internal server error: {str(e)}")


@router.post("/users", response=UserResponseSchema, auth=auth)
def create_user(request, data: UserCreateSchema):
    """Create new user (admin or digital marketing for clients)"""
    user = request.auth
    
    # Allow:
    # - Admins/superusers to create any user
    # - Digital marketing to create only clients
    if not (user.is_admin() or user.is_superuser or (user.role == ROLE_CHOICES.DIGITAL_MARKETING and data.role == ROLE_CHOICES.CLIENT)):
        raise HttpError(403, "Permission denied.")
    
    try:
        # Check if user already exists
        if StaffUserAuth.objects.filter(email=data.email).exists():
            raise HttpError(400, "User with this email already exists")
        
        # Create user
        user_data = _normalize_user_payload(data.dict())
        password = user_data.pop('password')
        
        new_user = _create_user_safe(user_data, password)
        
        return UserResponseSchema.from_orm(new_user)
    except Exception as e:
        raise HttpError(400, str(e))


@router.get("/users/{user_id}", response=UserResponseSchema, auth=auth)
def get_user(request, user_id: int):
    """Get specific user details"""
    user = request.auth
    target_user = get_object_or_404(StaffUserAuth, id=user_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_project_manager() or user.is_superuser or user.id == user_id):
        raise HttpError(403, "Permission denied")
    
    return UserResponseSchema.from_orm(target_user)


@router.put("/users/{user_id}", response=UserResponseSchema, auth=auth)
def update_user(request, user_id: int, data: UserUpdateSchema):
    """Update specific user (admin or digital marketing for clients)"""
    user = request.auth
    target_user = get_object_or_404(StaffUserAuth, id=user_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or (user.role == ROLE_CHOICES.DIGITAL_MARKETING and target_user.role == ROLE_CHOICES.CLIENT)):
        raise HttpError(403, "Permission denied. Only admins or digital marketing (for clients) can update.")
    
    for field, value in data.dict(exclude_unset=True).items():
        if hasattr(target_user, field):
            setattr(target_user, field, value)
    
    target_user.save()
    return UserResponseSchema.from_orm(target_user)


@router.post("/users/{user_id}/upload-profile-pic", response=UserResponseSchema, auth=auth)
def upload_profile_pic(request, user_id: int, profile_pic: UploadedFile = File(...)):
    """Upload/replace a user's profile picture (multipart form)."""
    user = request.auth
    target_user = get_object_or_404(StaffUserAuth, id=user_id)

    # Permission checks
    if not (user.is_admin() or user.is_superuser or user.id == target_user.id):
        raise HttpError(403, "Permission denied. Only admins or the user can upload profile picture.")

    # Validate content type (basic check)
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if getattr(profile_pic, "content_type", None) not in allowed_types:
        raise HttpError(400, "Invalid image type. Allowed: jpeg, png, gif, webp")

    # Save to ImageField
    target_user.profile_pic.save(profile_pic.name, profile_pic, save=True)
    return UserResponseSchema.from_orm(target_user)


@router.delete("/users/{user_id}", response=MessageResponseSchema, auth=auth)
def delete_user(request, user_id: int):
    """Delete specific user (admin only)"""
    user = request.auth
    target_user = get_object_or_404(StaffUserAuth, id=user_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser):
        raise HttpError(403, "Permission denied. Only admins can delete users.")
    
    # Prevent self-deletion
    if user.id == user_id:
        raise HttpError(400, "Cannot delete your own account")
    
    target_user.delete()
    return MessageResponseSchema(message="User deleted successfully")


@router.post("/users/{user_id}/set-password", response=MessageResponseSchema, auth=auth)
def admin_set_password(request, user_id: int, data: AdminSetPasswordSchema):
    """Set password for a specific user (admin or digital marketing for clients)."""
    user = request.auth
    target_user = get_object_or_404(StaffUserAuth, id=user_id)

    # Permission checks: admins/superusers can set for anyone; digital marketing only for clients
    if not (user.is_admin() or user.is_superuser or (user.role == ROLE_CHOICES.DIGITAL_MARKETING and target_user.role == ROLE_CHOICES.CLIENT)):
        raise HttpError(403, "Permission denied. Only admins or digital marketing (for clients) can set passwords.")

    new_password = data.new_password.strip()
    if not new_password or len(new_password) < 6:
        raise HttpError(400, "Password must be at least 6 characters long")

    target_user.set_password(new_password)
    target_user.save()
    return MessageResponseSchema(message="Password updated successfully")


@router.get("/roles", response=List[RoleChoicesSchema])
def get_role_choices(request):
    """Get available role choices"""
    return [
        RoleChoicesSchema(value=choice[0], label=choice[1])
        for choice in ROLE_CHOICES.choices
    ]


@router.get("/check-email/{email}")
def check_email_exists(request, email: str):
    """Check if email already exists in database"""
    exists = StaffUserAuth.objects.filter(email=email).exists()
    return {"exists": exists, "email": email}


@router.post("/logout", response=MessageResponseSchema, auth=auth)
def logout(request):
    """User logout endpoint"""
    # In a real implementation, you might want to blacklist the token
    return MessageResponseSchema(message="Logout successful")


@router.post("/send-mail", response=MessageResponseSchema, auth=auth)
def send_mail_endpoint(request, data: EmailSendSchema):
    """Send an email via Gmail SMTP (digital marketing users only)"""
    user = request.auth
    # Restrict to digital marketing users and admins/superusers if desired
    allowed_roles = {ROLE_CHOICES.DIGITAL_MARKETING, ROLE_CHOICES.ADMIN}
    if not (user.role in allowed_roles or user.is_superuser):
        raise HttpError(403, "Permission denied. Only Digital Marketing can send emails.")

    # Basic validation
    to_email = data.to.strip()
    subject = data.subject.strip()
    message = data.message
    if not to_email or not subject or not message:
        raise HttpError(400, "'to', 'subject', and 'message' are required")

    # Use Django's email utilities
    from django.core.mail import send_mail
    from django.conf import settings as dj_settings

    try:
        send_mail(
            subject,
            message,
            getattr(dj_settings, 'DEFAULT_FROM_EMAIL', None) or getattr(dj_settings, 'EMAIL_HOST_USER', None),
            [to_email],
            fail_silently=False,
        )
        return MessageResponseSchema(message="Email sent successfully")
    except Exception as e:
        raise HttpError(500, f"Failed to send email: {str(e)}")


@router.post("/onboard-client", response=dict, auth=auth)
def onboard_client(request, data: ClientOnboardingSchema):
    """Onboard a new client with auto-generated password (digital marketing only)"""
    user = request.auth
    
    # Check permissions - only digital marketing and admins can onboard clients
    if not (user.role == ROLE_CHOICES.DIGITAL_MARKETING or user.is_admin() or user.is_superuser):
        raise HttpError(403, "Permission denied. Only Digital Marketing can onboard clients.")
    
    # Validate required fields
    name = data.name.strip()
    email = data.email.strip()
    company = data.company.strip()
    
    if not name or not email or not company:
        raise HttpError(400, "Name, email, and company are required")
    
    # Check if email already exists
    if StaffUserAuth.objects.filter(email=email).exists():
        raise HttpError(400, "User with this email already exists")
    
    # Generate random password
    import string
    import random
    
    def generate_password(length=8):
        """Generate a random password with letters and numbers"""
        characters = string.ascii_letters + string.digits
        return ''.join(random.choice(characters) for _ in range(length))
    
    generated_password = generate_password()
    
    # Split name into first and last name
    name_parts = name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    try:
        # Create client user with all required fields
        client_user = StaffUserAuth.objects.create_user(
            email=email,
            password=generated_password,
            first_name=first_name,
            last_name=last_name,
            company_name=company,
            role=ROLE_CHOICES.CLIENT,
            is_active=True,
            is_staff=False,  # Clients are not staff members
            is_superuser=False,  # Clients are not superusers
            mobile_number='',  # Can be updated later
            address='',  # Can be updated later
            city='',  # Can be updated later
            state='',  # Can be updated later
            country='',  # Can be updated later
            pincode=''  # Can be updated later
        )
        
        # Verify the user was created successfully
        print(f"✅ Client user created successfully:")
        print(f"   - ID: {client_user.id}")
        print(f"   - Email: {client_user.email}")
        print(f"   - Name: {client_user.full_name}")
        print(f"   - Role: {client_user.role}")
        print(f"   - Active: {client_user.is_active}")
        print(f"   - Password: {generated_password}")
        
        return {
            "user": UserResponseSchema.from_orm(client_user).dict(),
            "password": generated_password,
            "message": "Client onboarded successfully"
        }
    except Exception as e:
        raise HttpError(500, f"Failed to onboard client: {str(e)}")


@router.post("/send-client-credentials", response=MessageResponseSchema, auth=auth)
def send_client_credentials(request, data: SendCredentialsSchema):
    """Send client login credentials via email (digital marketing only)"""
    user = request.auth
    
    # Check permissions - only digital marketing and admins can send credentials
    if not (user.role == ROLE_CHOICES.DIGITAL_MARKETING or user.is_admin() or user.is_superuser):
        raise HttpError(403, "Permission denied. Only Digital Marketing can send client credentials.")
    
    # Validate required fields
    client_id = data.client_id
    client_email = data.client_email.strip()
    client_name = data.client_name.strip()
    company_name = data.company_name.strip()
    password = data.password.strip()
    
    if not all([client_id, client_email, client_name, company_name, password]):
        raise HttpError(400, "All fields are required")
    
    # Verify client exists
    try:
        client_user = StaffUserAuth.objects.get(id=client_id, email=client_email, role=ROLE_CHOICES.CLIENT)
    except StaffUserAuth.DoesNotExist:
        raise HttpError(404, "Client not found")
    
    # Prepare email content
    from django.conf import settings as dj_settings
    from django.core.mail import send_mail
    
    # Get company name from settings or use default
    company_display_name = getattr(dj_settings, 'COMPANY_NAME', 'RVR ENGINEERING')
    support_email = getattr(dj_settings, 'SUPPORT_EMAIL', 'support@rvrengineering.com')
    login_url = getattr(dj_settings, 'LOGIN_URL', 'https://rvrengineering.com')
    
    subject = f"Welcome to {company_display_name} — Your Client Account Details"
    
    message = f"""Hello **{client_name}**,
Welcome to **{company_display_name}**! Your client account has been successfully created by our Digital Marketing Team.

Here are your login credentials:

* **Company Name:** {company_name}
* **Email ID:** {client_email}
* **Password:** {password}

You can log in to your dashboard here: [{login_url}]

Please change your password after your first login for security purposes.

If you need any help, contact us at **[{support_email}](mailto:{support_email})**.

Best regards,
**The {company_display_name} Team**"""
    
    try:
        send_mail(
            subject,
            message,
            getattr(dj_settings, 'DEFAULT_FROM_EMAIL', None) or getattr(dj_settings, 'EMAIL_HOST_USER', None),
            [client_email],
            fail_silently=False,
        )
        return MessageResponseSchema(message="Client credentials sent successfully")
    except Exception as e:
        raise HttpError(500, f"Failed to send credentials: {str(e)}")


@router.post("/test-client-login", response=dict)
def test_client_login(request, data: dict):
    """Test endpoint to verify client can log in with generated credentials"""
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    
    if not email or not password:
        raise HttpError(400, "Email and password are required")
    
    try:
        # Try to authenticate the client
        user = StaffUserAuth.objects.get(email=email)
        
        if user.check_password(password) and user.is_active:
            # Create a token for the client
            token = create_jwt_token(user)
            return {
                "success": True,
                "message": "Client login successful",
                "user": UserResponseSchema.from_orm(user).dict(),
                "token": token
            }
        else:
            return {
                "success": False,
                "message": "Invalid credentials or inactive user"
            }
    except StaffUserAuth.DoesNotExist:
        return {
            "success": False,
            "message": "Client not found"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Login test failed: {str(e)}"
        }
