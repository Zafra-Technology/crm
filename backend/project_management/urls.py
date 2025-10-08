from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from ninja import NinjaAPI
from accounts.api import router as accounts_router
from projects.api import router as projects_router
from chat.api import router as chat_router

def api_root(request):
    """Root API endpoint"""
    return JsonResponse({
        'message': 'Project Management API',
        'version': '1.0.0',
        'endpoints': {
            'docs': '/api/docs',
            'auth': '/api/auth/',
            'projects': '/api/projects/',
            'chat': '/api/chat/'
        }
    })

# Create the main API instance
api = NinjaAPI(
    title="Project Management API",
    version="1.0.0",
    description="Pure API Backend for Project Management System with Staff Management"
)

# Add routers
api.add_router("/auth/", accounts_router, tags=["Authentication"])
api.add_router("/projects/", projects_router, tags=["Projects"])
api.add_router("/chat/", chat_router, tags=["Chat"])

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
    path('', api_root, name='api_root'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)