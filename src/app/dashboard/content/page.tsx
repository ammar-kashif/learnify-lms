'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Paperclip,
  ClipboardList,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function TeacherContentPage() {
  const [activeTab, setActiveTab] = useState<'chapters' | 'resources' | 'assignments'>('chapters');

  const tabs = [
    { id: 'chapters', label: 'Chapters', icon: FileText, description: 'Manage course chapters and content' },
    { id: 'resources', label: 'Resources', icon: Paperclip, description: 'Upload and organize course materials' },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList, description: 'Create and manage assignments' },
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
              Content Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Manage your course content and materials
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {tabs.find(tab => tab.id === activeTab)?.description}
                </p>
              </div>
              <Button className="bg-primary text-white hover:bg-primary-600">
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'chapters' && (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No chapters yet
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Start by creating your first chapter for your courses.
                </p>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="py-12 text-center">
                <Paperclip className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No resources yet
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Upload files, documents, and other materials for your courses.
                </p>
              </div>
            )}

            {activeTab === 'assignments' && (
              <div className="py-12 text-center">
                <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No assignments yet
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Create assignments and quizzes for your students.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
