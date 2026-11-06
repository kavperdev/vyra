-- VYRA · Challenges: prizes, a code for everyone who reaches the goal, and result verification
-- (run time, impossible-pace check, screenshot proof checked automatically or by a founder).
-- Safe to run more than once.

alter table public.challenges add column if not exists prizes text check (char_length(prizes) <= 2000);
alter table public.challenges add column if not exists finisher_code text check (char_length(finisher_code) <= 40);

alter table public.challenge_entries add column if not exists duration_s int check (duration_s between 60 and 86400);
alter table public.challenge_entries add column if not exists proof_path text check (char_length(proof_path) <= 300);
alter table public.challenge_entries add column if not exists status text not null default 'ok' check (status in ('ok', 'pending', 'verified', 'rejected'));
alter table public.challenge_entries add column if not exists note text check (char_length(note) <= 300);
grant update on public.challenge_entries to authenticated;

-- Log one run (replaces the 3-argument version). Time is optional for older clients.
-- Impossible paces are refused; unusual entries and entries with a screenshot wait for a check.
drop function if exists public.challenge_log(uuid, date, numeric);
create or replace function public.challenge_log(p_token uuid, p_day date, p_km numeric, p_seconds int default null, p_proof text default null)
returns table (entry_id uuid, status text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_p uuid;
  v_start date;
  v_end date;
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
  v_pace numeric;
  v_status text := 'ok';
  v_note text;
  v_id uuid;
begin
  select p.id, c.starts_on, c.ends_on into v_p, v_start, v_end
    from challenge_participants p join challenges c on c.id = p.challenge_id where p.token = p_token;
  if v_p is null then raise exception 'NOT_FOUND' using errcode = '22023'; end if;
  if p_day < v_start or p_day > v_end or p_day > v_today then raise exception 'DAY_OUTSIDE' using errcode = '22023'; end if;
  if p_km is null or p_km < 0.5 or p_km > 100 then raise exception 'KM_RANGE' using errcode = '22023'; end if;
  if coalesce((select sum(e.km) from challenge_entries e where e.participant_id = v_p and e.day = p_day and e.status <> 'rejected'), 0) + p_km > 150 then
    raise exception 'KM_RANGE' using errcode = '22023';
  end if;
  if p_proof is not null and (char_length(p_proof) > 300 or split_part(p_proof, '/', 1) <> p_token::text) then
    raise exception 'BAD_PROOF' using errcode = '22023';
  end if;
  if p_seconds is not null then
    if p_seconds < 60 or p_seconds > 86400 then raise exception 'TIME_RANGE' using errcode = '22023'; end if;
    v_pace := p_seconds / p_km;
    -- Faster than 2:50 min/km over 1 km or more: beyond any amateur, refused outright.
    if p_km >= 1 and v_pace < 170 then raise exception 'PACE_IMPOSSIBLE' using errcode = '22023'; end if;
    if v_pace < 210 and p_km >= 5 then v_status := 'pending'; v_note := 'Bardzo szybkie tempo'; end if;
  end if;
  if p_km > 42.2 then v_status := 'pending'; v_note := coalesce(v_note || '; ', '') || 'Ponad maraton jednego dnia'; end if;
  if coalesce((select sum(e.km) from challenge_entries e where e.participant_id = v_p and e.day > p_day - 7 and e.day <= p_day and e.status <> 'rejected'), 0) + p_km > 200 then
    v_status := 'pending'; v_note := coalesce(v_note || '; ', '') || 'Ponad 200 km w 7 dni';
  end if;
  if p_proof is not null and v_status = 'ok' then v_status := 'pending'; v_note := 'Zrzut do sprawdzenia'; end if;
  insert into challenge_entries (participant_id, day, km, duration_s, proof_path, status, note)
    values (v_p, p_day, round(p_km, 2), p_seconds, p_proof, v_status, v_note)
    returning challenge_entries.id into v_id;
  return query select v_id, v_status;
end $$;
revoke execute on function public.challenge_log(uuid, date, numeric, int, text) from public;
grant execute on function public.challenge_log(uuid, date, numeric, int, text) to anon, authenticated;

-- Server only: result of the automatic screenshot check.
create or replace function public.challenge_verify(p_secret text, p_entry uuid, p_status text, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_status not in ('verified', 'pending') then raise exception 'BAD_STATUS' using errcode = '22023'; end if;
  update challenge_entries set status = p_status, note = left(p_note, 300) where id = p_entry and status <> 'rejected';
end $$;
revoke execute on function public.challenge_verify(text, uuid, text, text) from public;
grant execute on function public.challenge_verify(text, uuid, text, text) to anon, authenticated;

-- The participant's page: status of each run, and the finisher code once the goal is reached.
create or replace function public.challenge_me(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (
    select p.id pid, p.club, m.member_no, m.name, c.*
      from challenge_participants p
      join vyra_members m on m.member_no = p.member_no
      join challenges c on c.id = p.challenge_id
     where p.token = p_token
  ), score as (
    select coalesce(sum(e.km), 0) km, count(e.id) runs from challenge_entries e, me where e.participant_id = me.pid and e.status <> 'rejected'
  )
  select jsonb_build_object(
    'name', me.name, 'member_no', me.member_no, 'club', me.club,
    'challenge', jsonb_build_object('id', me.id, 'slug', me.slug, 'title', me.title, 'kind', me.kind, 'goal', me.goal, 'starts_on', me.starts_on, 'ends_on', me.ends_on),
    'finisher_code', case when me.goal is not null and me.finisher_code is not null
                           and (case when me.kind = 'runs' then score.runs else score.km end) >= me.goal then me.finisher_code end,
    'entries', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'day', e.day, 'km', e.km, 'seconds', e.duration_s, 'status', e.status, 'proof', e.proof_path is not null)
                                          order by e.day desc, e.created_at desc)
                          from challenge_entries e where e.participant_id = me.pid), '[]'::jsonb))
  from me, score;
