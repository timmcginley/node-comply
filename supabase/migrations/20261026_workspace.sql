begin;

create table public.teams (
  id text primary key
);

insert into public.teams (id) values
  ('ARC-01'), ('ARC-02'), ('ARC-03'), ('ARC-04'), ('ARC-06'), ('ARC-07'),
  ('IND-10'), ('IND-13'), ('IND-16'),
  ('STR-20'), ('STR-21'), ('STR-22'), ('STR-23'), ('STR-24'), ('STR-27'), ('STR-29'),
  ('MAT-34'), ('MAT-35'), ('BLD-40'), ('BLD-41'), ('BLD-42');

create table public.team_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null references public.teams(id),
  primary key (user_id, team_id)
);

create table public.facilitators (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.workspaces (
  team_id text primary key references public.teams(id),
  revision bigint not null check (revision > 0),
  schema_version integer not null check (schema_version = 1),
  payload jsonb not null,
  updated_at timestamptz not null,
  updated_by uuid not null references auth.users(id)
);

create table public.workspace_revisions (
  team_id text not null references public.teams(id),
  revision bigint not null check (revision > 0),
  schema_version integer not null check (schema_version = 1),
  payload jsonb not null,
  updated_at timestamptz not null,
  updated_by uuid not null references auth.users(id),
  primary key (team_id, revision)
);

alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.facilitators enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_revisions enable row level security;

create policy teams_read on public.teams for select to authenticated using (true);
create policy memberships_self_read on public.team_memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy facilitators_self_read on public.facilitators for select to authenticated
  using (user_id = (select auth.uid()));
create policy workspaces_read on public.workspaces for select to authenticated using (true);
create policy revisions_read on public.workspace_revisions for select to authenticated using (true);

revoke all on public.teams, public.team_memberships, public.facilitators,
  public.workspaces, public.workspace_revisions from public, anon, authenticated;
grant select on public.teams, public.team_memberships, public.facilitators,
  public.workspaces, public.workspace_revisions to authenticated;

create function public.can_edit_workspace(p_team_id text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.facilitators where user_id = auth.uid())
    or exists (select 1 from public.team_memberships
      where user_id = auth.uid() and team_id = p_team_id)
  );
$$;

revoke all on function public.can_edit_workspace(text) from public, anon;
grant execute on function public.can_edit_workspace(text) to authenticated;

create function public.save_workspace(
  p_team_id text,
  p_expected_revision bigint,
  p_payload jsonb
)
returns public.workspaces
language plpgsql security definer
set search_path = ''
as $$
declare
  current_revision bigint;
  saved public.workspaces;
  collection text;
begin
  if not public.can_edit_workspace(p_team_id) then
    raise exception 'You are not allowed to edit this team.' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'A non-negative base revision is required.' using errcode = '22023';
  end if;
  if p_payload is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload->'schemaVersion' is distinct from '1'::jsonb
    or p_payload->>'teamId' is distinct from p_team_id
    or jsonb_typeof(p_payload->'records') is distinct from 'object'
    or jsonb_typeof(p_payload->'diagrams') is distinct from 'object'
    or octet_length(p_payload::text) > 10485760 then
    raise exception 'Invalid workspace (schema 1, matching team and maximum 10 MiB required).' using errcode = '22023';
  end if;
  foreach collection in array array['mappings', 'nominations', 'dependencies',
    'activities', 'references', 'claims', 'requests', 'offers', 'assumptions',
    'evidence', 'toolbenchNodes', 'toolbenchWires'] loop
    if jsonb_typeof(p_payload->'records'->collection) is distinct from 'array' then
      raise exception 'Invalid workspace record collection: %', collection using errcode = '22023';
    end if;
  end loop;
  foreach collection in array array['general', 'scoped'] loop
    if not (p_payload->'diagrams' ? collection)
      or jsonb_typeof(p_payload->'diagrams'->collection) not in ('string', 'null')
      or (jsonb_typeof(p_payload->'diagrams'->collection) = 'string'
        and length(btrim(p_payload->'diagrams'->>collection)) = 0) then
      raise exception 'Each diagram must be non-empty XML text or explicit null.' using errcode = '22023';
    end if;
  end loop;

  -- Lock the team even before its first workspace exists: concurrent creates conflict too.
  perform 1 from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Unknown team.' using errcode = '22023';
  end if;
  select revision into current_revision from public.workspaces where team_id = p_team_id;
  if coalesce(current_revision, 0) <> p_expected_revision then
    raise exception 'WORKSPACE_CONFLICT: another save changed this workspace. Your local draft has been retained.'
      using errcode = '40001';
  end if;

  insert into public.workspaces(team_id, revision, schema_version, payload, updated_at, updated_by)
    values (p_team_id, p_expected_revision + 1, 1, p_payload, now(), auth.uid())
    on conflict (team_id) do update set revision = excluded.revision,
      schema_version = excluded.schema_version, payload = excluded.payload,
      updated_at = excluded.updated_at, updated_by = excluded.updated_by
    returning * into saved;
  insert into public.workspace_revisions select saved.*;
  return saved;
end;
$$;

revoke all on function public.save_workspace(text, bigint, jsonb) from public, anon;
grant execute on function public.save_workspace(text, bigint, jsonb) to authenticated;

commit;
