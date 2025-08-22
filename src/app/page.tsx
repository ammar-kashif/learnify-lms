'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Users,
  Shield,
  Smartphone,
  MessageSquare,
  BarChart3,
  Play,
  ArrowRight,
  Star,
  CheckCircle,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '@/components/theme-toggle';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: BookOpen,
      title: 'Easy Course Creation',
      description:
        'Intuitive tools to create engaging courses with multimedia content',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60',
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description:
        'Monitor student progress and performance with detailed analytics',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description:
        'Enterprise-grade security with real-time backups and monitoring',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60',
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Responsive design that works perfectly on all devices',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60',
    },
    {
      icon: MessageSquare,
      title: 'Real-time Collaboration',
      description: 'Interactive forums, discussions, and live sessions',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60',
    },
    {
      icon: Users,
      title: 'Advanced Analytics',
      description:
        'Comprehensive insights into learning outcomes and engagement',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60',
    },
  ];

  const stats = [
    { number: '10K+', label: 'Active Students' },
    { number: '500+', label: 'Expert Teachers' },
    { number: '1000+', label: 'Courses Available' },
    { number: '99.9%', label: 'Uptime' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <img
                src="/images/Logo.PNG"
                alt="Learnify Logo"
                className="h-24 w-24"
              />
              <span className="text-xl font-bold text-charcoal-900 dark:text-gray-100">
                Learnify
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center space-x-8 md:flex">
              <Link
                href="/"
                className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
              >
                Home
              </Link>
              <Link
                href="/courses"
                className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
              >
                Courses
              </Link>
              <Link
                href="#features"
                className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
              >
                Features
              </Link>
              <Link
                href="#about"
                className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
              >
                About
              </Link>
              <Link
                href="#contact"
                className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
              >
                Contact
              </Link>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden items-center space-x-2 md:flex">
              <ThemeToggle />
              <Button
                asChild
                variant="ghost"
                className="text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button
                asChild
                className="bg-primary text-white hover:bg-primary-600"
              >
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="border-t border-gray-200 py-4 dark:border-gray-800 md:hidden">
              <div className="flex flex-col space-y-4">
                <Link
                  href="/"
                  className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
                >
                  Home
                </Link>
                <Link
                  href="/courses"
                  className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
                >
                  Courses
                </Link>
                <Link
                  href="#features"
                  className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
                >
                  Features
                </Link>
                <Link
                  href="#about"
                  className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
                >
                  About
                </Link>
                <Link
                  href="#contact"
                  className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
                >
                  Contact
                </Link>
                <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                  <Button
                    asChild
                    variant="ghost"
                    className="mb-2 w-full justify-start text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                  >
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full bg-primary text-white hover:bg-primary-600"
                  >
                    <Link href="/auth/signup">Get Started</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-gray-100/50 dark:from-primary/10 dark:to-gray-800/50"></div>
        <div className="relative mx-auto max-w-4xl">
          <Badge
            variant="secondary"
            className="mb-6 border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary-700"
          >
            🚀 Now with AI-powered learning
          </Badge>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl lg:text-7xl">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary via-primary-600 to-gray-600 bg-clip-text text-transparent">
              Learnify LMS
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-gray-600 dark:text-gray-300">
            A modern, powerful learning management system designed for educators
            and students. Create, manage, and deliver engaging learning
            experiences with cutting-edge technology.
          </p>
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 bg-primary px-8 text-lg text-white shadow-lg transition-all duration-300 hover:bg-primary-600 hover:shadow-xl"
            >
              <Link href="/auth/signin" className="flex items-center space-x-2">
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-2 border-gray-300 px-8 text-lg text-gray-700 transition-all duration-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Link href="/courses" className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Browse Courses</span>
              </Link>
            </Button>
          </div>

          {/* Stats Section */}
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">
                  {stat.number}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-primary/20 px-4 py-2 text-sm font-medium text-primary-700"
            >
              ✨ Features
            </Badge>
            <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">
              Why Choose Learnify LMS?
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              Experience the future of education with our comprehensive learning
              platform
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group border-gray-200 bg-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-gray-800 dark:bg-gray-900"
              >
                <CardHeader className="pb-4 text-center">
                  <div
                    className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full ${feature.bgColor} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${feature.color}`}>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="about" className="bg-white/80 px-4 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-6 w-6 fill-yellow-400 text-yellow-400"
              />
            ))}
            <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              4.9/5
            </span>
          </div>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Trusted by over 10,000+ educators and students worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>ISO 27001 Certified</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-600 p-12 text-white">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-600/20"></div>
            <div className="relative">
              <h2 className="mb-6 text-4xl font-bold">
                Ready to Transform Your Learning Experience?
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-xl text-primary-100">
                Join thousands of educators and students already using Learnify
                LMS to create amazing learning experiences
              </p>
              <Button
                asChild
                size="lg"
                className="h-12 bg-white px-8 text-lg text-primary shadow-lg transition-all duration-300 hover:bg-gray-100 hover:shadow-xl"
              >
                <Link
                  href="/auth/signup"
                  className="flex items-center space-x-2"
                >
                  <span>Start Your Free Trial</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
