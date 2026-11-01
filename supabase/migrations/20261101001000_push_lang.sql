-- VYRA · push notifications in the language of each device

alter table public.push_subscriptions
  add column if not exists lang text not null default 'pl' check (lang in ('pl', 'en'));

drop function if exists public.take_push_job(uuid);
create function public.take_push_job(p_id uuid)
returns table (title text, body text, link text, endpoint text, p256dh text, auth text, lang text)
language plpgsql security definer set search_path = public as $$
declare
  v_n public.notifications;
begin
  update public.notifications set pushed_at = now()
    where id = p_id and pushed_at is null and created_at > now() - interval '10 minutes'
    returning * into v_n;
  if not found then return; end if;
  return query
    select v_n.title, v_n.body, v_n.link, s.endpoint, s.p256dh, s.auth, s.lang
    from public.push_subscriptions s where s.user_id = v_n.user_id;
end $$;
revoke execute on function public.take_push_job(uuid) from public;
grant execute on function public.take_push_job(uuid) to anon, authenticated;
