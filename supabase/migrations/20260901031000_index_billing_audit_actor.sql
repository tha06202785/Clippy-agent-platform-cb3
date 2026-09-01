create index if not exists billing_audit_events_actor_created_idx
  on public.billing_audit_events (actor_user_id, created_at desc)
  where actor_user_id is not null;
