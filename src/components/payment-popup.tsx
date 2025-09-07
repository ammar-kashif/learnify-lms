'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    // Default amount is 5000 PKR for all courses
    const amount = course.amount || 5000;
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
  };

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
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Bank Transfer Details
            </h4>
            
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
          </div>

          {/* Payment Amount Display */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Payment Amount
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                PKR {course.amount || 5000}
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              disabled={loading}
            >
              Cancel
            </Button>
             <Button
               onClick={handleCompletePayment}
               disabled={loading}
               className="flex-1 bg-primary text-white hover:bg-primary-600"
             >
               {loading ? 'Processing...' : 'Complete Payment'}
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
