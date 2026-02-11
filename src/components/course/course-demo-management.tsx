'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Video, Calendar, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface DemoAccess {
  id: string;
  user_id: string;
  access_type: 'lecture_recording' | 'live_class';
  expires_at: string;
  used_at: string;
  users: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface CourseDemoManagementProps {
  courseId: string;
  courseTitle: string;
}

export default function CourseDemoManagement({ courseId, courseTitle }: CourseDemoManagementProps) {
  const { session } = useAuth();
  const [demos, setDemos] = useState<DemoAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  
  // Grant demo form state
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAccessType, setGrantAccessType] = useState<'lecture_recording' | 'live_class'>('lecture_recording');

  const loadDemos = async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/demo/list?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch demos');
      }

      const data = await response.json();
      setDemos(data.demos || []);
    } catch (error) {
      console.error('Error loading demos:', error);
      toast.error('Failed to load demo access data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemos();
  }, [session, courseId]);

  const handleRevoke = async (demoId: string) => {
    if (!session?.access_token) return;
    if (!confirm('Are you sure you want to revoke this demo access?')) return;

    try {
      const response = await fetch(`/api/demo-access?id=${demoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke demo');
      }

      toast.success('Demo access revoked successfully');
      loadDemos();
    } catch (error) {
      console.error('Error revoking demo:', error);
      toast.error('Failed to revoke demo access');
    }
  };

  const handleGrantDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setIsGranting(true);
    try {
      const response = await fetch('/api/admin/demo/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: grantUserId,
          courseId: courseId,
          accessType: grantAccessType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to grant demo');
      }

      toast.success('Demo access granted successfully');
      setIsGrantModalOpen(false);
      setGrantUserId('');
      setGrantAccessType('lecture_recording');
      loadDemos();
    } catch (error: any) {
      console.error('Error granting demo:', error);
      toast.error(error.message || 'Failed to grant demo access');
    } finally {
      setIsGranting(false);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) <= new Date();

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const activeCount = demos.filter(d => !isExpired(d.expires_at)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Demo Access for {courseTitle}</h3>
          <p className="text-sm text-muted-foreground">
            {activeCount} active demo{activeCount !== 1 ? 's' : ''} out of {demos.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDemos}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isGrantModalOpen} onOpenChange={setIsGrantModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Grant Demo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Demo Access</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGrantDemo} className="space-y-4">
                <div>
                  <Label htmlFor="userId">User ID *</Label>
                  <Input
                    id="userId"
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    placeholder="Enter user ID"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get user ID from the Users page or student list
                  </p>
                </div>
                <div>
                  <Label htmlFor="accessType">Access Type *</Label>
                  <Select
                    value={grantAccessType}
                    onValueChange={(value: 'lecture_recording' | 'live_class') => setGrantAccessType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture_recording">Lecture Recording</SelectItem>
                      <SelectItem value="live_class">Live Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm">
                  <p className="text-blue-800 dark:text-blue-200">
                    This will grant 24-hour demo access to <strong>{courseTitle}</strong>
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGrantModalOpen(false)}
                    disabled={isGranting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isGranting}>
                    {isGranting ? 'Granting...' : 'Grant Access'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Demo Access Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : demos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No demo access granted for this course yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Student</th>
                    <th className="text-left p-3 font-semibold">Access Type</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Time Remaining</th>
                    <th className="text-left p-3 font-semibold">Granted</th>
                    <th className="text-right p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demos.map((demo) => (
                    <tr key={demo.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{demo.users.full_name}</div>
                          <div className="text-sm text-muted-foreground">{demo.users.email}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={demo.access_type === 'lecture_recording' ? 'default' : 'secondary'}>
                          {demo.access_type === 'lecture_recording' ? (
                            <><Video className="h-3 w-3 mr-1" /> Recording</>
                          ) : (
                            <><Calendar className="h-3 w-3 mr-1" /> Live Class</>
                          )}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {isExpired(demo.expires_at) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {formatTimeRemaining(demo.expires_at)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(demo.used_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevoke(demo.id)}
                          disabled={isExpired(demo.expires_at)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
