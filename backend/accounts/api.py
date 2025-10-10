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
    MessageResponseSchema, RoleChoicesSchema, EmailSendSchema
)

router = Router()


class AuthBearer(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            user = StaffUserAuth.objects.get(id=user_id)
            print(f"Authenticated user: {user.email}, role: {user.role}, is_admin: {user.is_admin()}, is_superuser: {user.is_superuser}")
            return user
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, StaffUserAuth.DoesNotExist) as e:
            print(f"Authentication failed: {e}")
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
        print(f"_create_user_safe called with data: {user_data}")
        
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
        print(f"Final data for user creation: {final_data}")
        
        # Validate role
        if not final_data.get('role'):
            raise ValueError("Role is required for user creation")
        
        print(f"Calling StaffUserAuth.objects.create_user...")
        new_user = StaffUserAuth.objects.create_user(
            password=password,
            **final_data
        )
        print(f"User created successfully in database: {new_user.email}")
        return new_user
        
    except Exception as e:
        print(f"=== ERROR in _create_user_safe ===")
        print(f"Error: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        print(f"Traceback:")
        print(traceback.format_exc())
        print(f"=== END _create_user_safe ERROR ===")
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
        
        print(f"List users request from: {user.email}, role filter: '{role}', search: '{search}'")
        
        # Check permissions
        if not (user.is_admin() or user.is_project_manager() or user.is_superuser or user.role == ROLE_CHOICES.DIGITAL_MARKETING):
            print(f"Permission denied for user: {user.email}, role: {user.role}, is_admin: {user.is_admin()}, is_superuser: {user.is_superuser}")
            raise HttpError(403, "Permission denied")
        
        queryset = StaffUserAuth.objects.all()
        
        # Filter by role if provided
        if role and role.strip():
            print(f"Filtering by role: '{role}'")
            queryset = queryset.filter(role=role)
        
        # Search functionality
        if search and search.strip():
            print(f"Searching for: '{search}'")
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
        print(f"Found {len(users_list)} users")
        
        result = [UserResponseSchema.from_orm(u) for u in users_list]
        print(f"Returning {len(result)} user records")
        return result
        
    except Exception as e:
        print(f"Error in list_users: {e}")
        import traceback
        traceback.print_exc()
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
