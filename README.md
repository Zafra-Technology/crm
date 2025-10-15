# 🏗️ RVR Engineering CRM System

<div align="center">

![RVR Engineering Logo](https://rvrengineering.com/wp-content/uploads/2022/12/RVR.svg)

**A comprehensive Customer Relationship Management system built for RVR Engineering**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.33-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.20.0-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

</div>

---

## 🚀 Features

### 👥 **Multi-Role User Management**
- **Admin**: Complete system oversight and user management
- **Project Managers**: Project coordination and team leadership
- **Designers**: Design workflow management and collaboration
- **Clients**: Project tracking and communication
- **HR, Marketing, Sales**: Specialized role-based dashboards

### 📋 **Project Management**
- **Project Lifecycle Tracking**: From quotation to completion
- **Real-time Status Updates**: Track project progress seamlessly
- **File Management**: Secure document storage and sharing
- **Timeline Management**: Project scheduling and deadline tracking
- **Quotation System**: Automated quotation generation and approval

### 💬 **Real-time Communication**
- **Project Chat**: Dedicated chat channels for each project
- **File Sharing**: Secure file uploads and downloads
- **Notifications**: Real-time updates and alerts
- **Message History**: Complete conversation tracking

### 📊 **Advanced Dashboards**
- **Role-based Views**: Customized dashboards for each user type
- **Project Analytics**: Visual project status and progress tracking
- **Task Management**: Kanban boards and task assignment
- **Performance Metrics**: Team and project performance insights

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works seamlessly on all devices
- **Dark/Light Mode**: User preference support
- **Intuitive Navigation**: Clean and user-friendly interface
- **Accessibility**: WCAG compliant design

---

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 14** - React framework with App Router
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library

### **Backend & Database**
- **MongoDB** - NoSQL database for flexible data storage
- **Mongoose** - MongoDB object modeling
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Secure authentication tokens
- **bcryptjs** - Password hashing

### **Development Tools**
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

---

## 📦 Installation & Setup

### **Prerequisites**
Before you begin, ensure you have the following installed on your system:

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **MongoDB 6.0+** - [Download from mongodb.com](https://www.mongodb.com/try/download/community)
- **Git** - [Download from git-scm.com](https://git-scm.com/)
- **npm** (comes with Node.js) or **yarn** - [Install yarn](https://yarnpkg.com/getting-started/install)

### **System Requirements**
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 2GB free space
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

### **Step-by-Step Installation**

#### **1. Clone the Repository**
```bash
# Clone the repository
git clone https://github.com/your-username/crm.git

# Navigate to the project directory
cd crm
```

#### **2. Install Dependencies**
```bash
# Navigate to the frontend directory
cd frontend

# Install all dependencies
npm install

# Alternative: If you prefer yarn
yarn install
```

#### **3. Database Setup**

**Option A: Local MongoDB Installation**
```bash
# Start MongoDB service (Windows)
net start MongoDB

# Start MongoDB service (macOS/Linux)
sudo systemctl start mongod

# Or using brew (macOS)
brew services start mongodb-community
```

**Option B: MongoDB Atlas (Cloud)**
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string

#### **4. Environment Configuration**
```bash
# Create environment file
cp .env.example .env.local

# Edit the environment file
# Windows
notepad .env.local

# macOS/Linux
nano .env.local
```

**Required Environment Variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/crm
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Application
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development

# Optional: Socket.io configuration
SOCKET_PORT=3001
```

#### **5. Start the Development Server**
```bash
# Start the development server
npm run dev

# Alternative commands
npm start          # Production mode
npm run build      # Build for production
npm run lint       # Run ESLint
```

#### **6. Access the Application**
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3000/api](http://localhost:3000/api)

### **Troubleshooting Common Issues**

#### **Port Already in Use**
```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

#### **MongoDB Connection Issues**
```bash
# Check if MongoDB is running
# Windows
sc query MongoDB

# macOS/Linux
sudo systemctl status mongod

# Test connection
mongosh
```

#### **Node Modules Issues**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### **Development Scripts**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint for code quality |
| `npm run type-check` | Run TypeScript type checking |

### **First Time Setup Checklist**

- [ ] Node.js 18+ installed
- [ ] MongoDB running locally or Atlas configured
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Development server started (`npm run dev`)
- [ ] Application accessible at http://localhost:3000
- [ ] Database connection established

---

## 🏗️ Project Structure

```
crm/
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/         # Dashboard pages
│   │   │   ├── admin/         # Admin-specific pages
│   │   │   ├── clients/       # Client management
│   │   │   ├── designers/     # Designer management
│   │   │   ├── messages/      # Chat interface
│   │   │   ├── projects/      # Project management
│   │   │   └── tasks/         # Task management
│   │   └── page.tsx          # Landing page
│   ├── components/            # Reusable React components
│   │   ├── dashboards/       # Role-specific dashboards
│   │   ├── modals/           # Modal components
│   │   ├── chat/             # Chat components
│   │   └── ui/               # UI component library
│   ├── lib/                  # Utility libraries
│   │   ├── api/              # API integration
│   │   ├── auth.ts           # Authentication logic
│   │   └── socket.ts         # Socket.io configuration
│   ├── types/                # TypeScript type definitions
│   └── hooks/                # Custom React hooks
```

---

## 🎯 Key Features in Detail

### **🔐 Authentication & Authorization**
- Secure JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcryptjs
- Session management

### **📱 Responsive Design**
- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interface
- Cross-browser compatibility

### **⚡ Real-time Features**
- Live chat with Socket.io
- Real-time notifications
- Instant status updates
- Collaborative editing

### **📈 Analytics & Reporting**
- Project progress tracking
- Team performance metrics
- Client satisfaction monitoring
- Custom reporting tools

---

## 🚀 Deployment

### **Production Build**
```bash
npm run build
npm start
```

### **Docker Deployment**
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Environment Variables**
```env
# Production environment
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### **Development Guidelines**
- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### **Documentation**
- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)

### **Getting Help**
- 📧 Email: support@rvrengineering.com
- 💬 Discord: [Join our community](https://discord.gg/rvr-engineering)
- 📖 Wiki: [Project Wiki](https://github.com/your-username/crm/wiki)

### **Bug Reports**
Found a bug? Please report it:
1. Check existing issues
2. Create a new issue with detailed description
3. Include steps to reproduce
4. Add screenshots if applicable

---

## 🎉 Acknowledgments

- **RVR Engineering Team** - For the vision and requirements
- **Open Source Community** - For the amazing tools and libraries
- **Contributors** - Everyone who helps improve this project

---

<div align="center">

**Built with ❤️ by the RVR Engineering Team**

[Website](https://rvrengineering.com) • [Documentation](docs/) • [Support](mailto:support@rvrengineering.com)

</div>
