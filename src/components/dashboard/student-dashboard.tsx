'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Play, 
  Award, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  FileText,
  Users,
  Target,
  BarChart3,
  Eye
} from 'lucide-react';
import { 
  mockCourses, 
  mockStudentEnrollments, 
  mockAssignments, 
  getCoursesByStudent,
  getEnrollmentsByStudent 
} from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');

  // Get student's enrolled courses and enrollments
  const studentEnrollments = getEnrollmentsByStudent(user?.id || 'user-5');
  const enrolledCourses = getCoursesByStudent(user?.id || 'user-5');
  
  // Calculate dashboard stats
  const totalCourses = enrolledCourses.length;
  const averageProgress = studentEnrollments.reduce((sum, enrollment) => sum + enrollment.progress_percentage, 0) / studentEnrollments.length || 0;
  const completedChapters = studentEnrollments.reduce((sum, enrollment) => {
    const course = enrolledCourses.find(c => c.id === enrollment.course_id);
    return sum + Math.floor((enrollment.progress_percentage / 100) * (course?.duration_weeks || 0));
  }, 0);

  // Get upcoming assignments
  const upcomingAssignments = mockAssignments
    .filter(assignment => {
      const dueDate = new Date(assignment.due_date);
      const now = new Date();
      return dueDate > now;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  // Get recent activities
  const recentActivities = [
    {
      id: 1,
      type: 'progress',
      message: 'Completed Chapter 2 in Mathematics',
      time: '2 hours ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'assignment',
      message: 'Submitted Physics Lab Report',
      time: '1 day ago',
      status: 'success'
    },
    {
      id: 3,
      type: 'enrollment',
      message: 'Enrolled in Chemistry course',
      time: '3 days ago',
      status: 'info'
    },
    {
      id: 4,
      type: 'achievement',
      message: 'Earned "Math Master" badge',
      time: '1 week ago',
      status: 'success'
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

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}. Continue your learning journey.
          </p>
        </div>
        <Button asChild>
          <a href="/courses">
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Courses
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              Active courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Across all courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Chapters</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedChapters}</div>
            <p className="text-xs text-muted-foreground">
              Total completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 days</div>
            <p className="text-xs text-muted-foreground">
              Current streak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Course Progress */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>My Courses Progress</CardTitle>
            <CardDescription>
              Track your progress across all enrolled courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentEnrollments.map((enrollment) => {
                const course = enrolledCourses.find(c => c.id === enrollment.course_id);
                if (!course) return null;

                return (
                  <div key={enrollment.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium">{course.title}</h4>
                          <p className="text-sm text-muted-foreground">{course.subject}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {enrollment.progress_percentage}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{enrollment.progress_percentage}%</span>
                      </div>
                      <Progress 
                        value={enrollment.progress_percentage} 
                        className="h-2"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="flex-1">
                        <Play className="h-4 w-4 mr-2" />
                        Continue
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        View Course
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="col-span-3 space-y-4">
          {/* Upcoming Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Assignments</CardTitle>
              <CardDescription>
                Stay on top of your deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAssignments.map((assignment) => {
                  const dueDate = new Date(assignment.due_date);
                  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={assignment.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <div className="mt-1">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {assignment.total_points} points
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {upcomingAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming assignments
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                Your latest learning milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
      </div>



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
              <Play className="h-6 w-6" />
              <span>Continue Learning</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <FileText className="h-6 w-6" />
              <span>View Resources</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Join Study Group</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Calendar className="h-6 w-6" />
              <span>Schedule Study</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
