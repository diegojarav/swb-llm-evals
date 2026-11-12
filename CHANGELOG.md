# Changelog

Two things change over time and they are kept apart here: the method that the boards follow, and this repository.

A change to a prompt, a grader, the system prompt, the output cap or the thinking setting can move a score, so it is a new method version. For the reasoning eval it gets an entry under "Reasoning eval versions" and a change in `src/eval-tasks.ts` (see the header of that file). The latency board has its own version, the ping version, with its entries under "Latency ping versions". Dated results of different versions are never merged: the `method` block saved in each reasoning result says which version produced it, and the latency file says it from ping version 2 on (the latency file of 2026-11-12 was taken earlier, has no `method` block and describes the 120-token ping).

## Reasoning eval versions

### No new version, 2026-11-12

- The `method` block of `GET /api/eval/leaderboard` now also carries `generatorVersion` and, for each task, `templateId` and `control`.
- A generator for rotating task instances exists in the site's code and is not in use. The eval still asks the six fixed tasks, each one its own template and a control, so nothing that moves a score changed and the version stays 2.

### Version 2, from 2026-11-12

- Output cap raised from 800 to 4,000 tokens, thinking included.
- Answers that stop at the cap are recorded and shown as cut off, next to accuracy, instead of being read as wrong answers.
- Every run carries its method version, and the reasoning board aggregates only runs of the current version.
- The slowest provider runs last, so that a slow day costs it its own row and not the others'.
- Prompts, graders and the system prompt: not changed in this version. The task file gained an `expected` field (the correct answer shown on the site), used only for display.

Why: under version 1 one provider showed about 75%. Of the 35 tasks it had answered wrong, 34 had stopped at the 800-token cap. See "Method versions" in `METHODOLOGY.md`.

### Version 1, from 2026-10

- Six tasks graded by code, output cap of 800 tokens.
- Cut-off answers were not recorded, so a cut-off was graded like a wrong answer.
- Runs did not carry a version number. They are not part of the board for version 2 and are not in this repository.

## Latency ping versions

### Ping version 3, from 2026-11-12

- Output cap of the scheduled ping raised from 400 to 1,000 tokens, thinking included.
- The live "race" on the site keeps its 120-token cap. It is not part of this board.

Why: in the first five real pings under version 2, one provider was still cut off at 400 every time. Measured directly, its complete answer used 558 to 739 tokens.

### Ping version 2, from 2026-11-12

- Output cap raised from 120 to 400 tokens, thinking included.
- Each ping records whether the answer was cut off by the cap, and the board returns how many pings in the window were cut off (`truncatedPings`) and a `method` block with the prompt, the cap and the ping version.
- Pings carry their version, and the board aggregates only the current one.
- The speed tab sorts by the time to the complete short answer. The badge goes to the fastest provider only if it had no cut-off ping in the window and at least five pings. The first-token column and the per-row "thinking off" tag are unchanged.

Why: under version 1, three of the four providers had stopped at the 120-token cap in at least 25 of 28 pings in a week, so the "complete answer" time was complete for one provider only. See "Ping method versions" in `METHODOLOGY.md`.

### Ping version 1, until 2026-11

- 120-token output cap, one short prompt, thinking off for the models that have a switch.
- Cut-offs were not recorded and pings carried no version. They are not part of the board for version 2 and are not in this repository, except as the published numbers in `results/2026-11-12/arena-leaderboard.json`.

## This repository

### 2026-11-12, security review of the scripts and workflows

- `src/reproduce.ts`: control characters (C0 and C1, so also escape sequences) in text that comes from the endpoint are replaced by a space before the error line is printed, and are written out as `\uXXXX` in `--show-answers`. A hostile endpoint can no longer erase rows or draw a result line of its own. Two tests cover it.
- `analysis/analyze-leaderboard.mjs`: every value read from a board is cleaned before it is used. Control characters are removed, line breaks and a leading `#` cannot add a line or a heading to the report, a `|` cannot split a table cell, and the length is capped. A value that is not a number where a number belongs is ignored. The request has a 30 s time limit. A file or response that is not valid JSON is reported by name, without repeating its text.
- `analysis/analyze-leaderboard.mjs` and `scripts/snapshot.mjs`: the `?t=` cache-buster is gone from the request URL. The boards change at most every six hours and the CDN keeps them for five minutes, so it only forced the site to render them again.
- `scripts/snapshot.mjs`: a board that comes back with no entries is still written, as the site served it, and the log now says so. Values from the response are cleaned before they are printed, and a response that is not JSON is not quoted.
- `.github/workflows/`: the actions are pinned to full commit SHAs (`actions/checkout` v7.0.1, `actions/setup-node` v6.5.0, the same in both files). The CI checkout no longer keeps credentials. The snapshot job pulls with a rebase before it pushes, and tries up to three times, so a push by the owner at the same moment does not lose the day.
- Added `.github/dependabot.yml` (npm and GitHub Actions, weekly, three pull requests at most each; the pinned actions are moved by it), `SECURITY.md` (linked from both READMEs) and `results/2026-11-12/NOTE.md` (that day's latency rows come from the 120-token ping and are not valid for comparing providers).
- Not changed: `src/eval-tasks.ts`, the method and its versions, and the data and analysis files in `results/2026-11-12/`.

### 2026-11-12, latency board and documentation update

- `METHODOLOGY.md`, `README.md`, `README.en.md`: updated to ping version 3 (1,000-token cap, cut-off pings, the badge rule, ping versions), the counts the reasoning tab now shows instead of a percentage, the new limits, and the unused task generator.
- `references/literature.md`: added Huyen (2025), "AI Engineering", chapter 9, as a source for the latency definitions. It is a printed book, checked on 2026-11-12 in a printed copy and not opened online.
- `analysis/analyze-leaderboard.mjs`: new copy of the analysis script. It now reads `truncatedPings` and the latency `method` block, prints the pings cut off at the cap, and says when the leader's time may be the time to run out of tokens.
- `test/eval-tasks.test.ts`: the comparison with the saved `method` block now ignores the fields this repository does not define (`generatorVersion`, `templateId`, `control`). Prompts, expected answers, system prompt, cap and thinking setting are still compared exactly, and two new tests check that.
- Not changed: `src/eval-tasks.ts` (same six tasks, graders and expected answers), `src/reproduce.ts`, the workflows and `results/`.
- Not included yet: the runner of the latency board.

### 2026-11-12, first entry

- `src/eval-tasks.ts`: verbatim copy of the site's `lib/eval-tasks.ts` as of method version 2. Its SHA-256 is recorded in the file header and checked by a test.
- `src/reproduce.ts`: runs the six tasks against any OpenAI-compatible chat-completions endpoint with your own key.
- `analysis/analyze-leaderboard.mjs`: copy of the analysis script. It reads the two public endpoints, or saved files.
- `scripts/snapshot.mjs` and the `snapshot` workflow: store the two boards and their analysis under `results/<UTC date>/` every day. The first snapshot is `results/2026-11-12/`.
- `METHODOLOGY.md`, `references/literature.md`, `references/statistics.md`: the method, its limits and its sources.
- Not included yet: the runner of the latency board.
