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
import { CreditCard, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    subject: string;
    amount?: number;
  };
  onCompletePayment: (courseId: string, amount: number) => Promise<void>;
  loading?: boolean;
}

export default function PaymentPopup({
  isOpen,
  onClose,
  course,
  onCompletePayment,
  loading = false,
}: PaymentPopupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Plan selection state
  type PlanId = 'oneMonth' | 'threeMonth' | 'untilCIES';
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('oneMonth');
  const [addonSelected, setAddonSelected] = useState<boolean>(false);

  // Pricing config (PKR)
  const pricing = {
    oneMonth: { label: '1 Month Recording', price: 7000 },
    threeMonth: { label: '3 Month Recording', pricePerMonth: 3500 },
    untilCIES: { label: 'Until CIES', pricePerMonth: 2000 },
    addon: { label: '2 Problem Solving Sessions / month', price: 1000 },
  } as const;

  // Compute payable amount for this transaction
  const payableAmount = useMemo(() => {
    let base = 0;
    if (selectedPlan === 'oneMonth') base = pricing.oneMonth.price;
    if (selectedPlan === 'threeMonth') base = pricing.threeMonth.pricePerMonth;
    if (selectedPlan === 'untilCIES') base = pricing.untilCIES.pricePerMonth;

    // Addon is paid only with 1-month plan; included (free) otherwise
    if (selectedPlan === 'oneMonth' && addonSelected) base += pricing.addon.price;
    return base;
  }, [selectedPlan, addonSelected]);

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
      amount 
    });
    
    // Ensure course ID is a string
    const courseId = String(course.id);
    console.log('🔍 Converted course ID:', courseId, 'Type:', typeof courseId);
    
    await onCompletePayment(courseId, amount);
  }
  // Two-step view state
  const [step, setStep] = useState<1 | 2>(1);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Details
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Complete your enrollment for <strong>{course.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card 1: Plan & Add-on */}
          {step === 1 && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Select a Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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