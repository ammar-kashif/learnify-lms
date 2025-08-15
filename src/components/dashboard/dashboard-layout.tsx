'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getNavigationByRole } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
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
  ChevronDown,
  Menu,
  X,
  Search,
  Bell,
  User,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navigation = getNavigationByRole(user?.user_metadata?.role || 'student');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const renderIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      LayoutDashboard: <LayoutDashboard className="h-4 w-4" />,
      BookOpen: <BookOpen className="h-4 w-4" />,
      Users: <Users className="h-4 w-4" />,
      FileText: <FileText className="h-4 w-4" />,
      BarChart3: <BarChart3 className="h-4 w-4" />,
      MessageSquare: <MessageSquare className="h-4 w-4" />,
      Settings: <Settings className="h-4 w-4" />,
      GraduationCap: <GraduationCap className="h-4 w-4" />,
      ClipboardList: <ClipboardList className="h-4 w-4" />,
      Award: <Award className="h-4 w-4" />,
      Calendar: <Calendar className="h-4 w-4" />,
      List: <FileText className="h-4 w-4" />,
      Paperclip: <FileText className="h-4 w-4" />,
      TrendingUp: <BarChart3 className="h-4 w-4" />,
      PieChart: <BarChart3 className="h-4 w-4" />,
      Activity: <BarChart3 className="h-4 w-4" />,
      Megaphone: <MessageSquare className="h-4 w-4" />,
      Mail: <MessageSquare className="h-4 w-4" />,
      MessageCircle: <MessageSquare className="h-4 w-4" />,
      User: <User className="h-4 w-4" />,
      Sliders: <Settings className="h-4 w-4" />,
      Bell: <Bell className="h-4 w-4" />,
      Play: <BookOpen className="h-4 w-4" />,
      Star: <Award className="h-4 w-4" />,
      History: <Calendar className="h-4 w-4" />,
      Heart: <Users className="h-4 w-4" />,
      Clock: <Calendar className="h-4 w-4" />,
      AlertCircle: <Bell className="h-4 w-4" />
    };
    return iconMap[iconName] || <FileText className="h-4 w-4" />;
  };

  const renderNavigationItem = (item: any, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.href);

    return (
      <div key={item.href} className="space-y-1">
        <Link
          href={item.href}
          className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isItemActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          } ${level > 0 ? 'ml-4' : ''}`}
        >
          <div className="flex items-center space-x-3">
            {renderIcon(item.icon)}
            <span>{item.title}</span>
          </div>
          <div className="flex items-center space-x-2">
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
            {hasChildren && (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </Link>
        
        {hasChildren && (
          <div className="ml-4 space-y-1">
            {item.children.map((child: any) => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Learnify LMS</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.user_metadata?.full_name || user?.email || 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.user_metadata?.role || 'student'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => renderNavigationItem(item))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-8 pr-4 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
