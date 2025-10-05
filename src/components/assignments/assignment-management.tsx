'use client';

import { useState } from 'react';
import AssignmentList from './assignment-list';
import AssignmentCreationForm from './assignment-creation-form';
import AssignmentSubmissionForm from './assignment-submission-form';
import AssignmentGradingInterface from './assignment-grading-interface';
import AssignmentGradeView from './assignment-grade-view';

interface Chapter {
  id: string;
  title: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_points: number;
  allowed_file_types: string[];
  max_file_size_mb: number;
  max_submissions: number;
  is_published: boolean;
  created_at: string;
  chapters?: {
    id: string;
    title: string;
  } | null;
  users?: {
    id: string;
    full_name: string;
  };
  submissions?: any[];
}

interface AssignmentManagementProps {
  courseId: string;
  userRole: string;
  chapters: Chapter[];
}

type ViewMode = 'list' | 'create' | 'edit' | 'submit' | 'grade' | 'view';

export default function AssignmentManagement({
  courseId,
  userRole,
  chapters
}: AssignmentManagementProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const handleCreateAssignment = () => {
    setSelectedAssignment(null);
    setViewMode('create');
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setViewMode('edit');
  };

  const handleViewSubmissions = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setViewMode('grade');
  };

  const handleSubmitAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setViewMode('submit');
  };

  const handleViewGrade = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setViewMode('view');
  };

  const handleBackToList = () => {
    setSelectedAssignment(null);
    setViewMode('list');
  };

  const handleAssignmentCreated = () => {
    setViewMode('list');
  };

  const handleSubmissionComplete = () => {
    setViewMode('list');
  };

  // Render different views based on current mode
  switch (viewMode) {
    case 'create':
      return (
        <AssignmentCreationForm
          courseId={courseId}
          chapters={chapters}
          onAssignmentCreated={handleAssignmentCreated}
          onCancel={handleBackToList}
        />
      );

    case 'edit':
      return selectedAssignment ? (
        <AssignmentCreationForm
          courseId={courseId}
          chapters={chapters}
          onAssignmentCreated={handleAssignmentCreated}
          onCancel={handleBackToList}
          editingAssignment={selectedAssignment}
        />
      ) : null;

    case 'submit':
      return selectedAssignment ? (
        <AssignmentSubmissionForm
          assignment={selectedAssignment}
          onSubmissionComplete={handleSubmissionComplete}
          onCancel={handleBackToList}
        />
      ) : null;

    case 'grade':
      return selectedAssignment ? (
        <AssignmentGradingInterface
          assignment={selectedAssignment}
          onBack={handleBackToList}
        />
      ) : null;

    case 'view':
      return selectedAssignment ? (
        <AssignmentGradeView
          assignment={selectedAssignment}
        />
      ) : null;

    case 'list':
    default:
      return (
        <AssignmentList
          courseId={courseId}
          userRole={userRole}
          onCreateAssignment={userRole !== 'student' ? handleCreateAssignment : undefined}
          onEditAssignment={userRole !== 'student' ? handleEditAssignment : undefined}
          onViewSubmissions={userRole !== 'student' ? handleViewSubmissions : undefined}
          onSubmitAssignment={userRole === 'student' ? handleSubmitAssignment : undefined}
          onViewGrade={userRole === 'student' ? handleViewGrade : undefined}
        />
      );
  }
}

