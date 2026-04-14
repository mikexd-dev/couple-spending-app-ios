-- =============================================================
-- Google Sheets Sync — couple_settings table + webhook trigger
-- =============================================================

-- Store per-couple settings (Google Sheet ID, etc.)
create table public.couple_settings (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null unique references public.couples(id) on delete cascade,
  google_sheet_id text,          -- the spreadsheet ID from the Google Sheets URL
  google_sheets_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger couple_settings_updated_at
  before update on public.couple_settings
  for each row execute procedure public.set_updated_at();

-- RLS: same couple-scoped access
alter table public.couple_settings enable row level security;

create policy "Couple members can view settings"
  on public.couple_settings for select
  using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert settings"
  on public.couple_settings for insert
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can update settings"
  on public.couple_settings for update
  using (couple_id = public.get_my_couple_id())
  with check (couple_id = public.get_my_couple_id());

-- Auto-create settings row when a couple is created
create or replace function public.handle_new_couple()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.couple_settings (couple_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_couple_created
  after insert on public.couples
  for each row execute procedure public.handle_new_couple();

-- =============================================================
-- Webhook trigger: call Edge Function on transaction changes
-- =============================================================
-- NOTE: Supabase Database Webhooks are configured in the Dashboard
-- (Database → Webhooks → Create), not via SQL. The webhook should:
--   Table: transactions
--   Events: INSERT, UPDATE, DELETE
--   Type: Supabase Edge Function
--   Function: sync-google-sheets
--
-- This migration only creates the settings table. Configure the
-- webhook in the Supabase Dashboard after deploying the Edge Function.
