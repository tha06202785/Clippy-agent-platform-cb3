-- Consolidate legacy profile policies into one explicit authenticated policy
-- per operation. This preserves own-row access while removing redundant
-- permissive policies and evaluating auth.uid() once per statement.

drop policy if exists "Enable delete for users on their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile." on public.profiles;
drop policy if exists "Enable insert for users on their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Enable read access for users on their own profile" on public.profiles;
drop policy if exists "Users read their own profile" on public.profiles;
drop policy if exists "users_can_view_own_profile" on public.profiles;
drop policy if exists "Enable update for users on their own profile" on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
drop policy if exists "users_can_update_own_profile" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = user_id);
