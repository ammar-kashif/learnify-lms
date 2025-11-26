'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import BugReportForm from '@/components/bug-reports/bug-report-form';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">
            Something went wrong
          </CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again or contact support if
            the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-3">
            <p className="font-mono text-sm text-muted-foreground">
              {error.message || 'Unknown error occurred'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} className="flex-1">
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
              className="flex-1"
            >
              Go Home
            </Button>
            <BugReportForm
              initialError={error.message}
              initialUrl={typeof window !== 'undefined' ? window.location.href : ''}
              trigger={
                <Button variant="outline" className="flex-1">
                  Report Bug
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
