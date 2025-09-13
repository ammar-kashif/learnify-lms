'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Sliders,
  Bell,
  ArrowLeft,
  Save,
} from 'lucide-react';
import Link from 'next/link';

export default function TeacherSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications'>('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'preferences', label: 'Preferences', icon: Sliders, description: 'Customize your dashboard and experience' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Configure notification settings' },
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
              Settings
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Manage your account settings and preferences
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
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      className="border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    rows={4}
                    placeholder="Tell us about yourself"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <Button className="bg-primary text-white hover:bg-primary-600">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">Light</Button>
                    <Button variant="outline" size="sm">Dark</Button>
                    <Button variant="outline" size="sm">System</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option>UTC-5 (EST)</option>
                    <option>UTC-8 (PST)</option>
                    <option>UTC+0 (GMT)</option>
                  </select>
                </div>
                <Button className="bg-primary text-white hover:bg-primary-600">
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Receive email updates about your courses
                      </p>
                    </div>
                    <input type="checkbox" className="h-4 w-4 text-primary" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Student Enrollments</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Get notified when students enroll in your courses
                      </p>
                    </div>
                    <input type="checkbox" className="h-4 w-4 text-primary" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Assignment Submissions</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Receive notifications when students submit assignments
                      </p>
                    </div>
                    <input type="checkbox" className="h-4 w-4 text-primary" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>System Updates</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Get notified about platform updates and maintenance
                      </p>
                    </div>
                    <input type="checkbox" className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <Button className="bg-primary text-white hover:bg-primary-600">
                  <Save className="mr-2 h-4 w-4" />
                  Save Notification Settings
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
