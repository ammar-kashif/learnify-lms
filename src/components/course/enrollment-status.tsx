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
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
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
}

interface Course {
  id: string;
  title: string;
  description?: string;
}

interface EnrollmentStatusProps {
  courseId: string;
  userRole: string;
}

export default function EnrollmentStatus({ courseId }: EnrollmentStatusProps) {
  const { session } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<EnrollmentStats | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);

  const fetchEnrollments = async () => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/enrollments`, {
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
      setCourse(data.course || null);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch enrollments');
      toast.error('Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [courseId, session?.access_token]);

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = 
      enrollment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' || 
      enrollment.enrollmentType === filterType ||
      (filterType === 'with-subscription' && enrollment.subscription) ||
      (filterType === 'with-demo' && enrollment.demoAccess.length > 0);

    return matchesSearch && matchesFilter;
  });

  const getEnrollmentBadge = (enrollment: Enrollment) => {
    if (enrollment.subscription) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
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

  const isSubscriptionActive = (subscription: Enrollment['subscription']) => {
    if (!subscription) return false;
    const now = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    return subscription.status === 'active' && expiresAt > now;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enrollment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading enrollment data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enrollment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchEnrollments} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enrollment Status
            </CardTitle>
            <CardDescription>
              {course?.title} - {stats?.total || 0} total enrollments
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
              <div className="text-sm text-green-800">Paid</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.demo}</div>
              <div className="text-sm text-yellow-800">Demo</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.withSubscriptions}</div>
              <div className="text-sm text-purple-800">Subscriptions</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search Students</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
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
        </div>

        {/* Enrollments List */}
        <div className="space-y-3">
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No enrollments found matching your criteria.
            </div>
          ) : (
            filteredEnrollments.map((enrollment) => (
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
                          <span className={isSubscriptionActive(enrollment.subscription) ? 'text-green-600' : 'text-red-600'}>
                            {enrollment.subscription.status}
                          </span>
                          {enrollment.subscription.expiresAt && (
                            <div className="text-xs text-muted-foreground">
                              Expires: {formatDate(enrollment.subscription.expiresAt)}
                            </div>
                          )}
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

        {/* Refresh Button */}
        <div className="flex justify-center">
          <Button onClick={fetchEnrollments} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
