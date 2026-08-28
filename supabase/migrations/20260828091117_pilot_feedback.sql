-- Privacy-minimised qualitative feedback from invited pilot agents. Draft
-- content is intentionally not stored; approval edits remain the learning
-- system's source of writing evidence.

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.pilot_invites(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'copilot_draft'
    check (feature in ('copilot_draft')),
  draft_id text not null check (char_length(draft_id) between 1 and 120),
  feedback_code text not null check (feedback_code in (
    'sounds_like_me',
    'too_formal',
    'too_casual',
    'too_sales_focused',
    'incorrect_information'
  )),
  channel text check (
    channel is null or channel in ('email', 'sms', 'whatsapp', 'facebook', 'copy')
  ),
  comment text check (comment is null or char_length(comment) <= 1000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invite_id, feature, draft_id)
);

create index if not exists pilot_feedback_invite_recent_idx
  on public.pilot_feedback (invite_id, created_at desc);

create index if not exists pilot_feedback_org_user_recent_idx
  on public.pilot_feedback (org_id, user_id, created_at desc);

alter table public.pilot_feedback enable row level security;

-- Feedback is written only by authenticated server routes after the caller,
-- tenant membership, private invite and trial expiry are verified together.
revoke all on table public.pilot_feedback from public, anon, authenticated;
grant all on table public.pilot_feedback to service_role;
