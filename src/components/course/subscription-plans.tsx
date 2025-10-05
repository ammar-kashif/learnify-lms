'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Loader2,
  Crown,
  Video,
  Play,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'recordings_only' | 'live_classes_only' | 'recordings_and_live';
  duration_months: number | null;
  duration_until_date: string | null;
  price_pkr: number;
  features: string[];
  is_active: boolean;
}

interface SubscriptionPlansProps {
  courseId: string;
  courseTitle: string;
  onSubscriptionCreated?: () => void;
}

export default function SubscriptionPlans({ 
  courseId, 
  courseTitle,
  onSubscriptionCreated 
}: SubscriptionPlansProps) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'recordings_only' | 'live_classes_only' | 'recordings_and_live'>('all');
  const [sortBy] = useState<'price' | 'duration' | 'popularity'>('duration');

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const url = selectedType === 'all' 
        ? '/api/subscription-plans'
        : `/api/subscription-plans?type=${selectedType}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        const fetchedPlans = data.plans || [];
        setPlans(sortPlans(fetchedPlans));
      } else {
        toast.error('Failed to load subscription plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const sortPlans = (plansToSort: SubscriptionPlan[]) => {
    return [...plansToSort].sort((a, b) => {
      switch (sortBy) {
        case 'price': {
          return a.price_pkr - b.price_pkr;
        }
        case 'duration': {
          // Sort by duration: 1 month first, then 3 months, then until CIES (May 31, 2026)
          const getDurationOrder = (plan: SubscriptionPlan) => {
            if (plan.duration_months === 1) return 1; // 1 month first
            if (plan.duration_months === 3) return 2; // 3 months second
            if (plan.duration_until_date) {
              const untilDate = new Date(plan.duration_until_date);
              const ciesDate = new Date('2026-05-31');
              // If it's until CIES date (around May 31, 2026), put it third
              if (Math.abs(untilDate.getTime() - ciesDate.getTime()) < 30 * 24 * 60 * 60 * 1000) {
                return 3; // Until CIES third
              }
              return 4; // Other until dates last
            }
            return 5; // No duration specified last
          };
          
          const aOrder = getDurationOrder(a);
          const bOrder = getDurationOrder(b);
          
          if (aOrder === bOrder) return a.price_pkr - b.price_pkr;
          return aOrder - bOrder;
        }
        case 'popularity': {
          // Sort by type priority: recordings_and_live > live_classes_only > recordings_only
          const typePriority = { 'recordings_and_live': 3, 'live_classes_only': 2, 'recordings_only': 1 };
          const aPriority = typePriority[a.type] || 0;
          const bPriority = typePriority[b.type] || 0;
          if (aPriority === bPriority) return a.price_pkr - b.price_pkr;
          return bPriority - aPriority;
        }
        default:
          return 0;
      }
    });
  };

  useEffect(() => {
    fetchPlans();
  }, [selectedType]);

  useEffect(() => {
    if (plans.length > 0) {
      setPlans(sortPlans(plans));
    }
  }, [sortBy, plans]);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Please log in to subscribe');
      return;
    }

    // For now, we'll use the direct API approach
    // In a real implementation, you might want to show a payment popup first
    setSubscribing(planId);
    try {
      const response = await fetch('/api/user-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          subscriptionPlanId: planId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Subscription created successfully!');
        onSubscriptionCreated?.();
      } else {
        if (data.error.includes('already has an active subscription')) {
          toast.error('You already have an active subscription for this course');
        } else {
          toast.error(data.error || 'Failed to create subscription');
        }
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    } finally {
      setSubscribing(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (plan: SubscriptionPlan) => {
    if (plan.duration_months) {
      return `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`;
    } else if (plan.duration_until_date) {
      const date = new Date(plan.duration_until_date);
      return `Until ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    return 'No duration specified';
  };



  const getPlanBadge = (plan: SubscriptionPlan) => {
    if (plan.type === 'recordings_and_live') {
      return { text: 'Most Popular', icon: Crown, color: 'bg-gradient-to-r from-purple-500 to-pink-500' };
    }
    if (plan.price_pkr <= 10000) {
      return { text: 'Best Value', icon: Zap, color: 'bg-gradient-to-r from-green-500 to-emerald-500' };
    }
    if (plan.duration_months === 1) {
      return { text: 'Quick Access', icon: Clock, color: 'bg-gradient-to-r from-blue-500 to-cyan-500' };
    }
    return null;
  };

  const typeFilters = [
    { value: 'all', label: 'All Plans', icon: Sparkles },
    { value: 'recordings_only', label: 'Recordings Only', icon: Play },
    { value: 'live_classes_only', label: 'Live Classes Only', icon: Video },
    { value: 'recordings_and_live', label: 'Recordings + Live', icon: Crown }
  ];


  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading subscription plans...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-foreground mb-2">Subscription</h2>
        <p className="text-lg text-muted-foreground">
          Choose the perfect plan for {courseTitle}
        </p>
      </div>

      {/* Plan Type Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-muted rounded-lg p-1">
          {typeFilters.map((filter) => {
            const FilterIcon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => setSelectedType(filter.value as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedType === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FilterIcon className="h-4 w-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plans Grid - Responsive Layout */}
      <div className="w-full">
        {/* Desktop: Grid Layout */}
        <div className="hidden lg:grid gap-4 grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const badge = getPlanBadge(plan);
            const isPopular = plan.type === 'recordings_and_live';
            
            return (
              <div 
                key={plan.id} 
                className={`relative group transition-all duration-300 hover:shadow-lg ${
                  isPopular 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                    : 'bg-card text-card-foreground border border-border hover:border-primary/50'
                } rounded-xl p-6 cursor-pointer`}
                onClick={() => handleSubscribe(plan.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSubscribe(plan.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {/* Badge */}
                {badge && !isPopular && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className={`${badge.color} text-white shadow-lg text-xs`}>
                      <badge.icon className="h-3 w-3 mr-1" />
                      {badge.text}
                    </Badge>
                  </div>
                )}

                {/* Plan Duration/Type */}
                <div className={`text-sm font-medium mb-2 ${
                  isPopular ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  {formatDuration(plan)}
                </div>

                {/* Plan Name */}
                <h3 className={`text-lg font-semibold mb-3 ${
                  isPopular ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div className={`text-3xl font-bold mb-4 ${
                  isPopular ? 'text-yellow-400' : 'text-primary'
                }`}>
                  {formatPrice(plan.price_pkr)}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className={`flex items-start gap-2 text-sm ${
                      isPopular ? 'text-primary-foreground/90' : 'text-muted-foreground'
                    }`}>
                      <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                        isPopular ? 'text-yellow-400' : 'text-green-500'
                      }`} />
                      <span className="line-clamp-2">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Subscribe Button */}
                <Button
                  disabled={subscribing === plan.id}
                  className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                    isPopular 
                      ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  variant="default"
                >
                  {subscribing === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-5 w-5" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Mobile/Tablet: Horizontal Scroll */}
        <div className="lg:hidden">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {plans.map((plan) => {
              const badge = getPlanBadge(plan);
              const isPopular = plan.type === 'recordings_and_live';
              
              return (
                <div 
                  key={plan.id} 
                  className={`relative group transition-all duration-300 hover:shadow-lg flex-shrink-0 w-72 ${
                    isPopular 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-card text-card-foreground border border-border hover:border-primary/50'
                  } rounded-xl p-4 cursor-pointer`}
                  onClick={() => handleSubscribe(plan.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSubscribe(plan.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {/* Badge */}
                  {badge && !isPopular && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className={`${badge.color} text-white shadow-lg text-xs`}>
                        <badge.icon className="h-3 w-3 mr-1" />
                        {badge.text}
                      </Badge>
                    </div>
                  )}

                  {/* Plan Duration/Type */}
                  <div className={`text-xs font-medium mb-1 ${
                    isPopular ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  }`}>
                    {formatDuration(plan)}
                  </div>

                  {/* Plan Name */}
                  <h3 className={`text-sm font-semibold mb-2 line-clamp-2 ${
                    isPopular ? 'text-primary-foreground' : 'text-foreground'
                  }`}>
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className={`text-xl font-bold mb-3 ${
                    isPopular ? 'text-yellow-400' : 'text-primary'
                  }`}>
                    {formatPrice(plan.price_pkr)}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1 mb-4">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className={`flex items-start gap-1.5 text-xs ${
                        isPopular ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      }`}>
                        <Check className={`h-3 w-3 flex-shrink-0 mt-0.5 ${
                          isPopular ? 'text-yellow-400' : 'text-green-500'
                        }`} />
                        <span className="line-clamp-1">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe Button */}
                  <Button
                    disabled={subscribing === plan.id}
                    className={`w-full h-10 text-sm font-semibold transition-all duration-200 ${
                      isPopular 
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                    variant="default"
                  >
                    {subscribing === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Subscribe
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Plans Available</h3>
          <p className="text-muted-foreground">
            No subscription plans are currently available for this course.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t border-border">
        <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>24/7 Support</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Instant Access</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          All plans are backed by our 30-day money-back guarantee
        </p>
      </div>
    </div>
  );
}
