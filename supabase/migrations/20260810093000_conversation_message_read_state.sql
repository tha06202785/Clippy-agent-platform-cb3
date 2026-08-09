alter table public.messages
  add column if not exists read_at timestamptz;

-- Avoid presenting historical imports as thousands of newly unread messages.
update public.messages
set read_at = coalesce(read_at, created_at, now())
where read_at is null;

create index if not exists messages_unread_by_conversation_idx
  on public.messages (org_id, conversation_id, created_at desc)
  where read_at is null and direction_in_out = 'in';
