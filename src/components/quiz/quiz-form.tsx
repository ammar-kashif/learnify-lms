'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { QuizQuestion, QuizSettings, CreateQuizData } from '@/types/quiz';

interface QuizFormProps {
  courseId: string;
  onSave: (quizData: CreateQuizData) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<CreateQuizData>;
}

export default function QuizForm({ courseId, onSave, onCancel, loading = false, initialData }: QuizFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [questions, setQuestions] = useState<Omit<QuizQuestion, 'id'>[]>(
    initialData?.questions || [
      {
        question: '',
        type: 'multiple_choice',
        options: ['', ''],
        correct_answer: 0,
        points: 1,
      }
    ]
  );
  const [settings, setSettings] = useState<QuizSettings>(initialData?.settings || {
    time_limit: 30,
    max_attempts: 1,
    shuffle_questions: false,
    show_correct_answers: true,
    allow_review: true,
  });

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      type: 'multiple_choice',
      options: ['', ''],
      correct_answer: 0,
      points: 1,
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof Omit<QuizQuestion, 'id'>, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options.push('');
    } else {
      updated[questionIndex].options = [''];
    }
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const question = updated[questionIndex];
    if (question.options && question.options.length > 2) {
      question.options.splice(optionIndex, 1);
      // Adjust correct_answer if needed
      if (question.options && question.correct_answer !== undefined && question.correct_answer >= question.options.length) {
        question.correct_answer = Math.max(0, question.options.length - 1);
      }
      setQuestions(updated);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options[optionIndex] = value;
    }
    setQuestions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error('Quiz title is required');
      return;
    }

    if (questions.length === 0) {
      toast.error('At least one question is required');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} text is required`);
        return;
      }
      if (!q.options || q.options.length < 2) {
        toast.error(`Question ${i + 1} must have at least 2 options`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        toast.error(`Question ${i + 1} has empty options`);
        return;
      }
      if (q.points <= 0) {
        toast.error(`Question ${i + 1} points must be greater than 0`);
        return;
      }
    }

    onSave({
      course_id: courseId,
      title: title.trim(),
      description: description.trim() || undefined,
      questions,
      settings,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Quiz Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter quiz description (optional)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Questions</h3>
          <Button type="button" onClick={addQuestion} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        {questions.map((question, questionIndex) => (
          <Card key={questionIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Question {questionIndex + 1}</CardTitle>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuestion(questionIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Question Text */}
              <div>
                <Label htmlFor={`question-${questionIndex}`}>Question Text *</Label>
                <Input
                  id={`question-${questionIndex}`}
                  value={question.question}
                  onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                  placeholder="Enter your question"
                  required
                />
              </div>

              {/* Options */}
              <div>
                <Label>Options *</Label>
                <div className="space-y-2">
                  {question.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={question.correct_answer === optionIndex}
                        onChange={() => updateQuestion(questionIndex, 'correct_answer', optionIndex)}
                        className="text-primary"
                      />
                      <Input
                        value={option}
                        onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                        required
                      />
                      {question.options && question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(questionIndex, optionIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(questionIndex)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>

              {/* Points */}
              <div>
                <Label htmlFor={`points-${questionIndex}`}>Points</Label>
                <Input
                  id={`points-${questionIndex}`}
                  type="number"
                  min="1"
                  value={question.points}
                  onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="time_limit">Time Limit (minutes)</Label>
              <Input
                id="time_limit"
                type="number"
                min="1"
                value={settings.time_limit || 30}
                onChange={(e) => setSettings({ ...settings, time_limit: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div>
              <Label htmlFor="max_attempts">Max Attempts</Label>
              <Input
                id="max_attempts"
                type="number"
                min="1"
                value={settings.max_attempts || 1}
                onChange={(e) => setSettings({ ...settings, max_attempts: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.shuffle_questions || false}
                onChange={(e) => setSettings({ ...settings, shuffle_questions: e.target.checked })}
                className="text-primary"
              />
              <span>Shuffle questions</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.show_correct_answers || false}
                onChange={(e) => setSettings({ ...settings, show_correct_answers: e.target.checked })}
                className="text-primary"
              />
              <span>Show correct answers after completion</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.allow_review || false}
                onChange={(e) => setSettings({ ...settings, allow_review: e.target.checked })}
                className="text-primary"
              />
              <span>Allow students to review their answers</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>
    </form>
  );
}
