from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import StaffUserAuth, ROLE_CHOICES


@admin.register(StaffUserAuth)
class StaffUserAuthAdmin(UserAdmin):
    """Custom admin for StaffUserAuth model"""
    
    # Fields to display in the list view
    list_display = (
        'email', 'full_name', 'role', 'company_name',
        'is_active', 'date_of_joining', 'profile_picture_preview'
    )
    
    # Fields to filter by
    list_filter = (
        'role', 'is_active', 'is_staff', 'is_superuser',
        'date_of_joining', 'created_at', 'country', 'state'
    )
    
    # Fields to search
    search_fields = (
        'email', 'first_name', 'last_name',
        'mobile_number', 'company_name'
    )
    
    # Ordering
    ordering = ('-created_at',)
    
    # Fields for the form
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'password')
        }),
        ('Personal Information', {
            'fields': (
                'first_name', 'last_name', 'date_of_birth',
                'profile_pic'
            )
        }),
        ('Contact Information', {
            'fields': (
                'mobile_number', 'address', 'city', 'state',
                'country', 'pincode', 'aadhar_number'
            )
        }),
        ('Company Information', {
            'fields': ('company_name',)
        }),
        ('Employment Details', {
            'fields': (
                'role', 'date_of_joining', 'date_of_exit'
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            )
        }),
        ('Important dates', {
            'fields': ('last_login', 'created_at', 'updated_at')
        }),
    )
    
    # Fields for adding new user
    add_fieldsets = (
        ('Authentication', {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2')
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'date_of_birth')
        }),
        ('Contact Information', {
            'fields': ('mobile_number', 'company_name')
        }),
        ('Employment Details', {
            'fields': ('role', 'date_of_joining')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser')
        }),
    )
    
    # Read-only fields
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    
    # Fields to display in the form
    filter_horizontal = ('groups', 'user_permissions')
    
    def profile_picture_preview(self, obj):
        """Display profile picture preview in admin"""
        if obj.profile_pic:
            return format_html(
                '<img src="{}" width="50" height="50" style="border-radius: 50%;" />',
                obj.profile_pic.url
            )
        return "No Image"
    profile_picture_preview.short_description = "Profile Picture"
    
    def get_queryset(self, request):
        """Customize queryset based on user role"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        elif request.user.is_admin():
            # Admin can see all users
            return qs
        elif request.user.is_project_manager():
            # Project managers can see designers and clients
            return qs.filter(role__in=[ROLE_CHOICES.DESIGNER, ROLE_CHOICES.CLIENT])
        else:
            # Others can only see themselves
            return qs.filter(id=request.user.id)
    
    def has_add_permission(self, request):
        """Control who can add users"""
        return request.user.is_superuser or request.user.is_admin()
    
    def has_change_permission(self, request, obj=None):
        """Control who can change users"""
        if request.user.is_superuser or request.user.is_admin():
            return True
        if obj and obj == request.user:
            return True
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Control who can delete users"""
        return request.user.is_superuser or request.user.is_admin()


# Customize admin site
admin.site.site_header = "Project Management Admin"
admin.site.site_title = "Project Management"
admin.site.index_title = "Welcome to Project Management Administration"