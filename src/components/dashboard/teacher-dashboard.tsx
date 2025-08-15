'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { mockCourses, mockUsers, mockStudentEnrollments, getCoursesByTeacher } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import ChartPlaceholder from './chart-placeholder';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState('3months');

  // Get teacher's courses
  const teacherCourses = getCoursesByTeacher(user?.id || 'user-1');
  
  // Calculate dashboard stats
  const totalStudents = mockStudentEnrollments.length;
  const totalRevenue = teacherCourses.reduce((sum, course) => sum + (course.price * course.current_students), 0);
  const averageProgress = teacherCourses.reduce((sum, course) => {
    const courseEnrollments = mockStudentEnrollments.filter(e => e.course_id === course.id);
    const avgProgress = courseEnrollments.reduce((pSum, e) => pSum + e.progress_percentage, 0) / courseEnrollments.length || 0;
    return sum + avgProgress;
  }, 0) / teacherCourses.length || 0;

  const recentActivities = [
    {
      id: 1,
      type: 'enrollment',
      message: 'New student enrolled in Mathematics course',
      time: '2 hours ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'assignment',
      message: 'Assignment "Algebra Quiz 1" due in 2 days',
      time: '4 hours ago',
      status: 'warning'
    },
    {
      id: 3,
      type: 'progress',
      message: 'Student completed Chapter 2 in Physics',
      time: '6 hours ago',
      status: 'success'
    },
    {
      id: 4,
      type: 'course',
      message: 'Chemistry course updated with new content',
      time: '1 day ago',
      status: 'info'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}. Here's what's happening with your courses.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherCourses.length}</div>
            <p className="text-xs text-muted-foreground">
              Active courses you're teaching
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled across all courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From course enrollments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Student completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ChartPlaceholder
          title="Student Progress Overview"
          description="Track student progress across your courses"
          chartType="line"
          data={[
            { label: 'Mathematics', value: '75%' },
            { label: 'Physics', value: '45%' },
            { label: 'Chemistry', value: '60%' }
          ]}
        />

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest updates from your courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.message}
                    </p>
                    <p className={`text-xs ${getStatusColor(activity.status)}`}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>
                Manage and monitor your active courses
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teacherCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {course.subject}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Students</span>
                      <span className="font-medium">
                        {course.current_students}/{course.max_students}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{course.duration_weeks} weeks</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium">${course.price}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(course.current_students / course.max_students) * 100}%` }}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Plus className="h-6 w-6" />
              <span>New Course</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Add Students</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <BookOpen className="h-6 w-6" />
              <span>Create Content</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <ClipboardList className="h-6 w-6" />
              <span>New Assignment</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
