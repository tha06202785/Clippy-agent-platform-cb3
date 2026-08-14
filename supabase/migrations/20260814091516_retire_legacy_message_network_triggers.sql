-- Retire the legacy database-to-Edge-Function message pipeline.
-- Approved delivery is performed once by the authenticated Next.js approval
-- routes before the delivery receipt is recorded in public.messages.

drop trigger if exists after_outbound_message_insert on public.messages;
drop trigger if exists trigger_outbound_message_sender on public.messages;
drop trigger if exists trigger_process_message_ai on public.messages;

comment on function public.trigger_outbound_message_sender() is
  'Legacy outbound trigger function retained without a table trigger for rollback inspection only.';
comment on function public.trigger_process_message_ai() is
  'Legacy AI trigger function retained without a table trigger for rollback inspection only.';

do $verify$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'messages'
      and not t.tgisinternal
      and t.tgname in (
        'after_outbound_message_insert',
        'trigger_outbound_message_sender',
        'trigger_process_message_ai'
      )
  ) then
    raise exception 'Legacy message network triggers are still installed';
  end if;
end
$verify$;
