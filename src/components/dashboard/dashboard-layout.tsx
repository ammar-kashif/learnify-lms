'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Menu, 
  X, 
  LogOut, 
  User,
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
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getNavigationByRole } from '@/config/navigation';
import ThemeToggle from '@/components/theme-toggle';

// Icon mapping for navigation items
const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
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
  Activity
};

// Logo Component
function Logo() {
  return (
    <div className="flex items-center space-x-3">
      <img src="/images/Logo.PNG" alt="Learnify Logo" className="w-10 h-10" />
      <span className="text-xl font-bold text-charcoal-800">Learnify</span>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = getNavigationByRole(user?.user_metadata?.role || 'student');

  const handleSignOut = async () => {
    await signOut();
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <FileText className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed and non-scrollable */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-charcoal-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col overflow-y-hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo and close button - This will join with the header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-charcoal-200 dark:border-gray-800 flex-shrink-0">
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
            {navigation.map((item) => (
              <Button
                key={item.title}
                variant="ghost"
                className="w-full justify-start text-charcoal-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10 h-10 px-3"
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
        <div className="p-4 border-t border-charcoal-200 dark:border-gray-800 flex-shrink-0">
          <Card className="bg-charcoal-50 dark:bg-gray-800 border-charcoal-200 dark:border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-800 dark:text-gray-100 truncate">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-charcoal-600 dark:text-gray-400 capitalize">
                    {user?.user_metadata?.role || 'student'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content - With left margin to account for fixed sidebar */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top header - Joined with sidebar */}
        <header className="bg-white dark:bg-gray-900 border-b border-charcoal-200 dark:border-gray-800 h-16 flex items-center justify-between px-6 flex-shrink-0">
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
                className="flex items-center space-x-2 text-charcoal-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-charcoal-200 dark:border-gray-800 py-1 z-50">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-charcoal-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content - Scrollable */}
        <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
