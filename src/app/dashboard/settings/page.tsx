'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  User, 
  Mail, 
  Shield,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Users,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import AvatarUpload from '@/components/ui/avatar-upload';
import Avatar from '@/components/ui/avatar';
import TwoFactorSettings from '@/components/auth/two-factor-settings';
import FeedbackForm from '@/components/feedback/feedback-form';
import BugReportForm from '@/components/bug-reports/bug-report-form';

export default function SettingsPage() {
  const { user, userProfile, signOut, updateUserProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [show2FASettings, setShow2FASettings] = useState(false);

  // Navigation items based on user role
  const getNavigationItems = (userRole: string) => {
    const baseItems = [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
      },
    ];

    // Add teacher-specific items
    if (userRole === 'teacher' || userRole === 'superadmin') {
      baseItems.splice(1, 0, 
        {
          title: 'My Courses',
          href: '/dashboard/courses',
          icon: BookOpen,
        },
        {
          title: 'Students',
          href: '/dashboard/students',
          icon: Users,
        }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems(userProfile?.role || 'student');

  // Debug: Log userProfile data
  useEffect(() => {
    if (userProfile) {
      console.log('UserProfile data:', userProfile);
    }
  }, [userProfile]);

  const handleAvatarChange = (avatarUrl: string | null) => {
    // Update the user profile in the auth context
    updateUserProfile({ avatar_url: avatarUrl });
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Learnify</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/dashboard/settings';
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary border-r-2 border-primary'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
             <div className="flex items-center space-x-3 mb-4">
               <Avatar
                 src={userProfile.avatar_url}
                 name={userProfile.full_name}
                 size="sm"
               />
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                   {userProfile.full_name}
                 </p>
                 <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                   {userProfile.role}
                 </p>
               </div>
             </div>
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Account Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your account information and preferences.
              </p>
            </div>

            {/* Profile Settings */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-start space-x-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Profile Picture
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Upload a profile picture to personalize your account.
                    </p>
                    <AvatarUpload
                      userId={userProfile.id}
                      currentAvatarUrl={userProfile.avatar_url}
                      userName={userProfile.full_name}
                      onAvatarChange={handleAvatarChange}
                      size="lg"
                    />
                  </div>
                </div>

                <Separator />

                {/* Profile Details */}
                <div className="grid gap-6 md:grid-cols-2">
                   <div>
                     <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                       Full Name
                     </div>
                     <div className="flex items-center space-x-2">
                       <User className="h-4 w-4 text-gray-400" />
                       <span className="text-sm text-gray-900 dark:text-white">
                         {userProfile.full_name}
                       </span>
                     </div>
                   </div>

                   <div>
                     <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                       Email Address
                     </div>
                     <div className="flex items-center space-x-2">
                       <Mail className="h-4 w-4 text-gray-400" />
                       <span className="text-sm text-gray-900 dark:text-white">
                         {userProfile.email || user?.email || 'No email available'}
                       </span>
                     </div>
                   </div>

                   <div>
                     <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                       Role
                     </div>
                     <div className="flex items-center space-x-2">
                       <Shield className="h-4 w-4 text-gray-400" />
                       <span className="text-sm text-gray-900 dark:text-white capitalize">
                         {userProfile.role}
                       </span>
                     </div>
                   </div>

                   <div>
                     <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                       Member Since
                     </div>
                     <div className="flex items-center space-x-2">
                       <User className="h-4 w-4 text-gray-400" />
                       <span className="text-sm text-gray-900 dark:text-white">
                         {userProfile.created_at 
                           ? new Date(userProfile.created_at).toLocaleDateString()
                           : 'Date not available'
                         }
                       </span>
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Add an extra layer of security to your account with 2FA.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShow2FASettings(true)}
                    variant="outline"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback & Support */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Feedback & Support</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Send Feedback
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Share your thoughts, suggestions, or feature requests.
                      </p>
                    </div>
                    <FeedbackForm />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Report a Bug
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Found an issue? Help us fix it by reporting bugs.
                      </p>
                    </div>
                    <BugReportForm />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 2FA Settings Modal */}
      {show2FASettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <TwoFactorSettings onClose={() => setShow2FASettings(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}