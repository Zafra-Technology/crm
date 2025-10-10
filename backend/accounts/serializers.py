from ninja import Schema
from typing import Optional
from datetime import date, datetime
from .models import ROLE_CHOICES


class UserCreateSchema(Schema):
    """Schema for creating a new user"""
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mobile_number: Optional[str] = None
    company_name: Optional[str] = None
    pan_number: Optional[str] = None
    role: str  # Required field - no default
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    aadhar_number: Optional[str] = None
    date_of_joining: Optional[date] = None


class UserUpdateSchema(Schema):
    """Schema for updating user information"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mobile_number: Optional[str] = None
    company_name: Optional[str] = None
    pan_number: Optional[str] = None
    role: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    aadhar_number: Optional[str] = None
    date_of_joining: Optional[date] = None
    date_of_exit: Optional[date] = None
    is_active: Optional[bool] = None


class UserResponseSchema(Schema):
    """Schema for user response"""
    id: int
    email: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    full_name: str
    mobile_number: Optional[str] = ""
    company_name: Optional[str] = ""
    pan_number: Optional[str] = ""
    role: str
    role_display: str
    date_of_birth: Optional[date]
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    country: Optional[str] = ""
    pincode: Optional[str] = ""
    aadhar_number: Optional[str]
    date_of_joining: Optional[date]
    date_of_exit: Optional[date]
    profile_pic: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            email=obj.email,
            first_name=obj.first_name or "",
            last_name=obj.last_name or "",
            full_name=obj.full_name,
            mobile_number=obj.mobile_number or "",
            company_name=obj.company_name or "",
            pan_number=getattr(obj, 'pan_number', None) or "",
            role=obj.role,
            role_display=obj.get_role_display_name(),
            date_of_birth=obj.date_of_birth,
            address=obj.address or "",
            city=obj.city or "",
            state=obj.state or "",
            country=obj.country or "",
            pincode=obj.pincode or "",
            aadhar_number=obj.aadhar_number,
            date_of_joining=obj.date_of_joining,
            date_of_exit=obj.date_of_exit,
            profile_pic=obj.profile_pic.url if obj.profile_pic else None,
            is_active=obj.is_active,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )


class LoginSchema(Schema):
    """Schema for user login"""
    email: str
    password: str


class LoginResponseSchema(Schema):
    """Schema for login response"""
    user: UserResponseSchema
    token: str
    message: str


class PasswordChangeSchema(Schema):
    """Schema for password change"""
    old_password: str
    new_password: str


class AdminSetPasswordSchema(Schema):
    """Schema for admin to set another user's password"""
    new_password: str


class MessageResponseSchema(Schema):
    """Schema for simple message responses"""
    message: str
    success: bool = True


class RoleChoicesSchema(Schema):
    """Schema for role choices"""
    value: str
    label: str


class EmailSendSchema(Schema):
    """Schema for sending an email"""
    to: str
    subject: str
    message: str