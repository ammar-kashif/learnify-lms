'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Star, Clock, Calendar, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: string;
  price_pkr: number;
  duration_months?: number;
  duration_until_date?: string;
  features: string[];
  limitations: string[];
  popular?: boolean;
  savings?: string;
}

interface ModernSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    subject: string;
  };
  onSelectPlan: (planId: string, plan: SubscriptionPlan) => void;
  subscriptionPlans: SubscriptionPlan[];
  loading?: boolean;
}

type TimelineOption = '1month' | '3months' | 'cies';

export default function ModernSubscriptionModal({
  isOpen,
  onClose,
  course,
  onSelectPlan,
  subscriptionPlans,
  loading = false,
}: ModernSubscriptionModalProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineOption>('1month');
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  if (!isOpen) return null;

  // Process plans and group by timeline
  const timelinePlans = {
    '1month': subscriptionPlans.filter(plan => plan.duration_months === 1),
    '3months': subscriptionPlans.filter(plan => plan.duration_months === 3),
    'cies': subscriptionPlans.filter(plan => plan.duration_until_date && 
      new Date(plan.duration_until_date).getFullYear() === 2026)
  };

  const currentPlans = timelinePlans[selectedTimeline];

  const handleSelectPlan = (planId: string) => {
    const selectedPlanData = subscriptionPlans.find(plan => plan.id === planId);
    if (selectedPlanData) {
      setSelectedPlan(planId);
      onSelectPlan(planId, selectedPlanData);
    }
  };

  const getTimelineIcon = (timeline: TimelineOption) => {
    switch (timeline) {
      case '1month': return <Clock className="h-4 w-4" />;
      case '3months': return <Star className="h-4 w-4" />;
      case 'cies': return <Calendar className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTimelineLabel = (timeline: TimelineOption) => {
    switch (timeline) {
      case '1month': return '1 Month';
      case '3months': return '3 Months';
      case 'cies': return 'Until CIES';
      default: return 'Custom';
    }
  };

  const getPlanIcon = (plan: SubscriptionPlan) => {
    if (plan.type === 'recordings_only') return <Clock className="h-5 w-5" />;
    if (plan.type === 'live_classes_only') return <Star className="h-5 w-5" />;
    if (plan.type === 'recordings_and_live') return <Calendar className="h-5 w-5" />;
    return <Zap className="h-5 w-5" />;
  };

  const getPlanTypeColor = (plan: SubscriptionPlan) => {
    if (plan.type === 'recordings_only') return 'bg-blue-500';
    if (plan.type === 'live_classes_only') return 'bg-green-500';
    if (plan.type === 'recordings_and_live') return 'bg-primary';
    return 'bg-gray-500';
  };

  const getPlanTypeLabel = (plan: SubscriptionPlan) => {
    if (plan.type === 'recordings_only') return 'RECORDINGS';
    if (plan.type === 'live_classes_only') return 'LIVE CLASSES';
    if (plan.type === 'recordings_and_live') return 'RECORDINGS + LIVE';
    return 'BASIC';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Semi-transparent dark overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        aria-label="Close subscription modal"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onClose(); } }}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Choose Your Learning Plan
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Unlock <span className="font-semibold text-primary">{course.title}</span> with flexible access options
              </p>
            </div>
          </div>

          <div className="p-8">
            {/* Timeline Selector */}
            <div className="mb-8">
              <div className="flex items-center justify-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-4">
                  Choose Timeline
                </h3>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                  {(['1month', '3months', 'cies'] as TimelineOption[]).map((timeline) => (
                    <button
                      key={timeline}
                      onClick={() => setSelectedTimeline(timeline)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                        selectedTimeline === timeline
                          ? "bg-primary text-white shadow-lg"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      {getTimelineIcon(timeline)}
                      {getTimelineLabel(timeline)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    selectedTimeline === '1month' && "bg-primary w-1/3",
                    selectedTimeline === '3months' && "bg-primary w-2/3",
                    selectedTimeline === 'cies' && "bg-primary w-full"
                  )}
                />
              </div>
            </div>

            {/* Plans Grid - 3 cards side by side */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const planTypeColor = getPlanTypeColor(plan);
                const planTypeLabel = getPlanTypeLabel(plan);
                
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative group transition-all duration-300 cursor-pointer transform hover:scale-105 flex flex-col h-full",
                      isSelected && "ring-2 ring-primary shadow-xl scale-105",
                      "hover:shadow-xl"
                    )}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {/* Plan Type Header */}
                    <div className={cn(
                      "text-center py-4 rounded-t-lg text-white font-bold text-sm",
                      planTypeColor
                    )}>
                      {planTypeLabel}
                    </div>

                    <CardHeader className="text-center pb-4">
                      {/* Plan Icon */}
                      <div className={cn(
                        "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                        isSelected 
                          ? "bg-primary/10 text-primary" 
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}>
                        {getPlanIcon(plan)}
                      </div>

                      {/* Plan Name */}
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        {plan.name}
                      </CardTitle>

                      {/* Price */}
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          PKR {plan.price_pkr.toLocaleString()}
                        </span>
                        {plan.duration_months && (
                          <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                            /{plan.duration_months === 1 ? 'month' : '3 months'}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 flex flex-col flex-grow">
                      {/* Features */}
                      <div className="space-y-3 mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                          What&apos;s included:
                        </h4>
                        <ul className="space-y-2">
                          {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start gap-3">
                              <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Limitations */}
                      {plan.limitations && plan.limitations.length > 0 && (
                        <div className="space-y-2 mb-6">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                            Limitations:
                          </h4>
                          <ul className="space-y-1">
                            {plan.limitations.map((limitation, limitIndex) => (
                              <li key={limitIndex} className="flex items-start gap-3">
                                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {limitation}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Spacer to push button to bottom */}
                      <div className="flex-grow"></div>

                      {/* Select Button */}
                      <Button
                        className={cn(
                          "w-full py-3 text-base font-semibold transition-all duration-300 mt-auto",
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                        )}
                        disabled={loading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlan(plan.id);
                        }}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          isSelected ? 'Selected' : 'Select Plan'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Bottom Info */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All plans include 24/7 support and can be upgraded at any time
              </p>
              <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Instant Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Money Back Guarantee</span>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}