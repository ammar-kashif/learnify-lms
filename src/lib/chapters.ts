import { supabase } from './supabase';

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

// Get all chapters for a course
export async function getChapters(courseId: string): Promise<Chapter[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return [];
    }
    const response = await fetch('/api/chapters/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId })
    });
    if (!response.ok) {
      return [];
    }
    const result = await response.json();
    return result.chapters || [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
}

// Create a new chapter from uploaded file
export async function createChapterFromFile(
  courseId: string,
  title: string,
  fileUrl: string,
  fileType: string,
  fileSize: number
): Promise<{ success: boolean; chapter?: Chapter; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId,
        title,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chapter:', error);
      return { success: false, error: error.message };
    }

    return { success: true, chapter: data };
  } catch (error) {
    console.error('Error creating chapter:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create chapter' 
    };
  }
}

// Update a chapter
export async function updateChapter(
  chapterId: string,
  updates: Partial<Pick<Chapter, 'title' | 'file_url' | 'file_type' | 'file_size'>>
): Promise<{ success: boolean; chapter?: Chapter; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chapterId)
      .select()
      .single();

    if (error) {
      console.error('Error updating chapter:', error);
      return { success: false, error: error.message };
    }

    return { success: true, chapter: data };
  } catch (error) {
    console.error('Error updating chapter:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update chapter' 
    };
  }
}

// Delete a chapter via API route
export async function deleteChapter(chapterId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Deleting chapter with ID:', chapterId);
    
    const response = await fetch('/api/chapters/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chapterId }),
    });

    const result = await response.json();
    console.log('Chapter delete API response:', result);

    if (!response.ok) {
      return { success: false, error: result.error || 'Delete failed' };
    }

    return result;
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete chapter' 
    };
  }
}

// Get chapter statistics for a course
export async function getChapterStats(courseId: string): Promise<{
  totalChapters: number;
  totalFileSize: number;
  fileTypeBreakdown: Record<string, number>;
}> {
  try {
    const chapters = await getChapters(courseId);
    
    const totalChapters = chapters.length;
    const totalFileSize = chapters.reduce((sum, chapter) => sum + (chapter.file_size || 0), 0);
    
    const fileTypeBreakdown = chapters.reduce((breakdown, chapter) => {
      const type = chapter.file_type || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);

    return {
      totalChapters,
      totalFileSize,
      fileTypeBreakdown,
    };
  } catch (error) {
    console.error('Error getting chapter stats:', error);
    return {
      totalChapters: 0,
      totalFileSize: 0,
      fileTypeBreakdown: {},
    };
  }
}

// Get file type category for display
export function getFileTypeCategory(fileType: string): 'image' | 'video' | 'document' | 'other' {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return 'document';
  return 'other';
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
