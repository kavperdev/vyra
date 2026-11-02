-- VYRA · photos for the website (team cards, ambassadors). Safe to run more than once.

alter table public.site_team add column if not exists photo_url text check (char_length(photo_url) <= 500);

-- Public bucket "site-photos": anyone can view, only founders can upload, replace or delete.
-- Skipped automatically where Supabase Storage is not installed (e.g. local tests).
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('site-photos', 'site-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

  execute 'drop policy if exists site_photos_read on storage.objects';
  execute 'drop policy if exists site_photos_insert on storage.objects';
  execute 'drop policy if exists site_photos_update on storage.objects';
  execute 'drop policy if exists site_photos_delete on storage.objects';
  execute $p$create policy site_photos_read on storage.objects for select to anon, authenticated using (bucket_id = 'site-photos')$p$;
  execute $p$create policy site_photos_insert on storage.objects for insert to authenticated with check (bucket_id = 'site-photos' and public.is_founder())$p$;
  execute $p$create policy site_photos_update on storage.objects for update to authenticated using (bucket_id = 'site-photos' and public.is_founder()) with check (bucket_id = 'site-photos' and public.is_founder())$p$;
  execute $p$create policy site_photos_delete on storage.objects for delete to authenticated using (bucket_id = 'site-photos' and public.is_founder())$p$;
end $$;
