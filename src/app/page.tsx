'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  X
} from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '@/components/theme-toggle';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: BookOpen,
      title: 'Easy Course Creation',
      description: 'Intuitive tools to create engaging courses with multimedia content',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60'
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description: 'Monitor student progress and performance with detailed analytics',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with real-time backups and monitoring',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60'
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Responsive design that works perfectly on all devices',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60'
    },
    {
      icon: MessageSquare,
      title: 'Real-time Collaboration',
      description: 'Interactive forums, discussions, and live sessions',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60'
    },
    {
      icon: Users,
      title: 'Advanced Analytics',
      description: 'Comprehensive insights into learning outcomes and engagement',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60'
    }
  ];

  const stats = [
    { number: '10K+', label: 'Active Students' },
    { number: '500+', label: 'Expert Teachers' },
    { number: '1000+', label: 'Courses Available' },
    { number: '99.9%', label: 'Uptime' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <img src="/images/Logo.PNG" alt="Learnify Logo" className="w-24 h-24" />
              <span className="text-xl font-bold text-charcoal-900 dark:text-gray-100">Learnify</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                Home
              </Link>
              <Link href="/courses" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                Courses
              </Link>
              <Link href="#features" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                Features
              </Link>
              <Link href="#about" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                About
              </Link>
              <Link href="#contact" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                Contact
              </Link>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-2">
              <ThemeToggle />
              <Button asChild variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild className="bg-primary hover:bg-primary-600 text-white">
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-800 py-4">
              <div className="flex flex-col space-y-4">
                <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                  Home
                </Link>
                <Link href="/courses" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                  Courses
                </Link>
                <Link href="#features" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                  Features
                </Link>
                <Link href="#about" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                  About
                </Link>
                <Link href="#contact" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                  Contact
                </Link>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <Button asChild variant="ghost" className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10 mb-2">
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                  <Button asChild className="w-full bg-primary hover:bg-primary-600 text-white">
                    <Link href="/auth/signup">Get Started</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-gray-100/50 dark:from-primary/10 dark:to-gray-800/50"></div>
        <div className="relative mx-auto max-w-4xl">
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium bg-primary/10 text-primary-700 border-primary/20">
            🚀 Now with AI-powered learning
          </Badge>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl lg:text-7xl">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary via-primary-600 to-gray-600 bg-clip-text text-transparent">
              Learnify LMS
            </span>
          </h1>
          <p className="mb-8 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            A modern, powerful learning management system designed for educators and students. 
            Create, manage, and deliver engaging learning experiences with cutting-edge technology.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mb-12">
            <Button asChild size="lg" className="h-12 px-8 text-lg bg-primary hover:bg-primary-600 shadow-lg hover:shadow-xl transition-all duration-300 text-white">
              <Link href="/auth/signin" className="flex items-center space-x-2">
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-lg border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300">
              <Link href="/courses" className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Browse Courses</span>
              </Link>
            </Button>
          </div>
          
          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
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
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium border-primary/20 text-primary-700">
              ✨ Features
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Why Choose Learnify LMS?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience the future of education with our comprehensive learning platform
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 backdrop-blur-sm hover:scale-105">
                <CardHeader className="text-center pb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${feature.color}`}>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="about" className="px-4 py-20 bg-white/80 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center items-center space-x-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">4.9/5</span>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Trusted by over 10,000+ educators and students worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 dark:text-gray-400">
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
          <div className="bg-gradient-to-r from-primary to-primary-600 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-600/20"></div>
            <div className="relative">
              <h2 className="mb-6 text-4xl font-bold">
                Ready to Transform Your Learning Experience?
              </h2>
              <p className="mb-8 text-xl text-primary-100 max-w-2xl mx-auto">
                Join thousands of educators and students already using Learnify LMS to create 
                amazing learning experiences
              </p>
              <Button asChild size="lg" className="h-12 px-8 text-lg bg-white text-primary hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <Link href="/auth/signup" className="flex items-center space-x-2">
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
