-- ============================================================
--  NexCode — Database Schema
--  Run this in: Supabase Dashboard → SQL Editor → New query
--  Paste the whole file, click "Run"
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- for gen_random_uuid()
create extension if not exists "pg_net";     -- for webhook delivery (optional, Supabase has it)

-- ── ENUMS ───────────────────────────────────────────────────
create type plan_tier    as enum ('starter', 'pro', 'business', 'enterprise', 'free');
create type billing_cycle as enum ('monthly', 'annual');
create type key_type     as enum ('day_locked', 'lifetime', 'trial', 'subscription', 'ffa');
create type key_status   as enum ('active', 'expired', 'revoked', 'paused');
create type script_status as enum ('active', 'archived');
create type webhook_event as enum (
  'key.created', 'key.validated', 'key.revoked', 'key.expired',
  'key.hwid_reset', 'key.paused', 'key.resumed',
  'validation.failed', 'script.compiled', 'script.compile_failed'
);
create type contact_topic as enum (
  'technical_support', 'billing', 'enterprise', 'api_integrations',
  'bug_report', 'security', 'other'
);

-- ── PROFILES ────────────────────────────────────────────────
-- Extends Supabase's auth.users (which handles passwords & sessions)
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  avatar_url      text,
  plan            plan_tier    not null default 'free',
  billing_cycle   billing_cycle not null default 'monthly',
  plan_started_at timestamptz,
  plan_expires_at timestamptz,
  discord_id      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Row-level security: users can only see & edit their own profile
alter table profiles enable row level security;
create policy "profiles: owner read"  on profiles for select using (auth.uid() = id);
create policy "profiles: owner write" on profiles for update using (auth.uid() = id);

-- Auto-create a profile when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── PROJECTS ────────────────────────────────────────────────
create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table projects enable row level security;
create policy "projects: owner all" on projects
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── SCRIPTS ─────────────────────────────────────────────────
create table scripts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  owner_id        uuid not null references profiles(id) on delete cascade,
  name            text not null,
  description     text,
  status          script_status not null default 'active',
  -- compile settings (stored so dashboard can restore them)
  opt_profile     text not null default 'balanced', -- 'fast' | 'balanced' | 'max'
  vm_enabled      boolean not null default true,
  flow_scramble   boolean not null default true,
  encrypt_strings boolean not null default true,
  anti_decompiler boolean not null default true,
  junk_code       boolean not null default false,
  anti_tamper     boolean not null default true,
  const_obfuscate boolean not null default true,
  -- ffa / keyless mode
  ffa_enabled     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table scripts enable row level security;
create policy "scripts: owner all" on scripts
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── KEYS ────────────────────────────────────────────────────
create table keys (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  script_id       uuid not null references scripts(id) on delete cascade,
  key_string      text not null unique,   -- e.g. NEXC-A1B2-C3D4
  type            key_type    not null default 'day_locked',
  status          key_status  not null default 'active',
  hwid            text,                   -- hardware fingerprint (set on first run)
  hwid_locked_at  timestamptz,
  note            text,                   -- optional label for this key
  max_executions  integer,                -- null = unlimited
  executions      integer not null default 0,
  expires_at      timestamptz,            -- null for lifetime
  duration_days   integer,                -- original duration (for display)
  -- floating seats
  seat_pool_id    uuid,                   -- links to a seat pool (future)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table keys enable row level security;
create policy "keys: owner all" on keys
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Index for fast key lookups (the hot path)
create index keys_key_string_idx on keys (key_string);
create index keys_owner_id_idx   on keys (owner_id);
create index keys_script_id_idx  on keys (script_id);

-- Auto-generate a key string in NEXC-XXXX-XXXX format
create or replace function generate_key_string()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no confusable chars
  seg1  text := '';
  seg2  text := '';
  i     int;
begin
  for i in 1..4 loop
    seg1 := seg1 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    seg2 := seg2 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return 'NEXC-' || seg1 || '-' || seg2;
end;
$$;

-- ── HWID RESET LOG ──────────────────────────────────────────
create table hwid_resets (
  id         uuid primary key default gen_random_uuid(),
  key_id     uuid not null references keys(id) on delete cascade,
  owner_id   uuid not null references profiles(id) on delete cascade,
  old_hwid   text,
  reset_by   text not null default 'user', -- 'user' | 'manager' | 'api'
  created_at timestamptz not null default now()
);

alter table hwid_resets enable row level security;
create policy "hwid_resets: owner read" on hwid_resets for select using (auth.uid() = owner_id);

-- ── API KEYS ────────────────────────────────────────────────
create table api_keys (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  key_hash    text not null unique,    -- bcrypt hash, never store plaintext
  key_prefix  text not null,          -- first 12 chars for display (nxc_sk_abc...)
  -- scoped permissions (bitmask stored as columns for simplicity)
  perm_keys_read    boolean not null default false,
  perm_keys_write   boolean not null default false,
  perm_scripts_read boolean not null default false,
  perm_scripts_write boolean not null default false,
  perm_webhooks     boolean not null default false,
  perm_admin        boolean not null default false,
  last_used_at timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

alter table api_keys enable row level security;
create policy "api_keys: owner all" on api_keys
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── WEBHOOKS ────────────────────────────────────────────────
create table webhooks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,
  name        text not null,
  url         text not null,
  secret      text not null,   -- HMAC-SHA256 signing secret
  enabled     boolean not null default true,
  -- which events to fire on (stored as array for flexibility)
  events      webhook_event[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table webhooks enable row level security;
create policy "webhooks: owner all" on webhooks
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── WEBHOOK DELIVERY LOG ────────────────────────────────────
create table webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  webhook_id   uuid not null references webhooks(id) on delete cascade,
  event        webhook_event not null,
  payload      jsonb not null,
  status_code  integer,
  success      boolean not null default false,
  attempt      integer not null default 1,
  error        text,
  delivered_at timestamptz not null default now()
);

-- No RLS — only written by the backend service account

-- ── CONTACT MESSAGES ────────────────────────────────────────
create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  topic      contact_topic not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- No RLS on contact_messages — only the backend service key writes/reads this

-- ── PLAN LIMITS VIEW ────────────────────────────────────────
-- Centralises the plan limits so the backend just queries this
create or replace view plan_limits as
select * from (values
  ('free'::plan_tier,       1,    50,   1),
  ('starter'::plan_tier,    3,   300,   1),
  ('pro'::plan_tier,       10,  2000,   5),
  ('business'::plan_tier,  25, 15000,  10),
  ('enterprise'::plan_tier, 9999, 9999999, 9999)
) as t(plan, max_scripts, max_keys, max_projects);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_profiles  before update on profiles  for each row execute procedure touch_updated_at();
create trigger touch_projects  before update on projects  for each row execute procedure touch_updated_at();
create trigger touch_scripts   before update on scripts   for each row execute procedure touch_updated_at();
create trigger touch_keys      before update on keys      for each row execute procedure touch_updated_at();
create trigger touch_webhooks  before update on webhooks  for each row execute procedure touch_updated_at();
