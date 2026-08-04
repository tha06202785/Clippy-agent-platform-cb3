-- Stable identifiers make Google sync idempotent and keep one health row per
-- organisation/provider. Existing rows are preserved.

alter table public.knowledge_documents
  add column if not exists external_id text,
  add column if not exists external_revision text;

with ranked as (
  select
    id,
    row_number() over (
      partition by org_id, source, external_id
      order by updated_at desc nulls last, created_at desc, id desc
    ) as row_number
  from public.knowledge_documents
  where external_id is not null
)
delete from public.knowledge_documents document
using ranked
where document.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists knowledge_documents_org_source_external_key
  on public.knowledge_documents (org_id, source, external_id);

with ranked as (
  select
    id,
    row_number() over (
      partition by org_id, provider
      order by updated_at desc nulls last, created_at desc, id desc
    ) as row_number
  from public.integration_health
)
delete from public.integration_health health
using ranked
where health.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists integration_health_org_provider_key
  on public.integration_health (org_id, provider);
