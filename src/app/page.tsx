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
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  GraduationCap,
  FileText,
  Trophy,
  Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/theme-toggle';
import Testimonials from '@/components/testimonials';
import WhatsAppFloat from '@/components/whatsapp-float';
import { whatsappLink, WHATSAPP_MESSAGES, WHATSAPP_DISPLAY } from '@/config/contact';

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
      icon: Users,
      title: 'Small Group Classes',
      description:
        'Learn in focused groups of 10-12 students — small enough for personalized attention, big enough for collaborative learning.',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60',
    },
    {
      icon: GraduationCap,
      title: 'Expert Tutors',
      description:
        'Our tutors are subject specialists with years of experience teaching O Level & IGCSE syllabi.',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60',
    },
    {
      icon: Play,
      title: 'Recorded Lectures & Full Revision Access',
      description:
        'Never miss a class. Every session is recorded and available for unlimited review.',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60',
    },
    {
      icon: FileText,
      title: 'Past Paper Mastery System',
      description:
        'We integrate past paper practice every week, training students to think and write exactly how examiners expect.',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60',
    },
    {
      icon: BarChart3,
      title: 'Personalized Support',
      description:
        'Each student receives regular feedback, progress tracking, and one-on-one attention from their tutor.',
      color: 'text-primary',
      bgColor: 'bg-primary-50 dark:bg-gray-800/60',
    },
    {
      icon: Trophy,
      title: 'Proven Results',
      description:
        'With structured lessons and constant feedback, our students consistently achieve top grades — and confidence that lasts.',
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/60',
    },
  ];

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English',
  ];

  const quickStats = [
    { value: '200+', label: 'Students Taught' },
    { value: '6', label: 'Expert Tutors' },
    { value: '100+', label: 'Past Papers Covered' },
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
          
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl lg:text-7xl animate-slide-up">
            Ace Your O Levels &amp; IGCSE Exams with{' '}
            <span className="bg-gradient-to-r from-primary via-primary-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
              Learnify
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-gray-600 dark:text-gray-300">
            Personalized online classes designed to help every student master
            concepts, practice past papers, and achieve A* results with the
            support of expert tutors who truly care.
          </p>

          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="group h-12 bg-gradient-to-r from-primary to-primary-600 px-8 text-lg text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/25"
            >
              <Link href="/courses" className="flex items-center space-x-2">
                <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span>Book a Free Trial Class</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group h-12 border-2 border-gray-300 px-8 text-lg text-gray-700 transition-all duration-300 hover:scale-105 hover:bg-gray-50 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:border-primary"
            >
              <a
                href={whatsappLink(WHATSAPP_MESSAGES.contact)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
              >
                <MessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span>Contact Now</span>
              </a>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
            {quickStats.map((stat, index) => (
              <div
                key={index}
                id={`stat-${index}`}
                data-animate
                className={`text-center transition-all duration-500 ${
                  visibleElements.has(`stat-${index}`) ? 'animate-scale-in' : 'opacity-0 scale-90'
                }`}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="text-3xl font-bold text-primary sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Subjects Strip */}
          <div className="mx-auto inline-flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {subjects.map((subj, index) => (
              <span
                key={index}
                id={`subj-${index}`}
                data-animate
                className={`inline-flex items-center rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 ${
                  visibleElements.has(`subj-${index}`) ? 'animate-scale-in' : 'opacity-0 scale-90'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <BookOpen className="mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary/60" />
                {subj}
              </span>
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
                Learnify?
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              Because your child deserves focused learning, expert guidance, and
              real results.
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
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary dark:bg-primary/20">
              <Rocket className="mr-2 h-4 w-4" />
              Getting Started
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">How Learnify Works</h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Learning that&apos;s structured, supportive, and success-driven.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '1', title: 'Enroll & Get Matched', desc: 'Choose your subjects and get placed in a small group led by an expert tutor.' },
              { step: '2', title: 'Learn & Revise', desc: 'Attend live interactive classes, access recorded lessons, and practice with topic-wise and past paper exercises.' },
              { step: '3', title: 'Track Progress & Improve', desc: 'Get detailed feedback after every quiz and monthly progress reports to keep you on track for your A*.' },
            ].map((s, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 transition-all duration-300 hover:shadow-lg hover:border-primary/30">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">{s.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{s.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Students Love Us */}
      <section id="about" className="relative bg-white/80 px-4 py-20 dark:bg-gray-900 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-600/5"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary dark:bg-primary/20">
            <Star className="mr-2 h-4 w-4" />
            Why Students Love Us
          </div>
          <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Built for O Level &amp; IGCSE Students
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {[
              { icon: CheckCircle, text: 'Syllabus-aligned content' },
              { icon: CheckCircle, text: 'Experienced O Level & IGCSE tutors' },
              { icon: CheckCircle, text: 'Live classes with Q&A' },
              { icon: CheckCircle, text: 'Practice quizzes & past papers' },
              { icon: CheckCircle, text: 'Recorded lectures — rewatch anytime' },
              { icon: CheckCircle, text: 'Graded assignments with feedback' },
              { icon: CheckCircle, text: 'Free demo before subscribing' },
              { icon: CheckCircle, text: 'Works on any device' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                <item.icon className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results / Testimonials Section */}
      <section className="relative px-4 pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/5" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
              What Students &amp; Parents Say
            </h2>

            {/* Star rating */}
            <div className="mt-5 flex items-center justify-center gap-3">
              <div className="flex" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                4.9/5
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Average from 100+ Students
              </span>
            </div>
          </div>

          {/* Written quotes */}
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                quote:
                  'Learnify completely transformed my son’s confidence in Maths. The small group setup and detailed feedback made all the difference.',
                name: 'Mr. Waqar',
                role: 'Parent of O Level Student',
              },
              {
                quote:
                  'I used to struggle with Maths, but Learnify’s structured classes and recorded lectures made revision easy. Got an A*!',
                name: 'Abdullah',
                role: 'IGCSE Student',
              },
            ].map((t, i) => (
              <figure
                key={i}
                id={`quote-${i}`}
                data-animate
                className={`relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-500 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 ${
                  visibleElements.has(`quote-${i}`) ? 'animate-slide-up' : 'opacity-0 translate-y-6'
                }`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="mb-3 flex" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {t.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"> — {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Review screenshots carousel */}
      <Testimonials />

      {/* FAQ Section */}
      <section className="relative px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/5" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary dark:bg-primary/20">
              <HelpCircle className="mr-2 h-4 w-4" />
              Common Questions
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Frequently Asked Questions
            </h2>
          </div>
          <FAQAccordion />
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
              <h2 className="mb-6 text-4xl font-bold">
                Ready to Help Your Child Ace Their{' '}
                <span className="bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                  O Levels &amp; IGCSE Exams?
                </span>
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-xl text-primary-100">
                Join hundreds of parents who trust Learnify to help their
                children study smarter, not harder — and secure top results.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="group h-12 bg-white px-8 text-lg text-primary shadow-lg transition-all duration-300 hover:scale-105 hover:bg-gray-100 hover:shadow-2xl hover:shadow-white/25"
                >
                  <Link
                    href="/courses"
                    className="flex items-center space-x-2"
                  >
                    <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <span>Book Your Free Trial Class</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="group h-12 border-2 border-white/40 px-8 text-lg text-white transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:border-white/60"
                >
                  <a
                    href={whatsappLink(WHATSAPP_MESSAGES.trial)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2"
                  >
                    <MessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <span>Chat with Our Team on WhatsApp</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <img src="/images/Logo.PNG" alt="Learnify Logo" className="h-12 w-12" />
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Learnify</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Your one-stop platform for Cambridge O Level preparation. Expert teachers, comprehensive courses, and everything you need to succeed.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">Quick Links</h3>
              <ul className="space-y-2.5">
                {[
                  { label: 'Courses', href: '/courses' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Sign In', href: '/auth/signin' },
                  { label: 'Sign Up', href: '/auth/signup' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-600 transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subjects */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">Subjects</h3>
              <ul className="space-y-2.5">
                {['Chemistry', 'Physics', 'Biology', 'Mathematics', 'English Language', 'English Literature'].map((subj) => (
                  <li key={subj}>
                    <Link href="/courses" className="text-sm text-gray-600 transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary">
                      {subj}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">Get in Touch</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <a href="mailto:support@learnify.com" className="text-sm text-gray-600 transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary">
                    support@learnify.com
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <a
                    href={whatsappLink(WHATSAPP_MESSAGES.general)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary"
                  >
                    {WHATSAPP_DISPLAY} (WhatsApp)
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Online — learn from anywhere
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 dark:border-gray-800 sm:flex-row">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} Learnify LMS. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="#" className="text-sm text-gray-500 transition-colors hover:text-primary dark:text-gray-500 dark:hover:text-primary">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-gray-500 transition-colors hover:text-primary dark:text-gray-500 dark:hover:text-primary">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floats with the user as they scroll */}
      <WhatsAppFloat />
    </div>
  );
}

/* ===== FAQ Accordion Component ===== */
function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Which exam boards does Learnify cover?',
      a: 'We focus on the O Level and IGCSE syllabi, so every lesson, quiz, and assignment is directly relevant to your exams.',
    },
    {
      q: 'Can I try before I subscribe?',
      a: 'Absolutely. You can book a free trial class, watch a demo lecture, or join a live class without signing up. Just pick a course and click "Try Free Demo".',
    },
    {
      q: 'What subjects are available?',
      a: 'We cover Mathematics, Physics, Chemistry, Biology, Computer Science, and English, with more subjects added regularly.',
    },
    {
      q: 'How big are the classes?',
      a: 'Classes run in small groups of 10-12 students — small enough for personalized attention from your tutor, big enough for collaborative learning.',
    },
    {
      q: 'How do live classes work?',
      a: 'Live classes are scheduled sessions with real teachers. You can ask questions, participate in discussions, and interact just like a real classroom — all online.',
    },
    {
      q: 'Can I watch lectures more than once?',
      a: 'Yes! All recorded lectures are available to rewatch as many times as you like — on any device, at any time.',
    },
    {
      q: 'What happens after I subscribe?',
      a: 'You get full access to all lectures, live classes, quizzes, and graded assignments for your chosen subjects. You can track your progress and get feedback from teachers.',
    },
  ];

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className={`rounded-xl border transition-all duration-300 ${
              isOpen
                ? 'border-primary/30 bg-primary/5 shadow-sm dark:border-primary/40 dark:bg-primary/10'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className={`font-medium ${isOpen ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                {faq.q}
              </span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180 text-primary' : 'text-gray-400'
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {faq.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
