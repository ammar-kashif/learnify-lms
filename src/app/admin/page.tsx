'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  BookOpen, 
  UserPlus, 
  Plus, 
  Trash2, 
  GraduationCap,
  Shield,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Menu,
  Home,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'superadmin';
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
}

interface TeacherCourse {
  teacher_id: string;
  course_id: string;
}

// Note: Service role client should only be used in API routes, not client components

export default function AdminDashboard() {
  const { user, userRole, loading, signOut } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [paymentVerifications, setPaymentVerifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'courses' | 'assignments' | 'payments'>('users');
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin' | 'superadmin'>('all');
  const [courseSearch, setCourseSearch] = useState('');
  
  // Form states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAssignCourse, setShowAssignCourse] = useState(false);
  
  // User form
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'student' | 'teacher' | 'admin' | 'superadmin'
  });
  
  // Course form
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: ''
  });
  
  // Assignment form
  const [assignmentForm, setAssignmentForm] = useState({
    teacherId: '',
    courseId: ''
  });

  useEffect(() => {
    // Allow both superadmin and admin to access admin dashboard
    if (!loading && (!user || (userRole !== 'superadmin' && userRole !== 'admin'))) {
      // Redirect to landing page instead of dashboard to prevent flash
      router.push('/');
    }
  }, [user, userRole, loading, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      console.log('🔄 Fetching admin dashboard data (core: users, courses, assignments)...');
      setDataLoading(true);
      setError(null);
      
      const usersPromise = supabase
        .from('users')
        .select('id,email,full_name,role,created_at')
        .order('created_at', { ascending: false });

      const coursesPromise = supabase
        .from('courses')
        .select('id,title,description,created_at,created_by')
        .order('created_at', { ascending: false });

      const assignmentsPromise = supabase
        .from('teacher_courses')
        .select('teacher_id,course_id');

      const [usersRes, coursesRes, assignmentsRes] = await Promise.all([
        usersPromise, coursesPromise, assignmentsPromise
      ]);

      if (usersRes.error) {
        console.error('❌ Error fetching users:', usersRes.error);
        setError('Failed to fetch users.');
      } else {
        setUsers(usersRes.data || []);
      }

      if (coursesRes.error) {
        console.error('❌ Error fetching courses:', coursesRes.error);
        setError((prev) => prev || 'Failed to fetch courses.');
      } else {
        setCourses(coursesRes.data || []);
      }

      if (assignmentsRes.error) {
        console.error('❌ Error fetching assignments:', assignmentsRes.error);
        setError((prev) => prev || 'Failed to fetch assignments.');
      } else {
        setTeacherCourses(assignmentsRes.data || []);
      }

      console.log('✅ Core admin data fetch completed');
    } catch (error) {
      console.error('💥 Unexpected error fetching admin data:', error);
      setError('An unexpected error occurred.');
    } finally {
      setDataLoading(false);
    }
  }, [user, userRole]);

  const fetchPayments = useCallback(async () => {
    try {
      console.log('💳 Fetching payment verifications (on-demand)...');
      const { data: { session } } = await supabase.auth.getSession();
      const paymentsResponse = await fetch('/api/payment-verifications', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPaymentVerifications(paymentsData?.paymentVerifications || []);
      } else {
        console.error('❌ Error fetching payment verifications:', paymentsResponse.status);
      }
    } catch (error) {
      console.error('❌ Error fetching payment verifications:', error);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchData();
    }
  }, [userRole, fetchData]);

  // Lazy-load payments only when tab is opened and not already loaded
  useEffect(() => {
    if (activeTab === 'payments' && paymentVerifications.length === 0) {
      fetchPayments();
    }
  }, [activeTab, paymentVerifications.length, fetchPayments]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🚀 Creating new user:', userForm.email);
      
      // Validate form data
      if (!userForm.email || !userForm.password || !userForm.fullName || !userForm.role) {
        alert('Please fill in all required fields');
        return;
      }

      // Validate password strength
      if (userForm.password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userForm.email)) {
        alert('Please enter a valid email address');
        return;
      }

      setDataLoading(true);
      
      // Enforce: only superadmin can create an admin user
      if (userRole === 'admin' && userForm.role === 'admin') {
        alert('Only superadmins can create admin users.');
        setDataLoading(false);
        return;
      }

      // Use our server-side API endpoint instead of client-side admin method
      console.log('🔐 Creating user via server API...');
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password,
          fullName: userForm.fullName,
          role: userForm.role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ User creation failed:', result.error);
        
        // Handle specific error cases
        if (result.error.includes('already exists')) {
          alert('A user with this email already exists. Please use a different email address.');
        } else if (result.error.includes('Password')) {
          alert('Password is too weak. Please use a stronger password.');
        } else if (result.error.includes('Invalid email')) {
          alert('Please enter a valid email address.');
        } else {
          alert(`Failed to create user: ${result.error}`);
        }
        return;
      }

      console.log('✅ User created successfully:', result.user);
      
      // Show success message
      alert(`User "${userForm.fullName}" created successfully!\n\nEmail: ${userForm.email}\nRole: ${userForm.role}\n\nThey can now sign in with their email and password.`);
      
      // Reset form and close modal
      setUserForm({ email: '', password: '', fullName: '', role: 'student' });
      setShowAddUser(false);
      
      // Refresh the data
      await fetchData();
      
    } catch (error) {
      console.error('💥 Unexpected error creating user:', error);
      
      if (error instanceof Error) {
        alert(`Failed to create user: ${error.message}`);
      } else {
        alert('An unexpected error occurred while creating the user. Please try again.');
      }
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🚀 Creating new course:', courseForm.title);
      
      const courseData = {
        title: courseForm.title,
        description: courseForm.description,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Course data:', courseData);

      const { error } = await supabase
        .from('courses')
        .insert([courseData]);

      if (error) {
        console.error('❌ Course creation failed:', error);
        throw error;
      }

      console.log('✅ Course created successfully');

      // Reset form and refresh data
      setCourseForm({ title: '', description: '' });
      setShowAddCourse(false);
      
      // Show success message
      alert('Course created successfully!');
      
      // Refresh the data
      await fetchData();
    } catch (error) {
      console.error('💥 Error creating course:', error);
      alert(`Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🚀 Assigning course to teacher...');
      console.log('👨‍🏫 Teacher ID:', assignmentForm.teacherId);
      console.log('📚 Course ID:', assignmentForm.courseId);
      
      const assignmentData = {
        teacher_id: assignmentForm.teacherId,
        course_id: assignmentForm.courseId,
      };

      console.log('📝 Assignment data:', assignmentData);

      const { error } = await supabase
        .from('teacher_courses')
        .insert([assignmentData]);

      if (error) {
        console.error('❌ Course assignment failed:', error);
        throw error;
      }

      console.log('✅ Course assigned successfully');

      // Reset form and refresh data
      setAssignmentForm({ teacherId: '', courseId: '' });
      setShowAssignCourse(false);
      
      // Show success message
      alert('Course assigned successfully!');
      
      // Refresh the data
      await fetchData();
    } catch (error) {
      console.error('💥 Error assigning course:', error);
      alert(`Failed to assign course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        console.log('🗑️ Deleting user:', userId);
        // Prevent admin from deleting a superadmin
        if (userRole === 'admin') {
          const target = users.find(u => u.id === userId);
          if (target?.role === 'superadmin') {
            alert('Admins are not allowed to delete a superadmin.');
            return;
          }
        }
        
        // Delete from users table first
        const { error: profileError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error('❌ Failed to delete user profile:', profileError);
          throw profileError;
        }

        console.log('✅ User profile deleted successfully');

        // Try to delete from auth (this might fail if user is currently signed in)
        try {
          const { error: authError } = await supabase.auth.admin.deleteUser(userId);
          if (authError) {
            console.warn('⚠️ Could not delete auth user (might be signed in):', authError);
          } else {
            console.log('✅ Auth user deleted successfully');
          }
        } catch (authDeleteError) {
          console.warn('⚠️ Auth user deletion failed (non-critical):', authDeleteError);
        }

        // Show success message
        alert('User deleted successfully!');
        
        // Refresh the data
        await fetchData();
      } catch (error) {
        console.error('💥 Error deleting user:', error);
        alert(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleDeleteAssignment = async (teacherId: string, courseId: string) => {
    if (confirm('Are you sure you want to remove this teacher-course assignment? This action cannot be undone.')) {
      try {
        console.log('🗑️ Removing teacher-course assignment:', { teacherId, courseId });
        
        const { error } = await supabase
          .from('teacher_courses')
          .delete()
          .eq('teacher_id', teacherId)
          .eq('course_id', courseId);

        if (error) {
          console.error('❌ Failed to remove assignment:', error);
          throw error;
        }

        console.log('✅ Assignment removed successfully');

        // Show success message
        alert('Teacher-course assignment removed successfully!');
        
        // Refresh the data
        await fetchData();
      } catch (error) {
        console.error('💥 Error removing assignment:', error);
        alert(`Failed to remove assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handlePaymentAction = async (paymentId: string, status: 'approved' | 'rejected') => {
    const action = status === 'approved' ? 'approve' : 'reject';
    if (confirm(`Are you sure you want to ${action} this payment verification?`)) {
      try {
        console.log(`🔄 ${action.charAt(0).toUpperCase() + action.slice(1)}ing payment verification:`, paymentId);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No authentication token found');
        }

        console.log('🔍 Making API request to:', `/api/payment-verifications/${paymentId}`);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`/api/payment-verifications/${paymentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ status }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        console.log('🔍 API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API error response:', errorData);
          throw new Error(errorData.error || `Failed to ${action} payment verification`);
        }

        const responseData = await response.json();
        console.log('✅ API response data:', responseData);
        console.log(`✅ Payment verification ${action}ed successfully`);
        alert(`Payment verification ${action}ed successfully!`);
        
        // Refresh the data
        console.log('🔄 Refreshing data...');
        await fetchData();
        console.log('✅ Data refreshed');
      } catch (error) {
        console.error(`💥 Error ${action}ing payment verification:`, error);
        if (error instanceof Error && error.name === 'AbortError') {
          alert(`Request timed out. Please try again.`);
        } else {
          alert(`Failed to ${action} payment verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm('Are you sure you want to delete this payment verification entry? This action cannot be undone.')) {
      try {
        console.log('🗑️ Deleting payment verification:', paymentId);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No authentication token found');
        }

        console.log('🔍 Making DELETE request to:', `/api/payment-verifications/${paymentId}`);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`/api/payment-verifications/${paymentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        console.log('🔍 DELETE response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ DELETE error response:', errorData);
          throw new Error(errorData.error || 'Failed to delete payment verification');
        }

        const responseData = await response.json();
        console.log('✅ DELETE response data:', responseData);
        console.log('✅ Payment verification deleted successfully');
        alert('Payment verification deleted successfully!');
        
        // Refresh the data
        console.log('🔄 Refreshing data after delete...');
        await fetchData();
        console.log('✅ Data refreshed after delete');
      } catch (error) {
        console.error('💥 Error deleting payment verification:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          alert(`Request timed out. Please try again.`);
        } else {
          alert(`Failed to delete payment verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        console.log('🗑️ Deleting course:', courseId);
        
        // First, delete any teacher assignments for this course
        const { error: assignmentError } = await supabase
          .from('teacher_courses')
          .delete()
          .eq('course_id', courseId);

        if (assignmentError) {
          console.error('❌ Failed to delete teacher assignments:', assignmentError);
          throw assignmentError;
        }

        console.log('✅ Teacher assignments deleted successfully');

        // Now delete the course
        const { error: courseError } = await supabase
          .from('courses')
          .delete()
          .eq('id', courseId);

        if (courseError) {
          console.error('❌ Failed to delete course:', courseError);
          throw courseError;
        }

        console.log('✅ Course deleted successfully');

        // Show success message
        alert('Course deleted successfully!');
        
        // Refresh the data
        await fetchData();
      } catch (error) {
        console.error('💥 Error deleting course:', error);
        alert(`Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');

  const filteredUsers = users
    .filter(u => {
      if (userRoleFilter === 'all') return true;
      return u.role === userRoleFilter;
    })
    .filter(u => {
      const q = userSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });

  const filteredCourses = courses.filter(c => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  const navigationItems = [
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'courses', label: 'Courses', icon: BookOpen, count: courses.length },
    { id: 'assignments', label: 'Assignments', icon: GraduationCap, count: teacherCourses.length },
    { id: 'payments', label: 'Payments', icon: CreditCard, count: paymentVerifications.length },
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || (userRole !== 'superadmin' && userRole !== 'admin')) {
    return <div className="flex items-center justify-center min-h-screen">Access Denied</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed lg:relative h-full z-50 ${!sidebarOpen ? 'lg:w-16' : 'lg:w-64'}`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-orange-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Admin</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'default' : 'ghost'}
              className={`w-full justify-start ${activeTab === item.id 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab(item.id as any)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full">
                  <span>{item.label}</span>
                  <Badge variant="secondary" className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {item.count}
                  </Badge>
                </div>
              )}
            </Button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => router.push('/dashboard')}
          >
            <Home className="h-4 w-4 mr-3" />
            {sidebarOpen && <span>Dashboard</span>}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={toggleTheme}
            disabled={!mounted}
          >
            {mounted && theme === 'dark' ? <Sun className="h-4 w-4 mr-3" /> : <Moon className="h-4 w-4 mr-3" />}
            {sidebarOpen && <span>Theme</span>}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            {sidebarOpen && <span>Sign Out</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeTab === 'users' && 'User Management'}
                  {activeTab === 'courses' && 'Course Management'}
                  {activeTab === 'assignments' && 'Teacher Assignments'}
                  {activeTab === 'payments' && 'Payment Verification'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Welcome back, {user?.user_metadata?.full_name || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                {user?.user_metadata?.full_name || 'Superadmin'}
              </Badge>
              <Button 
                variant="outline" 
                onClick={fetchData}
                disabled={dataLoading}
                size="sm"
                className="border-gray-300 dark:border-gray-600"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Error Display */}
          {error && (
            <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-800"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {dataLoading && (
            <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <p className="text-sm text-blue-800 dark:text-blue-200">Loading data...</p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-white">
              {users.length}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {students.length} students, {teachers.length} teachers
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
              Total Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-white">
              {courses.length}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              Active courses
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Assignments
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-white">
              {teacherCourses.length}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Teacher-course pairs
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
              System Status
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-white">
              Active
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

          {/* Content based on active tab */}
          {/* Users Tab */}
          {activeTab === 'users' && (
              <div>
                <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
                  <div className="flex flex-1 gap-3 md:justify-end">
                    <div className="w-full md:w-64">
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <Select
                      value={userRoleFilter}
                      onValueChange={(value: 'all' | 'student' | 'teacher' | 'admin' | 'superadmin') => setUserRoleFilter(value)}
                    >
                      <SelectTrigger className="w-36 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Filter role" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-600">
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => setShowAddUser(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={
                                user.role === 'superadmin' ? 'default' :
                                user.role === 'teacher' ? 'outline' : 'outline'
                              }
                              className={
                                user.role === 'superadmin' ? 'bg-orange-600 text-white' :
                                user.role === 'teacher' ? 'bg-green-100 text-green-800 border-green-300' : 
                                'bg-gray-100 text-gray-800 border-gray-300'
                              }
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <div>
                <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Course Management</h2>
                  <div className="flex flex-1 gap-3 md:justify-end">
                    <div className="w-full md:w-64">
                      <Input
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <Button onClick={() => setShowAddCourse(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <Card key={course.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-lg text-gray-900 dark:text-white">{course.title}</CardTitle>
                        <CardDescription className="text-gray-700 dark:text-gray-300">{course.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Created: {new Date(course.created_at).toLocaleDateString()}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCourse(course.id)}
                            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Teacher Assignments</h2>
                  <Button onClick={() => setShowAssignCourse(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Course
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Teacher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {teacherCourses.map((assignment) => {
                        const teacher = users.find(u => u.id === assignment.teacher_id);
                        const course = courses.find(c => c.id === assignment.course_id);
                        
                        return (
                          <tr key={`${assignment.teacher_id}-${assignment.course_id}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {teacher?.full_name || 'Unknown Teacher'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{teacher?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {course?.title || 'Unknown Course'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteAssignment(assignment.teacher_id, assignment.course_id)}
                                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Verification Tab */}
            {activeTab === 'payments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Verification</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Requested
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {paymentVerifications.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            No payment verification requests found
                          </td>
                        </tr>
                      ) : (
                        paymentVerifications.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {payment.users?.full_name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {payment.users?.email || 'Unknown'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {payment.courses?.title || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              PKR {payment.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  payment.status === 'approved' ? 'default' :
                                  payment.status === 'rejected' ? 'destructive' : 'secondary'
                                }
                                className={
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  payment.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }
                              >
                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                {payment.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handlePaymentAction(payment.id, 'approved')}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handlePaymentAction(payment.id, 'rejected')}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {payment.status !== 'pending' && (
                                  <span className="text-gray-400 dark:text-gray-500 mr-2">
                                    {payment.verified_at ? new Date(payment.verified_at).toLocaleDateString() : 'N/A'}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeletePayment(payment.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Add New User</h3>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>What happens when you create a user:</strong>
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 list-disc list-inside space-y-1">
                <li>User account is created in the authentication system</li>
                <li>User profile is added to the database</li>
                <li>User can immediately sign in with their email and password</li>
                <li>User will have access based on their assigned role</li>
              </ul>
            </div>
            

            <form onSubmit={handleAddUser}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-900 dark:text-white">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    placeholder="user@example.com"
                    className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${userForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email) ? 'border-red-300 dark:border-red-500' : ''}`}
                  />
                  {userForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email) && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Please enter a valid email address</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password" className="text-gray-900 dark:text-white">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                    placeholder="Minimum 6 characters"
                    className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${userForm.password && userForm.password.length < 6 ? 'border-red-300 dark:border-red-500' : ''}`}
                  />
                  {userForm.password && userForm.password.length < 6 && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Password must be at least 6 characters long</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fullName" className="text-gray-900 dark:text-white">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                    placeholder="John Doe"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-gray-900 dark:text-white">Role *</Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(value: 'student' | 'teacher' | 'admin' | 'superadmin') => 
                      setUserForm({ ...userForm, role: value })
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      <SelectItem value="student" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Student</SelectItem>
                      <SelectItem value="teacher" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Teacher</SelectItem>
                      {userRole === 'superadmin' && (
                        <SelectItem value="admin" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Admin</SelectItem>
                      )}
                      <SelectItem value="superadmin" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUser(false)}
                  disabled={dataLoading}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={dataLoading || !userForm.email || !userForm.password || !userForm.fullName || userForm.password.length < 6}
                  className="min-w-[100px]"
                >
                  {dataLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Add User'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Add New Course</h3>
            <form onSubmit={handleAddCourse}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-gray-900 dark:text-white">Course Title</Label>
                  <Input
                    id="title"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-gray-900 dark:text-white">Description</Label>
                  <Input
                    id="description"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddCourse(false)}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-700">
                  Add Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Assign Course to Teacher</h3>
            <form onSubmit={handleAssignCourse}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="teacherId" className="text-gray-900 dark:text-white">Teacher</Label>
                  <Select
                    value={assignmentForm.teacherId}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, teacherId: value })}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">
                          {teacher.full_name} ({teacher.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="courseId" className="text-gray-900 dark:text-white">Course</Label>
                  <Select
                    value={assignmentForm.courseId}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, courseId: value })}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAssignCourse(false)}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-700">
                  Assign Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
)}