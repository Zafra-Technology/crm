# API-specific settings for Django Ninja backend

# JWT Settings
JWT_SECRET_KEY = 'your-jwt-secret-key-here'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# API Documentation
API_TITLE = "Project Management API"
API_VERSION = "1.0.0"
API_DESCRIPTION = "Pure API Backend for Project Management System with Staff Management"

# File Upload Settings
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# CORS Settings for API
API_CORS_ORIGINS = [
    "http://localhost:3000",  # Next.js frontend
    "http://127.0.0.1:3000",
]

# MongoDB Collections
USER_COLLECTION = 'accounts_staffuserauth'
PROJECT_COLLECTION = 'projects_project'
CHAT_COLLECTION = 'chat_message'