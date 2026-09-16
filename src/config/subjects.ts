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

/**
 * Cambridge IGCSE mirrors the O Level nine.
 *
 * The requirements doc said "keep the existing IGCSE structure", which was first
 * read as the full 25-subject Cambridge range. The user corrected that on
 * 2026-09-16: "the existing structure is O levels, not the one built rn" — the
 * structure to mirror is O Level's. Seventeen Cambridge IGCSE courses were
 * unpublished by migration 006 to match.
 *
 * Only the Urdu title differs: Cambridge examines it as a second language, and
 * the course row is titled accordingly.
 */
export const CAMBRIDGE_IGCSE_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Computer Science',
  'Biology',
  'Pakistan Studies',
  'Islamiyat',
  'Urdu as a Second Language',
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

/** Boards available per level. */
export const BOARDS_BY_LEVEL: Record<Level, Board[]> = {
  'O Level': ['Cambridge'],
  IGCSE: ['Cambridge', 'Edexcel'],
};

/**
 * Subjects allowed for a level/board pair.
 *
 * Every pair is now constrained — there is no "whatever exists in the database"
 * case left — but the return type keeps `null` so a future unrestricted board
 * does not have to change every call site.
 */
export function allowedSubjects(
  level: Level,
  board: Board
): readonly string[] | null {
  if (level === 'O Level') return O_LEVEL_SUBJECTS;
  if (level === 'IGCSE' && board === 'Edexcel') return EDEXCEL_IGCSE_SUBJECTS;
  if (level === 'IGCSE' && board === 'Cambridge') return CAMBRIDGE_IGCSE_SUBJECTS;
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
