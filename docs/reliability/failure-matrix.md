# Failure Matrix

| Signal | Expected Value | Interpretation |
|---|---:|---|
| Redis group lag | 0 | Stream is fully drained |
| Redis pending | 0 | No orphaned PEL entries remain |
| Postgres completed | = total seeded | End-to-end durable convergence |
| Postgres failed/terminal | 0 | No budget-exhausted work items |
