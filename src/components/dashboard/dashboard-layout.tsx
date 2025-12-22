'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  Settings,
  GraduationCap,
  ClipboardList,
  Award,
  Calendar,
  TrendingUp,
  Play,
  Star,
  History,
  Heart,
  Clock,
  AlertCircle,
  Megaphone,
  Mail,
  MessageCircle,
  Sliders,
  Bell,
  List,
  Paperclip,
  PieChart,
  Activity,
  Shield,
  Bug,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getNavigationByRole } from '@/config/navigation';
import ThemeToggle from '@/components/theme-toggle';
import Avatar from '@/components/ui/avatar';
import BugReportForm from '@/components/bug-reports/bug-report-form';

// Icon mapping for navigation items
const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } =
  {
    LayoutDashboard,
    BookOpen,
    Users,
    FileText,
    BarChart3,
    MessageSquare,
    Settings,
    GraduationCap,
    ClipboardList,
    Award,
    Calendar,
    TrendingUp,
    Play,
    Star,
    History,
    Heart,
    Clock,
    AlertCircle,
    Megaphone,
    Mail,
    MessageCircle,
    Sliders,
    Bell,
    List,
    Paperclip,
    PieChart,
    Activity,
    Shield,
  };

// Logo Component
function Logo() {
  return (
    <div className="flex items-center space-x-3">
      <img src="/images/Logo.PNG" alt="Learnify Logo" className="h-10 w-10" />
      <span className="text-xl font-bold text-charcoal-800 dark:text-white">Learnify</span>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, userRole, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = getNavigationByRole(userRole || 'student');

  const handleSignOut = async () => {
    await signOut();
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? (
      <IconComponent className="h-5 w-5" />
    ) : (
      <FileText className="h-5 w-5" />
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar - Fixed and non-scrollable */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col overflow-y-hidden border-r border-charcoal-200 bg-white transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo and close button - This will join with the header */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-charcoal-200 px-6 dark:border-gray-800">
          <Logo />
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Fixed height, no scrolling */}
        <div className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigation.map(item => (
              <Button
                key={item.title}
                variant="ghost"
                className="h-10 w-full justify-start px-3 text-charcoal-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                asChild
              >
                <a href={item.href} className="flex items-center">
                  {renderIcon(item.icon)}
                  <span className="ml-3 text-sm font-medium">{item.title}</span>
                </a>
              </Button>
            ))}
          </nav>
        </div>

        {/* User profile card - Fixed at bottom, always visible */}
        <div className="flex-shrink-0 border-t border-charcoal-200 p-4 dark:border-gray-800">
          <Card className="border-charcoal-200 bg-charcoal-50 dark:border-gray-800 dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar
                  src={userProfile?.avatar_url}
                  name={userProfile?.full_name || user?.email || 'User'}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal-800 dark:text-gray-100">
                    {userProfile?.full_name || user?.email}
                  </p>
                  <p className="text-xs capitalize text-charcoal-600 dark:text-gray-400">
                    {userRole || 'student'}
                  </p>
                </div>
              </div>
              <BugReportForm
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full justify-start text-charcoal-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    Report Bug
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start text-charcoal-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content - With left margin to account for fixed sidebar */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Top header - Joined with sidebar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-charcoal-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center space-x-2 text-charcoal-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <Avatar
                  src={userProfile?.avatar_url}
                  name={userProfile?.full_name || user?.email || 'User'}
                  size="sm"
                />
                <span className="hidden text-sm font-medium sm:block">
                  {userProfile?.full_name || user?.email}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-charcoal-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-charcoal-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
