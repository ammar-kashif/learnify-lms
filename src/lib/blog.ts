import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

export type BlogMeta = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  tags?: string[];
};

export type BlogPost = BlogMeta & {
  html: string;
  readMinutes: number;
};

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function parseFrontMatter(markdown: string): { meta: BlogMeta; body: string } {
  const fmMatch = markdown.match(/^---[\r\n]([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('Missing front matter in blog post');
  }
  const [, fm, body] = fmMatch;
  const meta: any = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      const key = m[1];
      let value: any = m[2];
      if (value.startsWith('[') && value.endsWith(']')) {
        try { value = JSON.parse(value); } catch { /* ignore malformed arrays */ }
      }
      if (typeof value === 'string') {
        meta[key] = value.replace(/^"|"$/g, '');
      } else {
        meta[key] = value;
      }
    }
  }
  return { meta, body } as { meta: BlogMeta; body: string };
}

export function getAllPosts(): BlogMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const { meta } = parseFrontMatter(raw);
    return { ...meta, slug } as BlogMeta;
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): BlogPost | null {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { meta, body } = parseFrontMatter(raw);
  const html = marked.parse(body);
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));
  return { ...meta, slug, html, readMinutes } as BlogPost;
}


