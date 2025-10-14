'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPlan {
  id: string;
  name: string;
  type: 'recordings_only' | 'live_classes_only' | 'recordings_and_live';
  duration_months: number | null;
  duration_until_date: string | null;
  price_pkr: number;
  features: any;
  is_active: boolean;
}

export default function AdminPlansPage() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/subscription-plans', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load plans');
        const json = await res.json();
        setPlans(json.plans || []);
      } catch (e) {
        toast.error('Failed to load plans');
      } finally {
        setLoading(false);
      }
    };
    if (userRole === 'superadmin') load();
  }, [userRole]);

  const grouped = useMemo(() => {
    const map: Record<string, AdminPlan[]> = {};
    for (const p of plans) {
      if (!map[p.type]) map[p.type] = [];
      map[p.type].push(p);
    }
    for (const key of Object.keys(map)) {
      map[key] = map[key].sort((a, b) => a.price_pkr - b.price_pkr);
    }
    return map;
  }, [plans]);

  const savePlan = async (plan: AdminPlan) => {
    try {
      setSavingId(plan.id);
      const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_pkr: plan.price_pkr,
          duration_months: plan.duration_months,
          duration_until_date: plan.duration_until_date,
          is_active: plan.is_active,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const json = await res.json();
      setPlans(prev => prev.map(p => (p.id === plan.id ? json.plan : p)));
      toast.success('Plan updated');
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setSavingId(null);
    }
  };

  if (userRole !== 'superadmin') {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              You need superadmin access to manage subscription plans.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([type, typePlans]) => (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold capitalize">{type.replace(/_/g, ' ')}</h2>
                  <Badge variant="secondary">{typePlans.length} plans</Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {typePlans.map(plan => (
                    <Card key={plan.id} className="border-gray-200 dark:border-gray-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`price-${plan.id}`}>Price (PKR)</Label>
                            <Input
                              id={`price-${plan.id}`}
                              type="number"
                              value={plan.price_pkr}
                              onChange={(e) => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price_pkr: Number(e.target.value) } : p))}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`active-${plan.id}`}>Active</Label>
                            <div className="flex items-center gap-2 h-10">
                              <input
                                id={`active-${plan.id}`}
                                type="checkbox"
                                checked={plan.is_active}
                                onChange={(e) => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: e.target.checked } : p))}
                              />
                              <span className="text-sm">{plan.is_active ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`months-${plan.id}`}>Duration (months)</Label>
                            <Input
                              id={`months-${plan.id}`}
                              type="number"
                              value={plan.duration_months ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : Number(e.target.value);
                                setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, duration_months: value, duration_until_date: value != null ? null : p.duration_until_date } : p));
                              }}
                              placeholder="e.g. 1 or 3"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`until-${plan.id}`}>Duration until date</Label>
                            <Input
                              id={`until-${plan.id}`}
                              type="date"
                              value={plan.duration_until_date ? plan.duration_until_date.substring(0, 10) : ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : e.target.value;
                                setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, duration_until_date: value, duration_months: value ? null : p.duration_months } : p));
                              }}
                            />
                          </div>
                        </div>

                        <div className="pt-1">
                          <Button
                            onClick={() => savePlan(plan)}
                            disabled={savingId === plan.id}
                            className="bg-primary text-white hover:bg-primary-600"
                          >
                            {savingId === plan.id ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}




