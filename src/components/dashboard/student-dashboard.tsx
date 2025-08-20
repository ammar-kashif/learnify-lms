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
        return <Clock className="h-4 w-4 text-charcoal-500" />;
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
        return 'text-charcoal-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-charcoal-900">Student Dashboard</h1>
          <p className="text-charcoal-600">
            Welcome back, {user?.user_metadata?.full_name || user?.email}. Continue your learning journey.
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary-600 text-white">
          <a href="/courses">
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Courses
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-charcoal-200 dark:border-gray-800 bg-charcoal-50/50 dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-charcoal-800 dark:text-gray-200">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-charcoal-900 dark:text-gray-100">{totalCourses}</div>
            <p className="text-xs text-charcoal-600 dark:text-gray-400">
              Active courses
            </p>
          </CardContent>
        </Card>

        <Card className="border-charcoal-200 dark:border-gray-800 bg-primary-50/50 dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-800 dark:text-primary-300">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-900 dark:text-primary-300">{averageProgress.toFixed(1)}%</div>
            <p className="text-xs text-primary-600 dark:text-primary-400">
              Across all courses
            </p>
          </CardContent>
        </Card>

        <Card className="border-charcoal-200 dark:border-gray-800 bg-charcoal-50/50 dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-charcoal-800 dark:text-gray-200">Completed Chapters</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-charcoal-900 dark:text-gray-100">{completedChapters}</div>
            <p className="text-xs text-charcoal-600 dark:text-gray-400">
              Total completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-charcoal-200 dark:border-gray-800 bg-primary-50/50 dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-800 dark:text-primary-300">Study Streak</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-900 dark:text-primary-300">7 days</div>
            <p className="text-xs text-primary-600 dark:text-primary-400">
              Current streak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        {/* Course Progress */}
        <Card className="col-span-4 border-charcoal-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-charcoal-900 dark:text-gray-100">My Courses Progress</CardTitle>
            <CardDescription className="text-charcoal-600 dark:text-gray-300">
              Track your progress across all enrolled courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentEnrollments.length > 0 ? (
              <div className="space-y-6">
                {studentEnrollments.map((enrollment) => {
                  const course = enrolledCourses.find(c => c.id === enrollment.course_id);
                  if (!course) return null;

                  return (
                    <div key={enrollment.id} className="space-y-4 p-4 rounded-lg border border-charcoal-200 dark:border-gray-800 bg-charcoal-50/50 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-charcoal-900 dark:text-gray-100">{course.title}</h4>
                            <p className="text-sm text-charcoal-600 dark:text-gray-300">{course.subject}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary-700 border-primary/20">
                          {enrollment.progress_percentage}%
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-charcoal-600 dark:text-gray-300">Progress</span>
                          <span className="font-medium text-charcoal-900 dark:text-gray-100">{enrollment.progress_percentage}%</span>
                        </div>
                        <Progress 
                          value={enrollment.progress_percentage} 
                          className="h-2"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1 bg-primary hover:bg-primary-600 text-white">
                          <Play className="h-4 w-4 mr-2" />
                          Continue
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 border-charcoal-300 dark:border-gray-700 text-charcoal-700 dark:text-gray-200 hover:bg-charcoal-50 dark:hover:bg-gray-800">
                          <Eye className="h-4 w-4 mr-2" />
                          View Course
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-charcoal-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-charcoal-900 dark:text-gray-100 mb-2">No enrolled courses</h3>
                <p className="text-charcoal-600 dark:text-gray-300 mb-4">Start your learning journey by enrolling in courses</p>
                <Button asChild className="bg-primary hover:bg-primary-600 text-white">
                  <a href="/courses">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Courses
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="col-span-3 space-y-6">
          {/* Upcoming Assignments */}
          <Card className="border-charcoal-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-charcoal-900 dark:text-gray-100">Upcoming Assignments</CardTitle>
              <CardDescription className="text-charcoal-600 dark:text-gray-300">
                Stay on top of your deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAssignments.map((assignment) => {
                    const dueDate = new Date(assignment.due_date);
                    const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={assignment.id} className="flex items-start space-x-3 p-3 rounded-lg border border-charcoal-200 dark:border-gray-800 bg-charcoal-50/50 dark:bg-gray-800">
                        <div className="mt-1">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-charcoal-900 dark:text-gray-100">{assignment.title}</p>
                          <p className="text-xs text-charcoal-600 dark:text-gray-400">
                            Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                          </p>
                          <Badge variant="outline" className="text-xs border-primary/20 text-primary-700">
                            {assignment.total_points} points
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-charcoal-400 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-600 dark:text-gray-300">No upcoming assignments</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="border-charcoal-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-charcoal-900 dark:text-gray-100">Recent Activities</CardTitle>
              <CardDescription className="text-charcoal-600 dark:text-gray-300">
                Your latest learning milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="mt-1">
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none text-charcoal-900 dark:text-gray-100">
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
      <Card className="border-charcoal-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl text-charcoal-900 dark:text-gray-100">Quick Actions</CardTitle>
          <CardDescription className="text-charcoal-600 dark:text-gray-300">
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 dark:border-gray-700 text-charcoal-700 dark:text-gray-200 hover:bg-charcoal-50 dark:hover:bg-gray-800 hover:border-primary">
              <Play className="h-5 w-5" />
              <span className="text-sm">Continue Learning</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 dark:border-gray-700 text-charcoal-700 dark:text-gray-200 hover:bg-charcoal-50 dark:hover:bg-gray-800 hover:border-primary">
              <FileText className="h-5 w-5" />
              <span className="text-sm">View Resources</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 dark:border-gray-700 text-charcoal-700 dark:text-gray-200 hover:bg-charcoal-50 dark:hover:bg-gray-800 hover:border-primary">
              <Users className="h-5 w-5" />
              <span className="text-sm">Join Study Group</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 dark:border-gray-700 text-charcoal-700 dark:text-gray-200 hover:bg-charcoal-50 dark:hover:bg-gray-800 hover:border-primary">
              <Calendar className="h-5 w-5" />
              <span className="text-sm">Schedule Study</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
