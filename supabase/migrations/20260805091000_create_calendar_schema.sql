-- Sprint 3, steg 2: normaliserat kalenderschema. Ingen produktionsdata skrivs av Codex.
create table public.calendar_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  icon text null,
  color text null,
  is_archived boolean not null default false,
  is_system boolean not null default false,
  created_by uuid null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create unique index calendar_categories_household_name_key on public.calendar_categories (household_id, lower(name));

create table public.calendar_recurrence_series (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval_value integer not null default 1 check (interval_value > 0),
  starts_on date not null,
  ends_on date null,
  occurrence_count integer null check (occurrence_count > 0),
  parent_series_id uuid null references public.calendar_recurrence_series (id) on delete set null,
  split_from_date date null,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (not (ends_on is not null and occurrence_count is not null)),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  description text not null check (char_length(description) between 1 and 2000),
  location text null check (char_length(location) <= 250),
  notes text null check (char_length(notes) <= 5000),
  category_id uuid null,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  starts_at timestamptz null,
  ends_at timestamptz null,
  all_day boolean not null default false,
  all_day_start date null,
  all_day_end date null,
  is_family_event boolean not null default false,
  reminder_type text not null default 'none' check (reminder_type in ('none', 'at_start', '5_minutes', '15_minutes', '30_minutes', '1_hour', '1_day', 'custom')),
  reminder_offset_minutes integer null check (reminder_offset_minutes >= 0),
  external_source text null,
  external_id text null,
  recurrence_series_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (recurrence_series_id),
  foreign key (category_id, household_id) references public.calendar_categories (id, household_id),
  foreign key (recurrence_series_id, household_id) references public.calendar_recurrence_series (id, household_id),
  check (
    (all_day and starts_at is null and ends_at is null and all_day_start is not null and all_day_end is not null and all_day_end >= all_day_start)
    or
    (not all_day and starts_at is not null and ends_at is not null and all_day_start is null and all_day_end is null and ends_at > starts_at)
  ),
  check ((reminder_type = 'custom' and reminder_offset_minutes is not null) or (reminder_type <> 'custom' and reminder_offset_minutes is null))
);

create table public.calendar_event_participants (
  event_id uuid not null,
  profile_id uuid not null,
  household_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id),
  foreign key (event_id, household_id) references public.calendar_events (id, household_id) on delete cascade,
  foreign key (profile_id, household_id) references public.profiles (id, household_id)
);

create index calendar_events_household_starts_idx on public.calendar_events (household_id, starts_at);
create index calendar_events_household_all_day_idx on public.calendar_events (household_id, all_day_start, all_day_end);
create index calendar_events_series_idx on public.calendar_events (recurrence_series_id);
create index calendar_participants_profile_idx on public.calendar_event_participants (profile_id, event_id);
create index calendar_series_range_idx on public.calendar_recurrence_series (household_id, starts_on, ends_on);

create or replace function public.set_calendar_updated_at()
returns trigger language plpgsql set search_path = pg_catalog
as $$ begin new.updated_at = now(); return new; end $$;
create trigger calendar_categories_updated_at before update on public.calendar_categories for each row execute function public.set_calendar_updated_at();
create trigger calendar_series_updated_at before update on public.calendar_recurrence_series for each row execute function public.set_calendar_updated_at();
create trigger calendar_events_updated_at before update on public.calendar_events for each row execute function public.set_calendar_updated_at();

alter table public.calendar_categories enable row level security;
alter table public.calendar_recurrence_series enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_participants enable row level security;
