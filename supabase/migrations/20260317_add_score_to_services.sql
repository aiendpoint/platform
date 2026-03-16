-- Add score column to services for badge filtering and score-based sorting.
-- Populated at registration time from the validation result.
-- Existing rows default to 0; re-validate them if you need accurate scores.

alter table services
  add column if not exists score integer not null default 0
    check (score between 0 and 100);

create index if not exists services_score_idx on services (score desc);
