'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Avatar from '@/components/ui/avatar';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Star, 
  Crown, 
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  courseId: string;
  courseTitle: string;
  enrollmentType: 'paid' | 'demo';
  enrolledAt: string;
  subscription?: {
    id: string;
    status: string;
    planName: string;
    planType: string;
    price: number;
    startsAt: string;
    expiresAt: string;
  };
  demoAccess: Array<{
    accessType: string;
    usedAt?: string;
    expiresAt: string;
  }>;
}

interface EnrollmentStats {
  total: number;
  paid: number;
  demo: number;
  withSubscriptions: number;
  withDemoAccess: number;
  totalRevenue: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
}

export default function AdminEnrollmentsPage() {
  const { session, userRole } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<EnrollmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [courses, setCourses] = useState<Array<{id: string, title: string}>>([]);
  const itemsPerPage = 20;

  const fetchEnrollments = async () => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/enrollments', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch enrollments');
      }

      const data = await response.json();
      setEnrollments(data.enrollments || []);
      setStats(data.stats || null);
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch enrollments');
      toast.error('Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'superadmin' || userRole === 'admin') {
      fetchEnrollments();
    }
  }, [session?.access_token, userRole]);

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = 
      enrollment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTypeFilter = 
      filterType === 'all' || 
      enrollment.enrollmentType === filterType ||
      (filterType === 'with-subscription' && enrollment.subscription) ||
      (filterType === 'with-demo' && enrollment.demoAccess.length > 0);

    const matchesCourseFilter = 
      filterCourse === 'all' || 
      enrollment.courseId === filterCourse;

    return matchesSearch && matchesTypeFilter && matchesCourseFilter;
  });

  const totalPages = Math.ceil(filteredEnrollments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEnrollments = filteredEnrollments.slice(startIndex, startIndex + itemsPerPage);

  const getEnrollmentBadge = (enrollment: Enrollment) => {
    if (enrollment.subscription) {
      const isActive = enrollment.subscription.status === 'active' && 
        new Date(enrollment.subscription.expiresAt) > new Date();
      return (
        <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
          <Crown className="h-3 w-3 mr-1" />
          {enrollment.subscription.planName}
        </Badge>
      );
    }
    
    if (enrollment.enrollmentType === 'paid') {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800">
          <UserCheck className="h-3 w-3 mr-1" />
          Paid Enrollment
        </Badge>
      );
    }
    
    if (enrollment.enrollmentType === 'demo') {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Star className="h-3 w-3 mr-1" />
          Demo Enrollment
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <UserX className="h-3 w-3 mr-1" />
        Unknown
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (userRole !== 'superadmin' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <UserX className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-300">
              You don&apos;t have permission to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading enrollment data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <UserX className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <Button onClick={fetchEnrollments} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Enrollment Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Monitor and manage all course enrollments across the platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button onClick={fetchEnrollments} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Paid</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.demo}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Demo</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.activeSubscriptions}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Active Subs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Revenue (PKR)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.withDemoAccess}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Demo Access</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search students or courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filter">Filter by Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Enrollments</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                    <SelectItem value="demo">Demo Only</SelectItem>
                    <SelectItem value="with-subscription">With Subscription</SelectItem>
                    <SelectItem value="with-demo">With Demo Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="course">Filter by Course</Label>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger>
                    <BookOpen className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enrollments ({filteredEnrollments.length})
            </CardTitle>
            <CardDescription>
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEnrollments.length)} of {filteredEnrollments.length} enrollments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paginatedEnrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No enrollments found matching your criteria.
                </div>
              ) : (
                paginatedEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar 
                        src={enrollment.studentAvatar} 
                        alt={enrollment.studentName}
                        className="h-10 w-10"
                      />
                      <div>
                        <div className="font-medium">{enrollment.studentName}</div>
                        <div className="text-sm text-muted-foreground">{enrollment.studentEmail}</div>
                        <div className="text-xs text-muted-foreground">
                          <Link 
                            href={`/dashboard/courses/${enrollment.courseId}`}
                            className="hover:underline text-blue-600 dark:text-blue-400"
                          >
                            {enrollment.courseTitle}
                          </Link>
                          {' • '}
                          Enrolled {formatDate(enrollment.enrolledAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getEnrollmentBadge(enrollment)}
                      
                      {showDetails && (
                        <div className="text-right text-sm space-y-1">
                          {enrollment.subscription && (
                            <div className="text-xs">
                              <span className="font-medium">Subscription:</span>{' '}
                              <span className={enrollment.subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                                {enrollment.subscription.status}
                              </span>
                              {enrollment.subscription.expiresAt && (
                                <div className="text-xs text-muted-foreground">
                                  Expires: {formatDate(enrollment.subscription.expiresAt)}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(enrollment.subscription.price)}
                              </div>
                            </div>
                          )}
                          
                          {enrollment.demoAccess.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">Demo Access:</span>{' '}
                              <span className="text-yellow-600">
                                {enrollment.demoAccess.length} active
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
