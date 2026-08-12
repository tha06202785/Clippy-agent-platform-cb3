-- Cover every Adaptive Intelligence foreign key from its referenced column.
-- The organisation-scoped indexes remain in place for application queries.

create index if not exists communication_examples_lead_fk_idx
  on public.communication_examples (lead_id)
  where lead_id is not null;

create index if not exists communication_examples_conversation_fk_idx
  on public.communication_examples (conversation_id)
  where conversation_id is not null;

create index if not exists communication_learning_events_lead_fk_idx
  on public.communication_learning_events (lead_id)
  where lead_id is not null;

create index if not exists communication_learning_events_conversation_fk_idx
  on public.communication_learning_events (conversation_id)
  where conversation_id is not null;

create index if not exists communication_learning_events_example_fk_idx
  on public.communication_learning_events (example_id)
  where example_id is not null;
