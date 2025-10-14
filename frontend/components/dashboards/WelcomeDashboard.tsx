'use client';

import { User } from '@/types';
import { UserIcon, CalendarIcon, ClockIcon, CheckCircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WelcomeDashboardProps {
  user: User;
}

export default function WelcomeDashboard({ user }: WelcomeDashboardProps) {
  const getRoleDisplayName = () => {
    switch (user.role) {
      case 'team_head':
        return 'Team Head';
      case 'team_lead':
        return 'Team Lead';
      case 'hr':
        return 'HR';
      case 'accountant':
        return 'Accountant';
      case 'marketing':
        return 'Marketing';
      case 'sales':
        return 'Sales';
      case 'digital_marketing':
        return 'Digital Marketing';
      case 'client':
        return 'Client';
      default:
        return user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getWelcomeMessage = () => {
    switch (user.role) {
      case 'team_head':
        return 'Welcome to your team management dashboard. Manage your team and oversee operations.';
      case 'team_lead':
        return 'Welcome to your team leadership dashboard. Lead your team and track progress.';
      case 'hr':
        return 'Welcome to your HR dashboard. Manage human resources and employee relations.';
      case 'accountant':
        return 'Welcome to your accounting dashboard. Manage financial records and transactions.';
      case 'marketing':
        return 'Welcome to your marketing dashboard. Plan and execute marketing strategies.';
      case 'sales':
        return 'Welcome to your sales dashboard. Track sales performance and manage leads.';
      case 'digital_marketing':
        return 'Welcome to your digital marketing dashboard. Manage online marketing campaigns.';
      case 'client':
        return 'Welcome to your client dashboard. View your projects and communicate with the team.';
      default:
        return 'Welcome to your dashboard. Access your tools and information.';
    }
  };

  const getQuickActions = () => {
    switch (user.role) {
      case 'team_head':
      case 'team_lead':
        return [
          { name: 'View Team Members', icon: UserIcon, color: 'bg-blue-500' },
          { name: 'Team Performance', icon: CheckCircleIcon, color: 'bg-green-500' },
          { name: 'Schedule Meeting', icon: CalendarIcon, color: 'bg-purple-500' },
          { name: 'Time Tracking', icon: ClockIcon, color: 'bg-orange-500' }
        ];
      case 'hr':
        return [
          { name: 'Employee Records', icon: UserIcon, color: 'bg-blue-500' },
          { name: 'Attendance', icon: ClockIcon, color: 'bg-green-500' },
          { name: 'Payroll', icon: CheckCircleIcon, color: 'bg-purple-500' },
          { name: 'Recruitment', icon: UserIcon, color: 'bg-orange-500' }
        ];
      case 'accountant':
        return [
          { name: 'Financial Reports', icon: CheckCircleIcon, color: 'bg-blue-500' },
          { name: 'Expense Tracking', icon: ClockIcon, color: 'bg-green-500' },
          { name: 'Invoice Management', icon: UserIcon, color: 'bg-purple-500' },
          { name: 'Tax Records', icon: CheckCircleIcon, color: 'bg-orange-500' }
        ];
      case 'marketing':
      case 'digital_marketing':
        return [
          { name: 'Campaign Analytics', icon: CheckCircleIcon, color: 'bg-blue-500' },
          { name: 'Content Calendar', icon: CalendarIcon, color: 'bg-green-500' },
          { name: 'Lead Generation', icon: UserIcon, color: 'bg-purple-500' },
          { name: 'Social Media', icon: ClockIcon, color: 'bg-orange-500' }
        ];
      case 'sales':
        return [
          { name: 'Lead Management', icon: UserIcon, color: 'bg-blue-500' },
          { name: 'Sales Pipeline', icon: CheckCircleIcon, color: 'bg-green-500' },
          { name: 'Customer Relations', icon: UserIcon, color: 'bg-purple-500' },
          { name: 'Sales Reports', icon: ClockIcon, color: 'bg-orange-500' }
        ];
      case 'client':
        return [
          { name: 'My Projects', icon: CheckCircleIcon, color: 'bg-blue-500' },
          { name: 'Messages', icon: UserIcon, color: 'bg-green-500' },
          { name: 'Project Updates', icon: ClockIcon, color: 'bg-purple-500' },
          { name: 'Support', icon: UserIcon, color: 'bg-orange-500' }
        ];
      default:
        return [
          { name: 'Dashboard', icon: CheckCircleIcon, color: 'bg-blue-500' },
          { name: 'Profile', icon: UserIcon, color: 'bg-green-500' },
          { name: 'Settings', icon: ClockIcon, color: 'bg-purple-500' },
          { name: 'Help', icon: UserIcon, color: 'bg-orange-500' }
        ];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0">
        <CardContent className="p-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <UserIcon size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
              <p className="text-blue-100 text-lg">{getRoleDisplayName()}</p>
              <p className="text-blue-100 mt-2">{getWelcomeMessage()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`${action.color} p-3 rounded-lg`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{action.name}</h3>
                  <p className="text-sm text-muted-foreground">Click to access</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-foreground">System Login</p>
                <p className="text-xs text-muted-foreground">Just now</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-foreground">Dashboard Accessed</p>
                <p className="text-xs text-muted-foreground">Welcome to your personalized dashboard</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-foreground">Role</h3>
              <p className="text-sm text-muted-foreground">{getRoleDisplayName()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-foreground">Email</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-foreground">Status</h3>
              <p className="text-sm text-green-600">Active</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-foreground">Last Login</h3>
              <p className="text-sm text-muted-foreground">Just now</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
