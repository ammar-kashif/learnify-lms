/**
 * Canonical qualification and subject lists.
 *
 * Before this file the app had four hardcoded subject lists that disagreed with
 * each other — the footer column, the FAQ answer, the SEO keywords, and
 * `src/data/mock-data.ts`. Everything user-facing should read from here.
 *
 * The database is still the source of truth for which courses *exist*; these
 * lists describe what we are willing to offer and are used to seed, validate
 * and present the catalogue.
 */

export type Level = 'O Level' | 'IGCSE';
export type Board = 'Cambridge' | 'Edexcel';

/** Display order for grouped sections and filter tabs. */
export const LEVELS: Level[] = ['O Level', 'IGCSE'];

/**
 * The nine O Level subjects we offer. Anything outside this list is unpublished
 * from the public catalogue — note that unpublished courses may still have live
 * enrolments, so never use this to gate a student's own course access.
 *
 * Two readings of the shorthand in the requirements doc are baked in here:
 * "Math" is Mathematics only (not Additional Mathematics), and "English" is
 * English Language only (not English Literature).
 */
export const O_LEVEL_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Computer Science',
  'Biology',
  'Pakistan Studies',
  'Islamiyat',
  'Urdu',
  'English Language',
] as const;

/** The five subjects offered under Edexcel IGCSE. */
export const EDEXCEL_IGCSE_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
] as const;

/**
 * Boards available per level. Cambridge IGCSE keeps its full existing range, so
 * it has no fixed subject allow-list — only Edexcel is constrained.
 */
export const BOARDS_BY_LEVEL: Record<Level, Board[]> = {
  'O Level': ['Cambridge'],
  IGCSE: ['Cambridge', 'Edexcel'],
};

/**
 * Subjects allowed for a level/board pair. `null` means "no restriction" —
 * whatever exists in the database is offered.
 */
export function allowedSubjects(
  level: Level,
  board: Board
): readonly string[] | null {
  if (level === 'O Level') return O_LEVEL_SUBJECTS;
  if (level === 'IGCSE' && board === 'Edexcel') return EDEXCEL_IGCSE_SUBJECTS;
  return null;
}

/**
 * The six headline subjects used in marketing surfaces — the footer column and
 * the SEO keyword list. Deliberately shorter than the full catalogue.
 */
export const FEATURED_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English Language',
] as const;
