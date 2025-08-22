import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { mockCourses } from '@/data/mock-data';
import { BookOpen, Clock, Users, Star } from 'lucide-react';

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Explore Our Courses
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-xl text-gray-600">
              Discover a wide range of Cambridge O Levels courses designed to
              help you excel in your academic journey.
            </p>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {mockCourses.map(course => (
            <Card
              key={course.id}
              className="group border-gray-200 bg-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <CardHeader className="pb-4 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {course.title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {course.subject}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration_weeks} weeks</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{course.current_students} students</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.floor(course.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      ({course.rating})
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      ${course.price}
                    </span>
                    <Badge
                      variant="secondary"
                      className="border-primary/20 bg-primary/10 text-primary-700"
                    >
                      {course.level}
                    </Badge>
                  </div>
                  <Button className="w-full bg-primary text-white hover:bg-primary-600">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Enroll Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
