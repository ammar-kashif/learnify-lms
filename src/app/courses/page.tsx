import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { mockCourses } from '@/data/mock-data';

export default function CoursesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cambridge O Levels Courses</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Explore our comprehensive collection of Cambridge O Levels courses designed to prepare you for academic excellence.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockCourses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-xs">
                  {course.subject}
                </Badge>
                <Badge variant={course.status === 'active' ? 'default' : 'outline'}>
                  {course.status}
                </Badge>
              </div>
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription className="line-clamp-3">
                {course.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{course.duration_weeks} weeks</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">
                    {course.current_students}/{course.max_students}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium text-green-600">${course.price}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(course.current_students / course.max_students) * 100}%` }}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/courses/${course.id}`}>View Course</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/courses/${course.id}/enroll`}>Enroll Now</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Can't find what you're looking for?
        </p>
        <Button asChild variant="outline">
          <Link href="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
