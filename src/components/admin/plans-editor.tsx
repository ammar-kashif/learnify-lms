'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Trash2 } from 'lucide-react';
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

export default function PlansEditor() {
  const { userRole, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    type: 'recordings_only' as AdminPlan['type'],
    duration_months: 1 as number | null,
    duration_until_date: null as string | null,
    price_pkr: 0,
    is_active: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/subscription-plans', {
          cache: 'no-store',
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
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
  }, [userRole, session?.access_token]);

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
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
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

  const createPlan = async () => {
    try {
      setCreating(true);
      if (!newPlan.name || !newPlan.price_pkr || (!newPlan.duration_months && !newPlan.duration_until_date)) {
        toast.error('Please fill name, price and either months or until-date');
        return;
      }
      if (newPlan.duration_months && newPlan.duration_until_date) {
        toast.error('Choose months OR until-date, not both');
        return;
      }
      const res = await fetch('/api/subscription-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          name: newPlan.name,
          type: newPlan.type,
          duration_months: newPlan.duration_months,
          duration_until_date: newPlan.duration_until_date,
          price_pkr: newPlan.price_pkr,
          features: [],
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const json = await res.json();
      setPlans(prev => [...prev, json.plan]);
      setNewPlan({ name: '', type: 'recordings_only', duration_months: 1, duration_until_date: null, price_pkr: 0, is_active: true });
      toast.success('Plan created');
    } catch (e) {
      toast.error('Create failed');
    } finally {
      setCreating(false);
    }
  };

  if (userRole !== 'superadmin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>You need superadmin access to manage subscription plans.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription Plans</h2>
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" value={newPlan.name} onChange={(e) => setNewPlan(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="new-type">Type</Label>
              <select
                id="new-type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={newPlan.type}
                onChange={(e) => setNewPlan(p => ({ ...p, type: e.target.value as AdminPlan['type'] }))}
              >
                <option value="recordings_only">Recordings only</option>
                <option value="live_classes_only">Live classes only</option>
                <option value="recordings_and_live">Recordings + Live</option>
              </select>
            </div>
            <div>
              <Label htmlFor="new-price">Price (PKR)</Label>
              <Input id="new-price" type="number" value={newPlan.price_pkr} onChange={(e) => setNewPlan(p => ({ ...p, price_pkr: Number(e.target.value) }))} />
            </div>
            <div className="flex items-end">
              <Button onClick={createPlan} disabled={creating} className="w-full bg-primary text-white hover:bg-primary-600">
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-months">Duration (months)</Label>
              <Input
                id="new-months"
                type="number"
                value={newPlan.duration_months ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : Number(e.target.value);
                  setNewPlan(p => ({ ...p, duration_months: value, duration_until_date: value != null ? null : p.duration_until_date }));
                }}
                placeholder="e.g. 1 or 3"
              />
            </div>
            <div>
              <Label htmlFor="new-until">Duration until date</Label>
              <Input
                id="new-until"
                type="date"
                value={newPlan.duration_until_date ? newPlan.duration_until_date.substring(0, 10) : ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : e.target.value;
                  setNewPlan(p => ({ ...p, duration_until_date: value, duration_months: value ? null : p.duration_months }));
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, typePlans]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold capitalize">{type.split('_').join(' ')}</h3>
                <Badge variant="secondary">{typePlans.length} plans</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {typePlans.map(plan => (
                  <Card key={plan.id} className="border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!confirm('Delete this plan?')) return;
                            try {
                              const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, {
                                method: 'DELETE',
                                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
                              });
                              if (!res.ok) throw new Error('Failed to delete');
                              setPlans(prev => prev.filter(p => p.id !== plan.id));
                              toast.success('Plan deleted');
                            } catch (e) {
                              toast.error('Delete failed');
                            }
                          }}
                          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: checked } : p));
                                // Auto-save toggle
                                void savePlan({ ...plan, is_active: checked });
                              }}
                              disabled={savingId === plan.id}
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
  );
}


