begin;

create function public.choose_team(p_team_id text)
returns text
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before choosing a team.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Choose an existing team.' using errcode = '22023';
  end if;
  -- Serialize switches for the same account, including its first membership.
  perform 1 from auth.users where id = auth.uid() for update;
  delete from public.team_memberships where user_id = auth.uid();
  insert into public.team_memberships(user_id, team_id) values (auth.uid(), p_team_id);
  return p_team_id;
end;
$$;

revoke all on function public.choose_team(text) from public, anon;
grant execute on function public.choose_team(text) to authenticated;

create table public.focus_areas (
  id text primary key
);
insert into public.focus_areas values
  ('architecture'), ('indoor-energy'), ('structure'), ('materials'), ('build');

create table public.focus_canvases (
  focus_id text primary key references public.focus_areas(id),
  revision bigint not null check (revision > 0),
  schema_version integer not null check (schema_version = 1),
  payload jsonb not null,
  updated_at timestamptz not null,
  updated_by uuid not null references auth.users(id)
);
create table public.focus_canvas_revisions (
  focus_id text not null references public.focus_areas(id),
  revision bigint not null check (revision > 0),
  schema_version integer not null check (schema_version = 1),
  payload jsonb not null,
  updated_at timestamptz not null,
  updated_by uuid not null references auth.users(id),
  primary key (focus_id, revision)
);

alter table public.focus_areas enable row level security;
alter table public.focus_canvases enable row level security;
alter table public.focus_canvas_revisions enable row level security;
create policy focus_areas_read on public.focus_areas for select to authenticated using (true);
create policy focus_canvases_read on public.focus_canvases for select to authenticated using (true);
create policy focus_history_read on public.focus_canvas_revisions for select to authenticated using (true);
revoke all on public.focus_areas, public.focus_canvases, public.focus_canvas_revisions from public, anon, authenticated;
grant select on public.focus_areas, public.focus_canvases, public.focus_canvas_revisions to authenticated;

create function public.save_focus_canvas(
  p_focus_id text, p_expected_revision bigint, p_payload jsonb
)
returns public.focus_canvases
language plpgsql security definer
set search_path = ''
as $$
declare
  current_revision bigint;
  saved public.focus_canvases;
  collection text;
  node jsonb;
begin
  if auth.uid() is null or not (
    exists (select 1 from public.team_memberships where user_id = auth.uid())
    or exists (select 1 from public.facilitators where user_id = auth.uid())
  ) then
    raise exception 'Join a team before editing course canvases.' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'A non-negative base revision is required.' using errcode = '22023';
  end if;
  if p_payload is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload->'schemaVersion' is distinct from '1'::jsonb
    or p_payload->>'focusArea' is distinct from p_focus_id
    or jsonb_typeof(p_payload->'records') is distinct from 'object'
    or octet_length(p_payload::text) > 10485760 then
    raise exception 'Invalid focus canvas (schema 1, matching focus and maximum 10 MiB required).' using errcode = '22023';
  end if;
  foreach collection in array array['mappings', 'nominations', 'dependencies',
    'activities', 'references', 'claims', 'requests', 'offers', 'assumptions',
    'evidence', 'toolbenchNodes', 'toolbenchWires'] loop
    if jsonb_typeof(p_payload->'records'->collection) is distinct from 'array' then
      raise exception 'Invalid canvas collection: %', collection using errcode = '22023';
    end if;
  end loop;
  for node in select value from jsonb_array_elements(p_payload->'records'->'toolbenchNodes') loop
    if jsonb_typeof(node) is distinct from 'object'
      or jsonb_typeof(node->'id') is distinct from 'string'
      or jsonb_typeof(node->'title') is distinct from 'string'
      or jsonb_typeof(node->'inputs') is distinct from 'array'
      or jsonb_typeof(node->'outputs') is distinct from 'array' then
      raise exception 'Invalid canvas block.' using errcode = '22023';
    end if;
    if node->>'kind' = 'suggestion' then
      if coalesce(node->>'category', '') not in ('Capture', 'Connect', 'Calculate', 'Check', 'Compare', 'Communicate')
        or coalesce(length(btrim(node->>'title')), 0) = 0
        or jsonb_typeof(node->'owner') is distinct from 'string' then
        raise exception 'Suggestions require a name, six-C category and team assignment or empty owner.' using errcode = '22023';
      end if;
      if node->>'owner' <> '' and not exists (select 1 from public.teams where id = node->>'owner') then
        raise exception 'Unknown responsible team.' using errcode = '22023';
      end if;
    end if;
  end loop;

  perform 1 from public.focus_areas where id = p_focus_id for update;
  if not found then
    raise exception 'Unknown focus area.' using errcode = '22023';
  end if;
  select revision into current_revision from public.focus_canvases where focus_id = p_focus_id;
  if coalesce(current_revision, 0) <> p_expected_revision then
    raise exception 'CANVAS_CONFLICT: another editor saved a newer canvas. Load latest and review your retained draft.'
      using errcode = '40001';
  end if;
  insert into public.focus_canvases values
    (p_focus_id, p_expected_revision + 1, 1, p_payload, now(), auth.uid())
    on conflict (focus_id) do update set revision = excluded.revision,
      schema_version = excluded.schema_version, payload = excluded.payload,
      updated_at = excluded.updated_at, updated_by = excluded.updated_by
    returning * into saved;
  insert into public.focus_canvas_revisions select saved.*;
  return saved;
end;
$$;

revoke all on function public.save_focus_canvas(text, bigint, jsonb) from public, anon;
grant execute on function public.save_focus_canvas(text, bigint, jsonb) to authenticated;

commit;
