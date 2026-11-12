# Note on this folder

The first dated record was taken before the latency method changed.

- The latency rows in `arena-leaderboard.json` come from the earlier ping method (ping version 1): a 120-token output cap, thinking included, no cut-off count and no `method` block.
- Under that method, for three of the four providers at least 25 of 28 pings in the week had stopped at the cap (see "Ping method versions" in `METHODOLOGY.md`). The model had spent the budget thinking, so the "complete short answer" time was the time to run out of tokens. Only the provider whose thinking was switched off had measured a complete answer.
- The "complete short answer" times in that file, and the ranking by them in `analysis.md`, are therefore not valid for comparing providers.
- The files are kept unchanged as a record of what the site published that day.
- Later folders use the current method (1,000-token cap, cut-offs counted, a `method` block in the latency file).
- `eval-leaderboard.json` in this folder is reasoning method version 2 and is not affected.
