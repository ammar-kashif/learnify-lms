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
  Plus,
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { getCoursesByTeacher } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';

export default function TeacherDashboard() {
  const { user } = useAuth();
  
  // Get teacher's courses
  const teacherCourses = getCoursesByTeacher(user?.id || 'user-1');
  
  // Calculate dashboard stats
  const totalStudents = teacherCourses.reduce((sum, course) => sum + course.current_students, 0);
  const totalRevenue = teacherCourses.reduce((sum, course) => sum + (course.price * course.current_students), 0);

  const recentActivities = [
    {
      id: 1,
      message: 'New student enrolled in Mathematics course',
      time: '2 hours ago',
      status: 'success'
    },
    {
      id: 2,
      message: 'Assignment "Algebra Quiz 1" due in 2 days',
      time: '4 hours ago',
      status: 'warning'
    },
    {
      id: 3,
      message: 'Student completed Chapter 2 in Physics',
      time: '6 hours ago',
      status: 'success'
    }
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
          <h1 className="text-3xl font-bold tracking-tight text-charcoal-900">Teacher Dashboard</h1>
          <p className="text-charcoal-600 mt-2">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <Button size="lg" className="bg-primary hover:bg-primary-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary-50 to-primary-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-600">Total Courses</p>
                <p className="text-3xl font-bold text-primary-900">{teacherCourses.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-charcoal-50 to-charcoal-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal-600">Total Students</p>
                <p className="text-3xl font-bold text-charcoal-900">{totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-charcoal-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary-50 to-primary-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-600">Total Revenue</p>
                <p className="text-3xl font-bold text-primary-900">${totalRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Activities */}
        <Card className="lg:col-span-1 border-charcoal-200">
          <CardHeader>
            <CardTitle className="text-xl text-charcoal-900">Recent Activities</CardTitle>
            <CardDescription className="text-charcoal-600">Latest updates from your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-charcoal-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-relaxed text-charcoal-900">
                      {activity.message}
                    </p>
                    <p className={`text-xs mt-1 ${getStatusColor(activity.status)}`}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Course Overview */}
        <Card className="lg:col-span-2 border-charcoal-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-charcoal-900">My Courses</CardTitle>
                <CardDescription className="text-charcoal-600">Manage and monitor your active courses</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {teacherCourses.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {teacherCourses.slice(0, 4).map((course) => (
                  <Card key={course.id} className="hover:shadow-md transition-all duration-200 border-charcoal-200 bg-charcoal-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary-700 border-primary/20">
                          {course.subject}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-charcoal-600 hover:text-charcoal-800 hover:bg-charcoal-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardTitle className="text-base leading-tight text-charcoal-900">{course.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-charcoal-600">Students</span>
                        <span className="font-medium text-charcoal-900">
                          {course.current_students}/{course.max_students}
                        </span>
                      </div>
                      <div className="w-full bg-charcoal-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(course.current_students / course.max_students) * 100}%` }}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1 text-xs bg-primary hover:bg-primary-600 text-white">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-charcoal-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-charcoal-900 mb-2">No courses yet</h3>
                <p className="text-charcoal-600 mb-4">Get started by creating your first course</p>
                <Button className="bg-primary hover:bg-primary-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-charcoal-200">
        <CardHeader>
          <CardTitle className="text-xl text-charcoal-900">Quick Actions</CardTitle>
          <CardDescription className="text-charcoal-600">Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50 hover:border-primary">
              <Plus className="h-5 w-5" />
              <span className="text-sm">New Course</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50 hover:border-primary">
              <Users className="h-5 w-5" />
              <span className="text-sm">Add Students</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50 hover:border-primary">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm">Create Content</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2 border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50 hover:border-primary">
              <Award className="h-5 w-5" />
              <span className="text-sm">New Assignment</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
