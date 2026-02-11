'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Video,
  Calendar,
  TrendingUp,
  Plus,
  Trash2,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface DemoAccess {
  id: string;
  user_id: string;
  course_id: string;
  access_type: 'lecture_recording' | 'live_class';
  resource_id: string | null;
  expires_at: string;
  used_at: string;
  users: {
    id: string;
    full_name: string;
    email: string;
  };
  courses: {
    id: string;
    title: string;
  };
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  byType: {
    lecture_recording: number;
    live_class: number;
  };
}

export default function DemoAccessPage() {
  const { session, userRole } = useAuth();
  const [demos, setDemos] = useState<DemoAccess[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  
  // Grant demo form state
  const [grantUserId, setGrantUserId] = useState('');
  const [grantCourseId, setGrantCourseId] = useState('');
  const [grantAccessType, setGrantAccessType] = useState<'lecture_recording' | 'live_class'>('lecture_recording');

  const loadDemos = async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterCourse !== 'all') {
        params.append('courseId', filterCourse);
      }

      const response = await fetch(`/api/admin/demo/list?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch demos');
      }

      const data = await response.json();
      setDemos(data.demos || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error loading demos:', error);
      toast.error('Failed to load demo access data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemos();
  }, [session, filterStatus, filterCourse]);

  const handleRevoke = async (demoId: string) => {
    if (!session?.access_token) return;
    if (!confirm('Are you sure you want to revoke this demo access?')) return;

    try {
      const response = await fetch(`/api/demo-access?id=${demoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke demo');
      }

      toast.success('Demo access revoked successfully');
      loadDemos();
    } catch (error) {
      console.error('Error revoking demo:', error);
      toast.error('Failed to revoke demo access');
    }
  };

  const handleGrantDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setIsGranting(true);
    try {
      const response = await fetch('/api/admin/demo/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: grantUserId,
          courseId: grantCourseId,
          accessType: grantAccessType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to grant demo');
      }

      toast.success('Demo access granted successfully');
      setIsGrantModalOpen(false);
      setGrantUserId('');
      setGrantCourseId('');
      setGrantAccessType('lecture_recording');
      loadDemos();
    } catch (error: any) {
      console.error('Error granting demo:', error);
      toast.error(error.message || 'Failed to grant demo access');
    } finally {
      setIsGranting(false);
    }
  };

  // Filter demos by search query
  const filteredDemos = demos.filter(demo => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      demo.users.full_name.toLowerCase().includes(query) ||
      demo.users.email.toLowerCase().includes(query) ||
      demo.courses.title.toLowerCase().includes(query)
    );
  });

  // Get unique courses for filter
  const uniqueCourses = Array.from(new Set(demos.map(d => d.course_id)))
    .map(courseId => {
      const demo = demos.find(d => d.course_id === courseId);
      return demo ? { id: courseId, title: demo.courses.title } : null;
    })
    .filter(Boolean) as { id: string; title: string }[];

  const isExpired = (expiresAt: string) => new Date(expiresAt) <= new Date();

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Demo Access Management</h1>
          <p className="text-muted-foreground">View and manage all demo access grants</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDemos}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isGrantModalOpen} onOpenChange={setIsGrantModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Grant Demo Access
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Demo Access</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGrantDemo} className="space-y-4">
                <div>
                  <Label htmlFor="userId">User ID *</Label>
                  <Input
                    id="userId"
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    placeholder="Enter user ID"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get user ID from the Users page
                  </p>
                </div>
                <div>
                  <Label htmlFor="courseId">Course ID *</Label>
                  <Input
                    id="courseId"
                    value={grantCourseId}
                    onChange={(e) => setGrantCourseId(e.target.value)}
                    placeholder="Enter course ID"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="accessType">Access Type *</Label>
                  <Select
                    value={grantAccessType}
                    onValueChange={(value: 'lecture_recording' | 'live_class') => setGrantAccessType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture_recording">Lecture Recording</SelectItem>
                      <SelectItem value="live_class">Live Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGrantModalOpen(false)}
                    disabled={isGranting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isGranting}>
                    {isGranting ? 'Granting...' : 'Grant Access'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Demos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Video Demos</CardTitle>
              <Video className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.lecture_recording}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Class Demos</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.live_class}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Label htmlFor="course">Course</Label>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger id="course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {uniqueCourses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title.substring(0, 30)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Access Table */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Access Records ({filteredDemos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredDemos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No demo access records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Student</th>
                    <th className="text-left p-3 font-semibold">Course</th>
                    <th className="text-left p-3 font-semibold">Access Type</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Time Remaining</th>
                    <th className="text-left p-3 font-semibold">Granted</th>
                    <th className="text-right p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDemos.map((demo) => (
                    <tr key={demo.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{demo.users.full_name}</div>
                          <div className="text-sm text-muted-foreground">{demo.users.email}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{demo.courses.title}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={demo.access_type === 'lecture_recording' ? 'default' : 'secondary'}>
                          {demo.access_type === 'lecture_recording' ? (
                            <><Video className="h-3 w-3 mr-1" /> Recording</>
                          ) : (
                            <><Calendar className="h-3 w-3 mr-1" /> Live Class</>
                          )}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {isExpired(demo.expires_at) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {formatTimeRemaining(demo.expires_at)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(demo.used_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevoke(demo.id)}
                          disabled={isExpired(demo.expires_at)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
