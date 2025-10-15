'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Removed unused Checkbox import
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Avatar from '@/components/ui/avatar';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Save, 
  UserCheck, 
  UserX,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Tables } from '@/lib/supabase';

type LiveClass = Tables<'live_classes'>;

interface AttendanceRecord {
  student_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: 'present' | 'absent' | 'late';
  marked_at: string | null;
  notes: string | null;
}

interface AttendanceInterfaceProps {
  liveClass: LiveClass;
  onClose?: () => void;
}

export default function AttendanceInterface({ liveClass, onClose }: AttendanceInterfaceProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // const [bulkAction, setBulkAction] = useState<'present' | 'absent' | null>(null);
  const { session } = useAuth();

  // Fetch attendance data
  const fetchAttendance = async () => {
    try {
      if (!session) return;

      const response = await fetch(`/api/live-classes/${liveClass.id}/attendance`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const data = await response.json();
      setAttendance(data.attendance || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAttendance();
    }
  }, [liveClass.id, session]);

  // Update individual student attendance
  const updateStudentAttendance = (studentId: string, status: 'present' | 'absent' | 'late', notes?: string) => {
    setAttendance(prev => prev.map(record => 
      record.student_id === studentId 
        ? { 
            ...record, 
            status, 
            marked_at: new Date().toISOString(),
            notes: notes || record.notes
          }
        : record
    ));
  };

  // Handle bulk action
  const handleBulkAction = (action: 'present' | 'absent') => {
    setAttendance(prev => prev.map(record => ({
      ...record,
      status: action,
      marked_at: new Date().toISOString()
    })));
    // setBulkAction(action);
  };

  // Save attendance
  const saveAttendance = async () => {
    setSaving(true);

    try {
      if (!session) return;

      const attendanceData = attendance.map(record => ({
        student_id: record.student_id,
        status: record.status,
        notes: record.notes
      }));

      const response = await fetch(`/api/live-classes/${liveClass.id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ attendanceData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      toast.success('Attendance saved successfully');
      // setBulkAction(null);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Get attendance statistics
  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">{liveClass.title}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Mark attendance for enrolled students
                </p>
              </div>
            </div>
            <Badge 
              variant="outline"
              className="bg-blue-500 text-white"
            >
              Live Class
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.present}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.absent}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.late}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Late</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-sm font-medium">Bulk Actions:</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('present')}
                className="text-green-600 border-green-600 hover:bg-green-50 w-full sm:w-auto"
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('absent')}
                className="text-red-600 border-red-600 hover:bg-red-50 w-full sm:w-auto"
              >
                <UserX className="h-4 w-4 mr-1" />
                Mark All Absent
              </Button>
            </div>
            <Button
              onClick={saveAttendance}
              disabled={saving}
              className="bg-primary hover:bg-primary-600 w-full sm:w-auto"
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Students ({attendance.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {attendance.map((student) => (
              <div key={student.student_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <Avatar 
                      src={student.avatar_url} 
                      name={student.full_name}
                      size="md"
                      className="h-10 w-10"
                    />
                    <div>
                      <div className="font-medium">{student.full_name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {student.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:space-x-4">
                    {/* Status Selection */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={student.status === 'present' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateStudentAttendance(student.student_id, 'present')}
                        className={
                          student.status === 'present' 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'text-green-600 border-green-600 hover:bg-green-50'
                        }
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Present
                      </Button>
                      <Button
                        variant={student.status === 'late' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateStudentAttendance(student.student_id, 'late')}
                        className={
                          student.status === 'late' 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'text-yellow-600 border-yellow-600 hover:bg-yellow-50'
                        }
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Late
                      </Button>
                      <Button
                        variant={student.status === 'absent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateStudentAttendance(student.student_id, 'absent')}
                        className={
                          student.status === 'absent' 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'text-red-600 border-red-600 hover:bg-red-50'
                        }
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Absent
                      </Button>
                    </div>

                    {/* Notes */}
                    <div className="w-full sm:w-48">
                      <Textarea
                        placeholder="Add notes..."
                        value={student.notes || ''}
                        onChange={(e) => updateStudentAttendance(
                          student.student_id, 
                          student.status, 
                          e.target.value
                        )}
                        className="min-h-[32px] text-sm"
                        rows={1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {attendance.length === 0 && (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No students enrolled in this course yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2">
        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        )}
        <Button
          onClick={saveAttendance}
          disabled={saving}
          className="bg-primary hover:bg-primary-600 w-full sm:w-auto"
        >
          {saving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Attendance
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
