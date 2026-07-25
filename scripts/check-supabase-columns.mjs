#!/usr/bin/env node
/**
 * Statically checks every Supabase query in src/ against the live schema.
 *
 *   npm run schema:check
 *
 * Catches the class of bug where code references a column that does not exist —
 * PostgREST answers those with 400 / 42703 at runtime, often swallowed by a
 * `const { data } = await ...` that ignores the error.
 *
 * Heuristic, not a compiler: it understands `.from('t')` followed by
 * `.select(...)`, `.eq/.neq/.gt/.gte/.lt/.lte/.like/.ilike/.is/.in(...)`,
 * `.order(...)`, `.insert({...})` and `.update({...})`, including PostgREST
 * embedded-resource syntax such as `courses ( id, title )`.
 *
 * Exits 1 when unknown columns are found, so it can gate CI.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src');

function loadEnv() {
  const env = { ...process.env };
  for (const name of ['.env', '.env.local']) {
    const path = resolve(ROOT, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      if (value) env[match[1]] = value;
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase env vars in .env');
  process.exit(1);
}

const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!response.ok) {
  console.error(`Supabase returned ${response.status}`);
  process.exit(1);
}
const definitions = (await response.json()).definitions ?? {};

/** table -> Set(columns) */
const schema = new Map(
  Object.entries(definitions).map(([table, def]) => [
    table,
    new Set(Object.keys(def.properties ?? {})),
  ])
);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.tsx?$/.test(entry)) files.push(path);
  }
  return files;
}

/** Split on commas that sit at nesting depth 0. */
function topLevelSplit(input) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(' || char === '[' || char === '{') depth++;
    if (char === ')' || char === ']' || char === '}') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += char;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Extract the balanced `{...}` starting at `open`, returning its inner text. */
function balancedBraces(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

// PostgREST aggregate functions are valid inside a select, but are not columns.
const AGGREGATES = new Set(['count', 'sum', 'avg', 'min', 'max']);

/**
 * Parse a PostgREST select string into { columns, embeds }.
 * Handles aliases (`alias:col`), casts (`col::text`), json paths (`col->>x`),
 * modifiers (`col.count()`), and embedded resources (`courses ( id, title )`).
 */
function parseSelect(select) {
  const columns = [];
  const embeds = [];
  for (const raw of topLevelSplit(select)) {
    const embed = /^([A-Za-z0-9_:!\s]+?)\s*\(([\s\S]*)\)$/.exec(raw);
    if (embed) {
      // `alias:table!hint ( ... )` — the relation name is what matters.
      const name = embed[1].split(':').pop().split('!')[0].trim();
      embeds.push({ name, select: embed[2] });
      continue;
    }
    let token = raw.split(':').pop().trim(); // drop alias
    token = token.split('::')[0]; // drop cast
    token = token.split('->')[0].trim(); // drop json path
    if (!token || token === '*' || token.includes('...')) continue;
    if (AGGREGATES.has(token)) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) columns.push(token);
  }
  return { columns, embeds };
}

const problems = [];

function checkColumn(table, column, file, line, context) {
  const columns = schema.get(table);
  if (!columns) {
    problems.push({ file, line, table, column: null, context, missingTable: true });
    return;
  }
  if (!columns.has(column)) {
    problems.push({ file, line, table, column, context });
  }
}

function checkSelect(table, select, file, line) {
  if (!schema.has(table)) {
    problems.push({ file, line, table, column: null, context: 'select', missingTable: true });
    return;
  }
  const { columns, embeds } = parseSelect(select);
  for (const column of columns) checkColumn(table, column, file, line, 'select');
  for (const embed of embeds) {
    // Embedded resource: the name is a related table (or a FK column pointing at one).
    if (schema.has(embed.name)) checkSelect(embed.name, embed.select, file, line);
  }
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file).replace(/\\/g, '/');

  // Each `.from('table')` opens a query chain that runs until the statement ends.
  const fromPattern = /\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*\)/g;
  let match;
  while ((match = fromPattern.exec(source))) {
    const table = match[1];
    if (!schema.has(table)) {
      problems.push({
        file: rel,
        line: lineOf(source, match.index),
        table,
        column: null,
        context: 'from',
        missingTable: true,
      });
      continue;
    }
    // Grab the chain: everything until the statement ends, or until the next
    // `.from(` starts a sibling query (they coexist inside Promise.all blocks).
    const chain = source.slice(match.index, match.index + 2000);
    const ends = [chain.search(/;\s*\n/), chain.indexOf('.from(', 1)].filter(
      (i) => i !== -1
    );
    const body = ends.length ? chain.slice(0, Math.min(...ends)) : chain;
    const base = match.index;

    for (const call of body.matchAll(
      /\.select\(\s*(['"`])([\s\S]*?)\1/g
    )) {
      checkSelect(table, call[2], rel, lineOf(source, base + call.index));
    }
    for (const call of body.matchAll(
      /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order)\(\s*['"`]([A-Za-z0-9_]+)['"`]/g
    )) {
      // Embedded filters like `courses.title` are valid; only check bare columns.
      checkColumn(table, call[2], rel, lineOf(source, base + call.index), `.${call[1]}()`);
    }
    // Only depth-0 keys of the payload object are columns — nested objects are
    // jsonb values, and `a ? b : c` ternaries must not be mistaken for keys.
    for (const call of body.matchAll(/\.(insert|update|upsert)\(\s*\{/g)) {
      const open = call.index + call[0].lastIndexOf('{');
      const payload = balancedBraces(body, open);
      if (payload === null) continue;
      for (const entry of topLevelSplit(payload)) {
        const key = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(entry);
        if (!key) continue;
        checkColumn(table, key[1], rel, lineOf(source, base + open), `.${call[1]}()`);
      }
    }
  }
}

if (problems.length === 0) {
  console.log(`No column drift found. Checked ${schema.size} tables across src/.`);
  process.exit(0);
}

const missingTables = problems.filter((p) => p.missingTable);
const missingColumns = problems.filter((p) => !p.missingTable);

if (missingTables.length) {
  console.log('\nTables referenced in code but absent from the database:\n');
  const seen = new Set();
  for (const p of missingTables) {
    const id = `${p.file}:${p.line}:${p.table}`;
    if (seen.has(id)) continue;
    seen.add(id);
    console.log(`  ${p.file}:${p.line}  ${p.table}`);
  }
}

if (missingColumns.length) {
  console.log('\nColumns referenced in code but absent from the database:\n');
  const seen = new Set();
  for (const p of missingColumns) {
    const id = `${p.file}:${p.line}:${p.table}.${p.column}`;
    if (seen.has(id)) continue;
    seen.add(id);
    console.log(`  ${p.file}:${p.line}  ${p.table}.${p.column}  (${p.context})`);
  }
}

console.log(`\n${problems.length} problem(s). Fix these or re-run npm run schema:dump.`);
process.exit(1);
