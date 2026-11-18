-- VYRA · free in-app assistant ("Puls"): a daily question counter per user, so the free assistant has a cost cap.
-- Safe to run more than once.

create table if not exists public.assistant_usage (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  day      date not null default current_date,
  count    int not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;
drop policy if exists assistant_usage_select on public.assistant_usage;
create policy assistant_usage_select on public.assistant_usage for select to authenticated using (user_id = auth.uid());

-- Counts one question for the signed-in user and says whether it fits today's limit.
create or replace function public.bump_assistant(p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if auth.uid() is null then return -1; end if;
  insert into public.assistant_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.assistant_usage.count + 1
  returning count into n;
  return case when n > p_limit then -1 else p_limit - n end;
end;
$$;
revoke all on function public.bump_assistant(int) from public;
grant execute on function public.bump_assistant(int) to authenticated;
