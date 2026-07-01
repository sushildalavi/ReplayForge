# Failure Modes

## Covered scenarios

- worker crash
- Redis restart
- Postgres unavailable
- duplicate event
- poison message
- API timeout
- dead-letter replay
- ForgeLog WAL unavailable or corrupted
- ForgeLog service unavailable

## Failure handling summary

- Worker crash before Redis ack:
  - The message stays in the stream PEL.
  - Pending-entry recovery reclaims it on the next worker pass.
  - The event remains idempotent because PostgreSQL row state is claimed first.
- Database write succeeds but Redis ack fails:
  - The event stays in a terminal or retrying state in PostgreSQL.
  - Recovery replays the pending stream entry without duplicating side effects.
- Duplicate event delivery:
  - The idempotency key prevents a second persisted event row.
  - Duplicate stream deliveries are acknowledged after the existing row is read.
- Poison message / retry exhaustion:
  - The worker increments attempt history and moves the event to the DLQ with a reason code.
  - The dead-letter record keeps the replay metadata for auditability.
- DLQ replay:
  - Replaying a DLQ row creates a new attempt record and requeues the event.
  - The replay status is marked in the dead-letter row so repeated replay can be detected.
- Convergence verification:
  - `/api/convergence` reports pending entries, backlog, orphaned worker claims, duplicates, and the live convergence state.

## Reliability model

- At-least-once delivery with idempotent convergence.
- Dead-letter replay and recovery janitor support eventual reconciliation.
- ForgeLog is optional and experimental; Redis Streams remains the default backend.
