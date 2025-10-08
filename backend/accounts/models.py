from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import RegexValidator


class ROLE_CHOICES(models.TextChoices):
    """Enumeration of all possible staff roles"""
    ADMIN = 'admin', 'Admin'
    PROJECT_MANAGER = 'project_manager', 'Project Manager'
    ASSISTANT_PROJECT_MANAGER = 'assistant_project_manager', 'Assistant Project Manager'
    TEAM_HEAD = 'team_head', 'Team Head'
    TEAM_LEAD = 'team_lead', 'Team Lead'
    SENIOR_DESIGNER = 'senior_designer', 'Senior Designer'
    DESIGNER = 'designer', 'Designer'
    AUTO_CAD_DRAFTER = 'auto_cad_drafter', 'Auto CAD Drafter'
    HR = 'hr', 'HR'
    ACCOUNTANT = 'accountant', 'Accountant'
    MARKETING = 'marketing', 'Marketing'
    SALES = 'sales', 'Sales'
    DIGITAL_MARKETING = 'digital_marketing', 'Digital Marketing'
    CLIENT = 'client', 'Client'


class CustomUserManager(BaseUserManager):
    """Custom user manager using email as primary identifier"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user with email and password"""
        if not email:
            raise ValueError('The Email field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser with email and password"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', ROLE_CHOICES.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class StaffUserAuth(AbstractUser):
    """Custom user model for staff management system"""
    
    # Remove default username field
    username = None
    
    # Use email as primary identifier
    email = models.EmailField(unique=True)

    
    # Personal Information
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    
    # Contact Information
    mobile_number = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
            )
        ],
        blank=True
    )
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    aadhar_number = models.CharField(
        max_length=12,
        validators=[
            RegexValidator(
                regex=r'^\d{12}$',
                message="Aadhar number must be exactly 12 digits"
            )
        ],
        blank=True,
        null=True,
    )
    
    # Company Information
    company_name = models.CharField(max_length=200, blank=True)
    
    # Employment Details
    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES.choices,
        default=ROLE_CHOICES.CLIENT
    )
    date_of_joining = models.DateField(null=True, blank=True)
    date_of_exit = models.DateField(null=True, blank=True)
    
    # Profile Management
    profile_pic = models.ImageField(
        upload_to='profile_pics/',
        null=True,
        blank=True
    )
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Set email as username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = CustomUserManager()
    
    class Meta:
        verbose_name = 'Staff User'
        verbose_name_plural = 'Staff Users'
        ordering = ['-created_at']

    
    @property
    def full_name(self):
        """Return full name or email if name is not available"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        return self.email
    
    def __str__(self):
        """String representation using email"""
        return self.email
    
    def get_role_display_name(self):
        """Get human-readable role name"""
        return dict(ROLE_CHOICES.choices).get(self.role, self.role)
    
    def is_admin(self):
        """Check if user is admin"""
        return self.role == ROLE_CHOICES.ADMIN
    
    def is_project_manager(self):
        """Check if user is project manager or assistant project manager"""
        return self.role in [ROLE_CHOICES.PROJECT_MANAGER, ROLE_CHOICES.ASSISTANT_PROJECT_MANAGER]
    
    def is_designer(self):
        """Check if user is any type of designer"""
        return self.role in [ROLE_CHOICES.DESIGNER, ROLE_CHOICES.SENIOR_DESIGNER, ROLE_CHOICES.AUTO_CAD_DRAFTER]
    
    def is_client(self):
        """Check if user is client"""
        return self.role == ROLE_CHOICES.CLIENT
    
    def is_management(self):
        """Check if user is in management role"""
        return self.role in [ROLE_CHOICES.ADMIN, ROLE_CHOICES.PROJECT_MANAGER, ROLE_CHOICES.ASSISTANT_PROJECT_MANAGER, ROLE_CHOICES.TEAM_HEAD, ROLE_CHOICES.TEAM_LEAD]
    
    def is_design_team(self):
        """Check if user is in design team"""
        return self.role in [ROLE_CHOICES.DESIGNER, ROLE_CHOICES.SENIOR_DESIGNER, ROLE_CHOICES.AUTO_CAD_DRAFTER]
    
    def is_support_staff(self):
        """Check if user is support staff"""
        return self.role in [ROLE_CHOICES.HR, ROLE_CHOICES.ACCOUNTANT, ROLE_CHOICES.MARKETING, ROLE_CHOICES.SALES, ROLE_CHOICES.DIGITAL_MARKETING]