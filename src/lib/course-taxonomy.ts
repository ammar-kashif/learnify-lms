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
 * The `courses` table has no `level` or `subject` column — the qualification is
 * encoded in the title ("Cambridge O Level Physics", "Cambridge IGCSE Biology").
 * This derives both so the catalogue can be grouped and filtered without a
 * migration. If a level column is ever added, swap the parser for a read.
 */

export type CourseLevel = 'O Level' | 'IGCSE' | 'A Level' | 'Other';

/** Display order for grouped sections. */
export const LEVEL_ORDER: CourseLevel[] = ['O Level', 'IGCSE', 'A Level', 'Other'];

const PATTERNS: Array<{ re: RegExp; level: CourseLevel }> = [
  // IGCSE must be tested before O Level — both may start with "Cambridge".
  { re: /^(?:cambridge\s+)?igcse\s+(.+)$/i, level: 'IGCSE' },
  { re: /^(?:cambridge\s+)?o[\s-]*levels?\s+(.+)$/i, level: 'O Level' },
  { re: /^(?:cambridge\s+)?a[\s-]*levels?\s+(.+)$/i, level: 'A Level' },
];

export interface ParsedCourse {
  /** Qualification the course belongs to. */
  level: CourseLevel;
  /** Title with the qualification prefix stripped, e.g. "Physics". */
  subject: string;
}

export function parseCourseTitle(title: string): ParsedCourse {
  const trimmed = (title ?? '').trim();
  for (const { re, level } of PATTERNS) {
    const match = re.exec(trimmed);
    if (match) return { level, subject: match[1].trim() };
  }
  return { level: 'Other', subject: trimmed };
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
export function groupByLevel<T extends { title: string }>(
  courses: T[]
): Array<{ level: CourseLevel; courses: T[] }> {
  const buckets = new Map<CourseLevel, T[]>();
  for (const course of courses) {
    const { level } = parseCourseTitle(course.title);
    const bucket = buckets.get(level) ?? [];
    bucket.push(course);
    buckets.set(level, bucket);
  }
  return LEVEL_ORDER.filter(level => buckets.get(level)?.length).map(level => ({
    level,
    courses: buckets.get(level)!,
  }));
}
