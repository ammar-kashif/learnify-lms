#!/usr/bin/env node
/**
 * Probes every public table with the ANON key — the key that ships to every
 * browser — and fails if any table is readable or writable by an anonymous
 * visitor.
 *
 * Why this exists: several tables carried policies written as
 * `FOR ALL USING (true)` with no `TO` clause. The name said "service role", but
 * with no role clause the policy applies to PUBLIC, which includes `anon`. That
 * left the course catalogue deletable and subscription prices editable by
 * anyone who opened devtools. `schema:check` cannot see this — it only compares
 * column names — so this is a separate gate.
 *
 * Usage:  npm run check:rls
 *         npm run check:rls -- --allow courses:select
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.
 * Never prints key material.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/**
 * Access that is deliberate. Add entries here only with a reason.
 *
 *   courses:select            public catalogue; also counted by
 *                             src/app/admin/overview/page.tsx with the browser
 *                             client. Writes are already refused.
 *   subscription_plans:select public pricing. Writes are already refused.
 */
const DEFAULT_ALLOWED = new Set(['courses:select', 'subscription_plans:select']);

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) {
    console.error('No .env found — cannot probe.');
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
  return env;
}

/**
 * How the write probe works, and why it is not the obvious thing.
 *
 * The obvious probe — PATCH/DELETE filtered to an id that cannot exist — is
 * WRONG. RLS restricts which *rows* a statement sees, it does not reject the
 * statement. A filter matching zero rows returns 204 whether the policy permits
 * the write or not, so that probe reports every table as writable.
 *
 * This instead attempts an INSERT with an empty body and reads the error code:
 *   42501  insufficient privilege  -> the write was refused (good)
 *   23502  not-null violation      -> the write was PERMITTED and got as far as
 *                                     constraint checking (bad)
 * Nothing is ever written, because an empty row cannot satisfy the constraints.
 */
const DENIED_CODE = '42501';

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing from .env');
    process.exit(1);
  }
  if (!service) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY missing from .env — needed to enumerate tables.'
    );
    process.exit(1);
  }

  const allowed = new Set(DEFAULT_ALLOWED);
  const argAllow = process.argv.indexOf('--allow');
  if (argAllow !== -1 && process.argv[argAllow + 1]) {
    for (const entry of process.argv[argAllow + 1].split(',')) {
      allowed.add(entry.trim());
    }
  }

  const headers = {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    'Content-Type': 'application/json',
  };

  // Discover tables with the SERVICE key: anon is (correctly) refused schema
  // introspection, and enumerating with anon would silently probe nothing.
  const specRes = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  if (specRes.status !== 200) {
    console.error(`Could not enumerate tables (HTTP ${specRes.status}).`);
    process.exit(1);
  }
  const spec = await specRes.json();
  const tables = Object.keys(spec.paths || {})
    .filter(p => p !== '/' && !p.startsWith('/rpc/'))
    .map(p => p.slice(1))
    .sort();

  // A security check that probes nothing must never report success.
  if (tables.length === 0) {
    console.error('Enumerated 0 tables — refusing to report a pass.');
    process.exit(1);
  }

  const findings = [];

  for (const table of tables) {
    // READ — a 200 with rows means an anonymous visitor can read real data.
    let canRead = false;
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
      if (res.status === 200) {
        const body = await res.json();
        canRead = Array.isArray(body) && body.length > 0;
      }
    } catch {
      /* network hiccup — treated as not readable */
    }

    // WRITE — see the note on DENIED_CODE above. Writes nothing.
    let canWrite = false;
    try {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers,
        body: '{}',
      });
      let code = '';
      try {
        code = (JSON.parse(await res.text()) || {}).code || '';
      } catch {
        /* non-JSON body */
      }
      canWrite = res.status !== 401 && code !== DENIED_CODE;
    } catch {
      /* network hiccup — treated as not writable */
    }

    for (const [op, can] of [
      ['select', canRead],
      ['write', canWrite],
    ]) {
      if (can && !allowed.has(`${table}:${op}`)) {
        findings.push({ table, op });
      }
    }
  }

  console.log(`Probed ${tables.length} tables with the anon key.`);

  if (findings.length === 0) {
    console.log('No anonymous access found beyond the allow-list.');
    return;
  }

  console.error('\nANONYMOUS ACCESS FOUND — the public browser key can do this:\n');
  const byTable = {};
  for (const f of findings) (byTable[f.table] ??= []).push(f.op);
  for (const [table, ops] of Object.entries(byTable)) {
    console.error(`  ${table.padEnd(26)} ${ops.join(', ')}`);
  }
  console.error(
    '\nFix by dropping the offending policy and re-adding it with an explicit' +
      '\n`TO` clause, or no policy at all (RLS on + zero policies = deny-all;' +
      '\nservice_role bypasses RLS regardless). See migrations/005.\n'
  );
  process.exit(1);
}

main().catch(err => {
  console.error('check:rls failed:', err.message);
  process.exit(1);
});
