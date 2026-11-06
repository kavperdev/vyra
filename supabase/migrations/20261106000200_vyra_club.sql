-- VYRA · VYRA Club: free membership for an e-mail, a members' page behind a private link,
-- member-only posts (plan of the month, early access, events) and the "Standard" newsletter.
-- Builds on vyra_members from 20261106000100_challenges.sql. Safe to run more than once.

alter table public.vyra_members add column if not exists token uuid not null default gen_random_uuid();
alter table public.vyra_members add column if not exists newsletter boolean not null default false;
alter table public.vyra_members add column if not exists club boolean not null default false;
alter table public.vyra_members add column if not exists joined_via text check (char_length(joined_via) <= 40);
create unique index if not exists vyra_members_token on public.vyra_members (token);

-- Join VYRA Club. Returns the private token only for someone new to the club;
-- for an existing e-mail it returns null and the server e-mails the link again.
create or replace function public.club_join(p_email text, p_name text, p_newsletter boolean, p_via text)
returns table (token uuid, member_no int, is_new boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(p_email));
  v_row vyra_members%rowtype;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 254 then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  insert into vyra_members (email, name, club, newsletter, joined_via)
    values (v_email, left(trim(p_name), 60), true, coalesce(p_newsletter, false), left(p_via, 40))
    on conflict (email) do nothing
    returning * into v_row;
  if v_row.member_no is not null then
    return query select v_row.token, v_row.member_no, true;
    return;
  end if;
  -- Known e-mail (e.g. from a challenge): becomes a club member; newsletter only switches on, never off here.
  update vyra_members m set club = true, newsletter = m.newsletter or coalesce(p_newsletter, false)
   where m.email = v_email and not m.club
   returning * into v_row;
  if v_row.member_no is not null then
    return query select v_row.token, v_row.member_no, true;
    return;
  end if;
  return query select null::uuid, (select m.member_no from vyra_members m where m.email = v_email), false;
end $$;
revoke execute on function public.club_join(text, text, boolean, text) from public;
grant execute on function public.club_join(text, text, boolean, text) to anon, authenticated;

-- Server only: a member's private token, to e-mail their link again.
create or replace function public.member_token(p_secret text, p_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  return (select token from vyra_members where email = lower(trim(p_email)));
end $$;
revoke execute on function public.member_token(text, text) from public;
grant execute on function public.member_token(text, text) to anon, authenticated;

-- Posts only members see: plan of the month, early access, events.
create table if not exists public.member_posts (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'news' check (kind in ('plan', 'news', 'event')),
  title      text not null check (char_length(title) between 2 and 120),
  body       text check (char_length(body) <= 4000),
  link_url   text check (char_length(link_url) <= 500),
  link_label text check (char_length(link_label) <= 60),
  visible    boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.member_posts enable row level security;
revoke all on public.member_posts from anon, authenticated;
grant select, insert, update, delete on public.member_posts to authenticated;
drop policy if exists member_posts_founder on public.member_posts;
create policy member_posts_founder on public.member_posts for all to authenticated using (public.is_founder()) with check (public.is_founder());

-- The members' page behind the private link: who you are, your challenges, member posts.
create or replace function public.member_area(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'member_no', m.member_no, 'name', m.name, 'since', m.created_at, 'newsletter', m.newsletter, 'club', m.club,
    'challenges', coalesce((
      select jsonb_agg(jsonb_build_object('title', c.title, 'slug', c.slug, 'kind', c.kind, 'goal', c.goal, 'token', p.token,
                                          'km', coalesce((select sum(e.km) from challenge_entries e where e.participant_id = p.id), 0),
                                          'runs', (select count(*) from challenge_entries e where e.participant_id = p.id),
                                          'ends_on', c.ends_on) order by c.starts_on desc)
        from challenge_participants p join challenges c on c.id = p.challenge_id
       where p.member_no = m.member_no), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'title', x.title, 'body', x.body, 'link_url', x.link_url, 'link_label', x.link_label, 'created_at', x.created_at)
                       order by x.sort, x.created_at desc)
        from member_posts x where x.visible), '[]'::jsonb))
  from vyra_members m where m.token = p_token;
$$;
revoke execute on function public.member_area(uuid) from public;
grant execute on function public.member_area(uuid) to anon, authenticated;

-- Newsletter on/off from the link in every e-mail. Returns the new state, null for a wrong link.
create or replace function public.member_newsletter(p_token uuid, p_on boolean)
returns boolean
language sql security definer set search_path = public as $$
  update vyra_members set newsletter = p_on where token = p_token returning newsletter;
$$;
revoke execute on function public.member_newsletter(uuid, boolean) from public;
grant execute on function public.member_newsletter(uuid, boolean) to anon, authenticated;

-- Newsletter issues sent from the panel (a record, and protection against sending one twice).
create table if not exists public.newsletter_issues (
  id         uuid primary key default gen_random_uuid(),
  subject    text not null check (char_length(subject) between 3 and 140),
  body       text not null check (char_length(body) <= 8000),
  cta_label  text check (char_length(cta_label) <= 60),
  cta_url    text check (char_length(cta_url) <= 500),
  sent_at    timestamptz,
  recipients int,
  created_at timestamptz not null default now()
);
alter table public.newsletter_issues enable row level security;
revoke all on public.newsletter_issues from anon, authenticated;
grant select, insert, update, delete on public.newsletter_issues to authenticated;
drop policy if exists newsletter_issues_founder on public.newsletter_issues;
create policy newsletter_issues_founder on public.newsletter_issues for all to authenticated using (public.is_founder()) with check (public.is_founder());

-- Founders already read vyra_members (challenges migration); let them also change it (e.g. remove someone).
grant update, delete on public.vyra_members to authenticated;
drop policy if exists vyra_members_founder_write on public.vyra_members;
create policy vyra_members_founder_write on public.vyra_members for update to authenticated using (public.is_founder()) with check (public.is_founder());
drop policy if exists vyra_members_founder_delete on public.vyra_members;
create policy vyra_members_founder_delete on public.vyra_members for delete to authenticated using (public.is_founder());

-- Public count for the club page.
create or replace function public.club_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from vyra_members where club;
$$;
revoke execute on function public.club_count() from public;
grant execute on function public.club_count() to anon, authenticated;
