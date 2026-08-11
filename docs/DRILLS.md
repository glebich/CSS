# The drills

Stage 15 says nothing is trusted until it has been drilled. These two
run against the built api on a real socket, and each refuses to pass
quietly: any error, missing row, slow tail, or lost byte fails the
run. Both are one command from the repo root.

## The 200-person drill

```bash
npm run drill
```

Boots the api with a throwaway data volume, mints one resident
through the partner door, then puts two hundred simulated people
through it over real HTTP, twenty at a time: each signs in, writes
three rows, reads the count, and round-trips kv. The drill arrives
from one address, so it raises the general door's ceiling for its own
process with `OSYLE_RATE_MAX`; in production every person is their
own address and the default ceiling stands.

Last run, 2026-08-11, on the build machine (not the deployment box;
rerun on yours for numbers you can act on):

```
calls made          1400
errors              0
rows landed         600 of 600
alive in survival   1 of 1
wall clock          1.5 s
p50 latency         17.2 ms
p95 latency         36.0 ms
worst latency       158.2 ms
```

The pass bar: zero errors, every row landed, p95 within 250 ms.

## The backup and cold-start rehearsal

```bash
npm run rehearse
```

Boots the api cold, puts a resident with real bytes in it through the
same doors the product uses, backs the volume up with the same
`ops/backup.sh` the nightly cron runs, destroys the volume, restores
with exactly the `tar -xzf` that DEPLOY.md prescribes, boots cold
again, and proves everything survived: the resident database, the
survival index, the pre-fire session, and the vault bytes themselves.

Last run, 2026-08-11, on the build machine: eight checks, both cold
starts under half a second, all survived.

Run the rehearsal after the first deployment and monthly after that;
a backup that has never been restored is a hope, not a backup.
