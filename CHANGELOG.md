# Changelog

Two things change over time and they are kept apart here: the method that the boards follow, and this repository.

A change to a prompt, a grader, the system prompt, the output cap or the thinking setting can move a score, so it is a new method version. It gets an entry under "Method versions" and a change in `src/eval-tasks.ts` (see the header of that file). Dated results of different versions are never merged: each folder in `results/` says, in its `method` block, which version produced it.

## Method versions

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

## This repository

### 2026-11-12, first entry

- `src/eval-tasks.ts`: verbatim copy of the site's `lib/eval-tasks.ts` as of method version 2. Its SHA-256 is recorded in the file header and checked by a test.
- `src/reproduce.ts`: runs the six tasks against any OpenAI-compatible chat-completions endpoint with your own key.
- `analysis/analyze-leaderboard.mjs`: copy of the analysis script. It reads the two public endpoints, or saved files.
- `scripts/snapshot.mjs` and the `snapshot` workflow: store the two boards and their analysis under `results/<UTC date>/` every day. The first snapshot is `results/2026-11-12/`.
- `METHODOLOGY.md`, `references/literature.md`, `references/statistics.md`: the method, its limits and its sources.
- Not included yet: the runner of the latency board.
