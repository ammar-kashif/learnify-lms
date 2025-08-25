'use client';

import { useState, useEffect } from 'react';
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
  Moon
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

export default function AdminDashboard() {
  const { user, userRole, loading, signOut } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'courses' | 'assignments'>('users');
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAssignCourse, setShowAssignCourse] = useState(false);
  
  // User form
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'student' | 'teacher' | 'superadmin'
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
    if (!loading && (!user || userRole !== 'superadmin')) {
      // Redirect to landing page instead of dashboard to prevent flash
      router.push('/');
    }
  }, [user, userRole, loading, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchData();
    }
  }, [userRole]);

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching admin dashboard data...');
      console.log('🔑 Current user ID:', user?.id);
      console.log('🔑 Current user role:', userRole);
      
      // Debug JWT token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Current session:', session);
      console.log('🎫 JWT token:', session?.access_token);
      console.log('📋 User metadata from session:', session?.user?.user_metadata);
      
      setDataLoading(true);
      setError(null);
      
      // Fetch users
      console.log('👥 Fetching users...');
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 Raw users response:', { usersData, usersError });
      console.log('🔍 Response status:', usersError ? 'ERROR' : 'SUCCESS');
      console.log('🔍 Response data length:', usersData?.length || 0);
      
      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        console.error('❌ Error details:', {
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint,
          code: usersError.code
        });
        setError('Failed to fetch users.');
      } else {
        console.log('✅ Users fetched successfully:', usersData?.length || 0, 'users');
        console.log('👥 All users data:', usersData);
        setUsers(usersData || []);
      }

      // Fetch courses
      console.log('📚 Fetching courses...');
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (coursesError) {
        console.error('❌ Error fetching courses:', coursesError);
        setError('Failed to fetch courses.');
      } else {
        console.log('✅ Courses fetched successfully:', coursesData?.length || 0, 'courses');
        setCourses(coursesData || []);
      }

      // Fetch teacher-course assignments
      console.log('🎓 Fetching teacher-course assignments...');
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('teacher_courses')
        .select('*');
      
      if (assignmentsError) {
        console.error('❌ Error fetching assignments:', assignmentsError);
        setError('Failed to fetch assignments.');
      } else {
        console.log('✅ Assignments fetched successfully:', assignmentsData?.length || 0, 'assignments');
        setTeacherCourses(assignmentsData || []);
      }

      console.log('✅ Admin dashboard data fetch completed');
    } catch (error) {
      console.error('💥 Unexpected error fetching admin data:', error);
      setError('An unexpected error occurred.');
    } finally {
      setDataLoading(false);
    }
  };

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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || userRole !== 'superadmin') {
    return <div className="flex items-center justify-center min-h-screen">Access Denied</div>;
  }

  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
              <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Superadmin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {user.user_metadata?.full_name || 'Superadmin'}
              </Badge>
              <Button 
                variant="outline" 
                onClick={toggleTheme}
                size="sm"
                disabled={!mounted}
                className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                size="sm"
                className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchData}
                disabled={dataLoading}
                className="flex items-center space-x-2 bg-white border-gray-300 text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>

              <Button variant="outline" onClick={() => router.push('/dashboard')} className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
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
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-sm text-blue-800">Loading data...</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {students.length} students, {teachers.length} teachers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{courses.length}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Active courses</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Assignments</CardTitle>
              <GraduationCap className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{teacherCourses.length}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Teacher-course pairs</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">System Status</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">Active</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'users', label: 'User Management', icon: Users },
                { id: 'courses', label: 'Course Management', icon: BookOpen },
                { id: 'assignments', label: 'Teacher Assignments', icon: GraduationCap }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <tab.icon className="h-5 w-5 inline mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
                  <Button onClick={() => setShowAddUser(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
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
                      {users.map((user) => (
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
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Course Management</h2>
                  <Button onClick={() => setShowAddCourse(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
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
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 text-gray-900">Add New User</h3>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>What happens when you create a user:</strong>
              </p>
              <ul className="text-xs text-blue-700 mt-1 list-disc list-inside space-y-1">
                <li>User account is created in the authentication system</li>
                <li>User profile is added to the database</li>
                <li>User can immediately sign in with their email and password</li>
                <li>User will have access based on their assigned role</li>
              </ul>
            </div>
            

            <form onSubmit={handleAddUser}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-900">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    placeholder="user@example.com"
                    className={`bg-white border-gray-300 text-gray-900 ${userForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email) ? 'border-red-300' : ''}`}
                  />
                  {userForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email) && (
                    <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password" className="text-gray-900">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                    placeholder="Minimum 6 characters"
                    className={`bg-white border-gray-300 text-gray-900 ${userForm.password && userForm.password.length < 6 ? 'border-red-300' : ''}`}
                  />
                  {userForm.password && userForm.password.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters long</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fullName" className="text-gray-900">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                    placeholder="John Doe"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-gray-900">Role *</Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(value: 'student' | 'teacher' | 'superadmin') => 
                      setUserForm({ ...userForm, role: value })
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300">
                      <SelectItem value="student" className="text-gray-900 hover:bg-gray-100">Student</SelectItem>
                      <SelectItem value="teacher" className="text-gray-900 hover:bg-gray-100">Teacher</SelectItem>
                      <SelectItem value="superadmin" className="text-gray-900 hover:bg-gray-100">Superadmin</SelectItem>
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
                  className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 text-gray-900">Add New Course</h3>
            <form onSubmit={handleAddCourse}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-gray-900">Course Title</Label>
                  <Input
                    id="title"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-gray-900">Description</Label>
                  <Input
                    id="description"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddCourse(false)}
                  className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button type="submit">Add Course</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 text-gray-900">Assign Course to Teacher</h3>
            <form onSubmit={handleAssignCourse}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="teacherId" className="text-gray-900">Teacher</Label>
                  <Select
                    value={assignmentForm.teacherId}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, teacherId: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300">
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id} className="text-gray-900 hover:bg-gray-100">
                          {teacher.full_name} ({teacher.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="courseId" className="text-gray-900">Course</Label>
                  <Select
                    value={assignmentForm.courseId}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, courseId: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300">
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id} className="text-gray-900 hover:bg-gray-100">
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
                  className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button type="submit">Assign Course</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
