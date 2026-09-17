-- Warlord Draft · Versus rooms (docs/versus-plan.md §3).
-- One table. Only the server reads or writes it, with the service-role key, so there are no RLS policies.
-- Run once in the Supabase SQL editor.

create table if not exists rooms (
  code          text primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  status        text not null,            -- waiting · ready · drafting · deploying · battle · done · closed
  match_no      integer not null default 1,
  data_version  integer not null,
  seed          integer,                  -- drawn when the second player joins; redrawn on rematch
  ground        text,
  battle_seed   integer,
  host          jsonb not null,           -- { name, token, ready, step, stepStartedAt, lastSeenAt, run, plan, line, locked, auto, beat }
  guest         jsonb,
  record        jsonb not null default '{"host":0,"guest":0,"history":[]}'::jsonb,
  rematch       jsonb,                    -- { by: "host"|"guest", at } while an offer is open
  version       integer not null default 0 -- optimistic concurrency: every write checks and bumps it
);

create index if not exists rooms_expires_at on rooms (expires_at);

comment on table rooms is 'Versus rooms: state, both seats, the record. Server-only.';
