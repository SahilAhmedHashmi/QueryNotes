-- Run once in the Supabase SQL Editor. This is PostgreSQL application storage;
-- the SQL showcased in the notebook remains MySQL.
begin;
create table public.note_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.note_admins enable row level security;
revoke all on public.note_admins from anon, authenticated;

create or replace function public.is_note_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.note_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_note_admin() from public;
grant execute on function public.is_note_admin() to anon, authenticated;

create table public.drafts (
 id uuid primary key,
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 content jsonb not null check (jsonb_typeof(content)='object'),
 version integer not null default 1 check(version > 0),
 updated_at timestamptz not null default now(),
 published_at timestamptz
);
create table public.published_notes (
 id uuid primary key references public.drafts(id) on delete cascade,
 slug text not null unique,
 content jsonb not null,
 published_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index published_notes_date_idx on public.published_notes(published_at desc);
alter table public.drafts enable row level security;
alter table public.published_notes enable row level security;
revoke all on public.drafts,public.published_notes from anon,authenticated;
grant select,insert,update,delete on public.drafts to authenticated;
grant select on public.published_notes to anon,authenticated;
grant insert,update,delete on public.published_notes to authenticated;
create policy "Admin reads drafts" on public.drafts for select to authenticated using ((select public.is_note_admin()));
create policy "Admin creates drafts" on public.drafts for insert to authenticated with check ((select public.is_note_admin()));
create policy "Admin edits drafts" on public.drafts for update to authenticated using ((select public.is_note_admin())) with check ((select public.is_note_admin()));
create policy "Admin deletes drafts" on public.drafts for delete to authenticated using ((select public.is_note_admin()));
create policy "Visitors read published snapshots" on public.published_notes for select to anon,authenticated using (true);
create policy "Admin publishes" on public.published_notes for insert to authenticated with check ((select public.is_note_admin()));
create policy "Admin updates published" on public.published_notes for update to authenticated using ((select public.is_note_admin())) with check ((select public.is_note_admin()));
create policy "Admin unpublishes" on public.published_notes for delete to authenticated using ((select public.is_note_admin()));

create or replace function public.save_note_draft(note_id uuid,note_slug text,note_content jsonb,expected_version integer) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare old public.drafts; result public.drafts;
begin
 if not public.is_note_admin() then raise exception 'Editor access required.'; end if;
 if jsonb_typeof(note_content) is distinct from 'object' or
    note_content->>'id' is distinct from note_id::text or
    note_content->>'slug' is distinct from note_slug or
    coalesce(trim(note_content->>'title'),'') = '' or
    coalesce(note_content->>'difficulty','') not in ('Easy','Moderate','Hard') or
    jsonb_typeof(note_content->'tags') is distinct from 'array' or
    jsonb_typeof(note_content->'before') is distinct from 'array' or
    jsonb_typeof(note_content->'after') is distinct from 'array'
 then raise exception 'Invalid note. Check its title, URL slug, difficulty, and tables.'; end if;
 select * into old from public.drafts where id=note_id for update;
 if not found then
  if expected_version<>0 then raise exception 'Draft changed or deleted. Reload before saving.'; end if;
  insert into public.drafts(id,slug,content) values(note_id,note_slug,note_content) returning * into result;
 else
  if old.version<>expected_version then raise exception 'This draft changed in another tab. Reload before saving.'; end if;
  update public.drafts set slug=note_slug,content=note_content,version=version+1,updated_at=clock_timestamp() where id=note_id returning * into result;
 end if;
 return to_jsonb(result);
end;
$$;
create or replace function public.publish_note(note_id uuid,expected_version integer) returns void
language plpgsql security invoker set search_path = '' as $$
declare d public.drafts;
begin
 if not public.is_note_admin() then raise exception 'Editor access required.'; end if;
 select * into d from public.drafts where id=note_id for update;
 if not found or d.version<>expected_version then raise exception 'Draft changed or deleted. Reload before publishing.'; end if;
 if coalesce(trim(d.content->>'sql'),'')='' or coalesce(trim(d.content->>'problem'),'')='' or coalesce(trim(d.content->>'explanation'),'')='' then raise exception 'Add a problem, SQL solution, and explanation before publishing.'; end if;
 insert into public.published_notes(id,slug,content) values(d.id,d.slug,d.content)
 on conflict(id) do update set slug=excluded.slug,content=excluded.content,updated_at=clock_timestamp();
 update public.drafts set published_at=clock_timestamp() where id=note_id;
end;
$$;
create or replace function public.unpublish_note(note_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
 if not public.is_note_admin() then raise exception 'Editor access required.'; end if;
 perform 1 from public.drafts where id=note_id for update;
 delete from public.published_notes where id=note_id;
 update public.drafts set published_at=null where id=note_id;
end;
$$;
revoke all on function public.save_note_draft(uuid,text,jsonb,integer),public.publish_note(uuid,integer),public.unpublish_note(uuid) from public;
grant execute on function public.save_note_draft(uuid,text,jsonb,integer),public.publish_note(uuid,integer),public.unpublish_note(uuid) to authenticated;
commit;
