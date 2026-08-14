-- Run after 20260814093000_retire_legacy_message_network_triggers.sql.

do $test$
declare
  legacy_trigger_count integer;
begin
  select count(*)
    into legacy_trigger_count
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
    );

  if legacy_trigger_count <> 0 then
    raise exception 'Expected zero legacy message triggers, found %',
      legacy_trigger_count;
  end if;
end
$test$;

select t.tgname,
       pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'messages'
  and not t.tgisinternal
order by t.tgname;
