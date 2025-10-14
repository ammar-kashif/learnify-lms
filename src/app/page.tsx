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
  Sparkles,
  Zap,
  Globe,
  Rocket,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/theme-toggle';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Array<{ left: number; top: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    // Generate particle positions client-side to avoid hydration mismatches
    const generated = Array.from({ length: 20 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 20,
    }));
    setParticles(generated);
    
    // Scroll observer for animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements(prev => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe elements that should animate on scroll
    const elementsToObserve = document.querySelectorAll('[data-animate]');
    elementsToObserve.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      cancelAnimationFrame(id);
    };
  }, []);

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
                href="/blog"
                className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
              >
                Blog
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
                  href="/blog"
                  className="font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300"
                >
                  Blog
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
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-gray-100/50 dark:from-primary/10 dark:via-primary/5 dark:to-gray-800/50"></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            >
              <div className="h-2 w-2 rounded-full bg-primary/20 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Floating Icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 animate-bounce-slow">
            <BookOpen className="h-8 w-8 text-primary/30" />
          </div>
          <div className="absolute top-32 right-20 animate-bounce-slow" style={{ animationDelay: '1s' }}>
            <Users className="h-6 w-6 text-primary/30" />
          </div>
          <div className="absolute bottom-40 left-20 animate-bounce-slow" style={{ animationDelay: '2s' }}>
            <BarChart3 className="h-7 w-7 text-primary/30" />
          </div>
          <div className="absolute bottom-20 right-10 animate-bounce-slow" style={{ animationDelay: '3s' }}>
            <Shield className="h-6 w-6 text-primary/30" />
          </div>
        </div>

        <div className={`relative mx-auto max-w-4xl will-change-transform transition-transform duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary dark:bg-primary/20">
            <Sparkles className="mr-2 h-4 w-4" />
            New: AI-Powered Learning Analytics
          </div>
          
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl lg:text-7xl animate-slide-up">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary via-primary-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
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
              className="group h-12 bg-gradient-to-r from-primary to-primary-600 px-8 text-lg text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/25"
            >
              <Link href="/auth/signin" className="flex items-center space-x-2">
                <Rocket className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group h-12 border-2 border-gray-300 px-8 text-lg text-gray-700 transition-all duration-300 hover:scale-105 hover:bg-gray-50 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:border-primary"
            >
              <Link href="/courses" className="flex items-center space-x-2">
                <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span>Browse Courses</span>
              </Link>
            </Button>
            {/* Removed blog tertiary CTA per request */}
          </div>

          {/* Animated Stats Section */}
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div 
                key={index}
                id={`stat-${index}`}
                data-animate
                className={`group text-center transition-all duration-500 hover:scale-105 ${
                  visibleElements.has(`stat-${index}`) ? 'animate-scale-in' : 'opacity-0 scale-90'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl group-hover:text-primary transition-colors">
                  {stat.number}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary/80 transition-colors">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 py-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>
        
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary dark:bg-primary/20">
              <Zap className="mr-2 h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">
              Why Choose{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Learnify LMS?
              </span>
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
                id={`feature-${index}`}
                data-animate
                className={`group relative border-gray-200 bg-white/80 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/10 dark:border-gray-800 dark:bg-gray-900/80 overflow-hidden ${
                  visibleElements.has(`feature-${index}`) ? 'animate-slide-up' : 'opacity-0 translate-y-10'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Hover Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardHeader className="relative pb-4 text-center">
                  <div
                    className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full ${feature.bgColor} transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg`}
                  >
                    <feature.icon className={`h-8 w-8 ${feature.color} transition-transform duration-300 group-hover:scale-110`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${feature.color} group-hover:text-primary transition-colors duration-300`}>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative text-center">
                  <CardDescription className="text-base leading-relaxed text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
                
                {/* Animated Border */}
                <div className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-r from-primary/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted by Section removed per request */}

      {/* How it works */}
      <section className="relative px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/5" />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'Create', desc: 'Spin up a course with chapters, lectures, and assignments in minutes.' },
              { title: 'Engage', desc: 'Run live classes, track progress, and collect submissions effortlessly.' },
              { title: 'Mastery', desc: 'Grade fast, give feedback, and watch outcomes improve.' },
            ].map((s, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">{i+1}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{s.title}</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="about" className="relative bg-white/80 px-4 py-20 dark:bg-gray-900 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-600/5"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-6 w-6 fill-yellow-400 text-yellow-400 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
            <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              4.9/5
            </span>
          </div>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Trusted by over{' '}
            <span className="font-bold text-primary">10,000+</span> educators and students worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500 dark:text-gray-400">
            <div className="group flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:text-green-600">
              <CheckCircle className="h-5 w-5 text-green-500 group-hover:animate-bounce" />
              <span className="font-medium">ISO 27001 Certified</span>
            </div>
            <div className="group flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:text-green-600">
              <CheckCircle className="h-5 w-5 text-green-500 group-hover:animate-bounce" />
              <span className="font-medium">GDPR Compliant</span>
            </div>
            <div className="group flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:text-green-600">
              <CheckCircle className="h-5 w-5 text-green-500 group-hover:animate-bounce" />
              <span className="font-medium">24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="relative px-4 py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/5"></div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary-600 to-purple-600 p-12 text-white shadow-2xl">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-600/20"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]"></div>
            
            {/* Floating Elements */}
            <div className="absolute top-4 left-4 animate-bounce-slow">
              <Globe className="h-6 w-6 text-white/30" />
            </div>
            <div className="absolute top-8 right-8 animate-bounce-slow" style={{ animationDelay: '1s' }}>
              <Rocket className="h-5 w-5 text-white/30" />
            </div>
            <div className="absolute bottom-6 left-8 animate-bounce-slow" style={{ animationDelay: '2s' }}>
              <Sparkles className="h-4 w-4 text-white/30" />
            </div>
            <div className="absolute bottom-4 right-6 animate-bounce-slow" style={{ animationDelay: '3s' }}>
              <Zap className="h-5 w-5 text-white/30" />
            </div>
            
            <div className="relative">
              <div className="mb-4 inline-flex items-center rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Limited Time Offer
              </div>
              
              <h2 className="mb-6 text-4xl font-bold">
                Ready to Transform Your{' '}
                <span className="bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                  Learning Experience?
                </span>
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-xl text-primary-100">
                Join thousands of educators and students already using Learnify
                LMS to create amazing learning experiences
              </p>
              <Button
                asChild
                size="lg"
                className="group h-12 bg-white px-8 text-lg text-primary shadow-lg transition-all duration-300 hover:scale-105 hover:bg-gray-100 hover:shadow-2xl hover:shadow-white/25"
              >
                <Link
                  href="/auth/signup"
                  className="flex items-center space-x-2"
                >
                  <Rocket className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  <span>Start Your Free Trial</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
