# swb-llm-evals

How the Sahara World Business site measures LLM providers, published so that anyone can check it: the tasks, the graders, the method, a way to re-run the tasks with your own key, and a dated history of the published results.

Español: [README.md](README.md)

## What this is

The site https://www.saharaworldbusiness.com publishes two boards about four LLM API providers. This repository exists so that you do not have to take our word for it: here are the six tasks with their expected answers, the code that grades each answer, the explanation of the method and a daily copy of what the boards publish.

Each provider is measured on its default model on the site, named on its row.

| | Reasoning eval | Latency board |
|---|---|---|
| Question | Does the model get six verifiable tasks right, and at what cost and time? | How fast does a short answer start and finish? |
| Cadence | Once a day | Every six hours |
| Thinking mode | On | Off, for the models that have a switch (the row says so) |
| Output cap | 4,000 tokens, thinking included | 120 tokens |
| Prompt | Six fixed tasks in Spanish, identical for every provider | One short prompt, identical for every provider |
| Window shown | Last 14 days, current method version only | Last 7 days |
| Measured from | Our own server (Google Cloud, us-east4) | Same |

The full method is in [METHODOLOGY.md](METHODOLOGY.md).

## How to check us in three steps

You need Node 22 or later. After cloning the repository, run `npm install` once.

**1. Read the tasks and the graders.** Open [`src/eval-tasks.ts`](src/eval-tasks.ts): it is a verbatim copy of the file the site uses. Compare the prompts with the `method` block of https://www.saharaworldbusiness.com/api/eval/leaderboard. Then run `npm test`: it checks that every expected answer passes its own grader, that the copy has not been modified, and that the `method` block saved in each result matches these tasks.

**2. Re-run the six tasks with your own key.** It works with any endpoint compatible with the OpenAI chat-completions API:

```
LLM_API_KEY=<your key> npx tsx src/reproduce.ts --base-url https://api.example.com/v1 --model <model id>
```

In PowerShell: `$env:LLM_API_KEY = "<your key>"`, then the same command without the prefix. For each task it prints whether it was correct, whether the answer was cut off at the token cap, the output and reasoning tokens (when the endpoint reports them) and the seconds. At the end it prints `Correct: N / 6`. Use `--max-tokens` to change the cap (4,000 by default, like the site) and `--show-answers` to see the text of each answer. The key is read only from the environment variable, is never printed and is sent only to the endpoint you give. The script stores nothing.

**3. Recompute the analysis and compare.** `npm run analyze` reads the two public endpoints and prints the tables with confidence intervals, the per-task view and the three speed rankings. Compare it with what the site shows and with the files in `results/`.

## What you can and cannot reproduce

You can reproduce:

- The six tasks against any provider, with your own key (step 2).
- The analysis, from the public endpoints or from saved files (step 3).
- The results published each day, which are stored with their date in `results/`.

You cannot reproduce:

- Our exact timing. It depends on where our server is (us-east4) and on its network. Your seconds will be different.
- The latency board. Its runner is not in this repository yet. Today only its published numbers and its description are.
- The answers from our daily runs. The site publishes how many times each task was attempted and passed, and the tokens and times, but not the text of the answers. So `src/reproduce.ts` is an independent check of the tasks and graders on your own key. It is not an audit of our runs.

`src/reproduce.ts` makes plain non-streaming requests, sends no thinking switch (the site does not send one for this eval either) and uses the model you choose. Its results can differ from the board's.

## What the numbers support and what they do not

- **The sample is six tasks.** Every run repeats the same six, so more days add answers, not tasks. Eighteen correct answers out of eighteen are three runs of six tasks. Counted as answers, the 95% Wilson interval is 82% to 100%. Counted as tasks (six of six), it is 61% to 100%. That supports "no failure seen on these six tasks", not "100% accurate".
- **It is a health check, not a ranking.** When every provider is at 100% the suite is saturated: it confirms that nothing is broken and cannot rank on accuracy. Cost and time are then the columns that carry information.
- **Small differences are noise.** One task is 16.7 points. With six tasks only very large gaps between two providers can be told apart reliably.
- **The P90 on the latency board rests on about 28 samples,** so the two or three slowest requests set it. The medians are stable.
- **Scope.** The results describe these tasks, these default models and our server location. They say nothing about long answers, other languages, tools or the general quality of a model.

## Known limits

- Six tasks is a very small set, and one of them (the trap question) is a famous puzzle that is almost certainly in training data, so it may test memory.
- The JSON task uses a flat three-key schema: it supports a claim about simple structured output and nothing wider.
- The invalid-premise task tells the model what to answer if the date does not exist, which is the easy version of that probe.
- An answer cut off by the per-task time limit (90 s), as opposed to the token cap, is not marked.
- First-token times are not like for like while thinking can be switched off for some models and not others.

## Method versions

Anything that can move a score (the cap, the thinking setting, a task, a grader, the system prompt) increases the version. The board only aggregates runs of the current version. Details in [CHANGELOG.md](CHANGELOG.md).

| Version | From | What changed |
|---|---|---|
| 1 | 2026-10 | 800-token output cap. Cut-off answers were not recorded. |
| 2 | 2026-11-12 | 4,000-token cap; cut-off answers recorded and shown; runs carry their version; the slowest provider runs last. |

Version 2 exists because of an error of ours. Under version 1 the board showed one provider at about 75%. Of the 35 tasks it had answered wrong, 34 had stopped at the 800-token cap: the model was still thinking when it ran out of tokens. Under version 2 the same provider answers all six tasks correctly.

## Where the results are

Every day a scheduled job (`.github/workflows/snapshot.yml`) stores three files in `results/<UTC date>/`:

- `eval-leaderboard.json` and `arena-leaderboard.json`: the responses of the two public endpoints, as the site published them that day.
- `analysis.md`: the analysis of those two files. Regenerate it with `node analysis/analyze-leaderboard.mjs --eval results/<date>/eval-leaderboard.json --arena results/<date>/arena-leaderboard.json`.

A daily copy is not a new measurement: it is the dated record of what the site showed. The first one is `results/2026-11-12/`. There is no history in this repository before that date. To take a copy by hand: `npm run snapshot`.

## Contents

```
src/eval-tasks.ts              tasks and graders (verbatim copy from the site)
src/reproduce.ts               re-runs the tasks with your key
analysis/                      analysis script
scripts/snapshot.mjs           daily copy of the boards
results/                       dated copies and their analysis
references/                    sources for the method and the statistics
METHODOLOGY.md  CHANGELOG.md   method and versions
```

## License

The code is under the MIT license ([LICENSE](LICENSE)). The texts and the files in `results/` are under CC BY 4.0 ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)).
