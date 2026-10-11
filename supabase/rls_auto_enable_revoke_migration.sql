-- ============================================================
-- DocForge — revoke public EXECUTE on public.rls_auto_enable()
-- ============================================================
-- Problem
--   Supabase's "Automatically enable RLS" project setting creates
--   public.rls_auto_enable(), a SECURITY DEFINER event-trigger function that
--   runs ALTER TABLE ... ENABLE ROW LEVEL SECURITY on each new table. It lives
--   in the exposed `public` schema and carries Postgres' default
--   EXECUTE TO PUBLIC, so the Security Advisor flags it as callable by `anon`
--   via /rest/v1/rpc/rls_auto_enable.
--
--   The function is created by the platform, not by schema.sql, so a fresh
--   install may not have it at all.
--
-- Fix
--   Revoke EXECUTE from PUBLIC, anon and authenticated. Event triggers do not
--   check the caller's EXECUTE privilege when they fire, so auto-enabling RLS
--   on new tables keeps working.
--
-- Safe to re-run; a no-op when the function does not exist.
-- ============================================================

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- Verify (expect false, false):
--   select has_function_privilege('anon', 'public.rls_auto_enable()', 'execute');
--   select has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute');
