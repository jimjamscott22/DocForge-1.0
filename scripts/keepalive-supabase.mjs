#!/usr/bin/env node
/**
 * keepalive-supabase.mjs
 *
 * Sends a lightweight read request to the configured Supabase project to prevent
 * free-tier projects from being paused due to inactivity.
 *
 * Usage:
 *     node scripts/keepalive-supabase.mjs
 *
 * Required environment variables (either name works):
 *     SUPABASE_URL      / NEXT_PUBLIC_SUPABASE_URL      – e.g. https://yourproject.supabase.co
 *     SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY – your project's anon/public API key
 *
 * Optional environment variables:
 *     SUPABASE_KEEPALIVE_TABLE – table to query (default: documents)
 *
 * The table is protected by RLS, so an anonymous request returns an empty array.
 * That is expected — the point is that the query reaches Postgres and counts as
 * activity, not that it returns rows.
 */

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/+$/, '');

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.error('ERROR: SUPABASE_URL environment variable is not set.');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('ERROR: SUPABASE_ANON_KEY environment variable is not set.');
  process.exit(1);
}

const table = process.env.SUPABASE_KEEPALIVE_TABLE || 'documents';
const url = `${supabaseUrl}/rest/v1/${table}?select=id&limit=1`;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);

let response;
try {
  response = await fetch(url, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    signal: controller.signal,
  });
} catch (error) {
  console.error(`ERROR: Request to Supabase failed: ${error.message}`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}

if (!response.ok) {
  const body = await response.text();
  console.error(`ERROR: Supabase returned HTTP ${response.status}: ${body}`);
  process.exit(1);
}

console.log(`OK: Supabase keepalive succeeded (table='${table}', status=${response.status}).`);
