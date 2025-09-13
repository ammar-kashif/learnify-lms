'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Megaphone,
  Mail,
  MessageCircle,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function TeacherCommunicationsPage() {
  const [activeTab, setActiveTab] = useState<'announcements' | 'messages' | 'forums'>('announcements');

  const tabs = [
    { id: 'announcements', label: 'Announcements', icon: Megaphone, description: 'Send announcements to your students' },
    { id: 'messages', label: 'Messages', icon: Mail, description: 'Direct messaging with students' },
    { id: 'forums', label: 'Forums', icon: MessageCircle, description: 'Discussion forums and Q&A' },
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
              Communications
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Communicate with your students and manage discussions
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
                Create New
              </Button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'announcements' && (
              <div className="py-12 text-center">
                <Megaphone className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No announcements yet
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Create announcements to keep your students informed about course updates, deadlines, and important information.
                </p>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="py-12 text-center">
                <Mail className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No messages yet
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Send direct messages to individual students or groups for personalized communication.
                </p>
              </div>
            )}

            {activeTab === 'forums' && (
              <div className="py-12 text-center">
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No forums yet
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Create discussion forums for your courses to encourage student interaction and Q&A.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
