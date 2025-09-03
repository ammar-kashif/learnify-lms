import { NavigationItem } from '@/types/dashboard';

export const teacherNavigation: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    title: 'My Courses',
    href: '/dashboard/courses',
    icon: 'BookOpen',
    badge: '6',
  },
  {
    title: 'Browse Courses',
    href: '/courses',
    icon: 'Search',
  },
  {
    title: 'Students',
    href: '/dashboard/students',
    icon: 'Users',
    badge: '45',
  },
  {
    title: 'Content',
    href: '/dashboard/content',
    icon: 'FileText',
    children: [
      {
        title: 'Chapters',
        href: '/dashboard/content/chapters',
        icon: 'List',
      },
      {
        title: 'Resources',
        href: '/dashboard/content/resources',
        icon: 'Paperclip',
      },
      {
        title: 'Assignments',
        href: '/dashboard/content/assignments',
        icon: 'ClipboardList',
      },
    ],
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: 'BarChart3',
    children: [
      {
        title: 'Student Progress',
        href: '/dashboard/analytics/progress',
        icon: 'TrendingUp',
      },
      {
        title: 'Course Performance',
        href: '/dashboard/analytics/courses',
        icon: 'PieChart',
      },
      {
        title: 'Engagement Metrics',
        href: '/dashboard/analytics/engagement',
        icon: 'Activity',
      },
    ],
  },
  {
    title: 'Communications',
    href: '/dashboard/communications',
    icon: 'MessageSquare',
    children: [
      {
        title: 'Announcements',
        href: '/dashboard/communications/announcements',
        icon: 'Megaphone',
      },
      {
        title: 'Messages',
        href: '/dashboard/communications/messages',
        icon: 'Mail',
      },
      {
        title: 'Forums',
        href: '/dashboard/communications/forums',
        icon: 'MessageCircle',
      },
    ],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: 'Settings',
    children: [
      {
        title: 'Profile',
        href: '/dashboard/settings/profile',
        icon: 'User',
      },
      {
        title: 'Preferences',
        href: '/dashboard/settings/preferences',
        icon: 'Sliders',
      },
      {
        title: 'Notifications',
        href: '/dashboard/settings/notifications',
        icon: 'Bell',
      },
    ],
  },
];

export const studentNavigation: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    title: 'My Courses',
    href: '/dashboard/courses',
    icon: 'BookOpen',
    badge: '3',
  },
  {
    title: 'Browse Courses',
    href: '/courses',
    icon: 'Search',
  },
  {
    title: 'Learning',
    href: '/dashboard/learning',
    icon: 'GraduationCap',
    children: [
      {
        title: 'Current Lessons',
        href: '/dashboard/learning/current',
        icon: 'Play',
      },
      {
        title: 'Progress',
        href: '/dashboard/learning/progress',
        icon: 'TrendingUp',
      },
      {
        title: 'Resources',
        href: '/dashboard/learning/resources',
        icon: 'FileText',
      },
    ],
  },
  {
    title: 'Assignments',
    href: '/dashboard/assignments',
    icon: 'ClipboardList',
    badge: '5',
  },
  {
    title: 'Grades',
    href: '/dashboard/grades',
    icon: 'Award',
    children: [
      {
        title: 'Current Grades',
        href: '/dashboard/grades/current',
        icon: 'Star',
      },
      {
        title: 'Grade History',
        href: '/dashboard/grades/history',
        icon: 'History',
      },
      {
        title: 'Analytics',
        href: '/dashboard/grades/analytics',
        icon: 'BarChart3',
      },
    ],
  },
  {
    title: 'Community',
    href: '/dashboard/community',
    icon: 'Users',
    children: [
      {
        title: 'Study Groups',
        href: '/dashboard/community/study-groups',
        icon: 'Users',
      },
      {
        title: 'Forums',
        href: '/dashboard/community/forums',
        icon: 'MessageCircle',
      },
      {
        title: 'Peer Support',
        href: '/dashboard/community/peer-support',
        icon: 'Heart',
      },
    ],
  },
  {
    title: 'Calendar',
    href: '/dashboard/calendar',
    icon: 'Calendar',
    children: [
      {
        title: 'Upcoming',
        href: '/dashboard/calendar/upcoming',
        icon: 'Clock',
      },
      {
        title: 'Deadlines',
        href: '/dashboard/calendar/deadlines',
        icon: 'AlertCircle',
      },
      {
        title: 'Events',
        href: '/dashboard/calendar/events',
        icon: 'Calendar',
      },
    ],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: 'Settings',
    children: [
      {
        title: 'Profile',
        href: '/dashboard/settings/profile',
        icon: 'User',
      },
      {
        title: 'Preferences',
        href: '/dashboard/settings/preferences',
        icon: 'Sliders',
      },
      {
        title: 'Notifications',
        href: '/dashboard/settings/notifications',
        icon: 'Bell',
      },
    ],
  },
];

export const superadminNavigation: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Admin Panel',
    href: '/admin',
    icon: 'Shield',
    badge: 'Super',
  },
  {
    title: 'System Overview',
    href: '/admin/overview',
    icon: 'BarChart3',
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: 'Users',
  },
  {
    title: 'Course Management',
    href: '/admin/courses',
    icon: 'BookOpen',
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: 'Settings',
    children: [
      {
        title: 'Profile',
        href: '/dashboard/settings/profile',
        icon: 'User',
      },
      {
        title: 'System Settings',
        href: '/admin/settings',
        icon: 'Settings',
      },
      {
        title: 'Notifications',
        href: '/dashboard/settings/notifications',
        icon: 'Bell',
      },
    ],
  },
];

export const getNavigationByRole = (role: string): NavigationItem[] => {
  switch (role) {
    case 'teacher':
      return teacherNavigation;
    case 'student':
      return studentNavigation;
    case 'superadmin':
      return superadminNavigation;
    default:
      return [];
  }
};
