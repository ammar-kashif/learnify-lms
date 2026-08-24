import {
  Atom,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  Code2,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  Palette,
  Dumbbell,
  Moon,
  Coins,
  Sigma,
  type LucideIcon,
} from 'lucide-react';

/**
 * Qualification, board and subject for a course.
 *
 * These now live on `courses` as real columns (`level`, `board`, `subject`),
 * added by migrations/001-course-taxonomy.sql. The title parser below is kept
 * only as a fallback for rows whose columns are still null — read the columns
 * first via `courseTaxonomy()`.
 */

export type CourseLevel = 'O Level' | 'IGCSE' | 'Other';
export type CourseBoard = 'Cambridge' | 'Edexcel';

/** Display order for grouped sections and filter tabs. */
export const LEVEL_ORDER: CourseLevel[] = ['O Level', 'IGCSE', 'Other'];

/** Display order for the board sub-filter. */
export const BOARD_ORDER: CourseBoard[] = ['Cambridge', 'Edexcel'];

const PATTERNS: Array<{ re: RegExp; level: CourseLevel }> = [
  // IGCSE must be tested before O Level — both may start with a board prefix.
  { re: /^(?:cambridge|edexcel)?\s*igcse\s+(.+)$/i, level: 'IGCSE' },
  { re: /^(?:cambridge|edexcel)?\s*o[\s-]*levels?\s+(.+)$/i, level: 'O Level' },
];

export interface ParsedCourse {
  /** Qualification the course belongs to. */
  level: CourseLevel;
  /** Exam board, when it can be determined. */
  board: CourseBoard | null;
  /** Title with the board and qualification prefix stripped, e.g. "Physics". */
  subject: string;
}

/** Fallback parser for rows whose taxonomy columns have not been backfilled. */
export function parseCourseTitle(title: string): ParsedCourse {
  const trimmed = (title ?? '').trim();

  let board: CourseBoard | null = null;
  if (/^edexcel/i.test(trimmed)) board = 'Edexcel';
  else if (/^cambridge/i.test(trimmed)) board = 'Cambridge';

  for (const { re, level } of PATTERNS) {
    const match = re.exec(trimmed);
    if (match) return { level, board, subject: match[1].trim() };
  }
  return { level: 'Other', board, subject: trimmed };
}

/** A course as far as this module is concerned — columns optional. */
export interface TaxonomySource {
  title: string;
  level?: string | null;
  board?: string | null;
  subject?: string | null;
}

const LEVELS = new Set<string>(['O Level', 'IGCSE']);
const BOARDS = new Set<string>(['Cambridge', 'Edexcel']);

/**
 * Reads the taxonomy off a course row, falling back to the title parser for
 * any field the database has not filled in.
 */
export function courseTaxonomy(course: TaxonomySource): ParsedCourse {
  const needsFallback =
    !course.level || !course.subject || !LEVELS.has(course.level);
  const parsed = needsFallback ? parseCourseTitle(course.title) : null;

  const level: CourseLevel =
    course.level && LEVELS.has(course.level)
      ? (course.level as CourseLevel)
      : (parsed?.level ?? 'Other');

  const board: CourseBoard | null =
    course.board && BOARDS.has(course.board)
      ? (course.board as CourseBoard)
      : (parsed?.board ?? parseCourseTitle(course.title).board);

  const subject =
    course.subject?.trim() || parsed?.subject || course.title.trim();

  return { level, board, subject };
}

/**
 * Subject keyword -> icon. Ordered: the first keyword found in the subject
 * wins, so more specific entries ("additional mathematics") precede broader
 * ones ("mathematics").
 */
const SUBJECT_ICONS: Array<[string, LucideIcon]> = [
  ['additional mathematics', Sigma],
  ['mathematics', Calculator],
  ['maths', Calculator],
  ['physics', Atom],
  ['chemistry', FlaskConical],
  ['biology', Dna],
  ['computer science', Code2],
  ['information and communication', Code2],
  ['ict', Code2],
  ['english literature', BookOpen],
  ['literature', BookOpen],
  ['english', BookOpen],
  ['urdu', Languages],
  ['arabic', Languages],
  ['islamiyat', Moon],
  ['pakistan studies', Landmark],
  ['history', Landmark],
  ['geography', Globe2],
  ['global perspectives', Globe2],
  ['environmental', Leaf],
  ['accounting', Coins],
  ['economics', Coins],
  ['business', Building2],
  ['sociology', Brain],
  ['art', Palette],
  ['design', Palette],
  ['physical education', Dumbbell],
  ['science', Atom],
];

export function subjectIcon(subject: string): LucideIcon {
  const needle = subject.toLowerCase();
  for (const [keyword, icon] of SUBJECT_ICONS) {
    if (needle.includes(keyword)) return icon;
  }
  return BookOpen;
}

/** Groups courses by level, preserving LEVEL_ORDER and dropping empty groups. */
export function groupByLevel<T extends TaxonomySource>(
  courses: T[]
): Array<{ level: CourseLevel; courses: T[] }> {
  const buckets = new Map<CourseLevel, T[]>();
  for (const course of courses) {
    const { level } = courseTaxonomy(course);
    const bucket = buckets.get(level) ?? [];
    bucket.push(course);
    buckets.set(level, bucket);
  }
  return LEVEL_ORDER.filter(level => buckets.get(level)?.length).map(level => ({
    level,
    courses: buckets.get(level)!,
  }));
}
