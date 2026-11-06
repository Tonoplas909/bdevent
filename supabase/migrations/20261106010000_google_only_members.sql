-- Only a Google sign-in proves someone owns an @bdemiagenice.com address. An email/password
-- sign-up with a domain address (verified or not) must not become an active member.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) like '%@bdemiagenice.com'
     and new.raw_app_meta_data ->> 'provider' = 'google'
     and new.email_confirmed_at is not null then
    insert into public.members (id, email, name, status)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 'active')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
