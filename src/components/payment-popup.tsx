'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Copy, Check, AlertCircle, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ModernSubscriptionModal from './modern-subscription-modal';

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    subject: string;
    amount?: number;
  };
  onCompletePayment: (courseId: string, amount: number, subscriptionPlanId?: string) => Promise<void>;
  onSelectPlan?: (planId: string, plan: any) => void;
  loading?: boolean;
  isSubscription?: boolean;
  subscriptionPlans?: Array<{
    id: string;
    name: string;
    type: string;
    price_pkr: number;
    duration_months?: number;
    duration_until_date?: string;
  }>;
  selectedSubscriptionPlan?: any;
  isUpgrade?: boolean; // New prop to indicate if this is an upgrade from demo
}

export default function PaymentPopup({
  isOpen,
  onClose,
  course,
  onCompletePayment,
  onSelectPlan,
  loading = false,
  isSubscription = false,
  subscriptionPlans = [],
  selectedSubscriptionPlan = null,
  isUpgrade = false,
}: PaymentPopupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Plan selection state
  type PlanId = 'oneMonth' | 'threeMonth' | 'untilCIES';
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('oneMonth');
  const [addonSelected, setAddonSelected] = useState<boolean>(false);

  // Pricing config (PKR) - Legacy system
  const pricing = {
    oneMonth: { label: '1 Month Recording', price: 7000 },
    threeMonth: { label: '3 Month Recording', pricePerMonth: 3500 },
    untilCIES: { label: 'Until CIES', pricePerMonth: 2000 },
    addon: { label: '2 Problem Solving Sessions / month', price: 1000 },
  } as const;

  // Compute payable amount for this transaction
  const payableAmount = useMemo(() => {
    if (isSubscription && subscriptionPlans.length > 0) {
      const selectedPlanData = subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlan);
      return selectedPlanData?.price_pkr || 0;
    }

    // Legacy pricing calculation
    let base = 0;
    if (selectedPlan === 'oneMonth') base = pricing.oneMonth.price;
    if (selectedPlan === 'threeMonth') base = pricing.threeMonth.pricePerMonth;
    if (selectedPlan === 'untilCIES') base = pricing.untilCIES.pricePerMonth;

    // Addon is paid only with 1-month plan; included (free) otherwise
    if (selectedPlan === 'oneMonth' && addonSelected) base += pricing.addon.price;
    return base;
  }, [selectedPlan, addonSelected, selectedSubscriptionPlan, isSubscription, subscriptionPlans]);

  const bankDetails = {
    bankName: 'Sadapay',
    accountNumber: '0313-4568921',
    accountName: 'Learnify',
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCompletePayment = async () => {
    // Use computed amount from plan selection; fall back to course.amount or default
    const amount = payableAmount || course.amount || 5000;
    console.log('🔍 Payment popup - course details:', { 
      course, 
      courseId: course.id, 
      courseIdType: typeof course.id,
      amount,
      isSubscription,
      selectedSubscriptionPlan
    });
    
    // Ensure course ID is a string
    const courseId = String(course.id);
    console.log('🔍 Converted course ID:', courseId, 'Type:', typeof courseId);
    
    await onCompletePayment(courseId, amount, isSubscription ? selectedSubscriptionPlan : undefined);
  }
  
  const openWhatsApp = () => {
    // Use the correct amount based on context
    let amount;
    if (isSubscription && selectedSubscriptionPlan) {
      amount = selectedSubscriptionPlan.price_pkr;
    } else {
      amount = payableAmount || course.amount || 5000;
    }
    
    const phone = '923005299693';
    const message = `Hi, I have completed the payment for ${course.title}.\nAmount: PKR ${amount}.\nI will share the screenshot here.`;
    const encoded = encodeURIComponent(message);

    // Best-effort: copy message so user can paste if Desktop app ignores text param
    try {
      void navigator.clipboard.writeText(message).then(() => {
        toast.success('Message copied. If not auto-filled, paste in WhatsApp (Ctrl+V).');
      }).catch(() => {
        // ignore clipboard errors
      });
    } catch (_) {
      // ignore clipboard errors
    }

    // Open WhatsApp Web with prefilled text
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openWhatsAppDesktop = () => {
    // Use the correct amount based on context
    let amount;
    if (isSubscription && selectedSubscriptionPlan) {
      amount = selectedSubscriptionPlan.price_pkr;
    } else {
      amount = payableAmount || course.amount || 5000;
    }
    const phone = '923005299693';
    const message = `Hi, I have completed the payment for ${course.title}.\nAmount: PKR ${amount}.\nI will share the screenshot here.`;
    const encoded = encodeURIComponent(message);

    try {
      void navigator.clipboard.writeText(message).catch(() => {});
    } catch (_) {
      // ignore clipboard errors
    }

    const encodedCRLF = encodeURIComponent(message.replace(/\n/g, '\\n'));
    const encodedPct = message.replace(/\n/g, '%0A').replace(/ /g, '%20');
    const variants = [
      `whatsapp://send?abid=+${phone}&text=${encoded}`,
      `whatsapp://send?phone=+${phone}&text=${encoded}`,
      `whatsapp://send?phone=${phone}&text=${encoded}`,
      `whatsapp://send?text=${encoded}&phone=${phone}`,
      `whatsapp://send?text=${encoded}&phone=+${phone}`,
      `whatsapp://send/?phone=${phone}&text=${encoded}`,
      `whatsapp://send/?text=${encoded}&phone=${phone}`,
      `whatsapp://send?jid=${phone}@s.whatsapp.net&text=${encoded}`,
      `whatsapp://send?phone=${phone}&text=${encodedPct}`,
      `whatsapp://send?text=${encodedPct}&phone=${phone}`,
      `whatsapp://send?phone=${phone}&text=${encodedCRLF}`,
    ];

    let idx = 0;
    const tryNext = () => {
      if (idx >= variants.length) return;
      const uri = variants[idx++];
      window.location.href = uri;
      setTimeout(tryNext, 600);
    };
    tryNext();
  };
  // Two-step view state
  const [step, setStep] = useState<1 | 2>(1);

  // If it's a subscription and no plan is selected, show the modern modal
  if (isSubscription && !selectedSubscriptionPlan) {
    const processedPlans = subscriptionPlans.map((plan) => ({
      ...plan,
      features: [
        plan.type === 'recordings_only' ? 'Access to all recordings' : 
        plan.type === 'live_classes_only' ? 'Access to live classes' :
        'Access to recordings + live classes',
        '24/7 Student Support',
        'Mobile App Access',
        'Progress Tracking',
        'Certificate of Completion'
      ],
      limitations: plan.type === 'recordings_only' ? ['No live class access'] : 
                  plan.type === 'live_classes_only' ? ['No recording access'] : []
    }));

    return (
      <ModernSubscriptionModal
        isOpen={isOpen}
        onClose={onClose}
        course={course}
        onSelectPlan={async (planId, plan) => {
          // Call the parent's onSelectPlan to handle the flow
          if (onSelectPlan) {
            onSelectPlan(planId, plan);
          }
        }}
        subscriptionPlans={processedPlans}
        loading={loading}
      />
    );
  }

  // If it's a subscription and a plan is selected, show payment details
  if (isSubscription && selectedSubscriptionPlan) {
    const plan = selectedSubscriptionPlan;
    const amount = plan.price_pkr;
    
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <CreditCard className="h-5 w-5 text-primary" />
              {isUpgrade ? 'Upgrade to' : 'Payment Details -'} {plan.name}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              {isUpgrade ? 'Upgrade your demo access to full subscription for' : 'Complete your subscription for'} <strong>{course.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selected Plan Summary */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-base text-gray-900 dark:text-white">
                  Selected Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {plan.type === 'recordings_only' ? 'Recordings Only' : 
                       plan.type === 'live_classes_only' ? 'Live Classes Only' :
                       'Recordings + Live Classes'}
                    </p>
                    {plan.duration_months && (
                      <p className="text-sm text-gray-500">
                        Duration: {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}
                      </p>
                    )}
                    {plan.duration_until_date && (
                      <p className="text-sm text-gray-500">
                        Valid until: {new Date(plan.duration_until_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      PKR {amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Instructions */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-base text-gray-900 dark:text-white">
                  Payment Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Bank Name */}
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Bank Name
                      </p>
                      <p className="text-lg font-mono text-gray-700 dark:text-gray-300">
                        {bankDetails.bankName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(bankDetails.bankName, 'Bank Name')}
                      className="h-8 w-8 p-0"
                    >
                      {copiedField === 'Bank Name' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>

                  {/* Account Number */}
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Account Number
                      </p>
                      <p className="text-lg font-mono text-gray-700 dark:text-gray-300">
                        {bankDetails.accountNumber}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account Number')}
                      className="h-8 w-8 p-0"
                    >
                      {copiedField === 'Account Number' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>

                  {/* Account Name */}
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Account Name
                      </p>
                      <p className="text-lg font-mono text-gray-700 dark:text-gray-300">
                        {bankDetails.accountName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(bankDetails.accountName, 'Account Name')}
                      className="h-8 w-8 p-0"
                    >
                      {copiedField === 'Account Name' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Amount to Transfer
                      </p>
                      <p className="text-lg font-mono text-gray-700 dark:text-gray-300">
                        PKR {amount.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`PKR ${amount.toLocaleString()}`, 'Amount')}
                      className="h-8 w-8 p-0"
                    >
                      {copiedField === 'Amount' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={openWhatsApp}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                  <Button
                    onClick={() => onCompletePayment(course.id, amount, plan.id)}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Processing...' : 'Mark as Paid'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="h-5 w-5 text-primary" />
            {isUpgrade ? 'Upgrade to Full Access' : 'Payment Details'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {isUpgrade ? 'Upgrade your demo access to full enrollment for' : 'Complete your enrollment for'} <strong>{course.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card 1: Plan & Add-on */}
          {step === 1 && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">
                {isSubscription ? 'Select Subscription Plan' : 'Select a Plan'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isSubscription && subscriptionPlans.length > 0 ? (
                // Grid layout - all plans in one view, sorted by duration
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {subscriptionPlans
                    .sort((a, b) => {
                      // Sort by duration: 1 month first, then 3 months, then until CIES (May 31, 2026)
                      const getDurationOrder = (plan: any) => {
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
                    })
                    .map((plan) => {
                    const isSelected = selectedSubscriptionPlan === plan.id;

                    return (
                      <div key={plan.id} className="relative">
                        <input
                          id={`plan-${plan.id}`}
                          type="radio"
                          name="subscriptionPlan"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => {}}
                        />
                        <label 
                          htmlFor={`plan-${plan.id}`} 
                          className={`block cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            isSelected ? 'scale-105' : ''
                          }`}
                        >
                          <div className={`relative group transition-all duration-300 rounded-lg p-3 h-full min-h-[140px] ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground shadow-lg' 
                              : 'bg-card text-card-foreground border border-border hover:border-primary/50'
                          }`}>
                            {/* Plan Duration/Type */}
                            <div className={`text-xs font-medium mb-1 ${
                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}>
                              {plan.duration_months 
                                ? `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`
                                : plan.duration_until_date 
                                ? `Until ${new Date(plan.duration_until_date).toLocaleDateString()}`
                                : 'No duration specified'
                              }
                            </div>

                            {/* Plan Name */}
                            <h3 className={`text-xs font-semibold mb-1 line-clamp-2 ${
                              isSelected ? 'text-primary-foreground' : 'text-foreground'
                            }`}>
                              {plan.name}
                            </h3>

                            {/* Price */}
                            <div className={`text-sm font-bold mb-2 ${
                              isSelected ? 'text-yellow-400' : 'text-primary'
                            }`}>
                              PKR {plan.price_pkr.toLocaleString()}
                            </div>

                            {/* Features - Compact */}
                            <ul className="space-y-0.5 mb-2">
                              {[
                                plan.type === 'recordings_only' ? 'Recordings' : 
                                plan.type === 'live_classes_only' ? 'Live classes' :
                                'Recordings + Live',
                                '24/7 Support'
                              ].map((feature, index) => (
                                <li key={index} className={`flex items-start gap-1 text-xs ${
                                  isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground'
                                }`}>
                                  <Check className={`h-2.5 w-2.5 flex-shrink-0 mt-0.5 ${
                                    isSelected ? 'text-yellow-400' : 'text-green-500'
                                  }`} />
                                  <span className="line-clamp-1">{feature}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Selection Indicator */}
                            <div className="flex items-center justify-center mt-auto">
                              <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                isSelected 
                                  ? 'border-yellow-400 bg-yellow-400' 
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isSelected && <div className="w-1 h-1 rounded-full bg-black" />}
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Legacy plan selection
                <>
                  <input
                    id="plan-oneMonth"
                    type="radio"
                    name="plan"
                    className="sr-only"
                    checked={selectedPlan === 'oneMonth'}
                    onChange={() => setSelectedPlan('oneMonth')}
                  />
                  <label htmlFor="plan-oneMonth" className={`flex items-center justify-between rounded-md border p-3 cursor-pointer ${selectedPlan==='oneMonth' ? 'border-primary' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{pricing.oneMonth.label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">PKR {pricing.oneMonth.price}</p>
                    </div>
                    <span aria-hidden className="h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center">
                      {selectedPlan==='oneMonth' && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                  </label>
       
                  <input
                    id="plan-threeMonth"
                    type="radio"
                    name="plan"
                    className="sr-only"
                    checked={selectedPlan === 'threeMonth'}
                    onChange={() => setSelectedPlan('threeMonth')}
                  />
                  <label htmlFor="plan-threeMonth" className={`flex items-center justify-between rounded-md border p-3 cursor-pointer ${selectedPlan==='threeMonth' ? 'border-primary' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{pricing.threeMonth.label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">PKR {pricing.threeMonth.pricePerMonth} / month</p>
                    </div>
                    <span aria-hidden className="h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center">
                      {selectedPlan==='threeMonth' && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                  </label>
       
                  <input
                    id="plan-untilCIES"
                    type="radio"
                    name="plan"
                    className="sr-only"
                    checked={selectedPlan === 'untilCIES'}
                    onChange={() => setSelectedPlan('untilCIES')}
                  />
                  <label htmlFor="plan-untilCIES" className={`flex items-center justify-between rounded-md border p-3 cursor-pointer ${selectedPlan==='untilCIES' ? 'border-primary' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{pricing.untilCIES.label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">PKR {pricing.untilCIES.pricePerMonth} / month</p>
                    </div>
                    <span aria-hidden className="h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center">
                      {selectedPlan==='untilCIES' && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                  </label>
                  {/* Add-on logic */}
                  <div className="mt-1 rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{pricing.addon.label}</p>
                        {selectedPlan === 'oneMonth' ? (
                          <p className="text-xs text-gray-600 dark:text-gray-300">PKR {pricing.addon.price} (optional)</p>
                        ) : (
                          <p className="text-xs text-green-700 dark:text-green-300">Included free with this plan</p>
                        )}
                      </div>
                      {selectedPlan === 'oneMonth' ? (
                        <input type="checkbox" checked={addonSelected} onChange={(e)=> setAddonSelected(e.target.checked)} />
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Free</Badge>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* Card 2: Payment Summary */}
          {step === 2 && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Course Info */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {course.subject}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary-700 dark:text-primary-300">
                    O Levels
                  </Badge>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3">
                {/* Bank Name */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Bank Name
                    </p>
                    <p className="text-lg font-mono text-gray-700 dark:text-gray-300">
                      {bankDetails.bankName}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(bankDetails.bankName, 'Bank Name')}
                    className="h-8 w-8 p-0"
                  >
                    {copiedField === 'Bank Name' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Account Number
                    </p>
                    <p className="text-lg font-mono text-gray-700 dark:text-gray-300">
                      {bankDetails.accountNumber}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account Number')}
                    className="h-8 w-8 p-0"
                  >
                    {copiedField === 'Account Number' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>

                {/* Account Name */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Account Name
                    </p>
                    <p className="text-lg font-mono text-gray-700 dark:text-gray-300">
                      {bankDetails.accountName}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(bankDetails.accountName, 'Account Name')}
                    className="h-8 w-8 p-0"
                  >
                    {copiedField === 'Account Name' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Payment Amount Display */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Payment Amount
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    PKR {payableAmount || course.amount || 5000}
                  </p>
                </div>
              </div>

              {/* Important Message */}
              <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Important
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Please share a screenshot of the payment verification to the same number as above for the account number.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {step === 2 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  disabled={loading}
                >
                  Back
                </Button>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading}
                    onClick={openWhatsAppDesktop}
                    title="Open WhatsApp Desktop"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" /> Desktop
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={loading}
                    onClick={openWhatsApp}
                    title="Open WhatsApp Web"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" /> Web
                  </Button>
                </div>
                <Button
                  onClick={handleCompletePayment}
                  disabled={loading}
                  className="flex-1 bg-primary text-white hover:bg-primary-600"
                >
                  {loading ? 'Processing...' : 'Complete Payment'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-primary text-white hover:bg-primary-600"
                  disabled={loading}
                >
                  Next
                </Button>
              </>
            )}
          </div>
      </DialogContent>
    </Dialog>
  );
}