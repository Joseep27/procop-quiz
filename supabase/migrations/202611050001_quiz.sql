-- Apply ONLY in a new, dedicated Supabase project.
create schema if not exists quiz_private;
revoke all on schema quiz_private from public, anon, authenticated;
create table quiz_private.owner (singleton boolean primary key default true check(singleton), user_id uuid not null unique references auth.users(id));
create or replace function public.quiz_is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from quiz_private.owner where user_id=auth.uid());
$$;
revoke all on function public.quiz_is_owner() from public, anon;
grant execute on function public.quiz_is_owner() to authenticated;

create table public.quiz_attempts (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users(id),
 sheet_row bigint generated always as identity unique,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 constraint attempt_payload check (
  jsonb_typeof(payload)='object' and payload->>'id'=id::text
  and jsonb_typeof(payload->'pregunta')='object'
  and jsonb_typeof(payload->'correccion')='object'
  and jsonb_typeof(payload->'correccion'->'diferencias')='array'
  and jsonb_typeof(payload->'respuesta')='string'
  and length(payload->>'respuesta') between 1 and 15000
  and length(payload->'pregunta'->>'texto_literal') between 1 and 15000
  and payload->>'dia' ~ '^\d{4}-\d{2}-\d{2}$'
  and payload->'pregunta'->>'tipo' in ('PT','MS')
 )
);
create index quiz_attempts_user on public.quiz_attempts(user_id,created_at,id);
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon,authenticated;
grant select,insert on public.quiz_attempts to authenticated;
grant usage on sequence public.quiz_attempts_sheet_row_seq to authenticated;
create policy quiz_attempts_read on public.quiz_attempts for select to authenticated using (user_id=auth.uid() and public.quiz_is_owner());
create policy quiz_attempts_insert on public.quiz_attempts for insert to authenticated with check (user_id=auth.uid() and public.quiz_is_owner());
-- No UPDATE or DELETE policies/grants. onConflict ignoreDuplicates does not rewrite history.

create table public.quiz_annotations (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users(id),
 attempt_id uuid not null references public.quiz_attempts(id),
 payload jsonb not null,
 created_at timestamptz not null default now(),
 constraint annotation_payload check (jsonb_typeof(payload)='object' and payload->>'id'=id::text and payload->>'intento_id'=attempt_id::text and jsonb_typeof(payload->'leve')='boolean' and jsonb_typeof(payload->'indice')='number')
);
alter table public.quiz_annotations enable row level security;
revoke all on public.quiz_annotations from anon,authenticated;
grant select,insert on public.quiz_annotations to authenticated;
create policy quiz_annotations_read on public.quiz_annotations for select to authenticated using(user_id=auth.uid() and public.quiz_is_owner());
create policy quiz_annotations_insert on public.quiz_annotations for insert to authenticated with check(user_id=auth.uid() and public.quiz_is_owner() and exists(select 1 from public.quiz_attempts a where a.id=attempt_id and a.user_id=auth.uid()));
create index quiz_annotations_user on public.quiz_annotations(user_id,created_at,id);

create table public.quiz_daily_keys(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id),day_key text not null,unique(user_id,day_key));
alter table public.quiz_daily_keys enable row level security;
revoke all on public.quiz_daily_keys from anon,authenticated;
-- Only the Edge Function's service_role may allocate deterministic Sheets rows.
create table quiz_private.sync_lock(user_id uuid primary key,token uuid not null,until_at timestamptz not null);
create or replace function public.quiz_acquire_sync(p_user uuid,p_token uuid) returns boolean language plpgsql security definer set search_path='' as $$
 begin
  insert into quiz_private.sync_lock(user_id,token,until_at) values(p_user,p_token,now()+interval '5 minutes')
  on conflict(user_id) do update set token=excluded.token,until_at=excluded.until_at where quiz_private.sync_lock.until_at<now();
  return found;
 end;
$$;
create or replace function public.quiz_release_sync(p_user uuid,p_token uuid) returns void language sql security definer set search_path='' as $$
 delete from quiz_private.sync_lock where user_id=p_user and token=p_token;
$$;
revoke all on function public.quiz_acquire_sync(uuid,uuid) from public,anon,authenticated;
revoke all on function public.quiz_release_sync(uuid,uuid) from public,anon,authenticated;
grant execute on function public.quiz_acquire_sync(uuid,uuid) to service_role;
grant execute on function public.quiz_release_sync(uuid,uuid) to service_role;
