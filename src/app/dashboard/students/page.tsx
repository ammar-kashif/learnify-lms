'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Mail,
  ArrowLeft,
  Loader2,
  Search,
  MoreVertical,
  BookOpen,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

interface Student {
  id: string;
  full_name: string;
  email: string;
  enrolled_at: string;
  course_title: string;
  status: 'active';
}

export default function TeacherStudentsPage() {
  const { user, userRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch real student data
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/teacher/students?teacherId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }

        const data = await response.json();
        setStudents(data.students || []);
        setFilteredStudents(data.students || []);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user?.id]);

  // Filter students based on search term
  useEffect(() => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm]);


  // Calculate stats
  const totalStudents = students.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="space-y-8 p-6">
        {/* Header Section */}
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                Students
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300 text-lg">
                Manage and track your student progress
              </p>
            </div>
            <Link href={userRole === 'teacher' ? '/dashboard/courses' : '/dashboard'}>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Card */}
        
        <div className="flex justify-end">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg w-full max-w-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-white">{totalStudents}</p>
                </div>
                <div className="h-12 w-12 bg-blue-400/20 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-100" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search students by name or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        {loading ? (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-12 text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Loading students...</h3>
              <p className="text-slate-500 dark:text-slate-400">Please wait while we fetch your student data</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-red-200 dark:border-red-800 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Error loading students
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-red-500 hover:bg-red-600 text-white shadow-lg"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredStudents.length > 0 ? (
          <div className="grid gap-6">
            {filteredStudents.map((student) => (
              <Card
                key={student.id}
                className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">
                          {student.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {student.full_name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-slate-600 dark:text-slate-400">
                            <Mail className="mr-2 h-4 w-4" />
                            <span className="text-sm">{student.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-slate-600 dark:text-slate-400">
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span className="text-sm font-medium">{student.course_title}</span>
                          </div>
                          <div className="flex items-center text-slate-500 dark:text-slate-500">
                            <Clock className="mr-2 h-4 w-4" />
                            <span className="text-sm">Enrolled {new Date(student.enrolled_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {searchTerm ? 'No students found' : 'No students yet'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'You don\'t have any students enrolled in your courses yet.'
                }
              </p>
              {searchTerm && (
                <Button
                  onClick={() => setSearchTerm('')}
                  className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
