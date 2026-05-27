-- =====================================================================
-- DealerBot Backend — Supabase Schema (v2 — full feature set)
-- Run this in Supabase SQL Editor (one time)
-- Safe to re-run — uses CREATE IF NOT EXISTS / ALTER ADD COLUMN IF NOT EXISTS
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. CLIENTS
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id                          uuid primary key default uuid_generate_v4(),
  name                        text not null,
  brand                       text not null,
  city                        text default '',
  whatsapp_phone_id           text default 'MOCK_PHONE_ID',
  whatsapp_token              text default 'MOCK_TOKEN',
  whatsapp_waba_id            text default '',
  whatsapp_meta_access_token  text default '',
  google_sheet_url            text default '',
  plan_end_date               timestamptz,
  override_active             boolean default true,
  is_active                   boolean default true,
  bot_profile                 jsonb  default '{}'::jsonb,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);
create index if not exists clients_brand_idx on public.clients (brand);

-- ---------------------------------------------------------------------
-- 2. LEADS  (with CRM fields)
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid references public.clients(id) on delete cascade,
  phone           text not null,
  name            text default '',
  interest        text default 'Unknown',
  model           text default '',
  score           text default 'cold' check (score in ('hot','warm','cold')),
  status          text default 'New' check (status in ('New','Contacted','Interested','Closed','Lost')),
  notes           text default '',
  follow_up_date  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
-- For older installs, add new cols if missing
alter table public.leads add column if not exists status         text default 'New';
alter table public.leads add column if not exists notes          text default '';
alter table public.leads add column if not exists follow_up_date timestamptz;

create index if not exists leads_client_idx   on public.leads (client_id);
create index if not exists leads_score_idx    on public.leads (score);
create index if not exists leads_status_idx   on public.leads (status);
create index if not exists leads_interest_idx on public.leads (interest);
create index if not exists leads_created_idx  on public.leads (created_at desc);

-- ---------------------------------------------------------------------
-- 3. PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default uuid_generate_v4(),
  brand       text not null,
  model       text not null,
  price_range text default 'Contact dealer',
  variants    jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists products_brand_idx on public.products (brand);

-- ---------------------------------------------------------------------
-- 4. SESSIONS
-- ---------------------------------------------------------------------
create table if not exists public.sessions (
  id          uuid primary key default uuid_generate_v4(),
  client_id   text,
  phone       text,
  step        text default 'greeting',
  data        jsonb default '{}'::jsonb,
  messages    jsonb default '[]'::jsonb,
  updated_at  timestamptz default now(),
  unique (client_id, phone)
);
create index if not exists sessions_client_phone_idx on public.sessions (client_id, phone);

-- ---------------------------------------------------------------------
-- 5. USERS  (dashboard login — admin / client roles)
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id              uuid primary key default uuid_generate_v4(),
  email           text unique not null,
  password_hash   text not null,
  role            text default 'client' check (role in ('admin','client')),
  client_id       uuid references public.clients(id) on delete set null,
  otp             text,
  otp_expires_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists users_email_idx on public.users (email);

-- ---------------------------------------------------------------------
-- 6. HANDOFFS  (when AI can't help — human takeover queue)
-- ---------------------------------------------------------------------
create table if not exists public.handoffs (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid references public.clients(id) on delete cascade,
  phone       text not null,
  name        text default '',
  reason      text default '',
  status      text default 'pending' check (status in ('pending','resolved')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists handoffs_status_idx on public.handoffs (status);
create index if not exists handoffs_client_idx on public.handoffs (client_id);

-- ---------------------------------------------------------------------
-- 7. MASTER CONFIG
-- ---------------------------------------------------------------------
create table if not exists public.master_config (
  id           uuid primary key default uuid_generate_v4(),
  ai_api_key   text,
  agency_name  text,
  created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------
-- updated_at auto-trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array['clients','leads','products','sessions','users','handoffs']) loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Seed an initial admin user
-- Default login:  admin@botsaathi.com  /  admin123
-- (change password immediately after first login!)
-- Hash generated with bcryptjs cost 10
-- ---------------------------------------------------------------------
insert into public.users (email, password_hash, role)
values (
  'admin@botsaathi.com',
  '$2a$10$2I/LmedrQh42Fx4OsikISuPIEgvizbBI.3amvl6sTsSRF79H1biO2',
  'admin'
)
on conflict (email) do nothing;

-- ---------------------------------------------------------------------
-- RLS: backend uses SERVICE ROLE key so RLS is bypassed.
-- Don't expose anon key directly to these tables.
-- ---------------------------------------------------------------------
