# Project Management Dashboard

A clean, professional dashboard-style web application for project management with role-based access control.

## Features

### 🔐 Authentication & Roles
- Email/password login system
- Three distinct roles: Client, Project Manager, Designer
- Role-based page access and permissions

### 🧭 Navigation
- Collapsible left sidebar with icons and labels
- Responsive design for desktop and mobile
- Clean navigation: Projects, Messages, Profile, Settings

### 📊 Role-Specific Dashboards

**Project Manager Dashboard:**
- Overview of all managed projects
- Statistics cards showing project status
- Create new projects with form (Name, Description, Requirements, Timeline)
- Assign designers to projects

**Client Dashboard:**
- View client-specific projects
- Project status tracking
- Timeline and progress monitoring

**Designer Dashboard:**
- List of assigned projects
- Task management and deadlines
- Quick actions for common tasks
- Recent activity feed

### 📋 Project Details Screen
- **Left Panel:** Project information (name, description, requirements, timeline, status)
- **Middle Panel:** Project updates and file uploads in card-style gallery
- **Right Panel:** Real-time group chat between all project stakeholders
- Edit capabilities (Project Manager only)

### 🎨 Design System
- **Typography:** Inter font family for clean, professional appearance
- **Colors:** White background, black text, subtle gray accents
- **Components:** Flat design buttons, light shadows on cards
- **Framework:** Tailwind CSS for consistent styling
- **Responsive:** Mobile-first design approach

## Tech Stack

- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Icons:** Lucide React
- **State Management:** React hooks with local storage for demo

## Demo Accounts

Use these credentials to test different roles:

- **Client:** client@example.com / password
- **Project Manager:** manager@example.com / password  
- **Designer:** designer@example.com / password

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard pages
│   │   ├── project/[id]/  # Dynamic project detail pages
│   │   └── layout.tsx     # Dashboard layout with sidebar
│   ├── messages/          # Messages page
│   ├── profile/           # User profile page
│   ├── settings/          # Settings page
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Login page
├── components/            # Reusable UI components
│   ├── dashboards/        # Role-specific dashboard components
│   ├── chat/              # Chat functionality
│   ├── Header.tsx         # Main header component
│   ├── Sidebar.tsx        # Navigation sidebar
│   ├── ProjectCard.tsx    # Project display card
│   └── ProjectUpdates.tsx # Project updates component
├── lib/                   # Utility functions and data
│   ├── auth.ts           # Authentication logic
│   └── data/             # Mock data for demo
├── types/                 # TypeScript type definitions
└── README.md
```

## Key Features Implemented

### ✅ Authentication System
- Role-based login with mock authentication
- Session management with localStorage
- Protected routes and role validation

### ✅ Responsive Design
- Mobile-first approach with Tailwind CSS
- Collapsible sidebar for mobile devices
- Adaptive grid layouts

### ✅ Role-Based Access Control
- Different dashboard views per role
- Permission-based editing capabilities
- Role-specific navigation and features

### ✅ Real-Time Chat
- Project-based group messaging
- Message threading and timestamps
- User identification in conversations

### ✅ Project Management
- Full CRUD operations for projects
- Status tracking and updates
- File upload simulation
- Timeline management

### ✅ Professional UI/UX
- Clean, minimalist design
- Consistent component library
- Smooth transitions and interactions
- Accessible design patterns

## Customization

The application is built with modularity in mind:

- **Styling:** Modify `tailwind.config.js` and `globals.css` for theme changes
- **Data:** Replace mock data in `lib/data/mockData.ts` with real API calls
- **Authentication:** Update `lib/auth.ts` with your authentication provider
- **Components:** All components are self-contained and easily customizable

## Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

## Next Steps for Production

- Replace mock data with real database integration
- Implement proper authentication with JWT/OAuth
- Add real-time functionality with WebSockets
- Set up file upload storage (AWS S3, Cloudinary, etc.)
- Add comprehensive error handling and loading states
- Implement data validation and sanitization
- Add unit and integration tests

## License

This project is built as a demo/prototype for a project management dashboard. Feel free to use and modify as needed.