$$;

-- Rankings ignore rejected runs; "verified_km" shows who has proof for everything.
drop function if exists public.challenge_board(uuid);
create or replace function public.challenge_board(p_challenge uuid)
returns table (member_no int, name text, club text, km numeric, runs int, verified_km numeric)
language sql stable security definer set search_path = public as $$
  select m.member_no, m.name, p.club,
         coalesce(sum(e.km) filter (where e.status <> 'rejected'), 0),
         (count(e.id) filter (where e.status <> 'rejected'))::int,
         coalesce(sum(e.km) filter (where e.status = 'verified'), 0)
    from challenge_participants p
    join vyra_members m on m.member_no = p.member_no
    join challenges c on c.id = p.challenge_id and c.visible
    left join challenge_entries e on e.participant_id = p.id
   where p.challenge_id = p_challenge
   group by m.member_no, m.name, p.club
   order by 4 desc, 5 desc, 1;
$$;
revoke execute on function public.challenge_board(uuid) from public;
grant execute on function public.challenge_board(uuid) to anon, authenticated;

create or replace function public.challenge_clubs(p_challenge uuid)
returns table (club text, people int, km numeric, runs int)
language sql stable security definer set search_path = public as $$
  select min(p.club), count(distinct p.id)::int,
         coalesce(sum(e.km) filter (where e.status <> 'rejected'), 0),
         (count(e.id) filter (where e.status <> 'rejected'))::int
    from challenge_participants p
    join challenges c on c.id = p.challenge_id and c.visible
    left join challenge_entries e on e.participant_id = p.id
   where p.challenge_id = p_challenge and p.club is not null
   group by lower(p.club)
   order by 3 desc, 2 desc;
$$;

-- Member page: challenge progress without rejected runs.
create or replace function public.member_area(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'member_no', m.member_no, 'name', m.name, 'since', m.created_at, 'newsletter', m.newsletter, 'club', m.club,
    'challenges', coalesce((
      select jsonb_agg(jsonb_build_object('title', c.title, 'slug', c.slug, 'kind', c.kind, 'goal', c.goal, 'token', p.token,
                                          'km', coalesce((select sum(e.km) from challenge_entries e where e.participant_id = p.id and e.status <> 'rejected'), 0),
                                          'runs', (select count(*) from challenge_entries e where e.participant_id = p.id and e.status <> 'rejected'),
                                          'ends_on', c.ends_on) order by c.starts_on desc)
        from challenge_participants p join challenges c on c.id = p.challenge_id
       where p.member_no = m.member_no), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'title', x.title, 'body', x.body, 'link_url', x.link_url, 'link_label', x.link_label, 'created_at', x.created_at)
                       order by x.sort, x.created_at desc)
        from member_posts x where x.visible), '[]'::jsonb))
  from vyra_members m where m.token = p_token;
$$;

-- Is this a real participant link? Used by the storage rules below.
create or replace function public.challenge_token_ok(p_folder text)
returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return exists (select 1 from challenge_participants where token = p_folder::uuid);
exception when others then
  return false;
end $$;
revoke execute on function public.challenge_token_ok(text) from public;
grant execute on function public.challenge_token_ok(text) to anon, authenticated;

-- Private bucket for screenshots: a participant uploads only into their own folder (<token>/…),
-- reads only from it; founders read and delete everything. Skipped where Storage is not installed.
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('challenge-proofs', 'challenge-proofs', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
  execute 'drop policy if exists challenge_proofs_insert on storage.objects';
  execute 'drop policy if exists challenge_proofs_read on storage.objects';
  execute 'drop policy if exists challenge_proofs_founder on storage.objects';
  execute $p$create policy challenge_proofs_insert on storage.objects for insert to anon, authenticated
    with check (bucket_id = 'challenge-proofs' and public.challenge_token_ok((storage.foldername(name))[1]))$p$;
  execute $p$create policy challenge_proofs_read on storage.objects for select to anon, authenticated
    using (bucket_id = 'challenge-proofs' and (public.challenge_token_ok((storage.foldername(name))[1]) or public.is_founder()))$p$;
  execute $p$create policy challenge_proofs_founder on storage.objects for delete to authenticated
    using (bucket_id = 'challenge-proofs' and public.is_founder())$p$;
end $$;
