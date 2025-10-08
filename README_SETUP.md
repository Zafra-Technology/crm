# Project Management System Setup

## Overview
This project has been successfully converted from a Next.js full-stack application to a **Next.js frontend** with **Django Ninja backend** architecture.

## Architecture
- **Frontend**: Next.js with TypeScript (Port 3000)
- **Backend**: Django with Django Ninja API (Port 8000)
- **Database**: MongoDB using djongo
- **Authentication**: JWT-based authentication
- **Real-time Chat**: Socket.io (existing implementation preserved)

## Custom User Model Features
The system includes a comprehensive custom user model (`StaffUserAuth`) with:

### Core Features
- **Email-based authentication** (no username required)
- **Auto-generated 6-character alphanumeric Employee ID**
- **Role-based access control** with roles:
  - Admin
  - Project Manager
  - Designer
  - HR
  - Marketing
  - Client

### User Fields
- Personal info: first_name, last_name, date_of_birth
- Contact: mobile_number, address, city, state, country, pincode, aadhar_number
- Company: company_name
- Employment: role, date_of_joining, date_of_exit
- Profile: profile_pic, is_active
- Auto-generated: employee_id, created_at, updated_at

## Admin Dashboard Features
- **User Management**: Create, view, and delete users
- **Role-based Navigation**: Admin panel accessible only to admin users
- **User Statistics**: Total users, active users, role distribution
- **Search and Filter**: Filter users by role and search functionality
- **Create User Modal**: Popup form for creating new users with all fields

## Setup Instructions

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Activate virtual environment:
   ```bash
   # Windows
   ..\venv311\Scripts\activate
   
   # Linux/Mac
   source ../venv311/bin/activate
   ```

3. Install dependencies (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. Create superuser:
   ```bash
   python manage.py createsuperuser
   # Or run the helper script: python ../tmp_rovodev_create_superuser.py
   ```

6. Start Django server:
   ```bash
   python manage.py runserver 8000
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Next.js development server:
   ```bash
   npm run dev
   ```

### Quick Start (Both Servers)
Run the PowerShell script to start both servers:
```powershell
.\tmp_rovodev_start_servers.ps1
```

## API Endpoints
The Django Ninja API provides the following endpoints:

### Authentication (`/api/auth/`)
- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout
- `GET /me` - Get current user info
- `POST /change-password` - Change password

### User Management (`/api/auth/`)
- `GET /users` - List all users (admin only)
- `POST /users` - Create new user (admin only)
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user (admin only)
- `GET /role-choices` - Get available roles

### Projects (`/api/projects/`)
- Project management endpoints (existing)

### Chat (`/api/chat/`)
- Chat endpoints (existing, using Socket.io)

## Admin Access
1. Login with admin credentials
2. Navigate to `/dashboard/admin` 
3. Access user management features:
   - View user statistics
   - Create new users via "Create User" button
   - Search and filter users
   - Delete users (except self)

## Environment Variables

### Backend (.env)
```
DEBUG=true
SECRET_KEY=your-secret-key
MONGODB_URI=your-mongodb-connection-string
MONGODB_NAME=zafra
CORS_ALLOW_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Database Schema
The custom user model is stored in MongoDB with the following structure:
- Collection: `accounts_staffuserauth`
- Auto-generated employee_id with format: `[A-Z0-9]{6}`
- Email as unique identifier
- Role-based permissions

## Testing
- Backend API documentation: http://localhost:8000/api/docs
- Frontend application: http://localhost:3000
- Admin panel: http://localhost:3000/dashboard/admin (admin role required)

## Key Changes Made
1. ✅ Separated frontend and backend architectures
2. ✅ Implemented Django Ninja API with comprehensive user management
3. ✅ Added custom user model with company_name field
4. ✅ Created admin dashboard with user creation modal
5. ✅ Added admin navigation in sidebar
6. ✅ Preserved existing Socket.io chat functionality
7. ✅ Maintained MongoDB database integration
8. ✅ Implemented JWT authentication
9. ✅ Added role-based access control

The system is now ready for development and testing!