'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  PieChart,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function TeacherAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'progress' | 'courses' | 'engagement'>('progress');

  const tabs = [
    { id: 'progress', label: 'Student Progress', icon: TrendingUp, description: 'Track individual student progress and performance' },
    { id: 'courses', label: 'Course Performance', icon: PieChart, description: 'Analyze course completion rates and engagement' },
    { id: 'engagement', label: 'Engagement Metrics', icon: Activity, description: 'Monitor student activity and participation' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Analytics
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Track performance and engagement metrics
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white hover:bg-primary-600'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'progress' && (
              <div className="py-12 text-center">
                <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Student Progress Analytics
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Track individual student progress, completion rates, and performance metrics.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analytics will be available once students start enrolling in your courses.
                </p>
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="py-12 text-center">
                <PieChart className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Course Performance Analytics
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Analyze course completion rates, student satisfaction, and engagement levels.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Course analytics will be available once you have active courses with enrolled students.
                </p>
              </div>
            )}

            {activeTab === 'engagement' && (
              <div className="py-12 text-center">
                <Activity className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Engagement Metrics
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Monitor student activity, participation rates, and content interaction.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Engagement metrics will be available once students start interacting with your content.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
