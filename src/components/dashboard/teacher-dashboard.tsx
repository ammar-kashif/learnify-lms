'use client';


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
} from 'lucide-react';
import { getCoursesByTeacher } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';

export default function TeacherDashboard() {
  const { user } = useAuth();

  // Get teacher's courses
  const teacherCourses = getCoursesByTeacher(user?.id || 'user-1');

  // Calculate dashboard stats
  const totalStudents = teacherCourses.reduce(
    (sum, course) => sum + course.current_students,
    0
  );
  const totalRevenue = teacherCourses.reduce(
    (sum, course) => sum + course.price * course.current_students,
    0
  );

  const recentActivities = [
    {
      id: 1,
      message: 'New student enrolled in Mathematics course',
      time: '2 hours ago',
      status: 'success',
    },
    {
      id: 2,
      message: 'Assignment "Algebra Quiz 1" due in 2 days',
      time: '4 hours ago',
      status: 'warning',
    },
    {
      id: 3,
      message: 'Student completed Chapter 2 in Physics',
      time: '6 hours ago',
      status: 'success',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Teacher Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <Button
          size="lg"
          className="bg-primary text-white hover:bg-primary-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  Total Courses
                </p>
                <p className="text-3xl font-bold text-primary-900 dark:text-white">
                  {teacherCourses.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {totalStudents}
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-600 dark:text-gray-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-primary-900 dark:text-white">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Activities */}
        <Card className="border-gray-200 dark:border-gray-700 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 dark:text-white">
              Recent Activities
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Latest updates from your courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed text-gray-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p
                      className={`mt-1 text-xs ${getStatusColor(activity.status)}`}
                    >
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Course Overview */}
        <Card className="border-gray-200 dark:border-gray-700 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-gray-900 dark:text-white">
                  My Courses
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Manage and monitor your active courses
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Eye className="mr-2 h-4 w-4" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {teacherCourses.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {teacherCourses.slice(0, 4).map(course => (
                  <Card
                    key={course.id}
                    className="border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 transition-all duration-200 hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className="border-primary/20 bg-primary/10 text-xs text-primary-700 dark:text-primary-300"
                        >
                          {course.subject}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardTitle className="text-base leading-tight text-gray-900 dark:text-white">
                        {course.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Students</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {course.current_students}/{course.max_students}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                        <div
                          className="h-2 rounded-full bg-primary transition-all duration-300"
                          style={{
                            width: `${(course.current_students / course.max_students) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-primary text-xs text-white hover:bg-primary-600"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No courses yet
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Get started by creating your first course
                </p>
                <Button className="bg-primary text-white hover:bg-primary-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 dark:text-white">
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">New Course</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Add Students</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-sm">Create Content</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Award className="h-5 w-5" />
              <span className="text-sm">New Assignment</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
